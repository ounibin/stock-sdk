const axios = require('axios');
const dayjs = require('dayjs');

/**
 * 获取指定日期 A 股的主线板块（题材主线）
 *
 * "主线"是短线情绪周期（冰点 → 启动 → 发酵 → 高潮 → 分歧 → 退潮）中的核心概念：
 * 一轮行情中资金持续聚焦、率先走出空间板的题材方向。
 *
 * 判定所用量化指标（全部来自东方财富涨停板行情接口，按行业板块聚合）：
 *   - 板块涨停家数（资金聚焦的广度）
 *   - 板块内最高连板高度（空间板，主线的核心特征：龙头出自主线）
 *   - 板块内连板股数量（lbc >= 2，当日持续性，区分主线与一日游杂毛）
 *   - 板块封板资金合计（资金强度）
 *   - 上一交易日同板块涨停家数 / 最高连板（跨日持续性，主线应连续多日出现）
 *
 * 综合评分 = 涨停家数 × w.zt + 最高连板 × w.lbc + 连板股数 × w.lbCount
 *           + min(昨日涨停家数, w.prevZtCap) × w.prevZt
 * 评分最高者为主线，第 2 ~ topN 名为副线。
 *
 * 口径说明：涨停池不含 ST 股与北交所；板块为东财涨停池的行业板块字段（hybk），
 * 与"概念题材"不完全等价（如机器人概念的成分股可能落在通用设备等行业）。
 *
 * @async
 * @param {string|number} [date=今天] - 日期，格式 YYYYMMDD（例如：'20261126'）；默认当天
 *                                      非交易日/盘前会自动回退到最近一个有涨停数据的交易日
 * @param {Object} [options] - 可选配置
 * @param {Object} [options.weights] - 评分权重，可按需覆盖（见 DEFAULT_WEIGHTS）
 * @param {number} [options.topN=3] - 输出主线 + 副线的板块总数（至少为 2 才有副线）
 * @returns {Promise<Object>} 主线判定结果，含 mainLine（主线板块明细）、
 *                            subLines（副线板块明细数组）、boards（全部板块评分排行）
 * @throws {TypeError} 当日期格式不是 YYYYMMDD 时抛出错误
 * @throws {Error} 当连续多个自然日都取不到涨停数据时抛出错误（如超出东财约一个月的历史保留范围）
 *
 * @example
 * const result = await getMainLine('20261126');
 * // => { date: '20261126', mainLine: { name: '机器人', ztCount: 12, maxLbc: 9, ... }, subLines: [...], boards: [...] }
 *
 * @example
 * const result = await getMainLine(); // 默认今天
 */
module.exports = async (date = dayjs().format('YYYYMMDD'), options = {}) => {
  const dateStr = String(date);
  if (!/^\d{8}$/.test(dateStr)) {
    throw new TypeError('date 应为 YYYYMMDD 格式，如 20261126');
  }
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  const topN = Number(options.topN) > 1 ? Math.floor(Number(options.topN)) : DEFAULT_TOP_N;

  console.log(`正在获取主线板块(${dateStr})...`);

  // 1. 定位最近一个有涨停数据的交易日（跳过周末、节假日、盘前无数据等情况）
  const activeDate = await findDataDate(dateStr);
  if (!activeDate) {
    throw new Error(
      `自 ${dateStr} 起向前 ${PROBE_MAX_DAYS} 个自然日均未获取到涨停数据，` +
      '请检查网络；若日期较早，可能已超出东财涨停池约一个月的历史数据保留范围'
    );
  }

  // 2. 获取当日涨停池，以及上一交易日的涨停池（主线判定需要跨日持续性）
  const pool = await fetchZTPool(activeDate);
  const prevDate = await findDataDate(shiftDay(activeDate, -1));
  const prevPool = prevDate ? await fetchZTPool(prevDate) : null;

  // 3. 按行业板块聚合、评分、排序
  const { boards, stocksByBoard } = rankBoards(pool, prevPool, prevDate, weights);
  if (boards.length === 0) {
    throw new Error(`涨停池(${activeDate})数据为空，无法判定主线板块`);
  }

  const mainLine = buildBoardDetail(boards[0], stocksByBoard.get(boards[0].name));
  const subLines = boards.slice(1, topN)
    .map(board => buildBoardDetail(board, stocksByBoard.get(board.name)));

  console.log(`主线板块(${activeDate}): ${mainLine.name}` +
    (subLines.length ? `，副线: ${subLines.map(b => b.name).join('、')}` : ''));

  return {
    inputDate: dateStr,
    date: activeDate,
    dateAdjusted: activeDate !== dateStr,
    prevDate: prevDate || null,
    mainLine,
    subLines,
    boards
  };
};

// ============ 评分配置 ============

/**
 * 板块评分权重（默认值，可通过 options.weights 覆盖）
 * 空间板高度权重最高：主线最核心的特征就是龙头（空间板）出自该板块
 */
const DEFAULT_WEIGHTS = {
  zt: 3,        // 板块当日涨停家数（广度）
  lbc: 6,       // 板块内最高连板高度（空间板）
  lbCount: 4,   // 板块内连板股数量（lbc >= 2，当日持续性）
  prevZt: 2,    // 上一交易日同板块涨停家数（跨日持续性）
  prevZtCap: 15 // 跨日持续性得分的封顶家数，防止昨日情绪极端时权重失衡
};

/** 除主线外默认再输出的副线数量（topN - 1 条副线） */
const DEFAULT_TOP_N = 3;

/** 无行业板块信息时的兜底分组名 */
const UNKNOWN_BOARD = '其他';

/** 每个板块明细中展示的成分股数量上限（按连板高度降序） */
const STOCK_LIMIT = 5;

/** 判定板块"持续聚焦"所需的上一交易日最低涨停家数 */
const CONTINUED_MIN = 2;

/** 回退查找有数据的交易日时，最多向前探测的自然日数 */
const PROBE_MAX_DAYS = 10;

// ============ 数据获取 ============

/**
 * 获取指定日期的东财涨停池明细
 * @param {string} dateStr - YYYYMMDD
 * @param {number} pagesize - 拉取条数
 * @returns {Promise<Array>} 涨停股明细列表（含 c/n/lbc/fund/hybk 等字段）；失败返回空数组
 */
async function fetchZTPool(dateStr, pagesize = 10000) {
  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: '0',
    pagesize: String(pagesize),
    sort: 'fbt:asc',
    date: dateStr
  });
  try {
    const res = await axios.get(`https://push2ex.eastmoney.com/getTopicZTPool?${params}`, {
      headers: {
        Referer: 'https://quote.eastmoney.com/ztb/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const data = res.data && res.data.data;
    return data && Array.isArray(data.pool) ? data.pool : [];
  } catch (error) {
    console.error(`获取涨停池(${dateStr})出错:`, error.message);
    return [];
  }
}

/**
 * 自某日起向前查找最近一个有涨停数据的交易日
 * （涨停池为空即视为非交易日/无数据，最多向前探测 PROBE_MAX_DAYS 个自然日）
 * @param {string} startDate - YYYYMMDD
 * @returns {Promise<string|null>} 找到的交易日；找不到返回 null
 */
async function findDataDate(startDate) {
  let d = toDate(startDate);
  for (let i = 0; i < PROBE_MAX_DAYS; i++) {
    const dateStr = d.format('YYYYMMDD');
    const pool = await fetchZTPool(dateStr, 1);
    if (pool.length > 0) return dateStr;
    d = d.subtract(1, 'day');
  }
  return null;
}

// ============ 板块聚合与评分 ============

/**
 * 将涨停池按行业板块（hybk）分组
 * @param {Array|null} pool - 涨停池明细；null 表示无数据
 * @returns {Map<string, Array>|null} 板块名 → 涨停股列表；入参为 null 时返回 null
 */
function groupByBoard(pool) {
  if (!pool) return null;
  const map = new Map();
  for (const stock of pool) {
    const name = stock && stock.hybk ? String(stock.hybk).trim() : '';
    const board = name || UNKNOWN_BOARD;
    if (!map.has(board)) map.set(board, []);
    map.get(board).push(stock);
  }
  return map;
}

/**
 * 计算单个板块在涨停池中的统计指标
 * @param {Array} stocks - 该板块的涨停股列表
 * @returns {Object} { ztCount, maxLbc, lbCount, totalFund }
 */
function summarizeBoard(stocks) {
  return {
    ztCount: stocks.length,
    maxLbc: stocks.reduce((max, s) => Math.max(max, Number(s.lbc) || 0), 0),
    lbCount: stocks.filter(s => (Number(s.lbc) || 0) >= 2).length,
    totalFund: stocks.reduce((sum, s) => sum + (Number(s.fund) || 0), 0)
  };
}

/**
 * 聚合当日板块指标，结合上一交易日数据计算综合评分并排序
 * @param {Array} pool - 当日涨停池
 * @param {Array|null} prevPool - 上一交易日涨停池；null 表示无上一交易日数据
 * @param {string|null} prevDate - 上一交易日日期
 * @param {Object} w - 评分权重
 * @returns {{boards: Array<Object>, stocksByBoard: Map<string, Array>}}
 *          boards 为板块排行（score 降序，每项含统计指标、昨日对比与评分）；
 *          stocksByBoard 为板块名 → 涨停股明细列表，供生成板块明细使用
 */
function rankBoards(pool, prevPool, prevDate, w) {
  const current = groupByBoard(pool);
  const prev = groupByBoard(prevPool);
  const hasPrev = prev !== null;

  const boards = [];
  for (const [name, stocks] of current) {
    const stats = summarizeBoard(stocks);
    // 昨日池存在但该板块无涨停 → 昨日指标为 0（区别于整体无昨日数据的 null）
    const prevStats = !hasPrev
      ? null
      : (prev.has(name) ? summarizeBoard(prev.get(name)) : summarizeBoard([]));

    // 综合评分：广度 + 空间高度 + 当日持续性 + 跨日持续性
    const score = stats.ztCount * w.zt +
      stats.maxLbc * w.lbc +
      stats.lbCount * w.lbCount +
      (prevStats ? Math.min(prevStats.ztCount, w.prevZtCap) * w.prevZt : 0);

    boards.push({
      name,
      score: round2(score),
      ...stats,
      prevDate: hasPrev ? prevDate : null,
      prevZtCount: prevStats ? prevStats.ztCount : null,
      prevMaxLbc: prevStats ? prevStats.maxLbc : null,
      isContinued: prevStats !== null && prevStats.ztCount >= CONTINUED_MIN
    });
  }

  // 评分降序；同分时依次比较涨停家数、最高连板、封板资金
  boards.sort((a, b) =>
    b.score - a.score ||
    b.ztCount - a.ztCount ||
    b.maxLbc - a.maxLbc ||
    b.totalFund - a.totalFund
  );

  return { boards, stocksByBoard: current };
}

/**
 * 为排行中的板块生成明细：判定依据文字 + 龙头与成分股列表
 * @param {Object} board - rankBoards 输出的板块条目
 * @param {Array} stocks - 该板块的涨停股明细（来自 stocksByBoard）
 * @returns {Object} 板块明细
 */
function buildBoardDetail(board, stocks) {
  // 成分股按连板高度降序、封板资金降序排列（排在首位的是板块龙头）
  const stockList = (stocks || [])
    .sort((a, b) => (Number(b.lbc) || 0) - (Number(a.lbc) || 0) || (Number(b.fund) || 0) - (Number(a.fund) || 0))
    .slice(0, STOCK_LIMIT)
    .map(s => ({
      code: s.c,
      name: s.n,
      lbc: Number(s.lbc) || 0,
      fund: Number(s.fund) || 0
    }));

  const leader = stockList[0];
  const leaderTxt = leader && leader.lbc > 0 ? `（龙头 ${leader.name} ${leader.lbc} 板）` : '';
  const prevTxt = board.prevZtCount === null
    ? '，无上一交易日数据可比'
    : board.isContinued
      ? `，昨日亦有 ${board.prevZtCount} 家涨停，资金持续聚焦`
      : board.prevZtCount > 0
        ? `，昨日仅 ${board.prevZtCount} 家涨停，属于今日新启动方向`
        : '，昨日无涨停，为今日新启动方向';

  return {
    ...board,
    reason: `涨停 ${board.ztCount} 家、最高连板 ${board.maxLbc} 板${leaderTxt}、连板股 ${board.lbCount} 只，` +
      `封板资金 ${(board.totalFund / 1e8).toFixed(1)} 亿，评分 ${board.score}${prevTxt}`,
    stocks: stockList
  };
}

// ============ 工具函数 ============

/** YYYYMMDD 字符串 → dayjs 对象 */
function toDate(dateStr) {
  return dayjs(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);
}

/** YYYYMMDD 字符串按天平移，delta 为负表示向前 */
function shiftDay(dateStr, delta) {
  return (delta >= 0 ? toDate(dateStr).add(delta, 'day') : toDate(dateStr).subtract(-delta, 'day'))
    .format('YYYYMMDD');
}

/** 保留两位小数 */
function round2(v) {
  return Math.round(v * 100) / 100;
}

// 暴露默认权重，便于外部查看与调整
module.exports.weights = DEFAULT_WEIGHTS;

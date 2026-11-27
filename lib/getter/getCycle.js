const axios = require('axios');
const dayjs = require('dayjs');

/**
 * 按陈小群的 6 个情绪周期，判断 A 股在指定日期处于哪个周期
 *
 * 六个周期按顺序循环流转：冰点期 → 回暖期 → 发酵期 → 高潮期 → 分歧期 → 退潮期 →（回到冰点期）
 *
 * 判定所用量化指标（全部来自东方财富涨停板行情接口）：
 *   - 涨停家数（赚钱效应广度）
 *   - 最高连板高度（空间板，情绪高度）
 *   - 涨停溢价率（昨日涨停股今日平均涨跌幅，赚钱效应质量）
 *   - 炸板率 = 炸板家数 / (涨停家数 + 炸板家数)，分歧/退潮时显著升高
 *   - 跌停家数（亏钱效应）
 *   - 上一交易日的上述指标（用于对比趋势：分歧 = 高潮后的回落）
 *
 * @async
 * @param {string|number} [date=今天] - 日期，格式 YYYYMMDD（例如：'20261125'）；默认当天
 *                                      非交易日/盘前会自动回退到最近一个有涨停数据的交易日
 * @param {Object} [options] - 可选配置
 * @param {Object} [options.thresholds] - 周期判定阈值，可按需覆盖（见 DEFAULT_THRESHOLDS）
 * @returns {Promise<Object>} 周期判定结果，含 cycle（周期名）、cycleIndex（1~6）、
 *                            metrics/prevMetrics（当日与上一交易日指标）、reason（判定依据）、
 *                            suggestion（该周期的一般应对策略）
 * @throws {TypeError} 当日期格式不是 YYYYMMDD 时抛出错误
 * @throws {Error} 当连续多个自然日都取不到涨停数据时抛出错误（如超出东财约一个月的历史保留范围）
 *
 * @example
 * const result = await getCycle('20261125');
 * // => { date: '20261125', cycle: '退潮期', cycleIndex: 6, metrics: {...}, reason: '...', suggestion: '...' }
 *
 * @example
 * const result = await getCycle(); // 默认今天
 */
module.exports = async (date = dayjs().format('YYYYMMDD'), options = {}) => {
  const dateStr = String(date);
  if (!/^\d{8}$/.test(dateStr)) {
    throw new TypeError('date 应为 YYYYMMDD 格式，如 20261125');
  }
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) };

  console.log(`正在获取情绪周期(${dateStr})...`);

  // 1. 定位最近一个有涨停数据的交易日（跳过周末、节假日、盘前无数据等情况）
  const activeDate = await findDataDate(dateStr);
  if (!activeDate) {
    throw new Error(
      `自 ${dateStr} 起向前 ${PROBE_MAX_DAYS} 个自然日均未获取到涨停数据，` +
      '请检查网络；若日期较早，可能已超出东财涨停池约一个月的历史数据保留范围'
    );
  }

  // 2. 获取当日指标，以及上一交易日的指标（周期判定需要趋势对比）
  const metrics = await fetchDayMetrics(activeDate);
  const prevDate = await findDataDate(shiftDay(activeDate, -1));
  const prevMetrics = prevDate ? await fetchDayMetrics(prevDate) : null;

  // 3. 按规则判定所处周期
  const { cycle, reason } = classify(metrics, prevMetrics, thresholds);

  console.log(`情绪周期(${activeDate}): ${cycle}`);

  return {
    inputDate: dateStr,
    date: activeDate,
    dateAdjusted: activeDate !== dateStr,
    prevDate: prevDate || null,
    cycle,
    cycleIndex: CYCLE_FLOW.indexOf(cycle) + 1,
    cycleFlow: `${CYCLE_FLOW.join(' → ')}（循环）`,
    metrics,
    prevMetrics,
    reason,
    suggestion: CYCLE_SUGGESTION[cycle]
  };
};

// ============ 周期定义 ============

/** 六个周期的流转顺序（冰点 → 启动 → 发酵 → 高潮 → 分歧 → 退潮，之后回到冰点） */
const CYCLE_FLOW = ['冰点期', '回暖期', '发酵期', '高潮期', '分歧期', '退潮期'];

/** 各周期的一般应对策略（周期理论中的常见用法，仅供参考） */
const CYCLE_SUGGESTION = {
  冰点期: '情绪冰点，亏钱效应到极致，耐心观望等待破冰信号（首板/高度板重新出现），不宜急于抄底',
  回暖期: '情绪修复初期，可小仓位试错新题材龙头，跟随低位首板',
  发酵期: '赚钱效应扩散，可加仓主线龙头，关注连板梯队的完整性',
  高潮期: '情绪最强阶段，持股为主让利润奔跑，同时警惕随时转入分歧',
  分歧期: '高位股开始分化，逢高兑现、去弱留强，切忌追高',
  退潮期: '亏钱效应显著，以空仓防守为主，等待下一个冰点信号'
};

/**
 * 周期判定阈值（默认值，可通过 options.thresholds 覆盖）
 * 阈值为经验值，可结合自己对周期的理解调整
 */
const DEFAULT_THRESHOLDS = {
  ztStart: 20,    // 涨停家数达到该值以上，情绪才算走出冰点
  ztWarm: 40,     // 发酵期的涨停家数下限
  ztHot: 70,      // 接近百股涨停，高潮特征
  lbcIce: 3,      // 最高连板高度 <= 该值为"高度压缩"，冰点特征
  lbcStart: 3,    // 回暖期要求至少出现的高度
  lbcWarm: 4,     // 发酵期要求至少出现的高度
  lbcHigh: 6,     // 最高连板高度 >= 该值为"高度板"，高潮特征
  premiumIce: -2, // 涨停溢价率 <= 该值(%)为明显亏钱效应
  premiumGood: 2, // 涨停溢价率 >= 该值(%)为赚钱效应良好
  premiumWarm: 1, // 发酵期溢价率下限
  brokenMid: 25,  // 炸板率 >= 该值(%)出现分歧迹象
  brokenHigh: 30, // 炸板率 >= 该值(%)为退潮迹象
  dtHigh: 15      // 跌停家数 >= 该值，亏钱效应显著
};

/** 回退查找有数据的交易日时，最多向前探测的自然日数 */
const PROBE_MAX_DAYS = 10;

// ============ 数据获取 ============

/** 四个池子对应的接口路径与排序参数 */
const POOL_URLS = {
  ZT: 'getTopicZTPool',      // 涨停池
  ZB: 'getTopicZBPool',      // 炸板池
  DT: 'getTopicDTPool',      // 跌停池
  YZT: 'getYesterdayZTPool'  // 昨日涨停池（含昨日涨停股当日涨跌幅 zdp）
};
const POOL_SORTS = {
  ZT: 'fbt:asc',
  ZB: 'fbt:asc',
  DT: 'fund:asc',
  YZT: 'zs:desc'
};

/**
 * 获取指定日期某个池子的数据
 * @param {string} pool - 池子标识：ZT/ZB/DT/YZT
 * @param {string} dateStr - YYYYMMDD
 * @param {number} pagesize - 拉取条数
 * @returns {Promise<{tc: number, pool: Array}>} tc 为池子总数，pool 为明细列表
 */
async function fetchPool(pool, dateStr, pagesize = 10000) {
  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: '0',
    pagesize: String(pagesize),
    sort: POOL_SORTS[pool],
    date: dateStr
  });
  const url = `https://push2ex.eastmoney.com/${POOL_URLS[pool]}?${params}`;
  try {
    const res = await axios.get(url, {
      headers: {
        Referer: 'https://quote.eastmoney.com/ztb/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const data = res.data && res.data.data;
    return {
      tc: (data && data.tc) || 0,
      pool: data && Array.isArray(data.pool) ? data.pool : []
    };
  } catch (error) {
    console.error(`获取${pool}池(${dateStr})出错:`, error.message);
    return { tc: 0, pool: [] };
  }
}

/**
 * 获取单个交易日的完整情绪指标
 * @param {string} dateStr - YYYYMMDD
 * @returns {Promise<Object>} { ztCount, dtCount, zbCount, brokenRate, maxLbc, premium }
 */
async function fetchDayMetrics(dateStr) {
  const [zt, zb, dt, yzt] = await Promise.all([
    fetchPool('ZT', dateStr),
    fetchPool('ZB', dateStr),
    fetchPool('DT', dateStr),
    fetchPool('YZT', dateStr)
  ]);

  // 最高连板高度（空间板）
  const maxLbc = zt.pool.reduce((max, s) => Math.max(max, Number(s.lbc) || 0), 0);
  // 涨停溢价率：昨日涨停股今日平均涨跌幅
  const premium = yzt.pool.length
    ? yzt.pool.reduce((sum, s) => sum + (Number(s.zdp) || 0), 0) / yzt.pool.length
    : null;

  return {
    date: dateStr,
    ztCount: zt.tc || zt.pool.length,
    dtCount: dt.tc || dt.pool.length,
    zbCount: zb.tc || zb.pool.length,
    brokenRate: zt.tc + zb.tc > 0 ? round2((zb.tc / (zt.tc + zb.tc)) * 100) : 0,
    maxLbc,
    premium: premium === null ? null : round2(premium)
  };
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
    const { tc, pool } = await fetchPool('ZT', dateStr, 1);
    if (tc > 0 || pool.length > 0) return dateStr;
    d = d.subtract(1, 'day');
  }
  return null;
}

// ============ 周期判定 ============

/**
 * 按规则判定周期，规则自上而下命中即返回
 * （分歧期与高潮期、退潮期的区分依赖与上一交易日的对比）
 * @param {Object} m - 当日指标
 * @param {Object|null} prev - 上一交易日指标（取不到时为 null）
 * @param {Object} t - 判定阈值
 * @returns {{cycle: string, reason: string}}
 */
function classify(m, prev, t) {
  // 溢价率缺失时按 0 参与规则判断（结果字段中保留原始 null）
  const p = m.premium === null ? 0 : m.premium;
  const prevP = prev && prev.premium !== null ? prev.premium : null;
  const prevLbc = prev ? prev.maxLbc : null;
  const pTxt = prevP === null ? '无数据' : `${prevP}%`;

  // 1. 冰点期：涨停稀少 + 高度压缩 + 明显亏钱效应
  if (m.ztCount < t.ztStart && m.maxLbc <= t.lbcIce && p <= t.premiumIce) {
    return {
      cycle: '冰点期',
      reason: `涨停仅 ${m.ztCount} 家，最高连板 ${m.maxLbc} 板（高度压缩），涨停溢价率 ${p}%（明显亏钱效应），情绪处于冰点`
    };
  }

  // 2. 退潮期：明显亏钱效应，且炸板率高 / 跌停多 / 高度较前一日回落
  const ebbSignals = [
    m.brokenRate >= t.brokenHigh ? `炸板率 ${m.brokenRate}% 偏高` : null,
    m.dtCount >= t.dtHigh ? `跌停 ${m.dtCount} 家` : null,
    prevLbc !== null && m.maxLbc < prevLbc ? `最高连板由 ${prevLbc} 板回落至 ${m.maxLbc} 板` : null
  ].filter(Boolean);
  if (p <= t.premiumIce && ebbSignals.length > 0) {
    return {
      cycle: '退潮期',
      reason: `涨停溢价率 ${p}%（前一日 ${pTxt}）亏钱效应显著，${ebbSignals.join('、')}`
    };
  }

  // 3. 分歧期：情绪仍在高位（涨停多、溢价未大负），但炸板率升高且溢价较前一日收敛
  if (m.ztCount >= t.ztWarm && m.brokenRate >= t.brokenMid && prevP !== null && p < prevP && p > t.premiumIce) {
    return {
      cycle: '分歧期',
      reason: `涨停 ${m.ztCount} 家仍处高位，但炸板率升至 ${m.brokenRate}%，涨停溢价率 ${p}% 较前一日 ${prevP}% 明显收敛，情绪开始分化`
    };
  }

  // 4. 高潮期：涨停家数/高度齐升，炸板率低，溢价良好
  if (
    (m.ztCount >= t.ztHot || (m.ztCount >= t.ztWarm && m.maxLbc >= t.lbcHigh)) &&
    m.brokenRate < t.brokenMid && p >= t.premiumGood
  ) {
    return {
      cycle: '高潮期',
      reason: `涨停 ${m.ztCount} 家、最高连板 ${m.maxLbc} 板、涨停溢价率 ${p}%、炸板率仅 ${m.brokenRate}%，赚钱效应全面爆发`
    };
  }

  // 5. 发酵期：涨停放量、高度抬升（至少不回落）、溢价良好
  if (
    m.ztCount >= t.ztWarm && p >= t.premiumWarm && m.maxLbc >= t.lbcWarm &&
    (prevLbc === null || m.maxLbc >= prevLbc)
  ) {
    return {
      cycle: '发酵期',
      reason: `涨停 ${m.ztCount} 家持续放量，最高连板 ${m.maxLbc} 板（前一日 ${prevLbc === null ? '无数据' : `${prevLbc} 板`}），涨停溢价率 ${p}% 良好，赚钱效应扩散`
    };
  }

  // 6. 回暖期：涨停家数回升、出现一定高度、溢价转正
  if (m.ztCount >= t.ztStart && p >= 0 && m.maxLbc >= t.lbcStart) {
    return {
      cycle: '回暖期',
      reason: `涨停回升至 ${m.ztCount} 家，出现 ${m.maxLbc} 板高度，涨停溢价率 ${p}% 转正，情绪修复启动`
    };
  }

  // 兜底：特征不明显时，按"涨停家数 × 溢价率"四象限就近归类
  if (p < 0) {
    return m.ztCount < t.ztStart
      ? { cycle: '冰点期', reason: `涨停 ${m.ztCount} 家偏少且溢价率 ${p}% 为负，各项特征处于低位，就近归类为冰点期` }
      : { cycle: '退潮期', reason: `涨停 ${m.ztCount} 家不少但溢价率 ${p}% 为负，赚钱效应恶化，就近归类为退潮期` };
  }
  return m.ztCount < t.ztStart
    ? { cycle: '回暖期', reason: `涨停 ${m.ztCount} 家偏少但溢价率 ${p}% 为正，情绪低位回暖，就近归类为回暖期` }
    : { cycle: '发酵期', reason: `涨停 ${m.ztCount} 家、溢价率 ${p}% 为正，情绪处于中性偏暖区间，就近归类为发酵期` };
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

// 暴露默认阈值，便于外部查看与调整
module.exports.thresholds = DEFAULT_THRESHOLDS;

if (require.main === module) {
   module.exports('20261123').then((res) => {
    console.log(JSON.stringify(res, null, 2));
  })
}
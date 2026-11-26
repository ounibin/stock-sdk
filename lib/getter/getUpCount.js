const axios = require('axios');
const dayjs = require('dayjs');

const CLIST_URL = 'https://push2.eastmoney.com/api/qt/clist/get';
const ZT_POOL_URL = 'https://push2ex.eastmoney.com/getTopicZTPool';

// 沪深主板 + 创业板 + 科创板 + 北交所 全部 A 股
const MARKET_FS = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
const PAGE_SIZE = 100;
const HEADERS = {
  Referer: 'https://quote.eastmoney.com/',
  'User-Agent': 'Mozilla/5.0'
};

/**
 * 获取某只股票所在板块的涨跌幅限制
 * 北交所 30%；创业板(30) / 科创板(68) 20%；沪深主板(含风险警示股) 10%
 * 注：涨停价 = 昨收 × (1 + 涨跌幅限制)，四舍五入到分，
 *     该公式与交易所官方涨停价一致（已与腾讯行情官方涨停价字段核对）
 * @param {string} code - 6 位股票代码
 * @returns {number} 涨跌幅限制比例
 */
function getLimitRatio(code) {
  if (/^(4|8|92)/.test(code)) return 0.3;
  if (/^(30|68)/.test(code)) return 0.2;
  return 0.1;
}

/**
 * 判断一行行情数据是否处于涨停状态
 * @param {Object} row - 东财 clist 行情行 { f2现价, f3涨跌幅, f12代码, f14名称, f18昨收 }
 * @returns {boolean}
 */
function isLimitUp(row) {
  const { f2, f3, f12, f18 } = row;
  // 停牌或行情缺失（值为 '-'）不计入
  if (typeof f2 !== 'number' || typeof f18 !== 'number' || typeof f3 !== 'number') {
    return false;
  }
  const ratio = getLimitRatio(String(f12));
  // 涨幅超过板块上限 → 上市初期无涨跌幅限制的股票（如新股），不计入
  if (f3 > ratio * 100 + 1.5) {
    return false;
  }
  const limitPrice = Math.round(f18 * (1 + ratio) * 100) / 100;
  return f2 >= limitPrice;
}

/**
 * 全市场扫描统计涨停家数（含 ST 股，实时口径，盘中/收盘均可调用）
 * 按涨跌幅降序分页拉取行情，涨幅跌破 9.5% 即提前停止翻页
 * @returns {Promise<number>}
 */
async function countAllMarketLimitUp() {
  const seen = new Set();
  const limitUp = new Set();

  for (let page = 1; page <= 100; page++) {
    const params = new URLSearchParams({
      pn: String(page),
      pz: String(PAGE_SIZE),
      po: '1',
      np: '1',
      ut: 'bd1d9ddb04089700cf9c27f6f7426281',
      fltt: '2',
      invt: '2',
      fid: 'f3',
      fs: MARKET_FS,
      fields: 'f2,f3,f12,f14,f18'
    });
    const res = await axios.get(`${CLIST_URL}?${params}`, { headers: HEADERS });
    const data = res.data && res.data.data;
    const rows = data && Array.isArray(data.diff) ? data.diff : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (seen.has(row.f12)) continue;
      seen.add(row.f12);
      if (isLimitUp(row)) limitUp.add(row.f12);
    }

    // 提前停止：本页末尾涨幅已低于主板涨停下限（9.5%），后续页不会再有涨停
    const last = rows[rows.length - 1];
    const lastChg = typeof last.f3 === 'number' ? last.f3 : -1;
    if (lastChg < 9.5) break;
    if (data.total && seen.size >= data.total) break;
  }

  return limitUp.size;
}

/**
 * 通过东财涨停池接口获取历史某日的涨停家数（池口径，不含 ST 股与北交所）
 * @param {string} dateStr - YYYYMMDD
 * @returns {Promise<number>} 非交易日或无数据返回 0
 */
async function fetchZTPoolCount(dateStr) {
  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: '0',
    pagesize: '10000',
    sort: 'fbt:asc',
    date: dateStr
  });
  const res = await axios.get(`${ZT_POOL_URL}?${params}`, {
    headers: {
      Referer: 'https://quote.eastmoney.com/ztb/',
      'User-Agent': 'Mozilla/5.0'
    }
  });
  const data = res.data && res.data.data;
  if (!data) return 0;

  const totalCount = Number(data.tc);
  if (data.tc !== null && data.tc !== undefined && Number.isFinite(totalCount) && totalCount >= 0) {
    return totalCount;
  }
  return Array.isArray(data.pool) ? data.pool.length : 0;
}

/**
 * 获取指定日期的涨停家数
 *
 * 口径说明（与同花顺等行情软件的"涨停家数"对齐）：
 * - 当天日期：全市场行情扫描，收盘价/现价达到交易所官方涨停价即计入，
 *   包含 ST 股（沪深涨停池接口不含 ST 股，直接用它统计会比同花顺少）
 * - 历史日期：东财涨停池接口（池口径，不含 ST 股）
 *
 * @async
 * @param {string|number} date - 日期，格式 YYYYMMDD（例如：'20261125'）
 * @returns {Promise<number>} 返回当日涨停家数；非交易日或无数据时返回 0
 * @throws {TypeError} 当日期格式不是 YYYYMMDD 时抛出错误
 *
 * @example
 * const count = await getUpCount('20261125');
 * // => 58（含 ST 股涨停）
 */
module.exports = async (date) => {
  const dateStr = String(date);
  if (!/^\d{8}$/.test(dateStr)) {
    throw new TypeError('date 应为 YYYYMMDD 格式，如 20261125');
  }

  try {
    if (dateStr === dayjs().format('YYYYMMDD')) {
      console.log(`正在统计全市场涨停家数(${dateStr})...`);
      return await countAllMarketLimitUp();
    }
    console.log(`正在获取涨停家数(${dateStr})...`);
    return await fetchZTPoolCount(dateStr);
  } catch (error) {
    console.error(`获取涨停家数(${dateStr})出错:`, error.message);
    return 0;
  }
};

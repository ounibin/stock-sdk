const axios = require('axios');

/**
 * 获取指定日期的涨停家数量
 * @async
 * @param {string|number} date - 日期，格式 YYYYMMDD（例如：'20261125'）
 * @returns {Promise<number>} 返回当日涨停家数；非交易日或无数据时返回 0
 * @throws {TypeError} 当日期格式不是 YYYYMMDD 时抛出错误
 *
 * @example
 * const count = await getUpCount('20261125');
 * // => 58
 */
module.exports = async (date) => {
  const dateStr = String(date);
  if (!/^\d{8}$/.test(dateStr)) {
    throw new TypeError('date 应为 YYYYMMDD 格式，如 20261125');
  }

  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: '0',
    pagesize: '10000',
    sort: 'fbt:asc',
    date: dateStr
  });
  const url = `https://push2ex.eastmoney.com/getTopicZTPool?${params}`;

  try {
    console.log(`正在获取涨停家数(${dateStr})...`)
    const res = await axios.get(url, {
      headers: {
        Referer: 'https://quote.eastmoney.com/ztb/',
        'User-Agent': 'Mozilla/5.0'
      }
    })
    const data = res.data && res.data.data
    if (!data || !Array.isArray(data.pool)) {
      return 0
    }
    return data.pool.length
  } catch (error) {
    console.error(`获取涨停家数(${dateStr})出错:`, error.message)
    return 0
  }
}

/**
 * 
const item = {
  date: "20250925",
  open: 44.87,
  close: 43.93,
  high: 45.28,
  low: 42.7,
  volume: 2129901,
  amount: 9375430765.59,
  amplitude: 5.81,
  pct: -1.13,
  change: -0.5,
  turnover: 5.78,
  dateFormat: "2025-09-25",
}
 */



/**
 * 获取股票行情数据
 * @async
 * @function getQuotes
 * @param {string} code - 股票代码（自动识别市场）
 * @param {number} [maxDays=100] - 获取的最大天数，默认100天
 * @returns {Promise<Array<Object>>} 返回股票日线数据数组，按时间正序排列
 * @returns {string} return[].date - 日期，格式为YYYYMMDD
 * @returns {string} return[].dateFormat - 日期，格式为YYYY-MM-DD
 * @returns {number} return[].open - 开盘价
 * @returns {number} return[].close - 收盘价
 * @returns {number} return[].high - 最高价
 * @returns {number} return[].low - 最低价
 * @returns {number} return[].volume - 交易量
 * @returns {number} return[].amount - 交易额（万元）
 * @returns {number} return[].amplitude - 振幅（%）
 * @returns {number} return[].pct - 涨跌幅（%）
 * @returns {number} return[].change - 涨跌额
 * @returns {number} return[].turnover - 换手率（%）
 * @example
 * const quotes = await getQuotes('000001', 100);
 * console.log(quotes[0]);
 * // { date: '20250925', close: 43.93, high: 45.28, ... }
 */

async function getQuotes(code, maxDays = 100) {
  const client = new EastmoneyClient();
  const stock = client.stock(code); // 自动识别市场

  const daily = await stock.daily(maxDays);
  const formatData = daily.map(item => {
    return {
      ...item,
      date: dayjs(item.date, 'YYYY-MM-DD').format('YYYYMMDD'),
      dateFormat: item.date
    }
  })
  const res = formatData.reverse()
  return res
}

module.exports = getQuotes
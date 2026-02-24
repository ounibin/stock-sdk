const axios = require('axios')

/**
 * 获取指定交易日期的所有股票行情数据，需要在当天17:00后调用
 * @async
 * @param {string} date - 交易日期，格式为 YYYYMMDD（例如：'20260224'）
 * @returns {Promise<Array<Object>} 返回格式化后的股票行情数据数组，包含code、date、open、high、low、close、trade、volume、amount等字段；如果请求失败或发生错误，返回返回空数组
 * @throws {Error} 当API返回错误信息时抛出错误
 * 
 * @example
 * const quotes = await getAllQuotes('20260224');
 * // 返回结果示例：
 * // [
{
  code: "000001",
  date: "20260224",
  open: 10.93,
  high: 10.95,
  low: 10.88,
  close: 10.91,
  trade: 10.91,
  volume: 602512.4, // 成交（手）
  amount: 60252, // 成交金额（万元）
}
 * // ]
 */
async function getAllQuotes(date) {
  const TUSHARE_API_TOKEN = '636de5eeb64f0c7f44165b5e9f4458fbdb18faab6f7bd8aa565535c1'
  const TUSHARE_API_URL = 'http://api.waditu.com'
  try {
    const res = await axios.post(TUSHARE_API_URL, {
      api_name: 'daily',
      token: TUSHARE_API_TOKEN,
      params: {
        trade_date: date // 交易日期，格式：YYYYMMDD
      },
      fields: 'ts_code,trade_date,open,high,low,close,vol,amount'
    })

    if (res.data && res.data.data) {
      // console.log(`数据获取成功：${date}`)
      const items = res.data.data.items
      const list = items.map(formatData)
      return list // 返回数据
    } else {
      throw new Error(res.data.msg);
    }
  } catch (error) {
    console.error(`获取全市股票行情(${date})出错:`, error)
    return []
  }
}

function formatData(item) {
  const code = item[0].slice(0, 6)
  const date = item[1]
  const open = item[2]
  const high = item[3]
  const low = item[4]
  const close = item[5]
  const volume = item[6]
  const amount = Math.ceil(item[6] / 10)
  return {
    code,
    date,
    open,
    high,
    low,
    close,
    trade: close,
    volume,
    amount
  }
}

module.exports = getAllQuotes
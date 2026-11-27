const axios = require('axios')
const dayjs = require('dayjs')

const BASE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'

/**
 * 判断股票市场
 * 6开头 -> 上海
 * 其他普通A股 -> 深圳
 * 注意：北交所特殊代码可根据实际情况扩展
 */
function getSecId(code) {
  code = String(code).trim()

  if (!/^\d{6}$/.test(code)) {
    throw new Error(`无效股票代码: ${code}`)
  }

  const market = code.startsWith('6') ? '1' : '0'
  return `${market}.${code}`
}

const LINE_MAP = {
  DAY_LINE: 101,
  WEEK_LINE: 102,
  MONTH_LINE: 103,
  MIN_30_LINE: 30
}

/**
 * 默认开始日期：100天前的日期
 */
const DEFAULT_START_DATE = dayjs().subtract(100, 'day').format('YYYYMMDD')

/**
 * 获取股票历史数据
 */
module.exports = async function getHistory(
  code,
  limit = 100,
  { klt = LINE_MAP.DAY_LINE, fqt = 1, startDate = DEFAULT_START_DATE, endDate = dayjs().format('YYYYMMDD') } = {}
) {
  if (!code) {
    throw new Error('股票代码不能为空')
  }

  const secid = getSecId(code)

  const params = {
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt,
    fqt,
    beg: startDate,
    end: endDate,
    lmt: limit
  }

  const response = await axios.get(BASE_URL, {
    params,
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Referer: 'https://quote.eastmoney.com/'
    }
  })

  const data = response.data?.data

  if (!data || !Array.isArray(data.klines)) {
    throw new Error(`获取行情失败: ${response.data?.msg || '无行情数据'}`)
  }

  const klines = data.klines.map((item) => {
    const [date, open, close, high, low, volume, amount, amplitude, changePercent, changeAmount, turnover] = item.split(',')

    return {
      date: dayjs(date).format('YYYYMMDD'),
      open: Number(open),
      close: Number(close),
      trade: Number(close),
      high: Number(high),
      low: Number(low),
      volume: Number(volume),
      amount: Number(amount),
      amountYi: +(Number(amount) / 1000000000).toFixed(2),
      amplitude: Number(amplitude),
      changePercent: Number(changePercent),
      changeAmount: Number(changeAmount),
      turnover: Number(turnover)
    }
  })

  klines.reverse()

  return klines
}

if (require.main === module) {
  module.exports('000001').then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}

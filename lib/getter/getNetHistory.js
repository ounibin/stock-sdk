const axios = require('axios')
const dayjs = require('dayjs')
const getExchangeByCode = require('../utils/getExchangeByCode')

const BASE_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get'

/**
 * 获取东方财富股票资金流向
 * @param {string} code 股票代码，例如 600519、000001
 * @param {number} limit 获取数量
 */
module.exports = async function getFundFlow(code, dateStr, limit = 30) {
  code = String(code).padStart(6, '0')

  // 上海市场：1，深圳市场：0
  const market = code.startsWith('6') ? 1 : 0
  const secid = `${market}.${code}`

  const params = new URLSearchParams({
    secid,
    klt: '101',
    lmt: String(limit),
    fields1: 'f1,f2,f3,f7',
    fields2: 'f51,f52,f53,f54,f55,f56,f57'
  })

  const url = `${BASE_URL}?${params.toString()}`

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://data.eastmoney.com/'
    },
    signal: AbortSignal.timeout(15000)
  })

  const { klines, name } = data.data || {}

  if (!klines) {
    throw new Error(`东方财富返回异常: ${JSON.stringify(json)}`)
  }

  if (!klines.length) {
    return null
  }

  const list = klines.reverse()

  const itemStr = list.find((item) => {
    const parts = item.split(',')
    const dateFormat = dayjs(parts[0]).format('YYYYMMDD') // 日期
    return dateFormat === dateStr
  })

  const row = itemStr.split(',')

  const res = {
    code,
    date: dateStr,
    netInflowWan: Math.round(+row[1] / 10000), // 主力净流入
    name,
    extraLargeNetInflowWan: Math.round(+row[5] / 10000), // 超大单净流入
    largeNetInflowWan: Math.round(+row[4] / 10000), // 大单净流入
    mediumNetInflowWan: Math.round(+row[3] / 10000), // 中单净流入
    smallNetInflowWan: Math.round(+row[2] / 10000) // 小单净流入
  }

  return res
}

if (require.main === module) {
  module.exports('000001', '20261124').then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}

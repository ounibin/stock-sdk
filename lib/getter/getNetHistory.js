const axios = require('axios')
const dayjs = require('dayjs')
const getExchangeByCode = require('../utils/getExchangeByCode')

async function fn1(code, dateStr) {
  try {
    const exchange = getExchangeByCode(code)
    const symbol = `${exchange}${code}`

    // 使用新浪财经的另一个接口，获取更详细的资金流向数据
    const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_qsfx_lscjfb?page=1&num=100&sort=opendate&asc=0&daima=${symbol}`

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const data = response.data
    if (data && data.length > 0) {
      const fundData = data.find((item) => item.opendate === dateStr)
      if (!fundData) {
        throw new Error(`未找到股票(${code})在${dateStr}的资金流向数据`)
      }

      // 计算各资金流向
      const extraLargeNet = Math.round((+fundData.r0_net || 0) / 10000) // 超大单净流入(万元)
      const largeNet = Math.round((+fundData.r1_net || 0) / 10000) // 大单净流入(万元)
      const mediumNet = Math.round((+fundData.r2_net || 0) / 10000) // 中单净流入(万元)
      const smallNet = Math.round((+fundData.r3_net || 0) / 10000) // 小单净流入(万元)

      const netInflow = extraLargeNet + largeNet + mediumNet + smallNet // 主力净流入(万元)

      const result = {
        code: code,
        netInflow: netInflow, // 主力净流入(万元)
        extraLargeNetInflow: extraLargeNet, // 超大单净流入(万元)
        largeNetInflow: largeNet, // 大单净流入(万元)
        mediumNetInflow: mediumNet, // 中单净流入(万元)
        smallNetInflow: smallNet // 小单净流入(万元)
      }
      return result
    }
  } catch (error) {
    console.error('getNetHistory fail:', error.message)
    return null
  }
}

const BASE_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get'

/**
 * 获取东方财富股票资金流向
 * @param {string} code 股票代码，例如 600519、000001
 * @param {number} limit 获取数量
 */
module.exports = async function getFundFlow(code, dateStr, limit = 100) {
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

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://data.eastmoney.com/'
    },
    signal: AbortSignal.timeout(15000)
  })

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`)
  }

  const result = await response.json()

  if (!result.data || !result.data.klines) {
    throw new Error(`获取资金流向失败: ${JSON.stringify(result)}`)
  }

  const name = result.data.name

  const list = result.data.klines.reverse()

  const itemStr = list.find((item) => {
    const parts = item.split(',')
    const dateFormat = dayjs(parts[0]).format('YYYYMMDD') // 日期
    return dateFormat === dateStr
  })

  const itemList = itemStr.split(',')

  const res = {
    code,
    name,
    date: dateStr,
    netInflowWan: Math.round(itemList[1] / 10000), // 主力净流入
    extraLargeNetInflowWan: Math.round(itemList[5] / 10000), // 超大单净流入
    largeNetInflowWan: Math.round(itemList[4] / 10000), // 大单净流入
    mediumNetInflowWan: Math.round(itemList[3] / 10000), // 中单净流入
    smallNetInflowWan: Math.round(itemList[2] / 10000), // 小单净流入
    netInflow: +itemList[1], // 主力净流入
    extraLargeNetInflow: +itemList[5], // 超大单净流入
    largeNetInflow: +itemList[4], // 大单净流入
    mediumNetInflow: +itemList[3], // 中单净流入
    smallNetInflow: +itemList[2] // 小单净流入
  }

  return res
}

if (require.main === module) {
  module.exports('000001', '20261127').then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}

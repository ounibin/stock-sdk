const axios = require('axios')

/**
 * 获取东方财富个股资金流向
 * Node.js >= 18
 */

const BASE_URL = 'https://push2.eastmoney.com/api/qt/stock/fflow/kline/get'

/**
 * 获取证券市场代码
 * 6开头：沪市
 * 其他常见A股代码：深市
 *
 * 注意：北交所等特殊市场需单独处理
 */
function getSecId(code) {
  if (code.startsWith('6')) return `1.${code}`
  return `0.${code}`
}

/**
 * 获取个股资金流向
 * @param {string} code 股票代码，例如 600519
 */
module.exports = async function getStockFundFlow(code) {
  const secid = getSecId(code)

  const params = new URLSearchParams({
    secid,
    klt: '101', // 日级
    lmt: '1', // 获取最近1条
    fields1: 'f1,f2,f3,f7',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58'
  })

  const url = `${BASE_URL}?${params.toString()}`

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Referer: 'https://quote.eastmoney.com/'
    }
  })

  const { klines, name } = data.data || {}

  if (!klines) {
    throw new Error(`东方财富返回异常: ${JSON.stringify(json)}`)
  }

  if (!klines.length) {
    return null
  }

  // 资金流数据为逗号分隔字符串
  const row = klines[0].split(',')

  const result = {
    code,
    netInflowWan: Math.round(+row[1] / 10000), // 主力净流入(万元)
    name,
    extraLargeNetInflowWan: Math.round(+row[5] / 10000), // 超大单净流入(万元)
    largeNetInflowWan: Math.round(+row[4] / 10000), // 大单净流入(万元)
    mediumNetInflowWan: Math.round(+row[3] / 10000), // 中单净流入(万元)
    smallNetInflowWan: Math.round(+row[2] / 10000) // 小单净流入(万元)
  }

  return result
}

if (require.main === module) {
  module.exports('000001').then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}

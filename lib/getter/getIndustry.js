const axios = require('axios')

/**
 * 查询单只股票所属行业（东方财富 f127 字段），失败自动重试一次
 * @param {String} code 股票代码，如 000001
 * @returns {Promise<String>} 行业名称；获取失败返回空字符串
 */
module.exports = async function getIndustry(code) {
  const market = /^[569]/.test(code) ? '1' : '0'
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${market}.${code}&fields=f127&invt=2`
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: {
          Referer: 'https://quote.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      })
      return (res.data && res.data.data && res.data.data.f127) || ''
    } catch (error) {
      console.error(`获取行业(${code})第${attempt}次出错:`, error.message)
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }
  return ''
}

if (require.main === module) {
  module.exports('000001').then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}

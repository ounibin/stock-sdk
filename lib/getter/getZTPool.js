const axios = require('axios')

/**
 * 涨停池中的单只股票。
 * @typedef {Object} ZTPoolItem
 * @property {string} c 股票代码
 * @property {number} m 市场标识（通常 0 为深市、1 为沪市、2 为北交所）
 * @property {string} n 股票名称
 * @property {number} p 最新价，单位为厘（例如 17400 表示 17.40 元）
 * @property {number} zdp 涨跌幅，单位为百分比
 * @property {number} amount 成交额，单位为元
 * @property {number} ltsz 流通市值，单位为元
 * @property {number} tshare 总市值，单位为元
 * @property {number} hs 换手率，单位为百分比
 * @property {number} lbc 连板数
 * @property {number} fbt 首次封板时间，格式为 HHMMSS（如 92500 表示 09:25:00）
 * @property {number} lbt 最后封板时间，格式为 HHMMSS
 * @property {number} fund 封板资金，单位为元
 * @property {number} zbc 炸板次数
 * @property {string} hybk 所属行业板块
 * @property {{days: number, ct: number}} zttj 涨停统计；days 为统计天数，ct 为统计期内涨停次数
 */

/**
 * 获取指定日期的涨停池。
 * @param {String} date 日期，格式 YYYYMMDD
 * @returns {Promise<Array<ZTPoolItem>>} 涨停股列表；获取失败返回空数组
 */
module.exports = async function getZTPool(date) {
  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: '0',
    pagesize: '10000',
    sort: 'fbt:asc',
    date
  })
  const url = `https://push2ex.eastmoney.com/getTopicZTPool?${params}`
  try {
    const res = await axios.get(url, {
      headers: {
        Referer: 'https://quote.eastmoney.com/ztb/',
        'User-Agent': 'Mozilla/5.0'
      }
    })
    return (res.data && res.data.data && res.data.data.pool) || []
  } catch (error) {
    console.error(`获取涨停池(${date})出错:`, error.message)
    return []
  }
}

if (require.main === module) {
   module.exports('20261123').then((res) => {
    console.log(JSON.stringify(res, null, 2));
  })
}
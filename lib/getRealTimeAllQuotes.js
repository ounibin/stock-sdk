const axios = require('axios')
const asyncUtil = require('async')
const dayjs = require('dayjs')

/**
 * 获取获取全部股票的实时行情
 * @returns {Promise<Array>} 数组，某一个item，如下：
const item = {
  symbol: "sz300594",
  code: "300594",
  name: "朗进科技",
  trade: "27.800",
  pricechange: 0.01,
  changePercent: 0.036,
  buy: "27.800",
  sell: "27.830",
  settlement: "27.790",
  open: "28.440",
  high: "28.990",
  low: "27.000",
  volume: 4418700,
  amount: 124280490,
  ticktime: "15:36:00",
  per: -33.494,
  pb: 3.091,
  mktcap: 255408.191,
  nmc: 252974.7875,
  turnoverratio: 4.85581,
}
 */
module.exports = function getRealTimeAllQuotes() {
  return new Promise((resolve, reject) => {
    const urlList = []
    for (let index = 1; index <= 56; index++) {
      // 一次最多只能获取100条数据，设置1000也是获取100
      const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?num=100&sort=changepercent&asc=0&node=hs_a&symbol=&_s_r_a=page&page=${index}`
      urlList.push(url)
    }
    asyncUtil.mapLimit(urlList, 2, async (url) => {
      const res = await axios.get(url)
      console.log(`获取到${res.data.length}条行情数据`)
      return res.data
    }, (err, results) => {
      if (err) reject(err)
      else {
        let res = []
        results.forEach((itemlist) => {
          res = res.concat(itemlist)
        })
        const realRes = res.map((item) => {
          const {
            symbol,
            code,
            name,
            trade,
            pricechange,
            changepercent,
            buy,
            sell,
            settlement,
            open,
            high,
            low,
            volume,
            amount,
            ticktime,
            per,
            pb,
            mktcap,
            nmc,
            turnoverratio
          } = item
          return {
            date: dayjs().format('YYYYMMDD'),
            symbol,
            code,
            name,
            trade: Number(trade),
            close: Number(trade),
            pricechange,
            changePercent: changepercent,
            buy: Number(buy),
            sell: Number(sell),
            settlement: Number(settlement),
            open: Number(open),
            high: Number(high),
            low: Number(low),
            volume,
            amount,
            ticktime,
            per,
            pb,
            mktcap,
            nmc,
            turnoverratio
          }
        })
        console.log(`收集到${realRes.length}条行情数据`)
        resolve(realRes)
      }
    })
  })
}
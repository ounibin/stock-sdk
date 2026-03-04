const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const {
  getQuotes,
  getAllQuotes,
  getNetRealTime,
  getPreviousTradingDay,
  getAllQuotesRealTime
} = require('../lib')


async function main(day1, useLocalData = false) {
  const lastDay = await getPreviousTradingDay(day1)
  try {
    let list = []
    if (useLocalData) {
      console.log('使用本地数据，跳过网络请求')
      list = await require(`./data/${day1}.json`)
    } else {
      console.log('正在获取实时行情数据...')
      list = await getAllQuotesRealTime()
      const filePath = path.join(__dirname, `data/${day1}.json`)
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2))
    }

    console.log('今天开盘日: ', day1, '数据长度为', list.length)
    const lastList = await getAllQuotes(lastDay)
    console.log('上个开盘日: ', lastDay, '数据长度为', lastList.length)

    if (day1.length === 0) {
      console.log(`${day1}数据异常`)
      return
    } else if (lastDay.length === 0) {
      console.log(`${lastDay}数据异常`)
      return
    }

    // 条件选股
    list = list.filter((item) => {
      const isKechuang = /^688|689|787|789/.test(item.code)
      const isXinSanBan = /^82|83|87|88|430|420|400/.test(item.code)
      const isJingA = /^9/.test(item.code)
      const bigPrice = item.trade > 8
      return !isKechuang && !isXinSanBan && !isJingA && bigPrice
    })

    const list1 = []
    list.forEach(async (item) => {
      const item_last = lastList.find((n) => n.code === item.code)
      if (!item_last) {
        return
      }
      // 阴 缩量
      const lessThenLastDay = item.volume * 2 < item_last.volume
      if (item.trade < item.open && lessThenLastDay) {
        list1.push(item)
      }
      // 昨天绿色下影线较长
      // if (item_last && item_last.trade < item_last.open) {
      //   const lastday_upLineH = item_last.high - item_last.open
      //   const lastday_divH = item_last.open - item_last.trade
      //   const lastday_downLineH = item_last.trade - item_last.low
      //   // 长下影线
      //   const lastdayLongShadow = lastday_downLineH / lastday_divH > 2
      //   if (lastdayLongShadow && item.trade > item.open) {
      //     // 今天红色下影线较长，接近红T
      //     const today_lineUpH = item.high - item.trade
      //     const today_divH = item.trade - item.open
      //     const today_lineDownH = item.open - item.low
      //     // 长下影线
      //     const longLineDown = today_lineDownH / today_divH > 2
      //     // 短上影线
      //     const shortLineUp = today_lineDownH / today_lineUpH > 2
      //     if (today_lineUpH < today_divH && longLineDown && shortLineUp) {
      //       resList.push(item)
      //     }
      //   }
      // }
    })

    // 打印

    console.log(`list1.length====`, list1.length)
    list1.forEach((item, index) => {
      console.log(`缩量阴线结果${index + 1}：`, item.code)
    })


    if (list1.length > 3) {


      // 之前有放量阳
      const list2 = [];
      for (const l1 of list1) {
        // 等待当前请求完成，才会进入下一次循环
        const historyList = await getQuotes(l1.code, 20)
        const historyItem = historyList.find((n) => {
          const bigVol = n.volume / l1.volume > 3
          const isUp = n.trade > n.open
          return isUp && bigVol
        })
        if (historyItem) {
          list2.push(l1)
        }
      }


      // 打印
      console.log(`list2.length====`, list2.length)
      list2.forEach((item, index) => {
        console.log(`之前有放量阳结果${index + 1}：`, item.code)
      })


      if (list2.length > 3) {
        // 筛选
        // let resList2 = []
        // for (let index = 0; index < resList.length; index++) {
        //   const element = resList[index];
        //   const code = element.code
        //   const res = await getNetRealTime(code)
        //   // console.log(`股票 ${code} 的实时资金流向:`, res)
        //   if (res) {
        //     if (res.extraLargeNetInflow > 0) {
        //       if (res.largeNetInflow > 0) {
        //         resList2.push(element)
        //       } else if (res.extraLargeNetInflow + res.largeNetInflow > 0) {
        //         resList2.push(element)
        //       }
        //     }
        //   }
        // }

        // resList2.forEach((item, index) => {
        //   console.log(`大单选股结果${index + 1}：`, item.code)
        // })
      }
    }

  } catch (err) {
    console.log('分析出错err=', err)
  }
}


const day1 = dayjs().format('YYYYMMDD')
main(day1, true).catch(console.error)
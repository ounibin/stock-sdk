const dayjs = require('dayjs')
const {
  getAllQuotes,
  getRealTimeNet,
  filterRedCrossStar,
  getPreviousTradingDay,
  getRealTimeAllQuotes
} = require('../lib')


async function main() {
  // const day1 = '20260302'
  const day1 = dayjs().format('YYYYMMDD')
  const lastDay = await getPreviousTradingDay(day1)
  try {
    let list = await getRealTimeAllQuotes(day1)
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
      const bigPrice = item.trade > 10
      return !isKechuang && !isXinSanBan && !isJingA
    })

    const resList = []
    list.forEach((item) => {
      const item_last = lastList.find((n) => n.code === item.code)
      // 昨天绿色下影线较长
      if (item_last.trade < item_last.open) {
        const divH = Math.abs(item_last.trade - item_last.open)
        const lineDownH = Math.abs(item_last.trade - item_last.low)
        const lastdayLongShadow = lineDownH / divH > 1
        if (lastdayLongShadow && item.trade > item.open) {
          // 今天红色下影线较长
          const today_divH = Math.abs(item.trade - item.open)
          const today_lineDownH = Math.abs(item.open - item.low)
          const isTodayLongShadow = today_lineDownH / today_divH > 1
          if (isTodayLongShadow) {
            resList.push(item)
          }
        }



      }
    })

    // 打印
    resList.forEach((item, index) => {
      console.log(`双针探底结果${index + 1}：`, item.code)
    })

    // 第二轮筛选
    // let resList2 = []
    // for (let index = 0; index < resList.length; index++) {
    //   const element = resList[index];
    //   const code = element.code
    //   const res = await getRealTimeNet(code)
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

  } catch (err) {
    console.log('分析出错err=', err)
  }
}


main().catch(console.error)
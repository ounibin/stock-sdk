const dayjs = require('dayjs')
const {
  getAllQuotes,
  getRealTimeNet,
  filterRedCrossStar,
  kdj,
  getPreviousTradingDay
} = require('../lib')


async function main() {
  const day1 = dayjs().format('YYYYMMDD')
  const lastDay = await getPreviousTradingDay(day1)
  try {
    let list = await getAllQuotes(day1)
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
      if (item_last) {
        // console.log('异步打印----item_last: ', item.code, item)
        const changePercent = (((item.close - item_last.open) / item_last.open) * 100).toFixed(2)
        // console.log(`changePercent====`, changePercent)
        const isChuangYe = (/^30/).test(item.code)
        const isZhangTing = isChuangYe ? changePercent >= 19 : changePercent >= 9
        if (item.volume >= item_last.volume * 2.5 && changePercent >= 5 && !isZhangTing) {
          resList.push(item)
        }
      }
    })

    // 打印
    console.log('放量结果总数：', resList.length)
    resList.forEach((item, index) => {
      console.log(`放量结果${index + 1}：`, item.code)
    })

    // 第二轮筛选
    let resList2 = []
    for (let index = 0; index < resList.length; index++) {
      const element = resList[index];
      const code = element.code
      const {
        k,
        d,
        j
      } = await kdj(code, day1)

      if (Math.abs(k - j) <= 5 && Math.abs(d - k) <= 5) {
        resList2.push(element)
      }
    }
    console.log(`kdj选股结果总数：`, resList2.length)
    resList2.forEach((item, index) => {
      console.log(`kdj选股结果${index + 1}：`, item.code)
    })

  } catch (err) {
    console.log('分析出错err=', err)
  }
}


main().catch(console.error)
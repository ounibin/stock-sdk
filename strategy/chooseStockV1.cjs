const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const {
  getAllQuotes,
  getRealTimeNet,
  filterRedCrossStar,
  getPreviousTradingDay,
  getAllQuotesRealTime
} = require('../lib')


async function main(day1, useLocalData = false) {
  if (!day1) {
    console.log('请提供有效的日期参数')
    throw new Error('Invalid date parameter, please provide a valid date string in the format YYYYMMDD.')
  }
  const lastDay = await getPreviousTradingDay(day1)
  console.log(`指定开盘日====`, day1)
  console.log(`上个开盘日====`, lastDay)
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
    const list_hongshizi = filterRedCrossStar(list)
    list = list_hongshizi

    const resList = []
    list.forEach((item) => {
      const item_last = lastList.find((n) => n.code === item.code)
      if (item_last) {
        // console.log('异步打印----item_last: ', item.volume, item_last.volume * 2)
        if (item.close > item.open && item.volume > item_last.volume * 1.5 && item_last.open > item_last.close) {
          resList.push(item)
        }
      }
    })

    // 打印
    resList.forEach((item, index) => {
      console.log(`放量结果${index + 1}：`, item.code)
    })

    // 第二轮筛选
    let resList2 = []
    for (let index = 0; index < resList.length; index++) {
      const element = resList[index];
      const code = element.code
      const res = await getRealTimeNet(code)
      // console.log(`股票 ${code} 的实时资金流向:`, res)
      if (res) {
        if (res.extraLargeNetInflow > 0 && res.largeNetInflow > 0) {
          resList2.push(element)
        }
      }
    }

    resList2.forEach((item, index) => {
      console.log(`大单选股结果${index + 1}：`, item.code, item.name)
    })

  } catch (err) {
    console.log('分析出错err=', err)
  }
}

const today = dayjs().format('YYYYMMDD')
main(today, true).catch(console.error)
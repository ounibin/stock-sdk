const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const {
  getAllQuotes,
  getNetRealTime,
  filterRedCrossStar,
  getPreviousTradingDay,
  getAllQuotesRealTime
} = require('../lib')


async function main(day1, useLocalData = false) {
  const now = dayjs()
  const todayStr = now.format('YYYYMMDD')

  // 如果指定的是今天，则必须在17:00之后才能运行
  if (day1 === todayStr && now.hour() < 17) {
    console.log('今天是交易日，请在下午5点后再运行')
    return
  }



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
      list = await getAllQuotes(day1)
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

    // 红十字
    list = filterRedCrossStar(list)

    const list1 = []
    list.forEach((item) => {
      const item_last = lastList.find((n) => n.code === item.code)
      if (item_last && item.close > item.open && item.volume > item_last.volume * 1.5 && item_last.open > item_last.close) {
        list1.push(item)
      }
    })

    // 打印
    console.log(`list1====`, list1.length)
    list1.forEach((item, index) => {
      console.log(`放量结果${index + 1}：`, item.code)
    })

    if (list1.length > 3) {
      // 第二轮筛选
      let list2 = []
      for (let index = 0; index < list1.length; index++) {
        const element = list1[index];
        const code = element.code
        const res = await getNetRealTime(code)
        // console.log(`股票 ${code} 的实时资金流向:`, res)
        if (res) {
          if (res.extraLargeNetInflow > 0 && res.largeNetInflow > 0) {
            list2.push(element)
          }
        }
      }

      list2.forEach((item, index) => {
        console.log(`大单选股结果${index + 1}：`, item.code, item.name)
      })
    }

  } catch (err) {
    console.log('分析出错err=', err)
  }
}

// const today = dayjs().format('20260311')
const today = dayjs().format('YYYYMMDD')
main(today, false).catch(console.error)
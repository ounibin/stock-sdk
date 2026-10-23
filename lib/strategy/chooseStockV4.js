const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const getAllQuotes = require('../getter/getAllQuotes.js')
const getPreviousTradingDay = require('../getter/getPreviousTradingDay')
const filterRedCrossStar = require('../filter/filterRedCrossStar.js')
const filterCommon = require('../filter/filterCommon.js')
const translateListToString = require('../utils/translateListToString.js')

async function main(day1) {
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
    try {
      list = await require(`./data/${day1}.json`)
      console.log(day1, '存在本地数据，正在使用本地行情数据...')
    } catch (error) {
      console.warn(`获取指定数据(${day1})出错:`, error)
      list = await getAllQuotes(day1)
      // 获取后，保存到本地文件
      const filePath = path.join(__dirname, `data/${day1}.json`)
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2))
    }

    // 获取上个开盘日的行情数据
    let lastList = []
    try {
      lastList = await require(`./data/${lastDay}.json`) || []
    } catch (error) {
      console.warn(`获取上个开盘日数据(${lastDay})出错:`, error)
      console.log(lastDay, '没有本地数据，正在获取历史行情数据...')
      lastList = await getAllQuotes(lastDay)
      // 获取后，保存到本地文件
      const filePath = path.join(__dirname, `data/${lastDay}.json`)
      fs.writeFileSync(filePath, JSON.stringify(lastList, null, 2))
    }

    if (day1.length === 0) {
      console.log(`${day1}数据异常`)
      return
    } else if (lastDay.length === 0) {
      console.log(`${lastDay}数据异常`)
      return
    }

    // 排除 科创、北交所、新三板的股
    list = filterCommon(list)

    const list1 = []
    const LINE_RANGE = 2
    list.forEach((item) => {
      const item_last = lastList.find((n) => n.code === item.code)

      // 长下影线

      const todayIsRed = item.trade > item.open
      const lastdayIsRed = item_last?.trade > item_last?.open

      if (!todayIsRed && !lastdayIsRed) {
        // 今天的长下影线
        const lineDownH1 = Math.abs(item.low - item.trade)
        const lineUpH1 = Math.abs(item.high - item.open)
        const divH1 = Math.abs(item.trade - item.open)
        const todayLongLine = (lineDownH1 / divH1) > LINE_RANGE && (lineDownH1 / lineUpH1) > LINE_RANGE
        // 上一个交易日的长下影线
        const lineDownH2 = Math.abs(item_last?.low - item_last?.trade)
        const lineUpH2 = Math.abs(item_last?.high - item_last?.open)
        const divH2 = Math.abs(item_last?.trade - item_last?.open)
        const lastdayLongLine = (lineDownH2 / divH2) > LINE_RANGE && (lineDownH2 / lineUpH2) > LINE_RANGE


        if (todayLongLine && lastdayLongLine) {
          list1.push(item)
        }
      }
    })



    // 保存结果到本地文件
    console.log('双针探底')
    const filePath = path.join(__dirname, `ResData/双针探底${day1}.ebk`)
    fs.writeFileSync(filePath, translateListToString(list1))

  } catch (err) {
    console.log('分析出错err=', err)
  }
}


module.exports = main

if (require.main === module) {
  const today = dayjs().format('20261012')
  // const today = dayjs().format('YYYYMMDD')
  main(today).catch(console.error)
}
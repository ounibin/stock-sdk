const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const getAllQuotes = require('../getter/getAllQuotes.js')
const getPreviousTradingDay = require('../getter/getPreviousTradingDay.js')
const translateListToString = require('../utils/translateListToString.js')
const filterCommon = require('../filter/filterCommon.js')

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
      lastList = (await require(`./data/${lastDay}.json`)) || []
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

    const resList = []
    list.forEach((item) => {
      // 市值适中，流通盘 50~300 亿，兼顾弹性与稳定
      const condition1 = Number(item.close) < Number(item.open) // 当日收盘价低于开盘价
      if (item.amountYi > 20 && item.amountYi < 300) {
        resList.push(item)
      }
    })
    console.log(resList.length, '只符合条件的股票')
    const filePath = path.join(__dirname, `ResData/活跃${day1}.json`)
    fs.writeFileSync(filePath, JSON.stringify(resList, null, 2))
  } catch (err) {
    console.log('分析出错err=', err)
  }
}

module.exports = main

if (require.main === module) {
  main('20261127').catch(console.error)
}

const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const getAllQuotes = require('../getter/getAllQuotes.cjs')
const formatRes = require('../utils/formatRes.cjs')
const filterRedCrossStar = require('../filter/filterRedCrossStar.cjs')
const filterCommon = require('../filter/filterCommon.cjs')
const getPreviousTradingDay = require('../getter/getPreviousTradingDay')
const getOpenDate = require('../getter/getOpenDate.cjs')


async function main(day1) {
  const now = dayjs()
  const todayStr = now.format('YYYYMMDD')


  if (!day1) {
    console.log('请提供有效的日期参数')
    throw new Error('Invalid date parameter, please provide a valid date string in the format YYYYMMDD.')
  }


  const isOpen = await getOpenDate(day1)
  if (!isOpen) {
    console.warn(day1, `不是开盘日，请提供有效的开盘日参数`)
    return
  } else if (day1 === todayStr && now.hour() < 17) {
    // 如果今天开盘日，则必须在17:00之后才能运行
    console.warn('今天是交易日，请在下午5点后再运行')
    return
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


    // 红十字
    list = filterRedCrossStar(list)

    const list1 = []
    list.forEach((item) => {
      const item_last = lastList.find((n) => n.code === item.code)
      if (item_last && item.volume > item_last.volume * 2 && item_last.open > item_last.close) {
        list1.push(item)
      }
    })

    // 保存结果到本地文件
    console.log('十字反转')
    const filePath = path.join(__dirname, `ResData/${day1}十字反转.json`)
    fs.writeFileSync(filePath, JSON.stringify(formatRes(list1)))

  } catch (err) {
    console.log('分析出错err=', err)
  }
}


module.exports = main

if (require.main === module) {
  const today = dayjs().format('20261019')
  // const today = dayjs().format('YYYYMMDD')
  main(today).catch(console.error)
}
const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const getAllQuotes = require('../getter/getAllQuotes.cjs')
const formatRes = require('../utils/formatRes.cjs')
const filterRedCrossStar = require('../filter/filterRedCrossStar.cjs')
const getPreviousTradingDay = require('../getter/getPreviousTradingDay')
const getOpenDate = require('../getter/getOpenDate.cjs')

module.exports = async function (day1) {
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
    list = list.filter((item) => {
      const isKechuang = /^688|689|787|789/.test(item.code)
      const isXinSanBan = /^82|83|87|88|430|420|400/.test(item.code)
      const isJingA = /^9/.test(item.code)
      const bigPrice = item.trade > 10
      return !isKechuang && !isXinSanBan && !isJingA
    })

    // 红T
    list = filterRedT(list)
    console.log(`红T长度====`, list.length)

    const list1 = []
    list.forEach((item) => {
      const item_last = lastList.find((n) => n.code === item.code)
      let isNeedle = false
      const LINE_RANGE = 2
      if (item_last) {
        const isRed = item_last.trade > item_last.open
        if (isRed) {
          const lineDownH = Math.abs(item_last.open - item_last.low)
          const lineUpH = Math.abs(item_last.high - item_last.trade)
          const divH = Math.abs(item_last.trade - item_last.open)
          if ((lineDownH / divH) > LINE_RANGE && (lineUpH / divH) < LINE_RANGE) isNeedle = true
        } else {
          const lineDownH = Math.abs(item_last.trade - item_last.low)
          const lineUpH = Math.abs(item_last.high - item_last.open)
          const divH = Math.abs(item_last.trade - item_last.open)
          if ((lineDownH / divH) > LINE_RANGE && (lineUpH / divH) < LINE_RANGE) isNeedle = true
        }

        isNeedle && list1.push(item)
      }
    })



    // 保存结果到本地文件
    const filePath = path.join(__dirname, `ResData/${day1}双针探底.json`)
    fs.writeFileSync(filePath, JSON.stringify(formatRes(list1)))

  } catch (err) {
    console.log('分析出错err=', err)
  }
}

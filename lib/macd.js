const getQuotes = require('./getQuotes')

/**
 * 计算指定股票在指定交易日的 MACD
 * @param {string} code 股票代码，6位（例如 '000001'）
 * @param {string} dateStr 交易日期，格式 'YYYYMMDD'
 * @returns {Promise<{macds: number[], diffs: number[], deas: number[]}>}
 */
async function macd(code, dateStr) {
  try {
    // 从目标日开始向前抓取，直到收集到足够的历史数据或无更多交易日
    const ticks = await getQuotes(code)
    const closes = ticks.map(tick => tick.close)

    // 如果没有数据，返回空数组
    if (closes.length === 0) {
      return {
        macds: [],
        diffs: [],
        deas: []
      }
    }

    // 计算 EMA12, EMA26, DIF, DEA, MACD
    const ema12 = []
    const ema26 = []
    const difs = []
    const deas = []
    const macds = []

    const alpha12 = 2 / (12 + 1)
    const alpha26 = 2 / (26 + 1)
    const alphaDEA = 2 / (9 + 1)

    for (let i = 0; i < closes.length; i++) {
      const price = closes[i]
      if (i === 0) {
        ema12[i] = price
        ema26[i] = price
        difs[i] = ema12[i] - ema26[i]
        deas[i] = difs[i]
        macds[i] = 2 * (difs[i] - deas[i])
      } else {
        ema12[i] = alpha12 * price + (1 - alpha12) * ema12[i - 1]
        ema26[i] = alpha26 * price + (1 - alpha26) * ema26[i - 1]
        difs[i] = ema12[i] - ema26[i]
        deas[i] = alphaDEA * difs[i] + (1 - alphaDEA) * deas[i - 1]
        macds[i] = 2 * (difs[i] - deas[i])
      }
    }

    // 返回值四舍五入到小数点后2位
    const round2 = n => Number(n.toFixed(2))
    return {
      macds: macds.map(round2),
      diffs: difs.map(round2),
      deas: deas.map(round2)
    }
  } catch (err) {
    console.error('macd 计算出错:', err)
    return {
      macds: [],
      diffs: [],
      deas: []
    }
  }
}


module.exports = macd
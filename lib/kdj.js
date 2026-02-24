const getQuotes = require('./getQuotes')

async function kdj(code, dateStr) {
  try {
    const ticks = await getQuotes(code, 200)

    if (!ticks || ticks.length === 0) {
      return {
        k: null,
        d: null,
        j: null
      }
    }

    const idx = ticks.findIndex(t => t.date === dateStr)
    if (idx === -1) {
      return {
        k: null,
        d: null,
        j: null
      }
    }

    const period = 9
    const ks = []
    const ds = []
    const js = []

    let prevK = 50
    let prevD = 50

    for (let i = 0; i <= idx; i++) {
      const start = Math.max(0, i - (period - 1))
      let low = ticks[start].low
      let high = ticks[start].high
      for (let t = start + 1; t <= i; t++) {
        if (ticks[t].low < low) low = ticks[t].low
        if (ticks[t].high > high) high = ticks[t].high
      }

      const close = ticks[i].close
      const rsv = high === low ? 0 : ((close - low) / (high - low)) * 100

      const k = (2 / 3) * prevK + (1 / 3) * rsv
      const d = (2 / 3) * prevD + (1 / 3) * k
      const j = 3 * k - 2 * d

      ks.push(k)
      ds.push(d)
      js.push(j)

      prevK = k
      prevD = d
    }

    const last = ks.length - 1
    return {
      k: Number(ks[last].toFixed(4)),
      d: Number(ds[last].toFixed(4)),
      j: Number(js[last].toFixed(4)),
      ks,
      ds,
      js
    }
  } catch (err) {
    console.error('kdj 计算出错:', err)
    return {
      k: null,
      d: null,
      j: null
    }
  }
}

module.exports = kdj
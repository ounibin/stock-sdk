/**
 * kdj Demo
 *
 * Usage:
 *   node examples/kdjDemo.js [code] [date]
 * Example:
 *   node examples/kdjDemo.js 000001 20260224
 */

const kdj = require('../lib/kdj')

async function demo() {
  const code = process.argv[2] || '000001'
  const date = process.argv[3] || '20260224'
  try {
    const res = await kdj(code, date)
    console.log(`KDJ for ${code} on ${date}:`)
    console.log(`K: ${res.k}`)
    console.log(`D: ${res.d}`)
    console.log(`J: ${res.j}`)
  } catch (err) {
    console.error('kdj 调用出错:', err)
  }
}

demo()
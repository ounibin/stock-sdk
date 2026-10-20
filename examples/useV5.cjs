const dayjs = require('dayjs')
const { chooseStockV5 } = require('../lib/index')

// console.log('sdk.version====', sdk.version)


const today = dayjs().format('20261019')
// const today = dayjs().format('YYYYMMDD')
chooseStockV5(today).catch(console.error)

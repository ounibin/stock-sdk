const dayjs = require('dayjs')
const { chooseStockV1 } = require('../lib/index')

// console.log('sdk.version====', sdk.version)


const today = dayjs().format('20261019')
// const today = dayjs().format('YYYYMMDD')
chooseStockV1(today).catch(console.error)

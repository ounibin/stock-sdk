const dayjs = require('dayjs')
const f1 = require('../strategy/chooseStock-十字反转.cjs')



const today = dayjs().format('20261014')
// const today = dayjs().format('YYYYMMDD')
f1(today).catch(console.error)



module.exports = (list) => {
  console.log(`结果长度====`, list.length)
  let res = ''
  list.forEach((item, index) => {
    console.log(`结果${index + 1}：`, item.code)
    res += `${item.code}\n`
  })
  return res
}
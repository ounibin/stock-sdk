

function getPreStr(code) {
  const firstChar = code.charAt(0)
  switch (firstChar) {
    case '6':
      return '1'
    case '0':
    case '3':
      return '0'
    default:
      return '8'
  }
}

module.exports = (list) => {
  console.log(`结果长度====`, list.length)
  let res = ''
  list.forEach((item, index) => {
    console.log(`结果${index + 1}：`, item.code)
    const codeStr = `${getPreStr(item.code)}${item.code}`
    res += `${codeStr}\n`
  })
  return res
}
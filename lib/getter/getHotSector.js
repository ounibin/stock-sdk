const axios = require('axios')
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(customParseFormat)

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low'])
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

/**
 * 校验并标准化日期参数（YYYYMMDD 格式）
 * @param {string|number} date - 日期，格式 YYYYMMDD
 * @returns {{compact: string, iso: string}} compact 为原始 8 位字符串，iso 为 YYYY-MM-DD 格式
 * @throws {TypeError} 当日期格式不是 YYYYMMDD 或日期无效时抛出
 */
function normalizeDate(date) {
  const dateStr = String(date)
  if (!/^\d{8}$/.test(dateStr)) {
    throw new TypeError('date 应为 YYYYMMDD 格式，如 20261126')
  }

  const dateObj = dayjs(dateStr, 'YYYYMMDD', true)
  if (!dateObj.isValid()) {
    throw new TypeError('date 应为有效的 YYYYMMDD 日期，如 20261126')
  }

  return {
    compact: dateStr,
    iso: dateObj.format('YYYY-MM-DD')
  }
}

/**
 * 获取今天的 YYYYMMDD 字符串
 * @returns {string}
 */
function formatToday() {
  return dayjs().format('YYYYMMDD')
}

/**
 * 标准化单个板块对象：过滤无效字段、补全默认值
 * @param {*} sector - AI 返回的原始板块条目
 * @returns {Object|null} 标准化后的板块对象；入参无效时返回 null
 */
function normalizeSector(sector) {
  if (!sector || typeof sector !== 'object') return null

  const confidence = VALID_CONFIDENCE.has(sector.confidence) ? sector.confidence : 'low'

  return {
    name: typeof sector.name === 'string' ? sector.name.trim() : '',
    policyBasis: typeof sector.policyBasis === 'string' ? sector.policyBasis.trim() : '不确定',
    reason: typeof sector.reason === 'string' ? sector.reason.trim() : '',
    sources: Array.isArray(sector.sources) ? sector.sources.filter((source) => typeof source === 'string' && source.trim()).map((source) => source.trim()) : [],
    confidence
  }
}

/**
 * 解析模型返回的 JSON 字符串，兼容 ```json ... ``` code fence 包裹的情况
 * @param {string} content - DeepSeek 返回的 message.content
 * @returns {Object} 解析后的 JS 对象
 * @throws {SyntaxError} 内容不是合法 JSON 时抛出
 */
function parseJsonContent(content) {
  try {
    return JSON.parse(content)
  } catch (error) {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (!jsonMatch) throw error
    return JSON.parse(jsonMatch[1].trim())
  }
}

/**
 * 获取截至指定日期，中国政府重点支持、具有政策风口特征的行业板块
 *
 * 通过 DeepSeek 大模型结合政策上下文（可选）进行整理，输出最多 10 个行业，
 * 按政策支持明确程度排序。每个板块附带政策依据、入选理由、可核实的来源
 * 以及模型给出的置信度（high / medium / low）。
 *
 * @async
 * @param {string|number|Object} [dateOrOptions] - YYYYMMDD 格式的日期字符串（如 '20261126'）；
 *   或选项对象，此时第二个参数被忽略
 * @param {Object} [options] - 可选配置（当 dateOrOptions 为日期时生效）
 * @param {string} [options.context=''] - 传给模型的参考政策材料，帮助 grounded 回答
 * @param {string} [options.apiKey] - DeepSeek API Key，默认读取 DEEPSEEK_API_KEY 环境变量 / .env
 * @returns {Promise<Object>} 结果对象，含 asOf（有效日期）和 sectors 数组
 * @throws {TypeError} 当日期格式不是 YYYYMMDD 时抛出
 * @throws {Error} 当 API Key 缺失、网络请求失败或返回内容无法解析时抛出
 *
 * @example
 * const { sectors } = await getHotSector('20261126');
 * // => { asOf: '2026-11-26', sectors: [{ name: '半导体及元件', confidence: 'high', ... }, ...] }
 *
 * @example
 * const result = await getHotSector({ context: '参考：发改委于...' });
 * // 使用今天的日期 + 提供的参考资料
 */
async function getHotSector(dateOrOptions, options = {}) {
  let date
  let config
  let dateSpecified = false

  if (dateOrOptions && typeof dateOrOptions === 'object') {
    config = dateOrOptions
    dateSpecified = Boolean(config.date)
    date = dateSpecified ? config.date : formatToday()
  } else if (dateOrOptions !== undefined) {
    dateSpecified = true
    date = dateOrOptions
    config = options
  } else {
    date = formatToday()
    config = options
  }

  const { apiKey = DEEPSEEK_API_KEY, context = '' } = config
  const targetDate = normalizeDate(date)

  if (!apiKey) {
    throw new Error('Missing DeepSeek API key: set DEEPSEEK_API_KEY in .env or pass options.apiKey')
  }

  let responseData
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-flash',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是产业政策研究助手。只依据可确认的政府政策信息回答；不要把市场炒作当作政策支持，也不要编造文件、日期或来源。信息不足时明确标注。仅返回合法 JSON。'
          },
          {
            role: 'user',
            content: `截至 ${targetDate.iso}（含该日期），整理中国政府在该日期前已公开、重点支持且具有政策风口特征的行业（使用同花顺APP中的行业板块）。不得使用该日期之后才公开或发布的政策、文件和来源；如果没有实时资料支持，不得声称已核实。\n${context ? `参考资料：\n${context}\n` : ''}返回格式：{"asOf":"${targetDate.iso}","sectors":[{"name":"行业名称","policyBasis":"政策依据或支持方向；不确定则注明","reason":"入选理由","sources":["可核实的政府文件或发布机构；无资料时为空数组"],"confidence":"high|medium|low"}] }。列出最多10项，按政策支持明确程度排序。`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    )
    responseData = response.data
  } catch (error) {
    const detail = error.response ? `DeepSeek API error (${error.response.status}): ${JSON.stringify(error.response.data)}` : error.message
    throw new Error(`Failed to fetch hot sectors from DeepSeek: ${detail}`)
  }

  const content = responseData.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('DeepSeek returned an empty response')
  }

  let data
  try {
    data = parseJsonContent(content)
  } catch (error) {
    throw new Error(`Unable to parse DeepSeek response as JSON: ${error.message}`)
  }

  if (!Array.isArray(data.sectors)) {
    throw new Error('DeepSeek response does not contain a sectors array')
  }

  const res = {
    asOf: dateSpecified ? targetDate.iso : typeof data.asOf === 'string' && data.asOf ? data.asOf : targetDate.iso,
    sectors: data.sectors
      .map(normalizeSector)
      .filter((sector) => sector && sector.name)
      .slice(0, 10)
  }
  return (res.sectors || []).map((sector) => sector.name)
}

module.exports = getHotSector

if (require.main === module) {
  module.exports('20261126').then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}

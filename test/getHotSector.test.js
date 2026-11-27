const getHotSector = require('../lib/getter/getHotSector')

function createJsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload
  }
}

describe('getHotSector', () => {
  test('按统一结构返回热门行业', async () => {
    const fetcher = jest.fn().mockResolvedValue(createJsonResponse({
      choices: [{
        message: {
          content: JSON.stringify({
            asOf: '2026-11-27',
            sectors: [
              {
                name: ' 人工智能 ',
                policyBasis: ' 国家促进人工智能发展 ',
                reason: ' 政策支持明确 ',
                sources: [' 国务院文件 ', '', null],
                confidence: 'high'
              },
              {
                name: '未知行业',
                confidence: 'unknown'
              }
            ]
          })
        }
      }]
    }))

    const result = await getHotSector({
      apiKey: 'test-key',
      context: '测试资料',
      fetcher
    })

    expect(result).toEqual({
      asOf: '2026-11-27',
      sectors: [
        {
          name: '人工智能',
          policyBasis: '国家促进人工智能发展',
          reason: '政策支持明确',
          sources: ['国务院文件'],
          confidence: 'high'
        },
        {
          name: '未知行业',
          policyBasis: '不确定',
          reason: '',
          sources: [],
          confidence: 'low'
        }
      ]
    })
  })

  test('支持指定 YYYYMMDD 日期获取风口行业', async () => {
    const fetcher = jest.fn().mockResolvedValue(createJsonResponse({
      choices: [{
        message: {
          content: JSON.stringify({
            asOf: '2026-11-26',
            sectors: [{ name: '人工智能', confidence: 'high' }]
          })
        }
      }]
    }))

    const result = await getHotSector('20261126', {
      apiKey: 'test-key',
      context: '历史政策资料',
      fetcher
    })

    expect(result.asOf).toBe('2026-11-26')
    expect(result.sectors[0].name).toBe('人工智能')

    const requestBody = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(requestBody.messages[1].content).toContain('截至 2026-11-26')
  })

  test('兼容对象入参并支持 date 字段', async () => {
    const fetcher = jest.fn().mockResolvedValue(createJsonResponse({
      choices: [{
        message: {
          content: JSON.stringify({ sectors: [{ name: '机器人' }] })
        }
      }]
    }))

    const result = await getHotSector({
      date: '20261126',
      apiKey: 'test-key',
      fetcher
    })

    expect(result.asOf).toBe('2026-11-26')
  })

  test('日期格式无效时返回明确错误', async () => {
    await expect(getHotSector('20261340', { apiKey: 'test-key', fetcher: jest.fn() }))
      .rejects.toThrow('有效的 YYYYMMDD')
  })

  test('缺少 API Key 时返回明确错误', async () => {
    await expect(getHotSector({ apiKey: '', fetcher: jest.fn() }))
      .rejects.toThrow('Missing DeepSeek API key')
  })

  test('响应缺少 sectors 数组时返回明确错误', async () => {
    const fetcher = jest.fn().mockResolvedValue(createJsonResponse({
      choices: [{ message: { content: '{"asOf":"2026-11-27"}' } }]
    }))

    await expect(getHotSector({ apiKey: 'test-key', fetcher }))
      .rejects.toThrow('does not contain a sectors array')
  })
})

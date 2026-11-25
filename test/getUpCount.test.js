const axios = require('axios');
const getUpCount = require('../lib/getter/getUpCount');

// Mock axios
jest.mock('axios');

const EXPECTED_URL_BASE = 'https://push2ex.eastmoney.com/getTopicZTPool';
const EXPECTED_QUERY = 'ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=10000&sort=fbt%3Aasc';

// 构造东方财富涨停池接口的模拟响应
function mockZTPoolResponse(pool) {
  return {
    data: {
      rc: 0,
      rt: 6,
      svr: 182106728,
      lt: 1,
      full: 1,
      data: {
        pool,
        tc: pool.length
      }
    }
  };
}

describe('getUpCount 获取涨停家数测试', () => {

  let logSpy;
  let errorSpy;

  beforeEach(() => {
    // 屏蔽 getter 内部的 console 输出，保持测试输出干净
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('正常情况测试', () => {

    test('应该返回涨停池列表的长度', async () => {
      const pool = [
        { c: '000001', n: '平安银行', zdp: 10.01, lbc: 1 },
        { c: '600519', n: '贵州茅台', zdp: 10.0, lbc: 2 },
        { c: '300750', n: '宁德时代', zdp: 20.0, lbc: 1 }
      ];
      axios.get.mockResolvedValue(mockZTPoolResponse(pool));

      const result = await getUpCount('20261125');

      expect(result).toBe(3);
    });

    test('应该支持数字格式的日期入参', async () => {
      axios.get.mockResolvedValue(mockZTPoolResponse([{ c: '000001', n: '平安银行' }]));

      const result = await getUpCount(20261120);

      expect(result).toBe(1);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('应该使用正确的接口地址和参数调用', async () => {
      axios.get.mockResolvedValue(mockZTPoolResponse([]));

      await getUpCount('20261125');

      expect(axios.get).toHaveBeenCalledWith(
        `${EXPECTED_URL_BASE}?${EXPECTED_QUERY}&date=20261125`,
        {
          headers: {
            Referer: 'https://quote.eastmoney.com/ztb/',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );
    });

  });

  describe('边界情况测试', () => {

    test('非交易日（涨停池为空）应该返回 0', async () => {
      axios.get.mockResolvedValue(mockZTPoolResponse([]));

      const result = await getUpCount('20261122');

      expect(result).toBe(0);
    });

    test('响应中 data 为 null 时应该返回 0', async () => {
      axios.get.mockResolvedValue({ data: { data: null } });

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
    });

    test('响应中缺少 pool 字段时应该返回 0', async () => {
      axios.get.mockResolvedValue({ data: { data: { tc: 0 } } });

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
    });

    test('响应格式完全不正确时应该返回 0', async () => {
      axios.get.mockResolvedValue({});

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
    });

  });

  describe('错误处理测试', () => {

    test('网络请求失败时应该返回 0 并记录错误日志', async () => {
      const error = new Error('Network Error');
      axios.get.mockRejectedValue(error);

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith('获取涨停家数(20261125)出错:', 'Network Error');
    });

  });

  describe('日期格式校验测试', () => {

    test.each([
      ['2026-11-25', '带分隔符的日期'],
      ['202611', '位数不足的日期'],
      ['202611251', '位数超出的日期'],
      ['abc', '非数字字符串'],
      ['2026AB01', '包含字母的日期']
    ])('%s（%s）应该抛出 TypeError', async (date) => {
      await expect(getUpCount(date)).rejects.toThrow(TypeError);
      await expect(getUpCount(date)).rejects.toThrow('date 应为 YYYYMMDD 格式，如 20261125');
      expect(axios.get).not.toHaveBeenCalled();
    });

  });

});

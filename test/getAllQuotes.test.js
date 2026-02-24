const axios = require('axios');
const getAllQuotes = require('../lib/getAllQuotes');

// Mock axios
jest.mock('axios');

describe('getAllQuotes 获取所有股票行情测试', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常情况测试', () => {

    test('应该成功获取指定交易日期的所有股票行情数据', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              ['000001.SZ', '20260224', 10.93, 10.95, 10.88, 10.91, 602512.4, 6025200],
              ['000002.SZ', '20260224', 25.50, 25.80, 25.40, 25.75, 450000.0, 4500000],
              ['600000.SH', '20260224', 12.30, 12.50, 12.20, 12.45, 800000.0, 8000000]
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await getAllQuotes('20260224');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        code: '000001',
        date: '20260224',
        open: 10.93,
        high: 10.95,
        low: 10.88,
        close: 10.91,
        trade: 10.91,
        volume: 602512.4,
        amount: 60252
      });
      expect(result[1]).toEqual({
        code: '000002',
        date: '20260224',
        open: 25.50,
        high: 25.80,
        low: 25.40,
        close: 25.75,
        trade: 25.75,
        volume: 450000.0,
        amount: 45000
      });
      expect(result[2]).toEqual({
        code: '600000',
        date: '20260224',
        open: 12.30,
        high: 12.50,
        low: 12.20,
        close: 12.45,
        trade: 12.45,
        volume: 800000.0,
        amount: 80000
      });
    });

    test('应该正确提取股票代码（前6位）', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              ['000001.SZ', '20260224', 10.0, 10.5, 9.9, 10.2, 100000, 1000000],
              ['600519.SH', '20260224', 1500.0, 1520.0, 1490.0, 1510.0, 50000, 500000]
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await getAllQuotes('20260224');

      expect(result[0].code).toBe('000001');
      expect(result[1].code).toBe('600519');
    });

    test('应该正确计算成交金额（amount = volume / 10）', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              ['000001.SZ', '20260224', 10.0, 10.5, 9.9, 10.2, 1000000, 0],
              ['000002.SZ', '20260224', 20.0, 20.5, 19.9, 20.2, 550000, 0]
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await getAllQuotes('20260224');

      expect(result[0].amount).toBe(100000); // ceil(1000000 / 10)
      expect(result[1].amount).toBe(55000); // ceil(550000 / 10)
    });

  });

  describe('边界情况测试', () => {

    test('应该处理空数据列表', async () => {
      const mockResponse = {
        data: {
          data: {
            items: []
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await getAllQuotes('20260224');

      expect(result).toEqual([]);
    });

    test('应该处理只有一条记录的情况', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              ['000001.SZ', '20260224', 10.0, 10.5, 9.9, 10.2, 100000, 1000000]
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await getAllQuotes('20260224');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('000001');
    });

  });

  describe('错误处理测试', () => {

    test('应该在API返回错误时返回null', async () => {
      const mockResponse = {
        data: {
          msg: 'API错误：无效的日期格式'
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await getAllQuotes('20260224');

      expect(result).toBeNull();
    });

    test('应该在网络请求失败时返回null', async () => {
      const error = new Error('Network Error');
      axios.post.mockRejectedValue(error);

      const result = await getAllQuotes('20260224');

      expect(result).toBeNull();
    });

    test('应该在响应数据格式不正确时返回null', async () => {
      axios.post.mockResolvedValue({
        data: null
      });

      const result = await getAllQuotes('20260224');

      expect(result).toBeNull();
    });

  });

  describe('正确的API调用参数测试', () => {

    test('应该使用正确的API参数调用', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              ['000001.SZ', '20260224', 10.0, 10.5, 9.9, 10.2, 100000, 1000000]
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await getAllQuotes('20260224');

      expect(axios.post).toHaveBeenCalledWith(
        'http://api.waditu.com', {
          api_name: 'daily',
          token: '636de5eeb64f0c7f44165b5e9f4458fbdb18faab6f7bd8aa565535c1',
          params: {
            trade_date: '20260224'
          },
          fields: 'ts_code,trade_date,open,high,low,close,vol,amount'
        }
      );
    });

  });

});
const axios = require('axios');
const getRealTimeNet = require('../lib/getRealTimeNet');

// Mock axios
jest.mock('axios');

describe('getRealTimeNet 实时资金流向测试', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常情况测试', () => {

    test('应该成功获取上海交易所股票（600开头）的资金流向', async () => {
      const mockData = {
        data: {
          name: '贵州茅台',
          klines: [
            '2024-02-23,1000000,200000,300000,400000,500000,600000,700000,800000,900000,1000000,1100000,1200000'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600519');

      expect(result).toEqual({
        code: '600519',
        name: '贵州茅台',
        netInflow: 100,
        extraLargeNetInflow: 50,
        largeNetInflow: 40,
        mediumNetInflow: 30,
        smallNetInflow: 20
      });
    });

    test('应该成功获取深圳交易所股票（非600开头）的资金流向', async () => {
      const mockData = {
        data: {
          name: '腾讯控股',
          klines: [
            '2024-02-23,2000000,400000,600000,800000,1000000,1200000'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('000858');

      expect(result).toEqual({
        code: '000858',
        name: '腾讯控股',
        netInflow: 200,
        extraLargeNetInflow: 100,
        largeNetInflow: 80,
        mediumNetInflow: 60,
        smallNetInflow: 40
      });
    });

    test('应该正确识别深圳中小板股票（002开头）', async () => {
      const mockData = {
        data: {
          name: '测试股票',
          klines: [
            '2024-02-23,500000,100000,150000,200000,250000'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('002345');

      expect(result.code).toBe('002345');
      expect(result).toHaveProperty('netInflow');
      expect(result).toHaveProperty('extraLargeNetInflow');
      expect(result).toHaveProperty('largeNetInflow');
      expect(result).toHaveProperty('mediumNetInflow');
      expect(result).toHaveProperty('smallNetInflow');
    });

    test('应该正确识别深圳创业板股票（300开头）', async () => {
      const mockData = {
        data: {
          name: '创业板股票',
          klines: [
            '2024-02-23,800000,200000,250000,300000,350000'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('300001');

      expect(result.code).toBe('300001');
      expect(result).toHaveProperty('netInflow');
    });

  });

  describe('API调用测试', () => {

    test('应该使用正确的URL格式调用API（上海交易所）', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: ['2024-02-23,1000000,200000,300000,400000,500000']
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      await getRealTimeNet('600000');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('secid=sh.600000'),
        expect.any(Object)
      );
    });

    test('应该使用正确的URL格式调用API（深圳交易所）', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: ['2024-02-23,1000000,200000,300000,400000,500000']
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      await getRealTimeNet('000001');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('secid=sz.000001'),
        expect.any(Object)
      );
    });

    test('应该在请求头中包含User-Agent', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: ['2024-02-23,1000000,200000,300000,400000,500000']
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      await getRealTimeNet('600000');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      );
    });

  });

  describe('错误处理测试', () => {

    test('当API请求失败时应该返回null', async () => {
      axios.get.mockRejectedValue(new Error('网络错误'));

      const result = await getRealTimeNet('600519');

      expect(result).toBeNull();
    });

    test('当API返回的数据不包含klines时应该抛出错误', async () => {
      const mockData = {
        data: {
          name: '测试',
          // 没有klines
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600519');

      expect(result).toBeNull();
    });

    test('当API返回的数据为空时应该返回null', async () => {
      axios.get.mockResolvedValue({
        data: {}
      });

      const result = await getRealTimeNet('600519');

      expect(result).toBeNull();
    });

    test('当API响应中data为null时应该返回null', async () => {
      const mockData = {
        data: null
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600519');

      expect(result).toBeNull();
    });

  });

  describe('数据计算测试', () => {

    test('应该正确将資金流向数据从元转换为万元并四舍五入', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: [
            '2024-02-23,12345678,2000000,3000000,4000000,5000000'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600000');

      // 1234567800 / 10000 = 123456.78 ≈ 123457（四舍五入）
      expect(result.netInflow).toBe(1235);
      expect(typeof result.netInflow).toBe('number');
    });

    test('应该处理负数资金流向', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: [
            '2024-02-23,-1000000,-200000,-300000,-400000,-500000'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600000');

      expect(result.netInflow).toBe(-100);
      expect(result.smallNetInflow).toBe(-20);
    });

    test('应该处理零值数据', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: [
            '2024-02-23,0,0,0,0,0'
          ]
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600000');

      expect(result.netInflow).toBe(0);
      expect(result.extraLargeNetInflow).toBe(0);
      expect(result.largeNetInflow).toBe(0);
      expect(result.mediumNetInflow).toBe(0);
      expect(result.smallNetInflow).toBe(0);
    });

  });

  describe('返回数据结构测试', () => {

    test('返回的结果应该包含所有必需的字段', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: ['2024-02-23,1000000,200000,300000,400000,500000']
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600000');

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('netInflow');
      expect(result).toHaveProperty('extraLargeNetInflow');
      expect(result).toHaveProperty('largeNetInflow');
      expect(result).toHaveProperty('mediumNetInflow');
      expect(result).toHaveProperty('smallNetInflow');
    });

    test('所有资金流向字段应该是数字类型', async () => {
      const mockData = {
        data: {
          name: '测试',
          klines: ['2024-02-23,1000000,200000,300000,400000,500000']
        }
      };

      axios.get.mockResolvedValue({
        data: mockData
      });

      const result = await getRealTimeNet('600000');

      expect(typeof result.netInflow).toBe('number');
      expect(typeof result.extraLargeNetInflow).toBe('number');
      expect(typeof result.largeNetInflow).toBe('number');
      expect(typeof result.mediumNetInflow).toBe('number');
      expect(typeof result.smallNetInflow).toBe('number');
    });

  });

});
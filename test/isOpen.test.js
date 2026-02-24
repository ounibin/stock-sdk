const axios = require('axios');
const isOpen = require('../lib/isOpen');

// Mock axios
jest.mock('axios');

describe('isOpen 开盘日期检查测试', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常情况测试', () => {

    test('应该返回 true 当日期是开盘日（返回值为0表示开盘）', async () => {
      axios.get.mockResolvedValue({
        data: '0'
      });

      const result = await isOpen('20240223');

      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('http://tool.bitefu.net/jiari/?d=2024-02-23');
    });

    test('应该返回 false 当日期是休息日（返回值非0表示休息）', async () => {
      axios.get.mockResolvedValue({
        data: '1'
      });

      const result = await isOpen('20240224');

      expect(result).toBe(false);
      expect(axios.get).toHaveBeenCalledWith('http://tool.bitefu.net/jiari/?d=2024-02-24');
    });

    test('应该正确处理数字返回值', async () => {
      axios.get.mockResolvedValue({
        data: 0
      });

      const result = await isOpen('20240223');

      expect(result).toBe(true);
    });

  });

  describe('日期格式处理测试', () => {

    test('应该正确解析 YYYYMMDD 格式的日期', async () => {
      axios.get.mockResolvedValue({
        data: '0'
      });

      await isOpen('20240101');

      expect(axios.get).toHaveBeenCalledWith('http://tool.bitefu.net/jiari/?d=2024-01-01');
    });

    test('应该正确格式化日期为 YYYY-MM-DD', async () => {
      axios.get.mockResolvedValue({
        data: '0'
      });

      await isOpen('20231231');

      expect(axios.get).toHaveBeenCalledWith('http://tool.bitefu.net/jiari/?d=2023-12-31');
    });

  });

  describe('错误处理测试', () => {

    test('当 API 调用失败时应该抛出错误', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(isOpen('20240223')).rejects.toThrow('Network error');
    });

    test('应该处理无效的日期格式（使用 dayjs 默认行为）', async () => {
      axios.get.mockResolvedValue({
        data: '0'
      });

      // 这会被 dayjs 解析，虽然可能不是有效的日期
      await isOpen('invalid');

      // dayjs 会将其当作 Invalid Date，调用 format 后结果为 'Invalid Date'
      expect(axios.get).toHaveBeenCalled();
    });

    test("当返回值为空字符串时应该返回 true（因为 Number('') === 0）", async () => {
      axios.get.mockResolvedValue({
        data: ''
      });

      const result = await isOpen('20240223');

      expect(result).toBe(true); // Number('') === 0 为 true
    });

  });

  describe('实际场景测试', () => {

    test('检查多个日期', async () => {
      axios.get.mockResolvedValue({ data: '0' });

      const dates = ['20240219', '20240223', '20240228'];
      
      for (const date of dates) {
        const result = await isOpen(date);
        expect(result).toBe(true);
      }

      expect(axios.get).toHaveBeenCalledTimes(3);
    });

  });

});

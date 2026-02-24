const {
  getExchangeByCode,
  batchGetExchange,
  getExchangePrefixes,
  isValidStockCode
} = require('../lib/utils/getExchangeByCode');

describe('股票交易所判断功能测试', () => {

  describe('单个股票代码判断', () => {

    test('上海主板股票', () => {
      const result = getExchangeByCode('600000');
      expect(result.exchange).toBe('SH');
      expect(result.exchangeName).toBe('上海证券交易所');
      expect(result.market).toBe('MAIN');
      expect(result.marketName).toBe('主板');
      expect(result.isValid).toBe(true);
    });

    test('上海科创板股票', () => {
      const result = getExchangeByCode('688001');
      expect(result.exchange).toBe('SH');
      expect(result.exchangeName).toBe('上海证券交易所');
      expect(result.market).toBe('STAR');
      expect(result.marketName).toBe('科创板');
      expect(result.isValid).toBe(true);
    });

    test('深圳主板股票', () => {
      const result = getExchangeByCode('000001');
      expect(result.exchange).toBe('SZ');
      expect(result.exchangeName).toBe('深圳证券交易所');
      expect(result.market).toBe('MAIN');
      expect(result.marketName).toBe('主板');
      expect(result.isValid).toBe(true);
    });

    test('深圳中小板股票', () => {
      const result = getExchangeByCode('002001');
      expect(result.exchange).toBe('SZ');
      expect(result.exchangeName).toBe('深圳证券交易所');
      expect(result.market).toBe('SME');
      expect(result.marketName).toBe('中小板');
      expect(result.isValid).toBe(true);
    });

    test('深圳创业板股票', () => {
      const result = getExchangeByCode('300001');
      expect(result.exchange).toBe('SZ');
      expect(result.exchangeName).toBe('深圳证券交易所');
      expect(result.market).toBe('GEM');
      expect(result.marketName).toBe('创业板');
      expect(result.isValid).toBe(true);
    });

    test('北京交易所股票', () => {
      const result = getExchangeByCode('831234');
      expect(result.exchange).toBe('BJ');
      expect(result.exchangeName).toBe('北京证券交易所');
      expect(result.market).toBe('BSE');
      expect(result.marketName).toBe('北交所');
      expect(result.isValid).toBe(true);
    });

    test('无效股票代码应该抛出错误', () => {
      expect(() => getExchangeByCode('123456')).toThrow('无效的股票代码格式');
      expect(() => getExchangeByCode('abc123')).toThrow('无效的股票代码格式');
      expect(() => getExchangeByCode('60000')).toThrow('无效的股票代码格式');
    });
  });

  describe('批量股票代码判断', () => {

    test('批量查询正常情况', () => {
      const codes = ['600000', '000001', '300001'];
      const results = batchGetExchange(codes);

      expect(results).toHaveLength(3);
      expect(results[0].exchange).toBe('SH');
      expect(results[1].exchange).toBe('SZ');
      expect(results[2].exchange).toBe('SZ');
    });

    test('批量查询包含无效代码', () => {
      const codes = ['600000', 'invalid', '000001'];
      const results = batchGetExchange(codes);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });

    test('非数组参数应该抛出错误', () => {
      expect(() => batchGetExchange('not-an-array')).toThrow('参数必须是数组');
    });
  });

  describe('交易所前缀获取', () => {

    test('获取上海交易所前缀', () => {
      const prefixes = getExchangePrefixes('SH');
      expect(prefixes).toContain('600');
      expect(prefixes).toContain('688');
    });

    test('获取深圳交易所前缀', () => {
      const prefixes = getExchangePrefixes('SZ');
      expect(prefixes).toContain('000');
      expect(prefixes).toContain('300');
    });

    test('获取北京交易所前缀', () => {
      const prefixes = getExchangePrefixes('BJ');
      expect(prefixes).toContain('830');
      expect(prefixes).toContain('430');
    });

    test('无效交易所返回空数组', () => {
      const prefixes = getExchangePrefixes('INVALID');
      expect(prefixes).toEqual([]);
    });
  });

  describe('股票代码有效性验证', () => {

    test('有效的股票代码', () => {
      expect(isValidStockCode('600000')).toBe(true);
      expect(isValidStockCode('000001')).toBe(true);
      expect(isValidStockCode('300001')).toBe(true);
      expect(isValidStockCode('688001')).toBe(true);
      expect(isValidStockCode('831234')).toBe(true);
    });

    test('无效的股票代码', () => {
      expect(isValidStockCode('123456')).toBe(false); // 不是有效的前缀
      expect(isValidStockCode('abc123')).toBe(false); // 包含字母
      expect(isValidStockCode('60000')).toBe(false); // 长度不足6位
      expect(isValidStockCode('6000000')).toBe(false); // 长度超过6位
      expect(isValidStockCode('')).toBe(false); // 空字符串
    });
  });
});
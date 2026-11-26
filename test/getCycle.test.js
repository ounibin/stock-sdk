const axios = require('axios');
const dayjs = require('dayjs');
const getCycle = require('../lib/getter/getCycle');

// Mock axios
jest.mock('axios');

// 构造东方财富池子接口的空响应
function emptyResponse() {
  return { data: { data: { tc: 0, pool: [] } } };
}

/**
 * 构造按 URL 路由的 axios.get 模拟实现
 * URL 中同时包含池子名（getTopicZTPool 等）和 date=YYYYMMDD
 * @param {Object} scenarioByDate - 每个日期的指标配置 { zt, lbc, zb, dt, yzt, zdp }
 *   zt: 涨停家数   lbc: 最高连板数   zb: 炸板家数
 *   dt: 跌停家数   yzt: 昨日涨停家数 zdp: 昨日涨停股今日平均涨跌幅(即溢价率)
 */
function buildRouter(scenarioByDate) {
  return (url) => {
    const pool = url.includes('getTopicZTPool') ? 'ZT'
      : url.includes('getTopicZBPool') ? 'ZB'
        : url.includes('getTopicDTPool') ? 'DT'
          : url.includes('getYesterdayZTPool') ? 'YZT'
            : null;
    const date = (url.match(/date=(\d{8})/) || [])[1];
    const conf = scenarioByDate[date];

    if (!conf) return Promise.resolve(emptyResponse());

    if (pool === 'ZT') {
      return Promise.resolve({
        data: {
          data: {
            tc: conf.zt,
            pool: Array.from({ length: conf.zt }, (_, i) => ({
              c: `0000${i}`, n: `股票${i}`, lbc: i === 0 ? conf.lbc : 1
            }))
          }
        }
      });
    }
    if (pool === 'ZB') return Promise.resolve({ data: { data: { tc: conf.zb, pool: [] } } });
    if (pool === 'DT') return Promise.resolve({ data: { data: { tc: conf.dt, pool: [] } } });

    // YZT：昨日涨停池，每只股票当日涨跌幅均为 zdp
    return Promise.resolve({
      data: {
        data: {
          tc: conf.yzt,
          pool: Array.from({ length: conf.yzt }, (_, i) => ({ c: `3000${i}`, zdp: conf.zdp }))
        }
      }
    });
  };
}

describe('getCycle 情绪周期判定测试', () => {

  let logSpy;
  let errorSpy;

  beforeEach(() => {
    // 屏蔽 getter 内部的 console 输出，保持测试输出干净
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('六种周期判定测试', () => {

    test('涨停 75 家、高度 7 板、溢价 3.2% 应判定为高潮期', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 75, lbc: 7, zb: 10, dt: 0, yzt: 60, zdp: 3.2 },
        20261124: { zt: 55, lbc: 6, zb: 8, dt: 1, yzt: 40, zdp: 2.0 }
      }));

      const result = await getCycle('20261125');

      expect(result.cycle).toBe('高潮期');
      expect(result.cycleIndex).toBe(4);
      expect(result.metrics.ztCount).toBe(75);
      expect(result.metrics.maxLbc).toBe(7);
      expect(result.metrics.premium).toBe(3.2);
      expect(result.prevMetrics.ztCount).toBe(55);
      expect(result.suggestion).toContain('持股');
    });

    test('涨停 8 家、高度 2 板、溢价 -4.5% 应判定为冰点期', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 8, lbc: 2, zb: 15, dt: 22, yzt: 10, zdp: -4.5 },
        20261124: { zt: 45, lbc: 4, zb: 20, dt: 10, yzt: 40, zdp: -1.0 }
      }));

      const result = await getCycle('20261125');

      expect(result.cycle).toBe('冰点期');
      expect(result.cycleIndex).toBe(1);
      expect(result.metrics.dtCount).toBe(22);
      expect(result.reason).toContain('冰点');
    });

    test('溢价 -2.6% 且炸板率 43.75% 应判定为退潮期', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 45, lbc: 5, zb: 35, dt: 18, yzt: 40, zdp: -2.6 },
        20261124: { zt: 60, lbc: 8, zb: 15, dt: 5, yzt: 50, zdp: 1.0 }
      }));

      const result = await getCycle('20261125');

      expect(result.cycle).toBe('退潮期');
      expect(result.cycleIndex).toBe(6);
      // 炸板率 = 35 / (45 + 35) = 43.75%
      expect(result.metrics.brokenRate).toBe(43.75);
    });

    test('涨停 55 家但炸板率升高、溢价收敛应判定为分歧期', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 55, lbc: 6, zb: 20, dt: 3, yzt: 50, zdp: 0.8 },
        20261124: { zt: 60, lbc: 7, zb: 10, dt: 2, yzt: 55, zdp: 3.5 }
      }));

      const result = await getCycle('20261125');

      expect(result.cycle).toBe('分歧期');
      expect(result.cycleIndex).toBe(5);
      expect(result.metrics.premium).toBe(0.8);
      expect(result.prevMetrics.premium).toBe(3.5);
    });

    test('涨停 48 家、高度 5 板、溢价 1.8% 应判定为发酵期', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 48, lbc: 5, zb: 8, dt: 2, yzt: 45, zdp: 1.8 },
        20261124: { zt: 30, lbc: 4, zb: 6, dt: 2, yzt: 25, zdp: 1.0 }
      }));

      const result = await getCycle('20261125');

      expect(result.cycle).toBe('发酵期');
      expect(result.cycleIndex).toBe(3);
    });

    test('涨停回升至 25 家、溢价转正、出现 3 板应判定为启动期', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 25, lbc: 3, zb: 4, dt: 1, yzt: 18, zdp: 0.6 },
        20261124: { zt: 10, lbc: 2, zb: 8, dt: 12, yzt: 12, zdp: -3.0 }
      }));

      const result = await getCycle('20261125');

      expect(result.cycle).toBe('启动期');
      expect(result.cycleIndex).toBe(2);
    });

  });

  describe('日期入参测试', () => {

    test('不传日期时应该默认使用今天', async () => {
      axios.get.mockImplementation(buildRouter({
        [dayjs().format('YYYYMMDD')]: { zt: 75, lbc: 7, zb: 10, dt: 0, yzt: 60, zdp: 3.2 }
      }));

      const result = await getCycle();

      expect(result.inputDate).toBe(dayjs().format('YYYYMMDD'));
      expect(result.date).toBe(dayjs().format('YYYYMMDD'));
      expect(result.dateAdjusted).toBe(false);
    });

    test('应该支持数字格式的日期入参', async () => {
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 48, lbc: 5, zb: 8, dt: 2, yzt: 45, zdp: 1.8 },
        20261124: { zt: 30, lbc: 4, zb: 6, dt: 2, yzt: 25, zdp: 1.0 }
      }));

      const result = await getCycle(20261125);

      expect(result.inputDate).toBe('20261125');
      expect(result.cycle).toBe('发酵期');
    });

    test('入参为非交易日时应该自动回退到最近有数据的交易日', async () => {
      // 20261122 为周日：22、21 无数据，20261120（周五）有数据；
      // 再往前（20 的上一交易日）也无数据，prevMetrics 应为 null
      axios.get.mockImplementation(buildRouter({
        20261120: { zt: 75, lbc: 7, zb: 10, dt: 0, yzt: 60, zdp: 3.2 }
      }));

      const result = await getCycle('20261122');

      expect(result.inputDate).toBe('20261122');
      expect(result.date).toBe('20261120');
      expect(result.dateAdjusted).toBe(true);
      expect(result.prevDate).toBeNull();
      expect(result.prevMetrics).toBeNull();
      expect(result.cycle).toBe('高潮期');
    });

  });

  describe('异常情况测试', () => {

    test('连续多日无数据时应该抛出错误', async () => {
      axios.get.mockResolvedValue(emptyResponse());

      await expect(getCycle('20261125')).rejects.toThrow('未获取到涨停数据');
    });

    test('网络请求失败时应该抛出错误', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'));

      await expect(getCycle('20261125')).rejects.toThrow('未获取到涨停数据');
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
      await expect(getCycle(date)).rejects.toThrow(TypeError);
      await expect(getCycle(date)).rejects.toThrow('date 应为 YYYYMMDD 格式，如 20261125');
      expect(axios.get).not.toHaveBeenCalled();
    });

  });

  describe('阈值自定义测试', () => {

    test('应该支持通过 options.thresholds 覆盖默认阈值', async () => {
      // 默认阈值下 zt=48、溢价 1.8% 为发酵期；
      // 将 ztWarm 提高到 60、premiumWarm 提高到 3 后不再满足发酵期，
      // 落入兜底逻辑（家数 >= 新阈值前归为启动期口径？不，48 < 60 → 启动期）
      axios.get.mockImplementation(buildRouter({
        20261125: { zt: 48, lbc: 5, zb: 8, dt: 2, yzt: 45, zdp: 1.8 },
        20261124: { zt: 30, lbc: 4, zb: 6, dt: 2, yzt: 25, zdp: 1.0 }
      }));

      const result = await getCycle('20261125', {
        thresholds: { ztWarm: 60, premiumWarm: 3 }
      });

      expect(result.cycle).not.toBe('发酵期');
    });

  });

});

const axios = require('axios');
const dayjs = require('dayjs');
const getMainLine = require('../lib/getter/getMainLine');

// Mock axios
jest.mock('axios');

// 冻结到当天（2026-11-26 收盘后），使默认日期走当天的数据
const TODAY = new Date('2026-11-26T15:30:00');

// 构造涨停池中的一只股票
function stk(code, name, hybk, lbc = 1, fund = 1e7) {
  return { c: code, n: name, hybk, lbc, fund };
}

// 构造某板块 count 只首板涨停股
function firstBoards(boardName, count, startIdx = 0) {
  return Array.from({ length: count }, (_, i) =>
    stk(`${6000 + startIdx + i}`, `${boardName}股${i}`, boardName, 1, 1e7));
}

// 构造按日期路由的 axios.get 模拟实现（本模块只请求涨停池接口）
function buildRouter(scenarioByDate) {
  return (url) => {
    if (!url.includes('getTopicZTPool')) {
      return Promise.reject(new Error(`意外请求: ${url}`));
    }
    const date = (url.match(/date=(\d{8})/) || [])[1];
    const pool = scenarioByDate[date] || [];
    return Promise.resolve({ data: { data: { tc: pool.length, pool } } });
  };
}

describe('getMainLine 主线板块判定测试', () => {

  let logSpy;
  let errorSpy;

  beforeEach(() => {
    // 屏蔽 getter 内部的 console 输出，保持测试输出干净
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('主线判定测试', () => {

    test('涨停家数多、高度高且有持续性的板块应该判定为主线', async () => {
      axios.get.mockImplementation(buildRouter({
        // 机器人：4 家涨停（最高 6 板、2 只连板），昨日该板块亦有 2 家涨停
        20261126: [
          stk('300001', '机器人A', '机器人', 6, 5e8),
          stk('300002', '机器人B', '机器人', 3, 1e8),
          stk('600001', '机器人C', '机器人', 1, 5e7),
          stk('600002', '机器人D', '机器人', 1, 3e7),
          // 食品：3 家全是首板
          ...firstBoards('食品', 3, 10)
        ],
        20261125: [
          stk('300001', '机器人A', '机器人', 5, 4e8),
          stk('600003', '机器人E', '机器人', 1, 1e7)
        ]
      }));

      const result = await getMainLine('20261126');

      expect(result.mainLine.name).toBe('机器人');
      // 评分 = 4×3 + 6×6 + 2×4 + min(2,15)×2 = 12 + 36 + 8 + 4 = 60
      expect(result.mainLine.score).toBe(60);
      expect(result.mainLine.ztCount).toBe(4);
      expect(result.mainLine.maxLbc).toBe(6);
      expect(result.mainLine.lbCount).toBe(2);
      expect(result.mainLine.totalFund).toBe(5e8 + 1e8 + 5e7 + 3e7);
      expect(result.mainLine.prevZtCount).toBe(2);
      expect(result.mainLine.prevMaxLbc).toBe(5);
      expect(result.mainLine.isContinued).toBe(true);
      expect(result.mainLine.reason).toContain('昨日亦有 2 家涨停');
      expect(result.mainLine.reason).toContain('龙头 机器人A 6 板');
    });

    test('首板数量多的杂毛板块不应该压过有高度的主线板块', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [
          ...firstBoards('食品', 10),
          stk('300001', '高标A', '机器人', 5, 1e8),
          stk('600001', '机器人B', '机器人', 1),
          stk('600002', '机器人C', '机器人', 1)
        ]
      }));

      const result = await getMainLine('20261126');

      // 机器人：3×3 + 5×6 + 1×4 = 43 > 食品：10×3 + 1×6 = 36
      expect(result.mainLine.name).toBe('机器人');
      expect(result.subLines[0].name).toBe('食品');
    });

    test('成分股应该按连板高度降序排列且最多展示 5 只', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [
          stk('600001', '股1', '机器人', 1, 9e7),
          stk('600002', '股2', '机器人', 2, 8e7),
          stk('600003', '股3', '机器人', 4, 7e7),
          stk('600004', '股4', '机器人', 1, 6e7),
          stk('600005', '股5', '机器人', 3, 5e7),
          stk('600006', '股6', '机器人', 1, 4e7),
          stk('600007', '股7', '机器人', 2, 3e7),
          ...firstBoards('食品', 1, 20)
        ]
      }));

      const result = await getMainLine('20261126');

      expect(result.mainLine.stocks.length).toBe(5);
      // 连板高度降序：4、3、2、2、1（同高度按封板资金降序）
      expect(result.mainLine.stocks.map(s => s.lbc)).toEqual([4, 3, 2, 2, 1]);
      expect(result.mainLine.stocks[0].name).toBe('股3');
    });

    test('缺少 hybk 字段的股票应该归入"其他"板块', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [
          stk('600001', '有板块股', '食品', 1, 2e7),
          { c: '600002', n: '无板块股', lbc: 1, fund: 1e7 }
        ]
      }));

      const result = await getMainLine('20261126');

      const names = result.boards.map(b => b.name);
      expect(names).toContain('其他');
      expect(result.boards.length).toBe(2);
    });

  });

  describe('昨日数据对比测试', () => {

    test('昨日无涨停的板块应该标记为新启动方向', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [stk('600001', '新题材A', '低空经济', 2, 1e8)],
        20261125: [stk('600002', '旧题材B', '食品', 1, 1e7)]
      }));

      const result = await getMainLine('20261126');

      expect(result.mainLine.name).toBe('低空经济');
      expect(result.mainLine.prevZtCount).toBe(0);
      expect(result.mainLine.isContinued).toBe(false);
      expect(result.mainLine.reason).toContain('昨日无涨停，为今日新启动方向');
    });

    test('昨日仅 1 家涨停的板块不应该视为持续聚焦', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [stk('600001', '新A', '低空经济', 2, 1e8)],
        20261125: [
          stk('600003', '旧B', '低空经济', 1, 1e7),
          stk('600004', '旧C', '食品', 1, 1e7)
        ]
      }));

      const result = await getMainLine('20261126');

      expect(result.mainLine.prevZtCount).toBe(1);
      expect(result.mainLine.isContinued).toBe(false);
      expect(result.mainLine.reason).toContain('昨日仅 1 家涨停，属于今日新启动方向');
    });

    test('取不到上一交易日数据时持续性字段应该为 null', async () => {
      // 仅配置当日数据，再往前 10 个自然日都无数据
      axios.get.mockImplementation(buildRouter({
        20261126: [stk('600001', '新A', '低空经济', 2, 1e8)]
      }));

      const result = await getMainLine('20261126');

      expect(result.prevDate).toBeNull();
      expect(result.mainLine.prevZtCount).toBeNull();
      expect(result.mainLine.prevMaxLbc).toBeNull();
      expect(result.mainLine.isContinued).toBe(false);
      expect(result.mainLine.reason).toContain('无上一交易日数据');
    });

  });

  describe('评分权重自定义测试', () => {

    test('应该支持通过 options.weights 覆盖默认权重并改变主线', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [
          ...firstBoards('食品', 10),
          stk('300001', '高标A', '机器人', 5, 1e8),
          stk('600001', '机器人B', '机器人', 1),
          stk('600002', '机器人C', '机器人', 1)
        ]
      }));

      // 默认权重下机器人胜出（43 > 36）
      const byDefault = await getMainLine('20261126');
      expect(byDefault.mainLine.name).toBe('机器人');

      // 提高涨停家数权重、降低高度权重后，食品反超（10×5+1 = 51 > 3×5+5 = 20）
      const byCustom = await getMainLine('20261126', {
        weights: { zt: 5, lbc: 1, lbCount: 0, prevZt: 0 }
      });
      expect(byCustom.mainLine.name).toBe('食品');
    });

  });

  describe('topN 副线数量测试', () => {

    test('默认应该输出主线加最多 2 条副线', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [
          stk('600001', 'A', '板块A', 1, 7e7),
          stk('600002', 'B', '板块B', 1, 6e7),
          stk('600003', 'C', '板块C', 1, 5e7)
        ]
      }));

      const result = await getMainLine('20261126');

      expect(result.mainLine.name).toBe('板块A');
      expect(result.subLines.map(b => b.name)).toEqual(['板块B', '板块C']);
      expect(result.boards.length).toBe(3);
    });

    test('应该支持通过 options.topN 输出更多副线', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [
          stk('600001', 'A', '板块A', 1, 7e7),
          stk('600002', 'B', '板块B', 1, 6e7),
          stk('600003', 'C', '板块C', 1, 5e7),
          stk('600004', 'D', '板块D', 1, 4e7),
          stk('600005', 'E', '板块E', 1, 3e7),
          stk('600006', 'F', '板块F', 1, 2e7)
        ]
      }));

      const result = await getMainLine('20261126', { topN: 5 });

      // 主线 + 4 条副线；同分时按封板资金降序
      expect(result.subLines.map(b => b.name)).toEqual(['板块B', '板块C', '板块D', '板块E']);
    });

  });

  describe('日期入参测试', () => {

    test('不传日期时应该默认使用今天', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(TODAY);
      const today = dayjs().format('YYYYMMDD');

      axios.get.mockImplementation(buildRouter({
        [today]: [stk('600001', '新A', '低空经济', 2, 1e8)]
      }));

      const result = await getMainLine();

      expect(result.inputDate).toBe(today);
      expect(result.date).toBe(today);
      expect(result.dateAdjusted).toBe(false);
    });

    test('应该支持数字格式的日期入参', async () => {
      axios.get.mockImplementation(buildRouter({
        20261126: [stk('600001', '新A', '低空经济', 2, 1e8)]
      }));

      const result = await getMainLine(20261126);

      expect(result.inputDate).toBe('20261126');
      expect(result.mainLine.name).toBe('低空经济');
    });

    test('入参为非交易日时应该自动回退到最近有数据的交易日', async () => {
      // 20261122 为周日：22、21 无数据，20261120（周五）有数据；
      // 再往前（20 的上一交易日）也无数据，prevPool 应为 null
      axios.get.mockImplementation(buildRouter({
        20261120: [stk('600001', '周五A', '机器人', 3, 1e8)]
      }));

      const result = await getMainLine('20261122');

      expect(result.inputDate).toBe('20261122');
      expect(result.date).toBe('20261120');
      expect(result.dateAdjusted).toBe(true);
      expect(result.prevDate).toBeNull();
      expect(result.mainLine.name).toBe('机器人');
      expect(result.mainLine.prevZtCount).toBeNull();
    });

  });

  describe('异常情况测试', () => {

    test('连续多日无数据时应该抛出错误', async () => {
      axios.get.mockImplementation(buildRouter({}));

      await expect(getMainLine('20261126')).rejects.toThrow('未获取到涨停数据');
    });

    test('网络请求失败时应该抛出错误', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'));

      await expect(getMainLine('20261126')).rejects.toThrow('未获取到涨停数据');
    });

  });

  describe('日期格式校验测试', () => {

    test.each([
      ['2026-11-26', '带分隔符的日期'],
      ['202611', '位数不足的日期'],
      ['202611261', '位数超出的日期'],
      ['abc', '非数字字符串'],
      ['2026AB01', '包含字母的日期']
    ])('%s（%s）应该抛出 TypeError', async (date) => {
      await expect(getMainLine(date)).rejects.toThrow(TypeError);
      await expect(getMainLine(date)).rejects.toThrow('date 应为 YYYYMMDD 格式，如 20261126');
      expect(axios.get).not.toHaveBeenCalled();
    });

  });

});

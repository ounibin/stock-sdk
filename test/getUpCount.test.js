const axios = require('axios');
const getUpCount = require('../lib/getter/getUpCount');

// Mock axios
jest.mock('axios');

const CLIST_URL = 'https://push2.eastmoney.com/api/qt/clist/get';
const ZT_POOL_URL = 'https://push2ex.eastmoney.com/getTopicZTPool';

// 冻结到当天（2026-11-25 收盘后），使 '20261125' 走全市场扫描路径
const TODAY = new Date('2026-11-25T15:30:00');
// 冻结到次日，使 '20261125' 走历史涨停池路径
const NEXT_DAY = new Date('2026-11-26T10:00:00');

// 构造东财 clist 行情行
function row(code, name, price, prevClose, chg) {
  return { f12: code, f14: name, f2: price, f18: prevClose, f3: chg };
}

// 构造 clist 分页响应
function clistPage(rows, total = 5931) {
  return { data: { data: { total, diff: rows } } };
}

// 依次返回多页行情（翻页测试用）
function mockScanPages(pages) {
  let call = 0;
  axios.get.mockImplementation(async (url) => {
    if (!url.startsWith(CLIST_URL)) {
      throw new Error(`意外请求: ${url}`);
    }
    const page = pages[Math.min(call, pages.length - 1)];
    call++;
    return page;
  });
}

// 构造东方财富涨停池接口的模拟响应
function mockZTPoolResponse(pool, tc) {
  return {
    data: {
      data: {
        pool,
        tc: tc !== undefined ? tc : pool.length
      }
    }
  };
}

describe('getUpCount 获取涨停家数测试', () => {

  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('当天日期：全市场扫描口径（含 ST 股）', () => {

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(TODAY);
    });

    test('应该统计收盘价达到涨停价的股票（含 ST 股）', async () => {
      mockScanPages([
        clistPage([
          row('300086', '康芝药业', 4.85, 4.04, 20.05),   // 创业板 20% 涨停: 4.04*1.2=4.85
          row('688066', '*ST航图', 4.14, 3.45, 20.0),     // 科创板 ST 涨停: 3.45*1.2=4.14
          row('600340', '*ST华幸', 1.03, 0.94, 9.57),     // 主板 ST 涨停: 0.94*1.1=1.034→1.03，涨幅仅9.57%
          row('600001', '非涨停股', 10.5, 10.0, 5.0)      // 未涨停
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(3);
    });

    test('涨幅跌破 9.5% 后应该提前停止翻页', async () => {
      mockScanPages([
        clistPage([
          row('600340', '*ST华幸', 1.03, 0.94, 9.57),
          row('600001', '非涨停股', 10.5, 10.0, 5.0)
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(1);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('本页末尾涨幅仍高于 9.5% 时应该继续翻页统计', async () => {
      mockScanPages([
        clistPage([
          row('300001', '甲', 12.0, 10.0, 20.0),   // 涨停
          row('300002', '乙', 11.99, 10.0, 19.9)   // 20cm 封住前一档，需翻页
        ]),
        clistPage([
          row('000001', '丙', 11.0, 10.0, 10.0),   // 主板涨停
          row('000002', '丁', 10.3, 10.0, 3.0)     // 涨幅低，停止翻页
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(2);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('相邻页面出现的重复股票不应该重复计数', async () => {
      mockScanPages([
        clistPage([
          row('000001', '重复股', 11.0, 10.0, 10.0),
          row('300002', '乙', 11.99, 10.0, 19.9)
        ]),
        clistPage([
          row('000001', '重复股', 11.0, 10.0, 10.0),
          row('000002', '丁', 10.3, 10.0, 3.0)
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(1);
    });

    test('北交所股票应该按 30% 涨跌幅判定', async () => {
      mockScanPages([
        clistPage([
          row('920001', '北股A', 13.0, 10.0, 30.0),   // 10*1.3=13.00 涨停
          row('920002', '北股B', 12.9, 10.0, 29.0),   // 未到涨停价
          row('920003', '北股C', 13.1, 10.0, 35.0)    // 涨幅超上限 → 无涨跌幅限制
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(1);
    });

    test('上市初期无涨跌幅限制的股票不应该计入', async () => {
      mockScanPages([
        clistPage([
          row('301100', 'N创业板', 30.0, 10.0, 200.0),   // 创业板上市首日无涨跌幅限制
          row('001999', 'N主板', 14.4, 10.0, 44.0),      // 主板新股首日 44%
          row('000002', '正常涨停', 11.0, 10.0, 10.0)
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(1);
    });

    test('停牌或行情缺失的股票不应该计入', async () => {
      mockScanPages([
        clistPage([
          row('000999', '停牌股', '-', 10.0, '-'),
          row('000888', '昨收缺失', 11.0, '-', 10.0),
          row('000002', '正常涨停', 11.0, 10.0, 10.0)
        ])
      ]);

      const result = await getUpCount('20261125');

      expect(result).toBe(1);
    });

    test('接口返回空数据时应该返回 0', async () => {
      mockScanPages([clistPage([], 0)]);

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
    });

    test('行情接口请求失败时应该返回 0 并记录错误日志', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'));

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith('获取涨停家数(20261125)出错:', 'Network Error');
    });

  });

  describe('历史日期：东财涨停池口径', () => {

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(NEXT_DAY);
    });

    test('应该优先返回接口提供的总数 tc', async () => {
      axios.get.mockResolvedValue({
        data: { data: { tc: 55, pool: [{ c: '000001', n: '平安银行' }] } }
      });

      const result = await getUpCount('20261125');

      expect(result).toBe(55);
    });

    test('缺少 tc 时应该返回池列表长度', async () => {
      axios.get.mockResolvedValue({
        data: { data: { pool: [{ c: '000001' }, { c: '600519' }] } }
      });

      const result = await getUpCount('20261125');

      expect(result).toBe(2);
    });

    test('应该使用涨停池接口和正确参数请求', async () => {
      axios.get.mockResolvedValue(mockZTPoolResponse([]));

      await getUpCount('20261125');

      expect(axios.get).toHaveBeenCalledTimes(1);
      const calledUrl = axios.get.mock.calls[0][0];
      expect(calledUrl.startsWith(ZT_POOL_URL)).toBe(true);
      expect(calledUrl).toContain('date=20261125');
      expect(calledUrl).toContain('pagesize=10000');
      expect(axios.get.mock.calls[0][1]).toEqual({
        headers: {
          Referer: 'https://quote.eastmoney.com/ztb/',
          'User-Agent': 'Mozilla/5.0'
        }
      });
    });

    test('非交易日（涨停池为空）应该返回 0', async () => {
      axios.get.mockResolvedValue(mockZTPoolResponse([], 0));

      const result = await getUpCount('20261122');

      expect(result).toBe(0);
    });

    test('响应中 data 为 null 时应该返回 0', async () => {
      axios.get.mockResolvedValue({ data: { data: null } });

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
    });

    test('响应格式完全不正确时应该返回 0', async () => {
      axios.get.mockResolvedValue({});

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
    });

    test('网络请求失败时应该返回 0 并记录错误日志', async () => {
      const error = new Error('Network Error');
      axios.get.mockRejectedValue(error);

      const result = await getUpCount('20261125');

      expect(result).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith('获取涨停家数(20261125)出错:', 'Network Error');
    });

    test('应该支持数字格式的日期入参', async () => {
      axios.get.mockResolvedValue(mockZTPoolResponse([{ c: '000001', n: '平安银行' }]));

      const result = await getUpCount(20261120);

      expect(result).toBe(1);
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get.mock.calls[0][0]).toContain('date=20261120');
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

# Stock SDK - 中国股票市场工具包

一个用于中国股票市场的 Node.js SDK，提供实时行情、板块排名和交易所判断等功能。

## 功能特性

### 🏦 股票交易所判断
- 根据股票代码自动识别所属交易所
- 支持上海、深圳、北京三大交易所
- 区分主板、中小板、创业板、科创板等不同板块
- 批量处理和有效性验证

### 📈 实时行情获取
- 获取股票实时净值数据
- 支持多种数据源

### 📊 板块排名查询
- 获取行业板块实时排名
- 支持按涨幅、跌幅等条件筛选

## 安装

```bash
npm install
```

## 快速开始

```javascript
const stockSDK = require('stock-sdk');

// 判断单个股票所属交易所
const result = stockSDK.getExchangeByCode('600000');
console.log(result);
// 输出: { 
//   code: '600000',
//   exchange: 'SH',
//   exchangeName: '上海证券交易所',
//   market: 'MAIN',
//   marketName: '主板',
//   isValid: true
// }
```

## API 文档

### getExchangeByCode(stockCode)

根据股票代码判断所属交易所和板块。

**参数:**
- `stockCode` (string|number): 6位股票代码

**返回值:**
```javascript
{
  code: string,          // 股票代码
  exchange: string,      // 交易所代码 (SH/SZ/BJ)
  exchangeName: string,  // 交易所名称
  market: string,        // 板块代码
  marketName: string,    // 板块名称
  isValid: boolean       // 是否有效
}
```

**示例:**
```javascript
// 上海主板
stockSDK.getExchangeByCode('600000');
// { exchange: 'SH', exchangeName: '上海证券交易所', market: 'MAIN', marketName: '主板' }

// 深圳创业板
stockSDK.getExchangeByCode('300001');
// { exchange: 'SZ', exchangeName: '深圳证券交易所', market: 'GEM', marketName: '创业板' }

// 北京交易所
stockSDK.getExchangeByCode('831234');
// { exchange: 'BJ', exchangeName: '北京证券交易所', market: 'BSE', marketName: '北交所' }
```

### batchGetExchange(stockCodes)

批量判断多个股票代码的交易所信息。

**参数:**
- `stockCodes` (Array): 股票代码数组

**返回值:** 数组形式的交易所信息

**示例:**
```javascript
const results = stockSDK.getExchangeByCode.batchGetExchange(['600000', '000001', '300001']);
```

### isValidStockCode(code)

验证股票代码是否有效。

**参数:**
- `code` (string): 待验证的股票代码

**返回值:** boolean

### getExchangePrefixes(exchange)

获取指定交易所的所有股票代码前缀。

**参数:**
- `exchange` (string): 交易所代码 ('SH', 'SZ', 'BJ')

**返回值:** 前缀数组

## 中国股市代码规则

### 上海证券交易所 (SH)
- **主板**: 600xxx, 601xxx, 603xxx, 605xxx
- **科创板**: 688xxx, 689xxx

### 深圳证券交易所 (SZ)
- **主板**: 000xxx, 001xxx
- **中小板**: 002xxx, 003xxx
- **创业板**: 300xxx, 301xxx

### 北京证券交易所 (BJ)
- **北交所**: 430xxx, 8xxxxx (820-879范围)

## 运行示例

```bash
# 运行交易所判断示例
npm run example

# 运行测试
npm test

# 运行测试并查看覆盖率
npm run test:coverage
```

## 测试

项目使用 Jest 进行单元测试，包含完整的测试用例覆盖所有功能。

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 项目结构

```
stock-sdk/
├── lib/                    # 核心功能模块
│   ├── getExchangeByCode.js # 交易所判断模块
│   ├── getRealTimeNet.js   # 实时净值模块
│   ├── getSectorRank.js    # 板块排名模块
│   └── index.js           # 主入口文件
├── examples/              # 使用示例
│   └── exchange-example.js # 交易所判断示例
├── test/                  # 测试文件
│   └── exchange.test.js   # 交易所功能测试
├── package.json
└── README.md
```

## 许可证

ISC

## 贡献

欢迎提交 Issue 和 Pull Request！
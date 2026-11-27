# AGENTS.md

## 日期处理约定

- 涉及日期解析、格式化、转换或日期加减时，必须使用 `dayjs`，不得使用原生 `Date` 进行手动计算。
- 股票交易日期统一使用 `YYYYMMDD` 格式（例如 `20261126`）；需要展示时可格式化为 `YYYY-MM-DD`。
- 使用用户输入日期时，加载 `dayjs/plugin/customParseFormat`，并采用严格解析校验有效日期。
- 默认当天时使用 `dayjs().format('YYYYMMDD')`。

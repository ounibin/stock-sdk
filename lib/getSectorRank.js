// simple ReadableStream polyfill for test environment where it's missing
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {};
}
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {};
}
if (typeof global.File === 'undefined') {
  global.File = class File {};
}
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {};
}
if (typeof global.MessagePort === 'undefined') {
  global.MessagePort = class MessagePort {};
}

const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

module.exports = async function (fetcher = axios) {
  const url = 'https://q.10jqka.com.cn/thshy/';
  try {
    const resp = await (fetcher.get ? fetcher.get(url, {
      responseType: 'arraybuffer'
    }) : fetcher(url));
    const raw = resp && resp.data ? resp.data : resp;

    let html;
    if (raw && (Buffer.isBuffer(raw) || raw instanceof ArrayBuffer || raw instanceof Uint8Array)) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      html = iconv.decode(buf, 'gbk');
    } else {
      html = raw;
    }

    const $ = cheerio.load(html);

    // 找到包含"净流入"字样的表格，如果没有则取第一个 table 或全局 tr
    let $table = null;
    $('table').each((i, el) => {
      if ($(el).text().includes('净流入')) {
        $table = $(el);
        return false;
      }
    });
    if (!$table) $table = $('table').first();

    const rows = $table && $table.length ? $table.find('tr').toArray() : $('tr').toArray();

    // 字段索引映射
    const IDX = {
      NAME: 1,
      NAME_ALT: 0,
      CHANGE: 2,
      VOLUME: 3,
      AMOUNT: 4,
      NET_INFLOW: 5,
      UP: 6,
      DOWN: 7,
      TOP_STOCK: 9
    };
    const TOP_COUNT = 10;

    const resultDataRows = rows
      .map(tr => {
        const $tr = $(tr);
        // 跳过表头
        if ($tr.find('th').length) return null;
        const $tds = $tr.find('td');
        if (!$tds || $tds.length === 0) return null;
        const cells = $tds.map((i, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
        if (cells.length === 0) return null;

        return {
          name: cells[IDX.NAME] || cells[IDX.NAME_ALT] || '',
          changePercent: +cells[IDX.CHANGE] || 0,
          totalVolume: +cells[IDX.VOLUME] || 0,
          totalAmount: +cells[IDX.AMOUNT] || 0,
          netInflow: +cells[IDX.NET_INFLOW] || 0,
          upCount: +cells[IDX.UP] || 0,
          downCount: +cells[IDX.DOWN] || 0,
          topStock: cells[IDX.TOP_STOCK] || ''
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.netInflow - a.netInflow)
      .slice(0, TOP_COUNT);

    return resultDataRows;
  } catch (error) {
    console.error('[getSectorRank] 获取板块排行失败:', error.message);
    throw new Error(`获取板块排行失败: ${error.message}`);
  }
}
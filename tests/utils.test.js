/**
 * tests/utils.test.js
 * utils.gs 純函式的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/utils.gs。
 * 以下函式無 GAS API 依賴，可直接在 Node 環境驗證。
 * 執行方式：npm test
 */

'use strict';

// ==================== 依賴常數（來自 config.gs） ====================

const BOOKING_SHEET_NAME = '預約記錄';

// ==================== 從 utils.gs 提取的純函式（逐字複製，不做任何改動） ====================

function getTaipeiDateString(date) {
  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
  const taipeiTime = new Date(date.getTime() + UTC_OFFSET_MS);
  return taipeiTime.toISOString().split('T')[0];
}

function createTaipeiDateFromYMD(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('無法建立日期：dateString 參數缺失或格式錯誤');
  }
  const normalizedIsoString = dateString + 'T00:00:00+08:00';
  return new Date(normalizedIsoString);
}

function parseBookingDate(dateString) {
  if (typeof dateString === 'string') {
    if (dateString.includes('年') && dateString.includes('月') && dateString.includes('日')) {
      const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (match) {
        const year  = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day   = parseInt(match[3]);
        return new Date(year, month, day);
      }
    }
    if (dateString.includes('-') || dateString.includes('/')) {
      return new Date(dateString);
    }
  }
  if (dateString instanceof Date) {
    return dateString;
  }
  return new Date(dateString);
}

function isBookingSheetName(sheetName) {
  return /^預約記錄\d{4}$/.test(sheetName);
}

function getBookingSheetNameByDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('無效的日期參數');
  }
  const year = dateStr.substring(0, 4);
  if (!/^\d{4}$/.test(year)) {
    throw new Error('無法從日期中提取年份: ' + dateStr);
  }
  return BOOKING_SHEET_NAME + year;
}

// ==================== getTaipeiDateString ====================

describe('getTaipeiDateString', () => {
  it('UTC 00:00:00 → 同日台北日期', () => {
    // UTC 2025-07-01 00:00:00 → 台北 2025-07-01 08:00:00 → 同日
    const date = new Date('2025-07-01T00:00:00Z');
    expect(getTaipeiDateString(date)).toBe('2025-07-01');
  });

  it('UTC 16:00:00 前一天 → 台北跨日（隔天 00:00）', () => {
    // UTC 2025-06-30 16:00:00 → 台北 2025-07-01 00:00:00 → 7/1
    const date = new Date('2025-06-30T16:00:00Z');
    expect(getTaipeiDateString(date)).toBe('2025-07-01');
  });

  it('UTC 15:59:59 前一天 → 台北仍為前一天', () => {
    // UTC 2025-06-30 15:59:59 → 台北 2025-06-30 23:59:59 → 6/30
    const date = new Date('2025-06-30T15:59:59Z');
    expect(getTaipeiDateString(date)).toBe('2025-06-30');
  });

  it('年度邊界：UTC 12/31 16:00 → 台北 1/1', () => {
    // UTC 2024-12-31 16:00:00 → 台北 2025-01-01 00:00:00
    const date = new Date('2024-12-31T16:00:00Z');
    expect(getTaipeiDateString(date)).toBe('2025-01-01');
  });

  it('回傳格式符合 YYYY-MM-DD', () => {
    const date = new Date('2025-03-05T00:00:00Z');
    const result = getTaipeiDateString(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('月份與日期補零（3月5日）', () => {
    const date = new Date('2025-03-05T00:00:00Z');
    const result = getTaipeiDateString(date);
    const [, month, day] = result.split('-');
    expect(month).toBe('03');
    expect(day).toBe('05');
  });
});

// ==================== createTaipeiDateFromYMD ====================

describe('createTaipeiDateFromYMD', () => {
  it('建立台北 00:00 的絕對時間（UTC+8 等於 UTC 前一天 16:00）', () => {
    const result = createTaipeiDateFromYMD('2025-07-01');
    // 台北 2025-07-01 00:00 = UTC 2025-06-30 16:00
    expect(result.toISOString()).toBe('2025-06-30T16:00:00.000Z');
  });

  it('年初日期（1/1 00:00 台北）', () => {
    const result = createTaipeiDateFromYMD('2025-01-01');
    // 台北 2025-01-01 00:00 = UTC 2024-12-31 16:00
    expect(result.toISOString()).toBe('2024-12-31T16:00:00.000Z');
  });

  it('閏年 2/29 台北時間', () => {
    const result = createTaipeiDateFromYMD('2024-02-29');
    expect(result.toISOString()).toBe('2024-02-28T16:00:00.000Z');
  });

  it('null 時拋出 Error', () => {
    expect(() => createTaipeiDateFromYMD(null)).toThrow();
  });

  it('undefined 時拋出 Error', () => {
    expect(() => createTaipeiDateFromYMD(undefined)).toThrow();
  });

  it('非字串型別（數字）時拋出 Error', () => {
    expect(() => createTaipeiDateFromYMD(20250701)).toThrow();
  });

  it('空字串時拋出 Error', () => {
    expect(() => createTaipeiDateFromYMD('')).toThrow();
  });
});

// ==================== parseBookingDate ====================

describe('parseBookingDate', () => {
  it('中文格式「YYYY年M月D日」正確解析年份', () => {
    const result = parseBookingDate('2025年7月1日');
    expect(result.getFullYear()).toBe(2025);
  });

  it('中文格式「YYYY年M月D日」正確解析月份（1-indexed）', () => {
    const result = parseBookingDate('2025年7月1日');
    expect(result.getMonth()).toBe(6); // 0-indexed，7月 = 6
  });

  it('中文格式「YYYY年M月D日」正確解析日期', () => {
    const result = parseBookingDate('2025年7月1日');
    expect(result.getDate()).toBe(1);
  });

  it('中文格式月份為雙位數（12月）', () => {
    const result = parseBookingDate('2025年12月31日');
    expect(result.getMonth()).toBe(11); // 12月 = 11
    expect(result.getDate()).toBe(31);
  });

  it('連字號格式「YYYY-MM-DD」回傳有效 Date', () => {
    const result = parseBookingDate('2025-07-01');
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('斜線格式「YYYY/MM/DD」回傳有效 Date', () => {
    const result = parseBookingDate('2025/07/01');
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('Date 物件直接回傳原物件', () => {
    const original = new Date('2025-07-01');
    const result = parseBookingDate(original);
    expect(result).toBe(original);
  });
});

// ==================== isBookingSheetName ====================

describe('isBookingSheetName', () => {
  it('「預約記錄2025」回傳 true', () => {
    expect(isBookingSheetName('預約記錄2025')).toBe(true);
  });

  it('「預約記錄2024」回傳 true', () => {
    expect(isBookingSheetName('預約記錄2024')).toBe(true);
  });

  it('「預約記錄2030」回傳 true', () => {
    expect(isBookingSheetName('預約記錄2030')).toBe(true);
  });

  it('「預約記錄」（無年份）回傳 false', () => {
    expect(isBookingSheetName('預約記錄')).toBe(false);
  });

  it('「預約記錄202」（3位數）回傳 false', () => {
    expect(isBookingSheetName('預約記錄202')).toBe(false);
  });

  it('「預約記錄20251」（5位數）回傳 false', () => {
    expect(isBookingSheetName('預約記錄20251')).toBe(false);
  });

  it('「客戶資料」回傳 false', () => {
    expect(isBookingSheetName('客戶資料')).toBe(false);
  });

  it('「預約記錄202a」（含字母）回傳 false', () => {
    expect(isBookingSheetName('預約記錄202a')).toBe(false);
  });

  it('空字串回傳 false', () => {
    expect(isBookingSheetName('')).toBe(false);
  });
});

// ==================== getBookingSheetNameByDate ====================

describe('getBookingSheetNameByDate', () => {
  it('「2025-07-01」→「預約記錄2025」', () => {
    expect(getBookingSheetNameByDate('2025-07-01')).toBe('預約記錄2025');
  });

  it('「2026-01-01」→「預約記錄2026」', () => {
    expect(getBookingSheetNameByDate('2026-01-01')).toBe('預約記錄2026');
  });

  it('「2024-12-31」→「預約記錄2024」', () => {
    expect(getBookingSheetNameByDate('2024-12-31')).toBe('預約記錄2024');
  });

  it('null 時拋出 Error', () => {
    expect(() => getBookingSheetNameByDate(null)).toThrow();
  });

  it('空字串時拋出 Error', () => {
    expect(() => getBookingSheetNameByDate('')).toThrow();
  });

  it('開頭非數字年份（「abc-01-01」）時拋出 Error', () => {
    expect(() => getBookingSheetNameByDate('abc-01-01')).toThrow();
  });

  it('非字串型別時拋出 Error', () => {
    expect(() => getBookingSheetNameByDate(20250701)).toThrow();
  });
});

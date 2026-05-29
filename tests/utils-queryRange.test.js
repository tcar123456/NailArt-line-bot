/**
 * tests/utils-queryRange.test.js
 * utils.gs — getOptimizedQueryRange / getOptimizedQueryRangeBatch 的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/utils.gs。
 * 兩個函式依賴 CALENDAR_CONFIG（測試中直接定義所需子集），無 GAS API 依賴。
 * getOptimizedQueryRange   ：計算單日的優化查詢時間範圍（支援開關）
 * getOptimizedQueryRangeBatch：計算多日批量查詢的時間範圍
 * 執行方式：npm test
 */

'use strict';

// ==================== 依賴常數（來自 config.gs，逐字複製可測試部分） ====================

const CALENDAR_CONFIG = {
  defaultDuration: 1,
  businessHours: {
    start: '08:00',
    end:   '22:00'
  },
  optimization: {
    enableBusinessHoursFilter: true
  }
};

// ==================== 從 utils.gs 提取的純函式（逐字複製，不做任何改動） ====================

function getOptimizedQueryRange(queryDateStr) {
  const config = CALENDAR_CONFIG;

  if (!config.optimization.enableBusinessHoursFilter) {
    return {
      startTime: new Date(queryDateStr + 'T00:00:00+08:00'),
      endTime:   new Date(queryDateStr + 'T23:59:59+08:00'),
      reason:    'optimization_disabled'
    };
  }

  try {
    const [startHour, startMinute] = config.businessHours.start.split(':').map(Number);
    const [endHour,   endMinute]   = config.businessHours.end.split(':').map(Number);

    const businessStartTime = new Date(queryDateStr + 'T' +
      String(startHour).padStart(2, '0') + ':' +
      String(startMinute).padStart(2, '0') + ':00+08:00');

    const businessEndTime = new Date(queryDateStr + 'T' +
      String(endHour).padStart(2, '0') + ':' +
      String(endMinute).padStart(2, '0') + ':59+08:00');

    const dayStart = new Date(queryDateStr + 'T00:00:00+08:00');
    const dayEnd   = new Date(queryDateStr + 'T23:59:59+08:00');

    const optimizedStart = businessStartTime < dayStart ? dayStart : businessStartTime;
    const optimizedEnd   = businessEndTime   > dayEnd   ? dayEnd   : businessEndTime;

    const originalRange  = dayEnd - dayStart;
    const optimizedRange = optimizedEnd - optimizedStart;
    const savingsPercent = Math.round((1 - optimizedRange / originalRange) * 100);

    return {
      startTime: optimizedStart,
      endTime:   optimizedEnd,
      reason:    'business_hours_optimized',
      savings:   savingsPercent
    };

  } catch (error) {
    console.error('查詢範圍優化失敗，使用原始全天範圍:', error);
    return {
      startTime: new Date(queryDateStr + 'T00:00:00+08:00'),
      endTime:   new Date(queryDateStr + 'T23:59:59+08:00'),
      reason:    'optimization_failed',
      error:     error.message
    };
  }
}

function getOptimizedQueryRangeBatch(startDateStr, endDateStr) {
  try {
    const startDate = new Date(startDateStr + 'T00:00:00+08:00');
    const endDate   = new Date(endDateStr   + 'T23:59:59+08:00');

    const businessHours = CALENDAR_CONFIG.businessHours;
    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour,   endMinute]   = businessHours.end.split(':').map(Number);

    const batchStartTime = new Date(startDate);
    batchStartTime.setHours(startHour, startMinute, 0, 0);

    const batchEndTime = new Date(endDate);
    batchEndTime.setHours(endHour, endMinute, 0, 0);

    const totalDays           = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const businessHoursPerDay = endHour - startHour;
    const totalBusinessHours  = totalDays * businessHoursPerDay;
    const totalPossibleHours  = totalDays * 24;
    const savings             = Math.round((1 - totalBusinessHours / totalPossibleHours) * 100);

    return {
      startTime: batchStartTime,
      endTime:   batchEndTime,
      reason:    `批量查詢營業時間優化 (${totalDays}天)`,
      savings:   savings
    };

  } catch (error) {
    console.error('批量查詢範圍優化失敗:', error);
    return {
      startTime: new Date(startDateStr + 'T00:00:00+08:00'),
      endTime:   new Date(endDateStr   + 'T23:59:59+08:00'),
      reason:    '優化失敗，使用全天範圍',
      savings:   0
    };
  }
}

// ==================== getOptimizedQueryRange — 啟用營業時間過濾（08:00–22:00）====================
// 測試日期：2026-04-14（台北時區）
// 台北 08:00 = UTC 2026-04-14T00:00:00Z
// 台北 22:00:59 = UTC 2026-04-14T14:00:59Z
// 台北 00:00:00 = UTC 2026-04-13T16:00:00Z
// 台北 23:59:59 = UTC 2026-04-14T15:59:59Z

describe('getOptimizedQueryRange — 啟用營業時間過濾', () => {
  it('reason 為 business_hours_optimized', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.reason).toBe('business_hours_optimized');
  });

  it('startTime 對應營業開始（08:00 Taipei = UTC 00:00 同日）', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.startTime.toISOString()).toBe('2026-04-14T00:00:00.000Z');
  });

  it('endTime 對應營業結束（22:00:59 Taipei = UTC 14:00:59 同日）', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.endTime.toISOString()).toBe('2026-04-14T14:00:59.000Z');
  });

  it('startTime < endTime', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.startTime.getTime()).toBeLessThan(result.endTime.getTime());
  });

  it('savings 為正數（縮減查詢範圍）', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.savings).toBeGreaterThan(0);
  });

  it('savings 正確（08:00–22:00 覆蓋 14 小時，節省約 42%）', () => {
    // optimizedRange / originalRange ≈ 14h / 24h，節省 ≈ 41.67% → 42
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.savings).toBeGreaterThanOrEqual(40);
    expect(result.savings).toBeLessThanOrEqual(45);
  });

  it('回傳物件包含 startTime, endTime, reason, savings 欄位', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result).toHaveProperty('startTime');
    expect(result).toHaveProperty('endTime');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('savings');
  });

  it('回傳的 startTime 和 endTime 皆為 Date 物件', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
  });

  it('不同日期的 startTime 正確偏移（相差整日）', () => {
    // 2025-01-01 和 2025-12-31 的 startTime 相差 364 天
    const r1 = getOptimizedQueryRange('2025-01-01');
    const r2 = getOptimizedQueryRange('2025-12-31');
    const diffDays = (r2.startTime - r1.startTime) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(364);
  });

  it('年初（1 月 1 日）startTime 正確', () => {
    // 台北 2026-01-01 08:00 = UTC 2026-01-01 00:00
    const result = getOptimizedQueryRange('2026-01-01');
    expect(result.startTime.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('年末（12 月 31 日）endTime 正確', () => {
    // 台北 2026-12-31 22:00:59 = UTC 2026-12-31 14:00:59
    const result = getOptimizedQueryRange('2026-12-31');
    expect(result.endTime.toISOString()).toBe('2026-12-31T14:00:59.000Z');
  });
});

// ==================== getOptimizedQueryRange — 停用過濾 ====================

describe('getOptimizedQueryRange — 停用營業時間過濾', () => {
  beforeEach(() => {
    CALENDAR_CONFIG.optimization.enableBusinessHoursFilter = false;
  });

  afterEach(() => {
    CALENDAR_CONFIG.optimization.enableBusinessHoursFilter = true;
  });

  it('reason 為 optimization_disabled', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.reason).toBe('optimization_disabled');
  });

  it('startTime 為當天 00:00 Taipei（= UTC 前一天 16:00）', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.startTime.toISOString()).toBe('2026-04-13T16:00:00.000Z');
  });

  it('endTime 為當天 23:59:59 Taipei（= UTC 15:59:59 同日）', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.endTime.toISOString()).toBe('2026-04-14T15:59:59.000Z');
  });

  it('不包含 savings 欄位', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.savings).toBeUndefined();
  });

  it('startTime 仍小於 endTime', () => {
    const result = getOptimizedQueryRange('2026-04-14');
    expect(result.startTime.getTime()).toBeLessThan(result.endTime.getTime());
  });
});

// ==================== getOptimizedQueryRangeBatch ====================
// 批量版本使用 setHours()（本地時區），只驗證相對關係與結構，不驗證絕對 UTC 值

describe('getOptimizedQueryRangeBatch', () => {
  it('reason 包含天數資訊', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-20');
    expect(result.reason).toMatch(/\d+天/);
  });

  it('startTime ≤ endTime', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-20');
    expect(result.startTime.getTime()).toBeLessThanOrEqual(result.endTime.getTime());
  });

  it('savings 大於 0（營業時間 < 24 小時）', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-20');
    expect(result.savings).toBeGreaterThan(0);
  });

  it('savings 與單日相近（08:00-22:00 ≈ 42%）', () => {
    // businessHours = 14h / 24h → savings = round((1-14/24)*100) = 42
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-20');
    expect(result.savings).toBeGreaterThanOrEqual(40);
    expect(result.savings).toBeLessThanOrEqual(45);
  });

  it('回傳物件包含 startTime, endTime, reason, savings', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-20');
    expect(result).toHaveProperty('startTime');
    expect(result).toHaveProperty('endTime');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('savings');
  });

  it('startTime 和 endTime 皆為 Date 物件', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-20');
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
  });

  it('相同日期（單日查詢）不崩潰且回傳合法範圍', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-14', '2026-04-14');
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
    expect(isNaN(result.startTime.getTime())).toBe(false);
  });

  it('較長範圍（30 天）的 savings 仍在合理區間', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-01', '2026-04-30');
    expect(result.savings).toBeGreaterThan(0);
    expect(result.savings).toBeLessThan(100);
  });

  it('endTime 晚於 startTime（30 天跨度）', () => {
    const result = getOptimizedQueryRangeBatch('2026-04-01', '2026-04-30');
    expect(result.endTime.getTime()).toBeGreaterThan(result.startTime.getTime());
  });
});

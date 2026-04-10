/**
 * tests/bookingService.test.js
 * formatDateForSheet / hasConflictInBookingData 純函式的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/bookingService.gs。
 * 兩個函式皆無 GAS API 依賴，可直接在 Node 環境驗證。
 */

'use strict';

// ==================== 從 .gs 提取的純函式（逐字複製，不做任何改動） ====================

function formatDateForSheet(dateStr) {
  var parts = dateStr.split('-');
  var year  = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day   = parseInt(parts[2], 10);
  return year + '年' + month + '月' + day + '日';
}

function hasConflictInBookingData(dateValues, timeValues, storedDate, timeStr) {
  for (var i = 0; i < dateValues.length; i++) {
    var rowDate = String(dateValues[i][0]);
    var rowTime = String(timeValues[i][0]).trim();
    if (rowDate === storedDate && rowTime === timeStr) {
      return true;
    }
  }
  return false;
}

// ==================== formatDateForSheet ====================

describe('formatDateForSheet', () => {
  it('月日個位數不補零', () => {
    expect(formatDateForSheet('2025-07-01')).toBe('2025年7月1日');
  });

  it('月日雙位數維持原值', () => {
    expect(formatDateForSheet('2025-12-31')).toBe('2025年12月31日');
  });

  it('月個位數、日雙位數', () => {
    expect(formatDateForSheet('2025-01-10')).toBe('2025年1月10日');
  });

  it('閏年 2 月 29 日', () => {
    expect(formatDateForSheet('2024-02-29')).toBe('2024年2月29日');
  });
});

// ==================== hasConflictInBookingData ====================

describe('hasConflictInBookingData', () => {
  // 測試資料：3 列 (7/1 14:00、7/2 10:00、7/1 16:00)
  const DATE_VALUES = [
    ['2025年7月1日'],
    ['2025年7月2日'],
    ['2025年7月1日'],
  ];
  const TIME_VALUES = [
    ['14:00'],
    ['10:00'],
    ['16:00'],
  ];

  it('日期與時間完全吻合時回傳 true', () => {
    expect(
      hasConflictInBookingData(DATE_VALUES, TIME_VALUES, '2025年7月1日', '14:00')
    ).toBe(true);
  });

  it('日期吻合但時間不同時回傳 false', () => {
    expect(
      hasConflictInBookingData(DATE_VALUES, TIME_VALUES, '2025年7月1日', '10:00')
    ).toBe(false);
  });

  it('日期不同（時間吻合）時回傳 false', () => {
    expect(
      hasConflictInBookingData(DATE_VALUES, TIME_VALUES, '2025年7月2日', '14:00')
    ).toBe(false);
  });

  it('非首列的衝突也能被檢出', () => {
    expect(
      hasConflictInBookingData(DATE_VALUES, TIME_VALUES, '2025年7月2日', '10:00')
    ).toBe(true);
  });

  it('不存在的日期時回傳 false', () => {
    expect(
      hasConflictInBookingData(DATE_VALUES, TIME_VALUES, '2025年7月3日', '14:00')
    ).toBe(false);
  });

  it('空資料時回傳 false', () => {
    expect(hasConflictInBookingData([], [], '2025年7月1日', '14:00')).toBe(false);
  });

  it('時間值帶前後空白仍能匹配（trim）', () => {
    const dv = [['2025年7月1日']];
    const tv = [['  14:00  ']];
    expect(hasConflictInBookingData(dv, tv, '2025年7月1日', '14:00')).toBe(true);
  });
});

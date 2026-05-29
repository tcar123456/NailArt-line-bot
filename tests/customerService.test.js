/**
 * tests/customerService.test.js
 * customerService.gs — Google Sheets 時間小數轉換邏輯的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/customerService.gs。
 * Google Sheets 將時間存為「一天的小數」（0.5 = 12:00、0.625 = 15:00）。
 * handleGetCustomerBookings 讀取後執行此轉換，邏輯為純計算，無 GAS API 依賴。
 * 執行方式：npm test
 */

'use strict';

// ==================== 從 customerService.gs 提取的純函式（逐字複製） ====================
// 原始碼位於 handleGetCustomerBookings 內的 processedBookings.map() 匿名函式中。
// 此處提取為獨立函式以便單元測試，邏輯完全一致。

/**
 * 將 Google Sheets 時間小數（一天的分數）轉換為 HH:MM 字串
 * @param {number} timeValue - Sheets 時間值（0~1 的小數，例如 0.5 = 12:00）
 * @returns {string} HH:MM 格式字串
 */
function convertSheetTimeToHHMM(timeValue) {
  const totalMinutes = Math.round(timeValue * 24 * 60);
  const hours        = Math.floor(totalMinutes / 60) % 24;
  const minutes      = totalMinutes % 60;
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

// ==================== 整點時間 ====================

describe('convertSheetTimeToHHMM — 整點時間', () => {
  it('0.5 → "12:00"（正午）', () => {
    expect(convertSheetTimeToHHMM(0.5)).toBe('12:00');
  });

  it('0.375 → "09:00"（9 AM）', () => {
    expect(convertSheetTimeToHHMM(0.375)).toBe('09:00');
  });

  it('0.625 → "15:00"（3 PM）', () => {
    expect(convertSheetTimeToHHMM(0.625)).toBe('15:00');
  });

  it('14/24 → "14:00"（下午2點）', () => {
    expect(convertSheetTimeToHHMM(14 / 24)).toBe('14:00');
  });

  it('10/24 → "10:00"（上午10點）', () => {
    expect(convertSheetTimeToHHMM(10 / 24)).toBe('10:00');
  });

  it('18/24 = 0.75 → "18:00"（晚上6點）', () => {
    expect(convertSheetTimeToHHMM(0.75)).toBe('18:00');
  });

  it('0 → "00:00"（午夜）', () => {
    expect(convertSheetTimeToHHMM(0)).toBe('00:00');
  });

  it('1/24 → "01:00"（凌晨1點）', () => {
    expect(convertSheetTimeToHHMM(1 / 24)).toBe('01:00');
  });

  it('23/24 → "23:00"（晚上11點）', () => {
    expect(convertSheetTimeToHHMM(23 / 24)).toBe('23:00');
  });
});

// ==================== 非整點時間 ====================

describe('convertSheetTimeToHHMM — 半點與非整點', () => {
  it('10.5/24 → "10:30"（上午10:30）', () => {
    expect(convertSheetTimeToHHMM(10.5 / 24)).toBe('10:30');
  });

  it('8.5/24 → "08:30"（上午8:30）', () => {
    expect(convertSheetTimeToHHMM(8.5 / 24)).toBe('08:30');
  });

  it('14.5/24 → "14:30"（下午2:30）', () => {
    expect(convertSheetTimeToHHMM(14.5 / 24)).toBe('14:30');
  });

  it('13.25/24 → "13:15"（下午1:15）', () => {
    expect(convertSheetTimeToHHMM(13.25 / 24)).toBe('13:15');
  });

  it('9.75/24 → "09:45"（上午9:45）', () => {
    expect(convertSheetTimeToHHMM(9.75 / 24)).toBe('09:45');
  });
});

// ==================== 格式正確性（補零） ====================

describe('convertSheetTimeToHHMM — 補零格式', () => {
  it('小時個位數補零（9:00 → "09:00"）', () => {
    const result = convertSheetTimeToHHMM(0.375);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result.startsWith('09')).toBe(true);
  });

  it('分鐘個位數補零（X:05 情況）', () => {
    // 12小時5分 = (12*60+5)/(24*60) = 725/1440
    const result = convertSheetTimeToHHMM(725 / 1440);
    const minutes = result.split(':')[1];
    expect(minutes).toBe('05');
  });

  it('回傳格式符合 HH:MM（兩位數:兩位數）', () => {
    const cases = [0, 0.25, 0.5, 0.75, 14 / 24, 23 / 24];
    cases.forEach(val => {
      expect(convertSheetTimeToHHMM(val)).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});

// ==================== 邊界值 ====================

describe('convertSheetTimeToHHMM — 邊界值', () => {
  it('23:59 → "23:59"（一天最後一分鐘）', () => {
    // 23*60+59 = 1439 分鐘 → 1439/(24*60) ≈ 0.9993
    expect(convertSheetTimeToHHMM(1439 / 1440)).toBe('23:59');
  });

  it('23:30 → "23:30"', () => {
    expect(convertSheetTimeToHHMM(23.5 / 24)).toBe('23:30');
  });

  it('00:01 → "00:01"', () => {
    expect(convertSheetTimeToHHMM(1 / 1440)).toBe('00:01');
  });

  it('常見美甲預約時段（14:00）能正確轉換', () => {
    expect(convertSheetTimeToHHMM(14 / 24)).toBe('14:00');
  });

  it('常見美甲預約時段（10:00）能正確轉換', () => {
    expect(convertSheetTimeToHHMM(10 / 24)).toBe('10:00');
  });
});

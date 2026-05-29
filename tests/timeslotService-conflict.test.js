/**
 * tests/timeslotService-conflict.test.js
 * timeslotService.gs — checkSingleTimeSlotAvailabilityFromEvents 的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/timeslotService.gs。
 * 此函式是預約衝突判定的核心，邏輯為純計算（不呼叫 GAS API）。
 * bookingEvents 的 getStartTime / getEndTime / getTitle 以物件替身注入。
 * 執行方式：npm test
 */

'use strict';

// ==================== 依賴常數（來自 config.gs） ====================

const CALENDAR_CONFIG = {
  defaultDuration: 1  // 預設服務時長（小時）
};

// ==================== 依賴函式（來自 utils.gs，逐字複製） ====================

function getTaipeiDateString(date) {
  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
  const taipeiTime = new Date(date.getTime() + UTC_OFFSET_MS);
  return taipeiTime.toISOString().split('T')[0];
}

// ==================== 從 timeslotService.gs 提取的純函式（逐字複製） ====================

function checkSingleTimeSlotAvailabilityFromEvents(bookingEvents, timeSlot, date, queryDateStr) {
  try {
    const [hour, minute] = timeSlot.split(':').map(Number);

    const slotStartStr = queryDateStr + 'T' + String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00+08:00';
    const slotStart = new Date(slotStartStr);

    const endHour = hour + CALENDAR_CONFIG.defaultDuration;
    const slotEndStr = queryDateStr + 'T' + String(endHour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00+08:00';
    const slotEnd = new Date(slotEndStr);

    let conflictCount = 0;
    const conflictingEvents = [];

    for (const event of bookingEvents) {
      const eventStart = event.getStartTime();
      const eventEnd   = event.getEndTime();
      const eventDateStr = getTaipeiDateString(eventStart);

      if (eventDateStr !== queryDateStr) continue;

      if (slotStart < eventEnd && slotEnd > eventStart) {
        conflictCount++;
        conflictingEvents.push({
          title: event.getTitle(),
          start: eventStart.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
          end:   eventEnd.toLocaleString('zh-TW',   { timeZone: 'Asia/Taipei' })
        });
      }
    }

    const isAvailable = conflictCount === 0;

    return {
      available:        isAvailable,
      conflictCount:    conflictCount,
      conflictingEvents: conflictingEvents,
      reason: isAvailable ? '可預約' : `與 ${conflictCount} 個預約衝突`
    };

  } catch (error) {
    return {
      available:     false,
      conflictCount: -1,
      reason:        '檢查失敗: ' + error.message
    };
  }
}

// ==================== 輔助工具 ====================

/**
 * 建立模擬的 GAS CalendarEvent
 * @param {string} startISO - UTC ISO 字串
 * @param {string} endISO   - UTC ISO 字串
 * @param {string} title
 */
function makeEvent(startISO, endISO, title) {
  return {
    getStartTime: () => new Date(startISO),
    getEndTime:   () => new Date(endISO),
    getTitle:     () => title || '預約'
  };
}

// 測試基準：
//   queryDateStr = '2026-04-14'
//   timeSlot     = '14:00'（台北時間）
//   defaultDuration = 1 小時
//   slotStart = 2026-04-14T14:00+08:00 = UTC 06:00
//   slotEnd   = 2026-04-14T15:00+08:00 = UTC 07:00

const DATE = '2026-04-14';
const SLOT = '14:00';

// ==================== 可用性判斷（available 欄位） ====================

describe('checkSingleTimeSlotAvailabilityFromEvents — 可用性判斷', () => {
  it('無預約事件時：可預約', () => {
    const result = checkSingleTimeSlotAvailabilityFromEvents([], SLOT, null, DATE);
    expect(result.available).toBe(true);
  });

  it('事件完全重疊（14:00-15:00）：不可預約', () => {
    const events = [makeEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(false);
  });

  it('事件橫跨時段（13:30-14:30，前半重疊）：不可預約', () => {
    const events = [makeEvent('2026-04-14T05:30:00Z', '2026-04-14T06:30:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(false);
  });

  it('事件橫跨時段（14:30-15:30，後半重疊）：不可預約', () => {
    const events = [makeEvent('2026-04-14T06:30:00Z', '2026-04-14T07:30:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(false);
  });

  it('事件包含整個時段（13:00-16:00）：不可預約', () => {
    const events = [makeEvent('2026-04-14T05:00:00Z', '2026-04-14T08:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(false);
  });

  it('事件在時段開始前結束（13:00-14:00）：可預約（剛好相鄰，不重疊）', () => {
    // slotStart(14:00) < eventEnd(14:00) → false → 不衝突
    const events = [makeEvent('2026-04-14T05:00:00Z', '2026-04-14T06:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(true);
  });

  it('事件在時段結束後開始（15:00-16:00）：可預約（剛好相鄰，不重疊）', () => {
    // slotEnd(15:00) > eventStart(15:00) → false → 不衝突
    const events = [makeEvent('2026-04-14T07:00:00Z', '2026-04-14T08:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(true);
  });

  it('事件在時段前（12:00-13:00）：可預約', () => {
    const events = [makeEvent('2026-04-14T04:00:00Z', '2026-04-14T05:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(true);
  });

  it('事件在時段後（16:00-17:00）：可預約', () => {
    const events = [makeEvent('2026-04-14T08:00:00Z', '2026-04-14T09:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(true);
  });
});

// ==================== 跨日過濾 ====================

describe('checkSingleTimeSlotAvailabilityFromEvents — 跨日過濾', () => {
  it('相同時間但在隔天的事件：不影響，仍可預約', () => {
    // 事件在 4/15 14:00-15:00，查詢 4/14
    const events = [makeEvent('2026-04-15T06:00:00Z', '2026-04-15T07:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(true);
  });

  it('相同時間但在前一天的事件：不影響，仍可預約', () => {
    // 事件在 4/13 14:00-15:00，查詢 4/14
    const events = [makeEvent('2026-04-13T06:00:00Z', '2026-04-13T07:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.available).toBe(true);
  });

  it('同日衝突事件與不同日事件混合：只計同日衝突', () => {
    const events = [
      makeEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z'), // 同日，衝突
      makeEvent('2026-04-15T06:00:00Z', '2026-04-15T07:00:00Z')  // 不同日，不計
    ];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.conflictCount).toBe(1);
  });
});

// ==================== conflictCount 計算 ====================

describe('checkSingleTimeSlotAvailabilityFromEvents — conflictCount', () => {
  it('無衝突時 conflictCount=0', () => {
    const result = checkSingleTimeSlotAvailabilityFromEvents([], SLOT, null, DATE);
    expect(result.conflictCount).toBe(0);
  });

  it('一筆衝突時 conflictCount=1', () => {
    const events = [makeEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.conflictCount).toBe(1);
  });

  it('兩筆衝突時 conflictCount=2', () => {
    const events = [
      makeEvent('2026-04-14T05:30:00Z', '2026-04-14T06:30:00Z'),
      makeEvent('2026-04-14T06:30:00Z', '2026-04-14T07:30:00Z')
    ];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.conflictCount).toBe(2);
  });
});

// ==================== 回傳物件結構 ====================

describe('checkSingleTimeSlotAvailabilityFromEvents — 回傳物件結構', () => {
  it('可預約時 reason 為「可預約」', () => {
    const result = checkSingleTimeSlotAvailabilityFromEvents([], SLOT, null, DATE);
    expect(result.reason).toBe('可預約');
  });

  it('衝突時 reason 包含衝突數量', () => {
    const events = [makeEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.reason).toContain('1');
  });

  it('衝突時 conflictingEvents 陣列不為空', () => {
    const events = [makeEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z', '王小明 預約')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.conflictingEvents.length).toBe(1);
  });

  it('conflictingEvents 各元素包含 title', () => {
    const events = [makeEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z', '王小明 預約')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, SLOT, null, DATE);
    expect(result.conflictingEvents[0].title).toBe('王小明 預約');
  });

  it('可預約時 conflictingEvents 為空陣列', () => {
    const result = checkSingleTimeSlotAvailabilityFromEvents([], SLOT, null, DATE);
    expect(result.conflictingEvents).toHaveLength(0);
  });
});

// ==================== 錯誤處理 ====================

describe('checkSingleTimeSlotAvailabilityFromEvents — 錯誤處理', () => {
  // 注意：timeSlot='invalid' 不會拋例外（NaN 運算不拋），空事件陣列下仍回傳 available=true。
  // 真正觸發 catch 的條件是 bookingEvents 不可迭代（如 null）。

  it('events 傳入 null（不可迭代）時回傳 available=false, conflictCount=-1', () => {
    const result = checkSingleTimeSlotAvailabilityFromEvents(null, SLOT, null, DATE);
    expect(result.available).toBe(false);
    expect(result.conflictCount).toBe(-1);
  });

  it('events 傳入 null 時 reason 以「檢查失敗:」開頭', () => {
    const result = checkSingleTimeSlotAvailabilityFromEvents(null, SLOT, null, DATE);
    expect(result.reason).toMatch(/^檢查失敗:/);
  });
});

// ==================== 不同時段 ====================

describe('checkSingleTimeSlotAvailabilityFromEvents — 不同時段', () => {
  it('早上 09:00 時段，與 09:00-10:00 事件衝突', () => {
    // 09:00 Taipei = UTC 01:00
    const events = [makeEvent('2026-04-14T01:00:00Z', '2026-04-14T02:00:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, '09:00', null, DATE);
    expect(result.available).toBe(false);
  });

  it('晚上 20:00 時段，與 20:30-21:30 事件（後半重疊）衝突', () => {
    // 20:00 Taipei = UTC 12:00; 20:30 Taipei = UTC 12:30
    const events = [makeEvent('2026-04-14T12:30:00Z', '2026-04-14T13:30:00Z')];
    const result = checkSingleTimeSlotAvailabilityFromEvents(events, '20:00', null, DATE);
    expect(result.available).toBe(false);
  });
});

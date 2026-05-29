/**
 * tests/timeslotService-batch.test.js
 * timeslotService.gs — checkTimeSlotsAvailabilityFromEvents / extractTimeSlotsFromEvents 的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/timeslotService.gs。
 * 這兩個函式是批量時段處理的核心，邏輯為純計算（不呼叫 GAS API）。
 * checkTimeSlotsAvailabilityFromEvents：對多個時段分別呼叫衝突判定，回傳 Map。
 * extractTimeSlotsFromEvents：從事件陣列批量提取可用時段，帶去重與日期過濾。
 * 執行方式：npm test
 */

'use strict';

// ==================== 依賴常數（來自 config.gs） ====================

const CALENDAR_CONFIG = {
  defaultDuration: 1   // 預設服務時長（小時）
};

// ==================== 依賴函式（來自 utils.gs，逐字複製） ====================

function getTaipeiDateString(date) {
  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
  const taipeiTime = new Date(date.getTime() + UTC_OFFSET_MS);
  return taipeiTime.toISOString().split('T')[0];
}

// ==================== 從 timeslotService.gs 提取的純函式（逐字複製，不做任何改動） ====================

function extractTimeSlotsFromTitle(title, eventStartTime) {
  const slots = [];
  try {
    const timePatterns = [
      /(\d{1,2}):(\d{2})/g,
      /(\d{1,2})點(\d{2})?/g,
      /(\d{1,2})時(\d{2})?/g,
      /上午\s*(\d{1,2}):?(\d{2})?/g,
      /下午\s*(\d{1,2}):?(\d{2})?/g,
      /晚上\s*(\d{1,2}):?(\d{2})?/g
    ];
    const foundTimes = new Set();
    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(title)) !== null) {
        let hour = parseInt(match[1]);
        let minute = parseInt(match[2]) || 0;
        if (title.includes('下午') && hour < 12) { hour += 12; }
        else if (title.includes('上午') && hour === 12) { hour = 0; }
        const timeStr = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
        foundTimes.add(timeStr);
      }
    }
    if (foundTimes.size === 0 && eventStartTime) {
      const hour   = eventStartTime.getHours();
      const minute = eventStartTime.getMinutes();
      foundTimes.add(String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'));
    }
    for (const timeStr of foundTimes) {
      const hour = parseInt(timeStr.split(':')[0]);
      let period = '晚上';
      if (hour >= 6 && hour < 12)  period = '上午';
      else if (hour >= 12 && hour < 18) period = '下午';
      slots.push({
        time: timeStr,
        period,
        label: `${period} ${timeStr}`,
        available: true,
        source: 'calendar_event',
        originalTitle: title
      });
    }
  } catch (error) {
    console.error('提取時段時發生錯誤:', error);
  }
  return slots;
}

function extractTimeSlotsFromEvents(events, dateStr) {
  const availableSlots = [];
  try {
    for (const event of events) {
      const title          = event.getTitle();
      const eventStartTime = event.getStartTime();
      const eventDateStr   = getTaipeiDateString(eventStartTime);
      if (eventDateStr === dateStr) {
        const timeSlots = extractTimeSlotsFromTitle(title, eventStartTime);
        for (const slot of timeSlots) {
          const existingSlot = availableSlots.find(s => s.time === slot.time);
          if (!existingSlot) {
            availableSlots.push(slot);
          }
        }
      }
    }
    availableSlots.sort((a, b) => a.time.localeCompare(b.time));
    return availableSlots;
  } catch (error) {
    console.error(`從事件中提取時段失敗 (${dateStr}):`, error);
    return [];
  }
}

function checkSingleTimeSlotAvailabilityFromEvents(bookingEvents, timeSlot, date, queryDateStr) {
  try {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const slotStartStr = queryDateStr + 'T' + String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00+08:00';
    const slotStart    = new Date(slotStartStr);
    const endHour      = hour + CALENDAR_CONFIG.defaultDuration;
    const slotEndStr   = queryDateStr + 'T' + String(endHour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00+08:00';
    const slotEnd      = new Date(slotEndStr);

    let conflictCount = 0;
    const conflictingEvents = [];

    for (const event of bookingEvents) {
      const eventStart   = event.getStartTime();
      const eventEnd     = event.getEndTime();
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

    return {
      available:         conflictCount === 0,
      conflictCount,
      conflictingEvents,
      reason: conflictCount === 0 ? '可預約' : `與 ${conflictCount} 個預約衝突`
    };
  } catch (error) {
    return { available: false, conflictCount: -1, reason: '檢查失敗: ' + error.message };
  }
}

function checkTimeSlotsAvailabilityFromEvents(bookingEvents, timeSlots, date, queryDateStr) {
  const availability = {};
  try {
    for (const timeSlot of timeSlots) {
      availability[timeSlot] = checkSingleTimeSlotAvailabilityFromEvents(bookingEvents, timeSlot, date, queryDateStr);
    }
    return availability;
  } catch (error) {
    console.error(`檢查時段可用性失敗 (${queryDateStr}):`, error);
    for (const slot of timeSlots) {
      availability[slot] = { available: false, conflictCount: -1, reason: '檢查失敗: ' + error.message };
    }
    return availability;
  }
}

// ==================== 輔助工具 ====================

/**
 * 建立模擬 GAS CalendarEvent（預約行事曆用）
 * @param {string} startISO - UTC ISO 字串
 * @param {string} endISO   - UTC ISO 字串
 * @param {string} title
 */
function makeBookingEvent(startISO, endISO, title) {
  return {
    getStartTime: () => new Date(startISO),
    getEndTime:   () => new Date(endISO),
    getTitle:     () => title || '預約'
  };
}

/**
 * 建立模擬 GAS CalendarEvent（時段日曆用，標題帶時間字串）
 * 事件持續時間設定為 1 小時（不影響時段提取邏輯）
 * @param {string} startISO - UTC ISO 字串（用於日期比對）
 * @param {string} title    - 事件標題（應包含時間格式字串）
 */
function makeTimeslotEvent(startISO, title) {
  const d = new Date(startISO);
  return {
    getTitle:     () => title,
    getStartTime: () => d,
    getEndTime:   () => new Date(d.getTime() + 3600000)
  };
}

// 測試基準：
//   queryDateStr = '2026-04-14'（台北日期）
//   14:00 Taipei = UTC 06:00；10:00 Taipei = UTC 02:00；16:00 Taipei = UTC 08:00
//   defaultDuration = 1 小時

const DATE = '2026-04-14';

// ==================== checkTimeSlotsAvailabilityFromEvents — 回傳 Map 結構 ====================

describe('checkTimeSlotsAvailabilityFromEvents — 回傳 Map 結構', () => {
  it('空時段陣列時回傳空物件', () => {
    const result = checkTimeSlotsAvailabilityFromEvents([], [], null, DATE);
    expect(result).toEqual({});
  });

  it('回傳物件的 key 與傳入 timeSlots 一致', () => {
    const slots  = ['10:00', '14:00'];
    const result = checkTimeSlotsAvailabilityFromEvents([], slots, null, DATE);
    expect(Object.keys(result)).toEqual(expect.arrayContaining(slots));
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('無預約事件時所有時段 available=true', () => {
    const result = checkTimeSlotsAvailabilityFromEvents([], ['10:00', '14:00', '16:00'], null, DATE);
    expect(result['10:00'].available).toBe(true);
    expect(result['14:00'].available).toBe(true);
    expect(result['16:00'].available).toBe(true);
  });

  it('無衝突時所有時段 conflictCount=0', () => {
    const result = checkTimeSlotsAvailabilityFromEvents([], ['10:00', '14:00'], null, DATE);
    expect(result['10:00'].conflictCount).toBe(0);
    expect(result['14:00'].conflictCount).toBe(0);
  });
});

// ==================== checkTimeSlotsAvailabilityFromEvents — 衝突判定 ====================

describe('checkTimeSlotsAvailabilityFromEvents — 衝突判定', () => {
  it('與 14:00-15:00 事件衝突時，14:00 時段 available=false', () => {
    const events = [makeBookingEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z')];
    const result = checkTimeSlotsAvailabilityFromEvents(events, ['14:00', '10:00'], null, DATE);
    expect(result['14:00'].available).toBe(false);
    expect(result['10:00'].available).toBe(true);
  });

  it('多個時段各自與不同事件衝突', () => {
    const events = [
      makeBookingEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z'), // 衝突 14:00
      makeBookingEvent('2026-04-14T02:00:00Z', '2026-04-14T03:00:00Z')  // 衝突 10:00
    ];
    const result = checkTimeSlotsAvailabilityFromEvents(events, ['10:00', '14:00', '16:00'], null, DATE);
    expect(result['14:00'].available).toBe(false);
    expect(result['10:00'].available).toBe(false);
    expect(result['16:00'].available).toBe(true);
  });

  it('各時段的 conflictCount 各自獨立計算', () => {
    // 14:00 有 2 筆衝突；16:00 無衝突
    const events = [
      makeBookingEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z'), // 14:00 衝突
      makeBookingEvent('2026-04-14T05:30:00Z', '2026-04-14T06:30:00Z')  // 14:00 前半重疊
    ];
    const result = checkTimeSlotsAvailabilityFromEvents(events, ['14:00', '16:00'], null, DATE);
    expect(result['14:00'].conflictCount).toBe(2);
    expect(result['16:00'].conflictCount).toBe(0);
  });

  it('衝突時段的 reason 包含衝突數量', () => {
    const events = [makeBookingEvent('2026-04-14T06:00:00Z', '2026-04-14T07:00:00Z')];
    const result = checkTimeSlotsAvailabilityFromEvents(events, ['14:00'], null, DATE);
    expect(result['14:00'].reason).toContain('1');
  });

  it('可用時段的 reason 為「可預約」', () => {
    const result = checkTimeSlotsAvailabilityFromEvents([], ['10:00'], null, DATE);
    expect(result['10:00'].reason).toBe('可預約');
  });

  it('不同日的事件不影響今日時段', () => {
    // 事件在 4/15 14:00-15:00，查詢 4/14
    const events = [makeBookingEvent('2026-04-15T06:00:00Z', '2026-04-15T07:00:00Z')];
    const result = checkTimeSlotsAvailabilityFromEvents(events, ['14:00'], null, DATE);
    expect(result['14:00'].available).toBe(true);
  });
});

// ==================== checkTimeSlotsAvailabilityFromEvents — 單一時段 ====================

describe('checkTimeSlotsAvailabilityFromEvents — 單一時段查詢', () => {
  it('只查一個時段時回傳一個 key', () => {
    const result = checkTimeSlotsAvailabilityFromEvents([], ['14:00'], null, DATE);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty('14:00');
  });

  it('每個時段值包含 available, conflictCount, reason 欄位', () => {
    const result = checkTimeSlotsAvailabilityFromEvents([], ['14:00'], null, DATE);
    expect(result['14:00']).toHaveProperty('available');
    expect(result['14:00']).toHaveProperty('conflictCount');
    expect(result['14:00']).toHaveProperty('reason');
  });
});

// ==================== extractTimeSlotsFromEvents — 基本行為 ====================

describe('extractTimeSlotsFromEvents — 基本時段提取', () => {
  it('無事件時回傳空陣列', () => {
    expect(extractTimeSlotsFromEvents([], DATE)).toHaveLength(0);
  });

  it('事件標題含時間且日期匹配，提取到該時段', () => {
    // 事件 UTC 06:00 = Taipei 14:00
    const events = [makeTimeslotEvent('2026-04-14T06:00:00Z', '14:00')];
    const result  = extractTimeSlotsFromEvents(events, DATE);
    expect(result.some(s => s.time === '14:00')).toBe(true);
  });

  it('事件日期不匹配時不提取（隔天事件）', () => {
    // 事件在 4/15，查詢 4/14
    const events = [makeTimeslotEvent('2026-04-15T06:00:00Z', '14:00')];
    expect(extractTimeSlotsFromEvents(events, DATE)).toHaveLength(0);
  });

  it('事件日期不匹配時不提取（前一天事件）', () => {
    // 事件在 4/13，查詢 4/14
    const events = [makeTimeslotEvent('2026-04-13T06:00:00Z', '14:00')];
    expect(extractTimeSlotsFromEvents(events, DATE)).toHaveLength(0);
  });

  it('多個不同時段的事件各自提取', () => {
    const events = [
      makeTimeslotEvent('2026-04-14T02:00:00Z', '10:00'), // 10:00 Taipei
      makeTimeslotEvent('2026-04-14T06:00:00Z', '14:00')  // 14:00 Taipei
    ];
    const result = extractTimeSlotsFromEvents(events, DATE);
    const times  = result.map(s => s.time);
    expect(times).toContain('10:00');
    expect(times).toContain('14:00');
  });

  it('重複時段去重，相同時間只出現一次', () => {
    const events = [
      makeTimeslotEvent('2026-04-14T02:00:00Z', '10:00'),
      makeTimeslotEvent('2026-04-14T02:00:00Z', '10:00')
    ];
    const result = extractTimeSlotsFromEvents(events, DATE);
    const count  = result.filter(s => s.time === '10:00').length;
    expect(count).toBe(1);
  });

  it('回傳的時段依時間字串升冪排序（早→晚）', () => {
    const events = [
      makeTimeslotEvent('2026-04-14T06:00:00Z', '14:00'),
      makeTimeslotEvent('2026-04-14T02:00:00Z', '10:00'),
      makeTimeslotEvent('2026-04-14T08:00:00Z', '16:00')
    ];
    const result = extractTimeSlotsFromEvents(events, DATE);
    const times  = result.map(s => s.time);
    expect(times).toEqual([...times].sort());
  });
});

// ==================== extractTimeSlotsFromEvents — 時段物件屬性 ====================

describe('extractTimeSlotsFromEvents — 時段物件屬性', () => {
  const BASE_EVENT = [makeTimeslotEvent('2026-04-14T02:00:00Z', '10:00')];

  it('物件包含 time 屬性', () => {
    const result = extractTimeSlotsFromEvents(BASE_EVENT, DATE);
    expect(result[0]).toHaveProperty('time');
  });

  it('物件包含 period 屬性', () => {
    const result = extractTimeSlotsFromEvents(BASE_EVENT, DATE);
    expect(result[0]).toHaveProperty('period');
  });

  it('物件包含 label 屬性', () => {
    const result = extractTimeSlotsFromEvents(BASE_EVENT, DATE);
    expect(result[0]).toHaveProperty('label');
  });

  it('物件 available 固定為 true', () => {
    const result = extractTimeSlotsFromEvents(BASE_EVENT, DATE);
    expect(result[0].available).toBe(true);
  });

  it('物件 source 固定為 calendar_event', () => {
    const result = extractTimeSlotsFromEvents(BASE_EVENT, DATE);
    expect(result[0].source).toBe('calendar_event');
  });

  it('10:00 → period 為「上午」', () => {
    const result = extractTimeSlotsFromEvents(BASE_EVENT, DATE);
    expect(result[0].period).toBe('上午');
  });

  it('14:00 → period 為「下午」', () => {
    const events = [makeTimeslotEvent('2026-04-14T06:00:00Z', '14:00')];
    const result  = extractTimeSlotsFromEvents(events, DATE);
    expect(result[0].period).toBe('下午');
  });
});

// ==================== extractTimeSlotsFromEvents — 混合日期 ====================

describe('extractTimeSlotsFromEvents — 同日與跨日混合', () => {
  it('同日兩筆事件 + 跨日一筆：只提取同日時段', () => {
    const events = [
      makeTimeslotEvent('2026-04-14T02:00:00Z', '10:00'), // 同日 10:00
      makeTimeslotEvent('2026-04-14T06:00:00Z', '14:00'), // 同日 14:00
      makeTimeslotEvent('2026-04-15T02:00:00Z', '10:00')  // 不同日，略過
    ];
    const result = extractTimeSlotsFromEvents(events, DATE);
    expect(result).toHaveLength(2);
  });

  it('全部事件均在不同日時回傳空陣列', () => {
    const events = [
      makeTimeslotEvent('2026-04-13T06:00:00Z', '14:00'),
      makeTimeslotEvent('2026-04-15T06:00:00Z', '14:00')
    ];
    expect(extractTimeSlotsFromEvents(events, DATE)).toHaveLength(0);
  });
});

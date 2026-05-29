/**
 * tests/timeslotService.test.js
 * timeslotService.gs — extractTimeSlotsFromTitle 純函式的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/timeslotService.gs。
 * extractTimeSlotsFromTitle 無 GAS API 依賴；
 * eventStartTime 參數只需要 getHours() / getMinutes()，可用原生 Date 替代。
 * 執行方式：npm test
 */

'use strict';

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

        if (title.includes('下午') && hour < 12) {
          hour += 12;
        } else if (title.includes('上午') && hour === 12) {
          hour = 0;
        }

        const timeStr = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
        foundTimes.add(timeStr);
      }
    }

    // 如果標題中沒有時間，使用事件開始時間
    if (foundTimes.size === 0 && eventStartTime) {
      const hour = eventStartTime.getHours();
      const minute = eventStartTime.getMinutes();
      const timeStr = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
      foundTimes.add(timeStr);
    }

    for (const timeStr of foundTimes) {
      const hour = parseInt(timeStr.split(':')[0]);
      let period = '晚上';
      if (hour >= 6 && hour < 12) period = '上午';
      else if (hour >= 12 && hour < 18) period = '下午';

      slots.push({
        time: timeStr,
        period: period,
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

// ==================== 輔助工具 ====================

/** 傳入時分，回傳具有 getHours/getMinutes 方法的物件（模擬 GAS CalendarEvent startTime） */
function makeEventStartTime(hour, minute) {
  return {
    getHours: () => hour,
    getMinutes: () => minute
  };
}

// ==================== 標題解析 — 標準時間格式 ====================

describe('extractTimeSlotsFromTitle — HH:MM 格式', () => {
  it('「14:30」解析出時段 14:30', () => {
    const slots = extractTimeSlotsFromTitle('14:30', null);
    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('14:30');
  });

  it('「10:00」解析出時段 10:00', () => {
    const slots = extractTimeSlotsFromTitle('10:00', null);
    expect(slots[0].time).toBe('10:00');
  });

  it('「9:00」（個位數小時）解析出 09:00', () => {
    const slots = extractTimeSlotsFromTitle('9:00', null);
    expect(slots[0].time).toBe('09:00');
  });

  it('「14:30 16:00」解析出兩個時段', () => {
    const slots = extractTimeSlotsFromTitle('14:30 16:00', null);
    const times = slots.map(s => s.time).sort();
    expect(times).toContain('14:30');
    expect(times).toContain('16:00');
  });

  it('「10:00 14:00 17:00」解析出三個時段', () => {
    const slots = extractTimeSlotsFromTitle('10:00 14:00 17:00', null);
    expect(slots.length).toBeGreaterThanOrEqual(3);
  });
});

// ==================== 標題解析 — 下午調整 ====================

describe('extractTimeSlotsFromTitle — 下午時間調整', () => {
  it('「下午2:30」調整為 14:30', () => {
    const slots = extractTimeSlotsFromTitle('下午2:30', null);
    expect(slots.some(s => s.time === '14:30')).toBe(true);
  });

  it('「下午3點」調整為 15:00', () => {
    const slots = extractTimeSlotsFromTitle('下午3點', null);
    expect(slots.some(s => s.time === '15:00')).toBe(true);
  });

  it('「下午12:00」（已達12，不再加12）', () => {
    // hour=12 不滿足 hour<12，所以不加 12，保持 12:00
    const slots = extractTimeSlotsFromTitle('下午12:00', null);
    expect(slots.some(s => s.time === '12:00')).toBe(true);
  });
});

// ==================== 標題解析 — 上午調整 ====================

describe('extractTimeSlotsFromTitle — 上午時間調整', () => {
  it('「上午10:00」不調整，仍為 10:00', () => {
    const slots = extractTimeSlotsFromTitle('上午10:00', null);
    expect(slots.some(s => s.time === '10:00')).toBe(true);
  });

  it('「上午12:00」（正午12點 → 視為 00:00）', () => {
    // 上午12時特殊：hour===12 且 title.includes('上午') → hour=0
    const slots = extractTimeSlotsFromTitle('上午12:00', null);
    expect(slots.some(s => s.time === '00:00')).toBe(true);
  });
});

// ==================== 時段屬性與結構 ====================

describe('extractTimeSlotsFromTitle — 回傳物件屬性', () => {
  it('時段物件包含 time, period, label, available, source, originalTitle', () => {
    const slots = extractTimeSlotsFromTitle('14:30', null);
    const slot = slots[0];
    expect(slot).toHaveProperty('time');
    expect(slot).toHaveProperty('period');
    expect(slot).toHaveProperty('label');
    expect(slot).toHaveProperty('available', true);
    expect(slot).toHaveProperty('source', 'calendar_event');
    expect(slot).toHaveProperty('originalTitle', '14:30');
  });

  it('label 格式為「period time」', () => {
    const slots = extractTimeSlotsFromTitle('14:30', null);
    expect(slots[0].label).toBe('下午 14:30');
  });
});

// ==================== 時段分類（上午/下午/晚上） ====================

describe('extractTimeSlotsFromTitle — period 分類', () => {
  it('06:00 → 上午', () => {
    const slots = extractTimeSlotsFromTitle('06:00', null);
    expect(slots[0].period).toBe('上午');
  });

  it('11:00 → 上午', () => {
    const slots = extractTimeSlotsFromTitle('11:00', null);
    expect(slots[0].period).toBe('上午');
  });

  it('12:00 → 下午', () => {
    const slots = extractTimeSlotsFromTitle('12:00', null);
    expect(slots[0].period).toBe('下午');
  });

  it('17:00 → 下午', () => {
    const slots = extractTimeSlotsFromTitle('17:00', null);
    expect(slots[0].period).toBe('下午');
  });

  it('18:00 → 晚上', () => {
    const slots = extractTimeSlotsFromTitle('18:00', null);
    expect(slots[0].period).toBe('晚上');
  });

  it('23:00 → 晚上', () => {
    const slots = extractTimeSlotsFromTitle('23:00', null);
    expect(slots[0].period).toBe('晚上');
  });

  it('05:00 → 晚上（深夜）', () => {
    const slots = extractTimeSlotsFromTitle('05:00', null);
    expect(slots[0].period).toBe('晚上');
  });
});

// ==================== eventStartTime 回退 ====================

describe('extractTimeSlotsFromTitle — eventStartTime 回退', () => {
  it('標題無時間時使用 eventStartTime（10:00）', () => {
    const eventStart = makeEventStartTime(10, 0);
    const slots = extractTimeSlotsFromTitle('預約時段', eventStart);
    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('10:00');
  });

  it('標題無時間時使用 eventStartTime（14:30）', () => {
    const eventStart = makeEventStartTime(14, 30);
    const slots = extractTimeSlotsFromTitle('開放預約', eventStart);
    expect(slots[0].time).toBe('14:30');
  });

  it('標題有時間時，忽略 eventStartTime', () => {
    const eventStart = makeEventStartTime(9, 0);
    const slots = extractTimeSlotsFromTitle('14:00', eventStart);
    // 應使用標題的 14:00，不使用 eventStartTime 的 09:00
    expect(slots.every(s => s.time !== '09:00')).toBe(true);
    expect(slots.some(s => s.time === '14:00')).toBe(true);
  });

  it('標題無時間且 eventStartTime 為 null 時回傳空陣列', () => {
    const slots = extractTimeSlotsFromTitle('美甲預約開放', null);
    expect(slots).toHaveLength(0);
  });
});

// ==================== 重複時間去重 ====================

describe('extractTimeSlotsFromTitle — 重複時間去重', () => {
  it('相同時間只出現一次（「14:00」只產生一個時段）', () => {
    // 即使多個 pattern 都能匹配到 14:00，Set 確保去重
    const slots = extractTimeSlotsFromTitle('14:00', null);
    const count = slots.filter(s => s.time === '14:00').length;
    expect(count).toBe(1);
  });
});

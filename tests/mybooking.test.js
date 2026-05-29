/**
 * tests/mybooking.test.js
 * mybooking.js — formatDateChineseTaipei / generateBookingCardHTML 純函式的 Jest 測試
 *
 * 原始碼位於 public/mybooking.js。
 * 兩個函式無 LIFF / API 依賴，可直接在 Node 環境驗證。
 * 執行方式：npm test
 */

'use strict';

// ==================== 最小 SecurityUtils 替身（僅透傳值，不影響過濾邏輯） ====================

const SecurityUtils = {
  maskName:  (name)  => name  || '',
  maskPhone: (phone) => phone || ''
};

// ==================== 從 mybooking.js 提取的純函式（逐字複製，不做任何改動） ====================

function formatDateChineseTaipei(dateStr, timeStr) {
  try {
    const time = (typeof timeStr === 'string' && /^\d{1,2}:\d{2}$/.test(timeStr)) ? timeStr : '12:00';
    const iso = `${dateStr}T${time}:00+08:00`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(dateStr || '');
    const formatter = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year:     'numeric',
      month:    'numeric',
      day:      'numeric',
      weekday:  'short'
    });
    const parts = formatter.formatToParts(d);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const weekdayRaw  = map.weekday || '';
    const weekdayChar = weekdayRaw.replace('星期', '').replace('週', '');
    return `${map.year}年${map.month}月${map.day}日（${weekdayChar}）`;
  } catch (e) {
    return String(dateStr || '');
  }
}

function generateBookingCardHTML(bookingInfo) {
  let html = '';
  const now = new Date();
  const futureBookings = bookingInfo.filter(booking => {
    try {
      const bookingDateTime = new Date(`${booking.date}T${booking.time}:00+08:00`);
      const isFutureBooking = bookingDateTime > now;
      return isFutureBooking;
    } catch (error) {
      return true;
    }
  });

  if (futureBookings.length === 0) {
    return '';
  }

  futureBookings.forEach((booking) => {
    const displayDate = formatDateChineseTaipei(booking.date, booking.time);
    let displayTime = booking.time;
    if (displayTime && typeof displayTime === 'string' && displayTime.includes('T')) {
      try {
        const timeObj = new Date(displayTime);
        const hours   = timeObj.getHours();
        const minutes = timeObj.getMinutes();
        displayTime = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
      } catch (e) {
        displayTime = booking.time;
      }
    }

    html += `
      <div class="booking-card">
        <div class="booking-details">
          <div class="datetime-section">
            <div class="booking-detail-item">
              <span class="booking-detail-label">客戶姓名</span>
              <span class="booking-detail-value customer-name-value">${SecurityUtils.maskName(booking.customerName) || '未提供姓名'}</span>
            </div>
            <div class="booking-detail-item">
              <span class="booking-detail-label">連絡電話</span>
              <span class="booking-detail-value">${SecurityUtils.maskPhone(booking.phone) || '未提供電話'}</span>
            </div>
            <div class="booking-detail-item">
              <span class="booking-detail-label">預約日期</span>
              <span class="booking-detail-value">${displayDate || '未提供日期'}</span>
            </div>
            <div class="booking-detail-item">
              <span class="booking-detail-label">預約時間</span>
              <span class="booking-detail-value">${displayTime || '未提供時間'}</span>
            </div>
          </div>
          <div class="service-section">
            <div class="service-section-title">服務項目</div>
            <div class="service-item">
              <span class="service-label">服務：</span>
              <span class="service-value">${booking.services || '無'}</span>
            </div>
            <div class="service-item">
              <span class="service-label">卸甲：</span>
              <span class="service-value">${booking.removal || '無'}</span>
            </div>
            <div class="service-item">
              <span class="service-label">延甲：</span>
              <span class="service-value">${booking.quantity || '無'}</span>
            </div>
            <div class="service-item">
              <span class="service-label">備註：</span>
              <span class="service-value">${booking.remarks || '無'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  return html;
}

// ==================== formatDateChineseTaipei ====================

describe('formatDateChineseTaipei', () => {
  it('有效日期回傳包含年份的字串', () => {
    const result = formatDateChineseTaipei('2026-04-13', '10:00');
    expect(result).toContain('2026年');
  });

  it('有效日期回傳包含月份（不補零）', () => {
    const result = formatDateChineseTaipei('2026-04-13', '10:00');
    expect(result).toContain('4月');
  });

  it('有效日期回傳包含日期（不補零）', () => {
    const result = formatDateChineseTaipei('2026-04-13', '10:00');
    expect(result).toContain('13日');
  });

  it('2026-04-13 是星期一，括號內顯示「一」', () => {
    const result = formatDateChineseTaipei('2026-04-13', '10:00');
    expect(result).toContain('（一）');
  });

  it('2026-04-15 是星期三，括號內顯示「三」', () => {
    const result = formatDateChineseTaipei('2026-04-15', '10:00');
    expect(result).toContain('（三）');
  });

  it('2026-04-12 是星期日，括號內顯示「日」', () => {
    const result = formatDateChineseTaipei('2026-04-12', '10:00');
    expect(result).toContain('（日）');
  });

  it('缺少 timeStr 時使用預設時間（不崩潰）', () => {
    const result = formatDateChineseTaipei('2026-04-13');
    expect(result).toContain('2026年');
    expect(result).toContain('4月');
    expect(result).toContain('13日');
  });

  it('timeStr 格式無效時使用預設 12:00（不崩潰）', () => {
    const result = formatDateChineseTaipei('2026-04-13', 'invalid');
    expect(result).toContain('2026年');
  });

  it('無效 dateStr 時回傳原始字串', () => {
    const result = formatDateChineseTaipei('not-a-date', '10:00');
    expect(result).toBe('not-a-date');
  });

  it('空字串 dateStr 時回傳空字串', () => {
    const result = formatDateChineseTaipei('', '10:00');
    expect(result).toBe('');
  });

  it('1月個位數不補零', () => {
    const result = formatDateChineseTaipei('2026-01-05', '10:00');
    expect(result).toContain('1月');
  });

  it('回傳格式符合「YYYY年M月D日（X）」', () => {
    const result = formatDateChineseTaipei('2026-04-13', '10:00');
    expect(result).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日（.）$/);
  });
});

// ==================== generateBookingCardHTML — 未來預約過濾 ====================

describe('generateBookingCardHTML — 未來預約過濾', () => {
  // 固定「現在」為 2026-04-13T10:00:00+08:00 = 2026-04-13T02:00:00Z
  const FAKE_NOW = new Date('2026-04-13T02:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------- 基本測試資料 ----------

  const FUTURE_BOOKING = {
    date: '2026-04-14', time: '14:00',
    customerName: '王芳', phone: '0912345678',
    services: '單色', removal: '需要', quantity: '1-3', remarks: ''
  };

  const PAST_BOOKING = {
    date: '2026-04-12', time: '14:00',
    customerName: '李梅', phone: '0987654321',
    services: '貓眼', removal: '不用', quantity: '', remarks: '無'
  };

  const SAME_DAY_FUTURE = {
    date: '2026-04-13', time: '14:00', // 今天14:00，現在10:00 → 未來
    customerName: '陳美', phone: '0911111111',
    services: '不挑款', removal: '需要', quantity: '', remarks: ''
  };

  const SAME_DAY_PAST = {
    date: '2026-04-13', time: '08:00', // 今天08:00，現在10:00 → 過去
    customerName: '林小花', phone: '0922222222',
    services: '單色', removal: '不用', quantity: '', remarks: ''
  };

  // ---------- 測試案例 ----------

  it('只有未來預約時回傳含 booking-card 的 HTML', () => {
    const html = generateBookingCardHTML([FUTURE_BOOKING]);
    expect(html).toContain('booking-card');
  });

  it('只有過去預約時回傳空字串', () => {
    expect(generateBookingCardHTML([PAST_BOOKING]).trim()).toBe('');
  });

  it('空陣列時回傳空字串', () => {
    expect(generateBookingCardHTML([]).trim()).toBe('');
  });

  it('混合資料時只保留未來預約（共1筆）', () => {
    const html = generateBookingCardHTML([FUTURE_BOOKING, PAST_BOOKING]);
    const count = (html.match(/booking-card/g) || []).length;
    expect(count).toBe(1);
  });

  it('同天未來時段（今日14:00，現在10:00）視為未來', () => {
    expect(generateBookingCardHTML([SAME_DAY_FUTURE])).toContain('booking-card');
  });

  it('同天已過時段（今日08:00，現在10:00）視為過去', () => {
    expect(generateBookingCardHTML([SAME_DAY_PAST]).trim()).toBe('');
  });

  it('多筆未來預約各自生成一張卡片', () => {
    const anotherFuture = { ...FUTURE_BOOKING, date: '2026-04-15', customerName: '趙敏' };
    const html = generateBookingCardHTML([FUTURE_BOOKING, anotherFuture]);
    const count = (html.match(/booking-card/g) || []).length;
    expect(count).toBe(2);
  });

  it('所有預約均為過去時，回傳空字串', () => {
    const allPast = [
      { ...PAST_BOOKING, date: '2026-04-10' },
      { ...PAST_BOOKING, date: '2026-04-11' }
    ];
    expect(generateBookingCardHTML(allPast).trim()).toBe('');
  });
});

// ==================== generateBookingCardHTML — 卡片內容 ====================

describe('generateBookingCardHTML — 卡片內容渲染', () => {
  const FAKE_NOW = new Date('2026-04-13T02:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const BOOKING = {
    date: '2026-04-14', time: '14:00',
    customerName: '王芳', phone: '0912345678',
    services: '單色', removal: '需要', quantity: '1-3', remarks: '請輕柔'
  };

  it('卡片包含服務項目', () => {
    expect(generateBookingCardHTML([BOOKING])).toContain('單色');
  });

  it('卡片包含卸甲資訊', () => {
    expect(generateBookingCardHTML([BOOKING])).toContain('需要');
  });

  it('卡片包含延甲數量', () => {
    expect(generateBookingCardHTML([BOOKING])).toContain('1-3');
  });

  it('卡片包含備註', () => {
    expect(generateBookingCardHTML([BOOKING])).toContain('請輕柔');
  });

  it('卡片包含預約時間', () => {
    expect(generateBookingCardHTML([BOOKING])).toContain('14:00');
  });

  it('空服務項目顯示「無」', () => {
    const b = { ...BOOKING, services: '' };
    const html = generateBookingCardHTML([b]);
    expect(html).toContain('<span class="service-value">無</span>');
  });

  it('空備註顯示「無」', () => {
    const b = { ...BOOKING, remarks: '' };
    const html = generateBookingCardHTML([b]);
    // 備註那行的 service-value 應為「無」
    expect(html).toMatch(/<span class="service-label">備註：<\/span>\s*<span class="service-value">無<\/span>/);
  });

  it('空延甲顯示「無」', () => {
    const b = { ...BOOKING, quantity: '' };
    const html = generateBookingCardHTML([b]);
    expect(html).toMatch(/<span class="service-label">延甲：<\/span>\s*<span class="service-value">無<\/span>/);
  });

  it('缺少客戶姓名時顯示「未提供姓名」', () => {
    const b = { ...BOOKING, customerName: '' };
    const html = generateBookingCardHTML([b]);
    expect(html).toContain('未提供姓名');
  });

  it('缺少電話時顯示「未提供電話」', () => {
    const b = { ...BOOKING, phone: '' };
    const html = generateBookingCardHTML([b]);
    expect(html).toContain('未提供電話');
  });
});

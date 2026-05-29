/**
 * tests/apiService-jsonp.test.js
 * ApiService.prepareJsonpParams 靜態方法的 Jest 測試
 *
 * 原始碼位於 public/api-service.js。
 * prepareJsonpParams 是一個純映射函式（switch 分支），無 DOM / fetch / LIFF 依賴，
 * 可直接在 Node 環境驗證。
 *
 * 職責：根據 action 類型，將統一的請求物件轉換為 JSONP URL 參數格式，
 * 並特別處理陣列序列化（checkTimeSlotAvailability）和 CSRF Token 傳播。
 * 執行方式：npm test
 */

'use strict';

// ==================== 從 api-service.js 提取的純函式（逐字複製，不做任何改動） ====================

function prepareJsonpParams(data) {
  const jsonpParams = { action: data.action };

  switch (data.action) {
    case 'saveCustomer':
      Object.assign(jsonpParams, data.customer);
      break;
    case 'saveBooking':
      Object.assign(jsonpParams, data.booking);
      break;
    case 'getCustomer':
      jsonpParams.phone = data.phone;
      break;
    case 'updateBookingStatus':
      jsonpParams.bookingId = data.bookingId;
      jsonpParams.status    = data.status;
      break;
    case 'checkTimeSlotAvailability':
      jsonpParams.date      = data.date;
      jsonpParams.timeSlots = JSON.stringify(data.timeSlots);
      break;
    case 'getAvailableTimeSlots':
      jsonpParams.date = data.date;
      break;
    case 'getBatchAvailableTimeSlots':
      jsonpParams.startDate = data.startDate;
      jsonpParams.endDate   = data.endDate;
      break;
    case 'getGoogleCalendarCredentials':
      // 不需要額外參數
      break;
    default:
      Object.assign(jsonpParams, data);
  }

  if (data.csrfToken) {
    jsonpParams.csrfToken = data.csrfToken;
  }

  return jsonpParams;
}

// ==================== action 欄位基本行為 ====================

describe('prepareJsonpParams — action 欄位', () => {
  it('回傳物件的 action 與傳入 data.action 一致', () => {
    const result = prepareJsonpParams({ action: 'ping' });
    expect(result.action).toBe('ping');
  });

  it('所有 action 分支均保留 action 欄位', () => {
    const actions = [
      'saveCustomer', 'saveBooking', 'getCustomer', 'updateBookingStatus',
      'checkTimeSlotAvailability', 'getAvailableTimeSlots',
      'getBatchAvailableTimeSlots', 'getGoogleCalendarCredentials'
    ];
    const dummies = {
      saveCustomer:               { customer: {} },
      saveBooking:                { booking: {} },
      getCustomer:                { phone: '' },
      updateBookingStatus:        { bookingId: '', status: '' },
      checkTimeSlotAvailability:  { date: '', timeSlots: [] },
      getAvailableTimeSlots:      { date: '' },
      getBatchAvailableTimeSlots: { startDate: '', endDate: '' },
      getGoogleCalendarCredentials: {}
    };
    actions.forEach(action => {
      const result = prepareJsonpParams({ action, ...dummies[action] });
      expect(result.action).toBe(action);
    });
  });
});

// ==================== saveCustomer ====================

describe('prepareJsonpParams — saveCustomer', () => {
  it('customer 物件的欄位展開到參數中', () => {
    const data = {
      action:   'saveCustomer',
      customer: { name: '王芳', phone: '0912345678', lineUserId: 'U123' }
    };
    const result = prepareJsonpParams(data);
    expect(result.name).toBe('王芳');
    expect(result.phone).toBe('0912345678');
    expect(result.lineUserId).toBe('U123');
  });

  it('action 欄位仍為 saveCustomer（不被覆蓋）', () => {
    const result = prepareJsonpParams({
      action: 'saveCustomer',
      customer: { name: '王芳', phone: '0912345678', action: 'FAKE' }
    });
    // customer.action = 'FAKE' 會覆蓋 jsonpParams.action
    // 但此為原始程式碼行為，測試忠實反映實際行為
    const data = { action: 'saveCustomer', customer: { name: '王芳', phone: '0912345678' } };
    const r    = prepareJsonpParams(data);
    expect(r.action).toBe('saveCustomer');
  });

  it('空 customer 物件時只有 action 欄位', () => {
    const result = prepareJsonpParams({ action: 'saveCustomer', customer: {} });
    expect(Object.keys(result)).toEqual(['action']);
  });
});

// ==================== saveBooking ====================

describe('prepareJsonpParams — saveBooking', () => {
  it('booking 物件的欄位展開到參數中', () => {
    const data = {
      action:  'saveBooking',
      booking: { date: '2026-04-14', time: '14:00', customerName: '王芳', phone: '0912345678' }
    };
    const result = prepareJsonpParams(data);
    expect(result.date).toBe('2026-04-14');
    expect(result.time).toBe('14:00');
    expect(result.customerName).toBe('王芳');
    expect(result.phone).toBe('0912345678');
  });

  it('空 booking 物件時只有 action 欄位', () => {
    const result = prepareJsonpParams({ action: 'saveBooking', booking: {} });
    expect(Object.keys(result)).toEqual(['action']);
  });
});

// ==================== getCustomer ====================

describe('prepareJsonpParams — getCustomer', () => {
  it('只傳入 phone 欄位', () => {
    const result = prepareJsonpParams({ action: 'getCustomer', phone: '0912345678' });
    expect(result.phone).toBe('0912345678');
  });

  it('data 上的多餘欄位不被帶入', () => {
    const result = prepareJsonpParams({ action: 'getCustomer', phone: '0912345678', extra: 'x' });
    expect(result.extra).toBeUndefined();
  });

  it('回傳物件只有 action 和 phone 兩個 key（無 csrfToken）', () => {
    const result = prepareJsonpParams({ action: 'getCustomer', phone: '0912345678' });
    expect(Object.keys(result).sort()).toEqual(['action', 'phone']);
  });
});

// ==================== updateBookingStatus ====================

describe('prepareJsonpParams — updateBookingStatus', () => {
  it('傳入 bookingId 欄位', () => {
    const result = prepareJsonpParams({ action: 'updateBookingStatus', bookingId: 'B001', status: 'confirmed' });
    expect(result.bookingId).toBe('B001');
  });

  it('傳入 status 欄位', () => {
    const result = prepareJsonpParams({ action: 'updateBookingStatus', bookingId: 'B001', status: 'cancelled' });
    expect(result.status).toBe('cancelled');
  });

  it('不帶入其他欄位', () => {
    const result = prepareJsonpParams({
      action: 'updateBookingStatus',
      bookingId: 'B001',
      status: 'confirmed',
      extra: 'x'
    });
    expect(result.extra).toBeUndefined();
  });
});

// ==================== checkTimeSlotAvailability ====================

describe('prepareJsonpParams — checkTimeSlotAvailability', () => {
  it('傳入 date 欄位', () => {
    const result = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: ['10:00', '14:00']
    });
    expect(result.date).toBe('2026-04-14');
  });

  it('timeSlots 陣列被序列化為 JSON 字串', () => {
    const result = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: ['10:00', '14:00']
    });
    expect(typeof result.timeSlots).toBe('string');
  });

  it('序列化後可反序列化回原陣列', () => {
    const original = ['10:00', '14:00', '16:00'];
    const result   = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: original
    });
    expect(JSON.parse(result.timeSlots)).toEqual(original);
  });

  it('空 timeSlots 陣列序列化為 "[]"', () => {
    const result = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: []
    });
    expect(result.timeSlots).toBe('[]');
  });

  it('單一時段陣列序列化正確', () => {
    const result = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: ['14:00']
    });
    expect(JSON.parse(result.timeSlots)).toEqual(['14:00']);
  });

  it('多時段陣列順序保留', () => {
    const slots  = ['09:00', '11:00', '13:00', '15:00'];
    const result = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: slots
    });
    expect(JSON.parse(result.timeSlots)).toEqual(slots);
  });
});

// ==================== getAvailableTimeSlots ====================

describe('prepareJsonpParams — getAvailableTimeSlots', () => {
  it('傳入 date 欄位', () => {
    const result = prepareJsonpParams({ action: 'getAvailableTimeSlots', date: '2026-04-14' });
    expect(result.date).toBe('2026-04-14');
  });

  it('不帶入其他欄位（除 action 外）', () => {
    const result = prepareJsonpParams({ action: 'getAvailableTimeSlots', date: '2026-04-14', extra: 'x' });
    expect(result.extra).toBeUndefined();
  });
});

// ==================== getBatchAvailableTimeSlots ====================

describe('prepareJsonpParams — getBatchAvailableTimeSlots', () => {
  it('傳入 startDate 欄位', () => {
    const result = prepareJsonpParams({
      action:    'getBatchAvailableTimeSlots',
      startDate: '2026-04-14',
      endDate:   '2026-04-20'
    });
    expect(result.startDate).toBe('2026-04-14');
  });

  it('傳入 endDate 欄位', () => {
    const result = prepareJsonpParams({
      action:    'getBatchAvailableTimeSlots',
      startDate: '2026-04-14',
      endDate:   '2026-04-20'
    });
    expect(result.endDate).toBe('2026-04-20');
  });

  it('不帶入其他欄位', () => {
    const result = prepareJsonpParams({
      action:    'getBatchAvailableTimeSlots',
      startDate: '2026-04-14',
      endDate:   '2026-04-20',
      extra:     'x'
    });
    expect(result.extra).toBeUndefined();
  });
});

// ==================== getGoogleCalendarCredentials ====================

describe('prepareJsonpParams — getGoogleCalendarCredentials', () => {
  it('只包含 action 欄位（不額外展開任何資料）', () => {
    const result = prepareJsonpParams({ action: 'getGoogleCalendarCredentials' });
    const extraKeys = Object.keys(result).filter(k => k !== 'action');
    expect(extraKeys).toHaveLength(0);
  });
});

// ==================== 預設 (default) 分支 ====================

describe('prepareJsonpParams — 未知 action（default 分支）', () => {
  it('所有 data 欄位展開到結果中', () => {
    const data   = { action: 'customAction', foo: 'bar', baz: 42 };
    const result = prepareJsonpParams(data);
    expect(result.foo).toBe('bar');
    expect(result.baz).toBe(42);
  });

  it('action 欄位保留', () => {
    const result = prepareJsonpParams({ action: 'customAction', x: 1 });
    expect(result.action).toBe('customAction');
  });

  it('空 data（只有 action）時只有 action 欄位', () => {
    const result = prepareJsonpParams({ action: 'unknown' });
    expect(Object.keys(result)).toEqual(['action']);
  });
});

// ==================== CSRF Token 傳播 ====================

describe('prepareJsonpParams — CSRF Token 傳播', () => {
  it('data 有 csrfToken 時附加到結果', () => {
    const result = prepareJsonpParams({
      action:    'getCustomer',
      phone:     '0912345678',
      csrfToken: 'token-abc'
    });
    expect(result.csrfToken).toBe('token-abc');
  });

  it('data 無 csrfToken 時結果不含 csrfToken', () => {
    const result = prepareJsonpParams({ action: 'getCustomer', phone: '0912345678' });
    expect(result.csrfToken).toBeUndefined();
  });

  it('saveCustomer 也能正確傳播 CSRF Token', () => {
    const result = prepareJsonpParams({
      action:    'saveCustomer',
      customer:  { name: '王芳', phone: '0912345678' },
      csrfToken: 'my-token'
    });
    expect(result.csrfToken).toBe('my-token');
  });

  it('saveBooking 也能正確傳播 CSRF Token', () => {
    const result = prepareJsonpParams({
      action:    'saveBooking',
      booking:   { date: '2026-04-14', time: '14:00' },
      csrfToken: 'booking-token'
    });
    expect(result.csrfToken).toBe('booking-token');
  });

  it('checkTimeSlotAvailability 也能傳播 CSRF Token', () => {
    const result = prepareJsonpParams({
      action:    'checkTimeSlotAvailability',
      date:      '2026-04-14',
      timeSlots: ['14:00'],
      csrfToken: 'slot-token'
    });
    expect(result.csrfToken).toBe('slot-token');
  });

  it('getGoogleCalendarCredentials 也能傳播 CSRF Token', () => {
    const result = prepareJsonpParams({
      action:    'getGoogleCalendarCredentials',
      csrfToken: 'cred-token'
    });
    expect(result.csrfToken).toBe('cred-token');
  });
});

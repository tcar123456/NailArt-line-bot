/**
 * tests/security-utils.test.js
 * SecurityUtils 所有靜態方法的 Jest 測試
 *
 * 原始碼位於 public/security-utils.js（已有 module.exports，直接 require）。
 * 所有方法皆為純函式，無 DOM / LIFF / API 依賴。
 * 執行方式：npm test
 */

'use strict';

const SecurityUtils = require('../public/security-utils.js');

// ==================== maskPhone ====================

describe('SecurityUtils.maskPhone', () => {
  it('標準10位號碼遮罩第5~7位', () => {
    expect(SecurityUtils.maskPhone('0912345678')).toBe('0912***678');
  });

  it('0900000000 → 0900***000', () => {
    expect(SecurityUtils.maskPhone('0900000000')).toBe('0900***000');
  });

  it('0999999999 → 0999***999', () => {
    expect(SecurityUtils.maskPhone('0999999999')).toBe('0999***999');
  });

  it('長度大於4但不足10時：保留前4位加***', () => {
    expect(SecurityUtils.maskPhone('091234')).toBe('0912***');
  });

  it('長度等於5時：保留前4位加***', () => {
    expect(SecurityUtils.maskPhone('09123')).toBe('0912***');
  });

  it('長度超過10時：保留前4位加***（非標準格式）', () => {
    expect(SecurityUtils.maskPhone('09123456789')).toBe('0912***');
  });

  it('長度不超過4時直接回傳原值', () => {
    expect(SecurityUtils.maskPhone('091')).toBe('091');
  });

  it('null 回傳空字串', () => {
    expect(SecurityUtils.maskPhone(null)).toBe('');
  });

  it('undefined 回傳空字串', () => {
    expect(SecurityUtils.maskPhone(undefined)).toBe('');
  });

  it('空字串回傳空字串', () => {
    expect(SecurityUtils.maskPhone('')).toBe('');
  });

  it('數字型別轉字串後長度不足10，走短號碼分支', () => {
    // 912345678 → 字串長度9，>4但不足10 → 前4位加***
    expect(SecurityUtils.maskPhone(912345678)).toBe('9123***');
  });
});

// ==================== maskUserId ====================

describe('SecurityUtils.maskUserId', () => {
  it('標準 LINE UserId（≥10字元）保留前4後4', () => {
    // 'U1234567890abcdef' → 'U123***cdef'
    const result = SecurityUtils.maskUserId('U1234567890abcdef');
    expect(result).toBe('U123***cdef');
  });

  it('剛好10字元：保留前4後4', () => {
    // 'U123456789' (10) → 'U123***6789'
    expect(SecurityUtils.maskUserId('U123456789')).toBe('U123***6789');
  });

  it('少於10字元：保留前3加***', () => {
    // 'U12345678' (9) → 'U12***'
    expect(SecurityUtils.maskUserId('U12345678')).toBe('U12***');
  });

  it('極短（3字元）：保留前3加***', () => {
    expect(SecurityUtils.maskUserId('U12')).toBe('U12***');
  });

  it('null 回傳空字串', () => {
    expect(SecurityUtils.maskUserId(null)).toBe('');
  });

  it('undefined 回傳空字串', () => {
    expect(SecurityUtils.maskUserId(undefined)).toBe('');
  });

  it('空字串回傳空字串', () => {
    expect(SecurityUtils.maskUserId('')).toBe('');
  });

  it('遮罩字串中包含 ***', () => {
    const result = SecurityUtils.maskUserId('U1234567890abcdef');
    expect(result).toContain('***');
  });
});

// ==================== maskName ====================

describe('SecurityUtils.maskName', () => {
  it('中文3字姓名：保留第1字，其餘用*', () => {
    expect(SecurityUtils.maskName('王小明')).toBe('王**');
  });

  it('中文2字姓名：保留姓氏，其餘用*', () => {
    expect(SecurityUtils.maskName('王芳')).toBe('王*');
  });

  it('中文1字：單字不遮罩，原值回傳', () => {
    expect(SecurityUtils.maskName('王')).toBe('王');
  });

  it('英文名（多字）：保留首字母加***', () => {
    expect(SecurityUtils.maskName('John Doe')).toBe('J***');
  });

  it('英文3字母：保留首字母加***', () => {
    expect(SecurityUtils.maskName('Amy')).toBe('A***');
  });

  it('英文2字母：保留首字母加***', () => {
    expect(SecurityUtils.maskName('Jo')).toBe('J***');
  });

  it('null 回傳空字串', () => {
    expect(SecurityUtils.maskName(null)).toBe('');
  });

  it('undefined 回傳空字串', () => {
    expect(SecurityUtils.maskName(undefined)).toBe('');
  });

  it('空字串回傳空字串', () => {
    expect(SecurityUtils.maskName('')).toBe('');
  });

  it('純空白（trim後為空）回傳空字串', () => {
    expect(SecurityUtils.maskName('   ')).toBe('');
  });

  it('中文4字：保留第1字，其餘用***', () => {
    expect(SecurityUtils.maskName('陳小美花')).toBe('陳***');
  });
});

// ==================== maskEmail ====================

describe('SecurityUtils.maskEmail', () => {
  it('標準 Email 遮罩本地部分', () => {
    expect(SecurityUtils.maskEmail('user@example.com')).toBe('u***@example.com');
  });

  it('Gmail 地址', () => {
    expect(SecurityUtils.maskEmail('test@gmail.com')).toBe('t***@gmail.com');
  });

  it('保留完整 domain', () => {
    const result = SecurityUtils.maskEmail('admin@mail.example.co.uk');
    expect(result).toContain('@mail.example.co.uk');
  });

  it('沒有 @ 時：保留第1字加***', () => {
    expect(SecurityUtils.maskEmail('notanemail')).toBe('n***');
  });

  it('null 回傳空字串', () => {
    expect(SecurityUtils.maskEmail(null)).toBe('');
  });

  it('undefined 回傳空字串', () => {
    expect(SecurityUtils.maskEmail(undefined)).toBe('');
  });

  it('空字串回傳空字串', () => {
    expect(SecurityUtils.maskEmail('')).toBe('');
  });
});

// ==================== maskCustomer ====================

describe('SecurityUtils.maskCustomer', () => {
  const CUSTOMER = {
    name: '王小明',
    phone: '0912345678',
    lineUserId: 'U1234567890abcdef',
    email: 'wang@example.com'
  };

  it('姓名欄位被遮罩', () => {
    const result = SecurityUtils.maskCustomer(CUSTOMER);
    expect(result.name).toBe('王**');
  });

  it('電話欄位被遮罩', () => {
    const result = SecurityUtils.maskCustomer(CUSTOMER);
    expect(result.phone).toBe('0912***678');
  });

  it('LINE User ID 欄位被遮罩', () => {
    const result = SecurityUtils.maskCustomer(CUSTOMER);
    expect(result.lineUserId).toContain('***');
  });

  it('Email 欄位被遮罩', () => {
    const result = SecurityUtils.maskCustomer(CUSTOMER);
    expect(result.email).toBe('w***@example.com');
  });

  it('不影響原始物件（回傳副本）', () => {
    SecurityUtils.maskCustomer(CUSTOMER);
    expect(CUSTOMER.name).toBe('王小明');
    expect(CUSTOMER.phone).toBe('0912345678');
  });

  it('非物件傳入時回傳空物件', () => {
    expect(SecurityUtils.maskCustomer('not an object')).toEqual({});
  });

  it('null 傳入時回傳空物件', () => {
    expect(SecurityUtils.maskCustomer(null)).toEqual({});
  });

  it('部分欄位（只有 name/phone）也能正常遮罩', () => {
    const partial = { name: '李梅', phone: '0987654321' };
    const result = SecurityUtils.maskCustomer(partial);
    expect(result.name).toBe('李*');
    expect(result.phone).toBe('0987***321');
  });

  it('其他欄位（如 totalBookings）保持原值', () => {
    const customer = { ...CUSTOMER, totalBookings: 5 };
    const result = SecurityUtils.maskCustomer(customer);
    expect(result.totalBookings).toBe(5);
  });
});

// ==================== maskSensitiveData ====================

describe('SecurityUtils.maskSensitiveData', () => {
  it('基本型別（數字）直接回傳', () => {
    expect(SecurityUtils.maskSensitiveData(42)).toBe(42);
  });

  it('基本型別（字串）直接回傳', () => {
    expect(SecurityUtils.maskSensitiveData('hello')).toBe('hello');
  });

  it('null 直接回傳', () => {
    expect(SecurityUtils.maskSensitiveData(null)).toBeNull();
  });

  it('undefined 直接回傳', () => {
    expect(SecurityUtils.maskSensitiveData(undefined)).toBeUndefined();
  });

  it('陣列：每個元素遞迴處理', () => {
    const arr = [{ phone: '0912345678' }, { phone: '0987654321' }];
    const result = SecurityUtils.maskSensitiveData(arr);
    expect(result[0].phone).toBe('0912***678');
    expect(result[1].phone).toBe('0987***321');
  });

  it('phone 鍵自動識別並遮罩', () => {
    const data = { phone: '0912345678' };
    expect(SecurityUtils.maskSensitiveData(data).phone).toBe('0912***678');
  });

  it('phoneNumber 鍵（包含 phone）自動遮罩', () => {
    const data = { phoneNumber: '0912345678' };
    expect(SecurityUtils.maskSensitiveData(data).phoneNumber).toBe('0912***678');
  });

  it('lineUserId 鍵自動識別並遮罩', () => {
    const data = { lineUserId: 'U1234567890abcdef' };
    expect(SecurityUtils.maskSensitiveData(data).lineUserId).toContain('***');
  });

  it('name 鍵自動識別並遮罩', () => {
    const data = { name: '王小明' };
    expect(SecurityUtils.maskSensitiveData(data).name).toBe('王**');
  });

  it('customerName 鍵（包含 name）自動遮罩', () => {
    const data = { customerName: '王小明' };
    expect(SecurityUtils.maskSensitiveData(data).customerName).toBe('王**');
  });

  it('email 鍵自動識別並遮罩', () => {
    const data = { email: 'test@gmail.com' };
    expect(SecurityUtils.maskSensitiveData(data).email).toBe('t***@gmail.com');
  });

  it('非敏感欄位保持原值', () => {
    const data = { status: 'confirmed', count: 3 };
    const result = SecurityUtils.maskSensitiveData(data);
    expect(result.status).toBe('confirmed');
    expect(result.count).toBe(3);
  });

  it('巢狀物件遞迴處理', () => {
    const data = {
      booking: {
        phone: '0912345678',
        date: '2026-04-14'
      }
    };
    const result = SecurityUtils.maskSensitiveData(data);
    expect(result.booking.phone).toBe('0912***678');
    expect(result.booking.date).toBe('2026-04-14');
  });

  it('不影響原始物件', () => {
    const data = { phone: '0912345678' };
    SecurityUtils.maskSensitiveData(data);
    expect(data.phone).toBe('0912345678');
  });
});

// ==================== containsSensitiveInfo ====================

describe('SecurityUtils.containsSensitiveInfo', () => {
  it('包含台灣手機號碼 → 偵測到 phone', () => {
    const result = SecurityUtils.containsSensitiveInfo('手機：0912345678');
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.types).toContain('phone');
  });

  it('包含 LINE User ID 格式 → 偵測到 lineUserId', () => {
    const userId = 'U' + 'a'.repeat(32);
    const result = SecurityUtils.containsSensitiveInfo(`userId: ${userId}`);
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.types).toContain('lineUserId');
  });

  it('包含 Email → 偵測到 email', () => {
    const result = SecurityUtils.containsSensitiveInfo('聯絡：user@example.com');
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.types).toContain('email');
  });

  it('乾淨文字 → hasSensitiveInfo=false', () => {
    const result = SecurityUtils.containsSensitiveInfo('預約時間：14:00');
    expect(result.hasSensitiveInfo).toBe(false);
    expect(result.types).toHaveLength(0);
  });

  it('同時包含手機和 Email → 回傳兩種類型', () => {
    const result = SecurityUtils.containsSensitiveInfo('0912345678 / user@example.com');
    expect(result.types).toContain('phone');
    expect(result.types).toContain('email');
  });

  it('null 輸入 → hasSensitiveInfo=false', () => {
    const result = SecurityUtils.containsSensitiveInfo(null);
    expect(result.hasSensitiveInfo).toBe(false);
  });

  it('空字串 → hasSensitiveInfo=false', () => {
    const result = SecurityUtils.containsSensitiveInfo('');
    expect(result.hasSensitiveInfo).toBe(false);
  });

  it('回傳物件包含 message 欄位', () => {
    const result = SecurityUtils.containsSensitiveInfo('0912345678');
    expect(result).toHaveProperty('message');
  });
});

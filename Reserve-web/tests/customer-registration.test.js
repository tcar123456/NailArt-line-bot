/**
 * tests/customer-registration.test.js
 * CustomerRegistration 純函式的 Jest 測試
 *
 * 原始碼位於 public/customer-registration.js。
 * 以下函式無 DOM / LIFF / ApiService 依賴，可直接在 Node 環境驗證。
 * 執行方式：npm test
 */

'use strict';

// ==================== 從 customer-registration.js 提取的純函式（逐字複製，不做任何改動） ====================

function validateName(name) {
    return name.length >= 2 && name.length <= 20;
}

function validatePhone(phone) {
    const phoneRegex = /^09\d{8}$/;
    return phoneRegex.test(phone);
}

function validateInputs(name, phone) {
    const errors = [];
    if (!validateName(name)) {
        errors.push({ field: 'name', message: '請輸入有效的姓名' });
    }
    if (!validatePhone(phone)) {
        errors.push({ field: 'phone', message: '請輸入正確的手機號碼格式' });
    }
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function maskPhoneNumber(phone) {
    if (!phone || phone.length !== 10) {
        return phone;
    }
    const prefix = phone.substring(0, 4);
    const suffix = phone.substring(7, 10);
    return `${prefix}XXX${suffix}`;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// ==================== validateName ====================

describe('validateName', () => {
    it('2字姓名有效（下限）', () => {
        expect(validateName('王芳')).toBe(true);
    });

    it('20字姓名有效（上限）', () => {
        expect(validateName('王'.repeat(20))).toBe(true);
    });

    it('10字姓名有效（中間值）', () => {
        expect(validateName('王'.repeat(10))).toBe(true);
    });

    it('1字姓名無效（低於下限）', () => {
        expect(validateName('王')).toBe(false);
    });

    it('21字姓名無效（超過上限）', () => {
        expect(validateName('王'.repeat(21))).toBe(false);
    });

    it('空字串無效', () => {
        expect(validateName('')).toBe(false);
    });

    it('英文姓名（3字）有效', () => {
        expect(validateName('Amy')).toBe(true);
    });

    it('中英混合姓名有效', () => {
        expect(validateName('王Amy')).toBe(true);
    });

    it('含空白的姓名計算長度後有效', () => {
        // '王 芳' 長度為 3，介於 2~20 之間
        expect(validateName('王 芳')).toBe(true);
    });
});

// ==================== validatePhone ====================

describe('validatePhone', () => {
    it('09開頭10位數字有效', () => {
        expect(validatePhone('0912345678')).toBe(true);
    });

    it('0900000000 有效（最小邊界）', () => {
        expect(validatePhone('0900000000')).toBe(true);
    });

    it('0999999999 有效（最大邊界）', () => {
        expect(validatePhone('0999999999')).toBe(true);
    });

    it('非09開頭（08）無效', () => {
        expect(validatePhone('0812345678')).toBe(false);
    });

    it('非09開頭（07）無效', () => {
        expect(validatePhone('0712345678')).toBe(false);
    });

    it('01開頭無效', () => {
        expect(validatePhone('0112345678')).toBe(false);
    });

    it('9位數字無效（太短）', () => {
        expect(validatePhone('091234567')).toBe(false);
    });

    it('11位數字無效（太長）', () => {
        expect(validatePhone('09123456789')).toBe(false);
    });

    it('空字串無效', () => {
        expect(validatePhone('')).toBe(false);
    });

    it('含字母無效', () => {
        expect(validatePhone('0912abcd78')).toBe(false);
    });

    it('含連字號無效', () => {
        expect(validatePhone('0912-34567')).toBe(false);
    });

    it('含空白無效', () => {
        expect(validatePhone('0912 34567')).toBe(false);
    });
});

// ==================== validateInputs ====================

describe('validateInputs', () => {
    it('姓名與手機都正確時 isValid=true 且 errors 為空', () => {
        const result = validateInputs('王芳', '0912345678');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('姓名無效時 isValid=false 且含 name 錯誤', () => {
        const result = validateInputs('王', '0912345678');
        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'name' })])
        );
    });

    it('手機無效時 isValid=false 且含 phone 錯誤', () => {
        const result = validateInputs('王芳', '1234567890');
        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'phone' })])
        );
    });

    it('姓名與手機都無效時回傳兩個錯誤', () => {
        const result = validateInputs('王', '123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
    });

    it('name 錯誤訊息正確', () => {
        const result = validateInputs('王', '0912345678');
        const err = result.errors.find(e => e.field === 'name');
        expect(err.message).toBe('請輸入有效的姓名');
    });

    it('phone 錯誤訊息正確', () => {
        const result = validateInputs('王芳', '123');
        const err = result.errors.find(e => e.field === 'phone');
        expect(err.message).toBe('請輸入正確的手機號碼格式');
    });

    it('空姓名與空手機各回傳一個錯誤', () => {
        const result = validateInputs('', '');
        expect(result.errors.some(e => e.field === 'name')).toBe(true);
        expect(result.errors.some(e => e.field === 'phone')).toBe(true);
    });
});

// ==================== maskPhoneNumber ====================

describe('maskPhoneNumber', () => {
    it('標準10位號碼遮罩第5~7位', () => {
        expect(maskPhoneNumber('0912345678')).toBe('0912XXX678');
    });

    it('0900000000 → 0900XXX000', () => {
        expect(maskPhoneNumber('0900000000')).toBe('0900XXX000');
    });

    it('0999999999 → 0999XXX999', () => {
        expect(maskPhoneNumber('0999999999')).toBe('0999XXX999');
    });

    it('不足10位時直接回傳原值', () => {
        expect(maskPhoneNumber('091234567')).toBe('091234567');
    });

    it('超過10位時直接回傳原值', () => {
        expect(maskPhoneNumber('09123456789')).toBe('09123456789');
    });

    it('空字串直接回傳空字串', () => {
        expect(maskPhoneNumber('')).toBe('');
    });

    it('null 直接回傳 null', () => {
        expect(maskPhoneNumber(null)).toBe(null);
    });

    it('undefined 直接回傳 undefined', () => {
        expect(maskPhoneNumber(undefined)).toBe(undefined);
    });

    it('遮罩後前綴（前4位）正確', () => {
        const result = maskPhoneNumber('0912345678');
        expect(result.startsWith('0912')).toBe(true);
    });

    it('遮罩後後綴（後3位）正確', () => {
        const result = maskPhoneNumber('0912345678');
        expect(result.endsWith('678')).toBe(true);
    });

    it('遮罩後中間為 XXX', () => {
        const result = maskPhoneNumber('0912345678');
        expect(result.substring(4, 7)).toBe('XXX');
    });

    it('遮罩後總長度為10', () => {
        const result = maskPhoneNumber('0912345678');
        expect(result.length).toBe(10);
    });
});

// ==================== formatDateTime ====================
// 注意：此函式使用 getHours() 等本地時間方法，輸出受執行環境時區影響。
// 以下測試只驗證格式結構，不驗證絕對時間值。

describe('formatDateTime', () => {
    it('回傳格式符合 YYYY/MM/DD HH:mm', () => {
        const result = formatDateTime('2025-07-01T14:30:00');
        expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it('年份四位數正確', () => {
        const result = formatDateTime('2026-04-13T10:00:00');
        const year = result.split('/')[0];
        expect(year).toBe('2026');
    });

    it('分鐘補零（05 分）', () => {
        // 使用 UTC 字串並比對分鐘部分
        const result = formatDateTime('2025-07-01T00:05:00Z');
        const minutes = result.slice(-2);
        expect(minutes).toBe('05');
    });

    it('月份補零（01 月）', () => {
        const result = formatDateTime('2025-01-15T00:00:00Z');
        const month = result.split('/')[1];
        expect(month).toBe('01');
    });

    it('不同年份仍能正確解析', () => {
        const result = formatDateTime('2030-12-31T23:59:00');
        expect(result.startsWith('2030/')).toBe(true);
    });
});

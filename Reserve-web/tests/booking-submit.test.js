/**
 * tests/booking-submit.test.js
 * submitBooking 函式的自動化測試
 * 執行方式：npm test
 */

'use strict';

const { submitBooking } = require('../public/booking-submit.js');

// ==================== 輔助工具 ====================

function makeMockModal() {
  return { classList: { add: jest.fn(), remove: jest.fn() } };
}

function makeDeps(apiResult, overrides) {
  return Object.assign({
    apiSave:     jest.fn().mockResolvedValue(apiResult),
    redirect:    jest.fn(),
    showAlert:   jest.fn(),
    onSuccess:   jest.fn()
  }, overrides || {});
}

const BOOKING = { date: '2025-07-01', time: '14:00', customerName: '測試' };

// ==================== 測試群組 ====================

describe('submitBooking — 成功路徑', () => {
  it('後端回傳 success:true 時呼叫 onSuccess', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: true });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.onSuccess).toHaveBeenCalledTimes(1);
  });

  it('成功時不顯示 alert 也不跳轉', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: true });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.showAlert).not.toHaveBeenCalled();
    expect(deps.redirect).not.toHaveBeenCalled();
  });

  it('成功時隱藏 loadingModal', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: true });

    await submitBooking(BOOKING, modal, deps);

    expect(modal.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('回傳後端回應物件', async () => {
    const modal  = makeMockModal();
    const apiRes = { success: true, bookingId: 'B001' };
    const deps   = makeDeps(apiRes);

    const result = await submitBooking(BOOKING, modal, deps);

    expect(result).toBe(apiRes);
  });
});

// ==================== 時段衝突路徑 ====================

describe('submitBooking — 時段已被預約', () => {
  const CONFLICT_ERRORS = ['TIME_SLOT_UNAVAILABLE', 'TIME_SLOT_CONFLICT'];

  CONFLICT_ERRORS.forEach(function(errorCode) {
    it('error=' + errorCode + ' 時顯示衝突 alert', async () => {
      const modal = makeMockModal();
      const deps  = makeDeps({ success: false, error: errorCode });

      await submitBooking(BOOKING, modal, deps);

      expect(deps.showAlert).toHaveBeenCalledWith(
        '很抱歉，這個時段剛好被其他客戶預約了，請重新選擇其他時段。'
      );
    });

    it('error=' + errorCode + ' 時跳轉回首頁', async () => {
      const modal = makeMockModal();
      const deps  = makeDeps({ success: false, error: errorCode });

      await submitBooking(BOOKING, modal, deps);

      expect(deps.redirect).toHaveBeenCalledWith('index.html');
    });

    it('error=' + errorCode + ' 時不呼叫 onSuccess', async () => {
      const modal = makeMockModal();
      const deps  = makeDeps({ success: false, error: errorCode });

      await submitBooking(BOOKING, modal, deps);

      expect(deps.onSuccess).not.toHaveBeenCalled();
    });
  });
});

// ==================== 鎖超時路徑 ====================

describe('submitBooking — 鎖超時', () => {
  it('error=LOCK_TIMEOUT 時顯示重試提示', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: false, error: 'LOCK_TIMEOUT' });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.showAlert).toHaveBeenCalledWith(
      '目前預約人數較多，請稍後再試。'
    );
  });

  it('error=LOCK_TIMEOUT 時不跳轉', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: false, error: 'LOCK_TIMEOUT' });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.redirect).not.toHaveBeenCalled();
  });
});

// ==================== 一般錯誤路徑 ====================

describe('submitBooking — 一般錯誤', () => {
  it('有 message 時顯示後端訊息', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: false, error: 'OTHER', message: '伺服器忙碌中' });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.showAlert).toHaveBeenCalledWith('伺服器忙碌中');
  });

  it('無 message 時顯示預設錯誤文字', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: false });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.showAlert).toHaveBeenCalledWith('預約失敗，請重試');
  });

  it('一般錯誤時不跳轉', async () => {
    const modal = makeMockModal();
    const deps  = makeDeps({ success: false, message: '錯誤' });

    await submitBooking(BOOKING, modal, deps);

    expect(deps.redirect).not.toHaveBeenCalled();
  });
});

// ==================== loadingModal 隱藏保證 ====================

describe('submitBooking — loadingModal 必定隱藏', () => {
  const CASES = [
    { label: '成功',            result: { success: true } },
    { label: '時段衝突',        result: { success: false, error: 'TIME_SLOT_UNAVAILABLE' } },
    { label: '鎖超時',          result: { success: false, error: 'LOCK_TIMEOUT' } },
    { label: '一般錯誤',        result: { success: false, message: '錯誤' } }
  ];

  CASES.forEach(function(tc) {
    it(tc.label + ' 情況下隱藏 modal', async () => {
      const modal = makeMockModal();
      const deps  = makeDeps(tc.result);

      await submitBooking(BOOKING, modal, deps);

      expect(modal.classList.add).toHaveBeenCalledWith('hidden');
    });
  });
});

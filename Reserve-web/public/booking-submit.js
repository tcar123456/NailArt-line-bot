/**
 * booking-submit.js - 預約送出核心邏輯
 *
 * 與 service-selection.js 一起引入，獨立拆出以便單元測試。
 * 所有外部依賴（API 呼叫、頁面跳轉、alert）透過 deps 參數注入，
 * 預設值指向瀏覽器全域物件。
 */

/**
 * 送出預約並根據後端回應處理 UI
 *
 * @param {Object} bookingData        - 預約資料
 * @param {Object} loadingModal       - 載入中模態框 DOM 元素
 * @param {Object} [deps]             - 可覆寫的外部依賴（用於測試）
 * @param {Function} [deps.apiSave]   - 呼叫後端的函式，預設 ApiService.saveBooking
 * @param {Function} [deps.redirect]  - 頁面跳轉，預設設定 window.location.href
 * @param {Function} [deps.showAlert] - 顯示提示，預設 window.alert
 * @param {Function} [deps.onSuccess] - 成功後的 UI 回呼，預設顯示成功 modal
 * @returns {Promise<Object>}          - 後端回應結果
 */
async function submitBooking(bookingData, loadingModal, deps) {
  const d = deps || {};
  const apiSave = d.apiSave || function(data) { return ApiService.saveBooking(data); };
  const redirect = d.redirect || function(url) { window.location.href = url; };
  const showAlert = d.showAlert || function(msg) { window.alert(msg); };
  const onSuccess = d.onSuccess || function() {
    saveServiceData();
    document.getElementById('successModal').classList.remove('hidden');
  };

  const result = await apiSave(bookingData);

  loadingModal.classList.add('hidden');

  if (result.success) {
    onSuccess();
    return result;
  }

  if (result.error === 'TIME_SLOT_UNAVAILABLE' || result.error === 'TIME_SLOT_CONFLICT') {
    showAlert('很抱歉，這個時段剛好被其他客戶預約了，請重新選擇其他時段。');
    redirect('index.html');
  } else if (result.error === 'LOCK_TIMEOUT') {
    showAlert('目前預約人數較多，請稍後再試。');
  } else {
    showAlert(result.message || '預約失敗，請重試');
  }

  return result;
}

// Node.js 環境（Jest）時匯出，瀏覽器環境此段不執行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { submitBooking };
}

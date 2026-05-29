/**
 * bookingService.test.gs — formatDateForSheet / hasConflictInBookingData 純函式測試
 *
 * 使用方式：在 GAS 編輯器選取 runBookingServiceTests 後點「執行」
 * 結果可在「執行記錄」查看 [PASS] / [FAIL] 訊息
 *
 * 注意：此檔案測試的兩個函式定義於 bookingService.gs，
 *       GAS 專案內所有 .gs 共用同一全域 scope，可直接呼叫。
 */

// ==================== 斷言工具 ====================

/**
 * @param {boolean} condition
 * @param {string}  desc
 * @param {{passed:number, failed:number}} counter
 */
function _assert(condition, desc, counter) {
  if (condition) {
    Logger.log('[PASS] ' + desc);
    counter.passed++;
  } else {
    Logger.log('[FAIL] ' + desc);
    counter.failed++;
  }
}

// ==================== 主測試入口 ====================

function runBookingServiceTests() {
  var c = { passed: 0, failed: 0 };

  Logger.log('===== formatDateForSheet =====');

  // 月日個位數不補零
  _assert(
    formatDateForSheet('2025-07-01') === '2025年7月1日',
    'formatDateForSheet("2025-07-01") === "2025年7月1日"',
    c
  );

  // 月日雙位數維持原值
  _assert(
    formatDateForSheet('2025-12-31') === '2025年12月31日',
    'formatDateForSheet("2025-12-31") === "2025年12月31日"',
    c
  );

  // 月個位數、日雙位數
  _assert(
    formatDateForSheet('2025-01-10') === '2025年1月10日',
    'formatDateForSheet("2025-01-10") === "2025年1月10日"',
    c
  );

  // 閏年 2/29
  _assert(
    formatDateForSheet('2024-02-29') === '2024年2月29日',
    'formatDateForSheet("2024-02-29") === "2024年2月29日"',
    c
  );

  Logger.log('===== hasConflictInBookingData =====');

  var dateValues = [
    ['2025年7月1日'],
    ['2025年7月2日'],
    ['2025年7月1日']
  ];
  var timeValues = [
    ['14:00'],
    ['10:00'],
    ['16:00']
  ];

  // 完全吻合 → true
  _assert(
    hasConflictInBookingData(dateValues, timeValues, '2025年7月1日', '14:00') === true,
    '日期時間完全吻合 → true',
    c
  );

  // 日期吻合、時間不同 → false
  _assert(
    hasConflictInBookingData(dateValues, timeValues, '2025年7月1日', '10:00') === false,
    '日期吻合但時間不同 → false',
    c
  );

  // 日期不同、時間吻合 → false
  _assert(
    hasConflictInBookingData(dateValues, timeValues, '2025年7月2日', '14:00') === false,
    '日期不同（時間吻合）→ false',
    c
  );

  // 非首列的衝突也能檢出
  _assert(
    hasConflictInBookingData(dateValues, timeValues, '2025年7月2日', '10:00') === true,
    '第二列衝突 → true',
    c
  );

  // 不存在的日期 → false
  _assert(
    hasConflictInBookingData(dateValues, timeValues, '2025年7月3日', '14:00') === false,
    '不存在的日期 → false',
    c
  );

  // 空資料 → false
  _assert(
    hasConflictInBookingData([], [], '2025年7月1日', '14:00') === false,
    '空資料 → false',
    c
  );

  // 時間值帶前後空白仍能 trim 比對
  _assert(
    hasConflictInBookingData(
      [['2025年7月1日']],
      [['  14:00  ']],
      '2025年7月1日',
      '14:00'
    ) === true,
    '時間值帶前後空白仍能匹配（trim）',
    c
  );

  Logger.log(
    '===== 測試完成  PASS: ' + c.passed + '  FAIL: ' + c.failed + ' ====='
  );
}

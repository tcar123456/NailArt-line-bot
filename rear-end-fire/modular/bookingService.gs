/**
 * bookingService.gs - 預約服務模組
 * 美甲預約系統 - Google Apps Script
 *
 * 包含：預約儲存、預約狀態更新、後端時段驗證
 */

// ==================== 預約儲存 ====================

/**
 * 處理預約儲存
 * @param {Object} booking - 預約資料
 * @returns {Object} - 處理結果
 */
function handleSaveBooking(booking) {
  const bookingStartTime = Date.now();
  Logger.api('開始處理預約儲存', { customerName: booking.customerName, date: booking.date, time: booking.time }, 'booking');

  // 使用 Document Lock 避免並發寫入
  const bookingLock = LockService.getScriptLock();
  try {
    bookingLock.waitLock(30000);
  } catch (lockError) {
    console.error('無法取得預約鎖定:', lockError);
    return {
      success: false,
      error: 'LOCK_TIMEOUT',
      message: '目前預約人數較多，請稍後再試',
      timestamp: new Date().toISOString()
    };
  }

  try {
    // 預約資料驗證
    if (!booking || typeof booking !== 'object') {
      throw new Error('預約資料格式錯誤');
    }

    const requiredFields = ['customerName', 'phone', 'date', 'time'];
    for (const field of requiredFields) {
      if (!booking[field]) {
        throw new Error(`缺少必要欄位: ${field}`);
      }
    }

    // 日期格式驗證
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_REGEX.test(booking.date) || /[TZ]/i.test(booking.date)) {
      throw new Error(`無效的日期格式: ${booking.date}，請使用 YYYY-MM-DD 格式`);
    }

    // 時間格式驗證
    if (!SYSTEM_CONFIG.TIME_FORMAT_REGEX.test(booking.time)) {
      throw new Error(`無效的時間格式: ${booking.time}，請使用 HH:MM 格式`);
    }

    // 取得工作表（需在衝突檢查前備妥）
    const bookingSheetName = getBookingSheetNameByDate(booking.date);
    const bookingSheet = getSheet(bookingSheetName);
    const customerSheet = getSheet(CUSTOMER_SHEET_NAME);

    Logger.log('預約將寫入工作表: ' + bookingSheetName, { date: booking.date }, 'booking');

    // 第一道防線：Sheets 強一致性衝突查詢（在鎖內執行，不受 Calendar API 傳播延遲影響）
    const sheetsConflict = checkBookingConflictInSheets(bookingSheet, booking.date, booking.time);
    if (sheetsConflict) {
      Logger.warn('Sheets 衝突檢查：時段已被預約', { date: booking.date, time: booking.time }, 'booking');
      return {
        success: false,
        error: 'TIME_SLOT_UNAVAILABLE',
        message: '該時段已被預約，請重新選擇',
        timestamp: new Date().toISOString()
      };
    }

    // 第二道防線：Calendar 二次驗證（防止極低機率的傳播延遲邊界情況）
    const backendSlotCheck = verifyBackendTimeSlotAvailability(booking.date, booking.time);
    if (!backendSlotCheck.available) {
      Logger.warn('後端時段檢查未通過', backendSlotCheck, 'booking');
      return {
        success: false,
        error: backendSlotCheck.errorCode || 'TIME_SLOT_UNAVAILABLE',
        message: backendSlotCheck.message || '該時段已被占用，請重新選擇',
        conflictDetails: backendSlotCheck.slotStatus,
        timestamp: new Date().toISOString()
      };
    }

    clearCustomerCache();

    const now = new Date();
    const services = booking.serviceText || booking.services || booking.service || '';

    // 查找客戶的 LINE User ID
    let lineUserId = '';
    if (booking.phone) {
      const customerRowIndex = findCustomerByPhone(booking.phone);
      if (customerRowIndex > 0) {
        lineUserId = customerSheet.getRange(customerRowIndex, 1).getValue() || '';
      }
    }

    // 格式化預約日期
    let formattedDate = booking.date;
    try {
      const parts = booking.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        formattedDate = `${year}年${month}月${day}日`;
      }
    } catch (e) {
      formattedDate = booking.date;
    }

    // 準備要寫入的資料
    const rowData = [
      lineUserId,
      booking.customerName,
      `'${booking.phone}`,
      formattedDate,
      booking.time,
      services,
      booking.removalText || booking.removal || '',
      (booking.quantityText || booking.quantity) ? (booking.quantityText || booking.quantity) : '無',
      booking.remarks || '',
      now
    ];

    // 新增預約記錄
    const newBookingRow = bookingSheet.getLastRow() + 1;
    bookingSheet.appendRow(rowData);

    // 設定手機欄位格式
    const bookingPhoneCell = bookingSheet.getRange(newBookingRow, 3);
    bookingPhoneCell.setNumberFormat('@');
    bookingPhoneCell.setValue(booking.phone);

    clearBookingCache();

    Logger.log('預約資料已寫入試算表', null, 'booking');
    SpreadsheetApp.flush();

    // 更新客戶預約資訊
    updateCustomerBookingInfo(booking.phone, now);

    // 建立 Google 日曆活動
    let calendarEventResult = null;
    try {
      const calendarData = {
        customerName: booking.customerName,
        phone: booking.phone,
        date: booking.date,
        time: booking.time,
        services: services,
        removal: booking.removal || '',
        quantity: booking.quantity || '',
        remarks: booking.remarks || ''
      };

      calendarEventResult = createCalendarEvent(calendarData);

      if (calendarEventResult && calendarEventResult.success) {
        // 將 Event ID 寫入試算表
        try {
          bookingSheet.getRange(newBookingRow, 11).setValue(calendarEventResult.eventId);
        } catch (updateError) {
          console.error('寫入 Event ID 到試算表失敗:', updateError);
        }

        // 發送預約通知
        try {
          const emailBookingData = {
            customerName: booking.customerName,
            phone: booking.phone,
            date: booking.date,
            time: booking.time,
            services: booking.serviceText || services,
            removal: booking.removalText || booking.removal,
            quantity: (booking.quantityText || booking.quantity) || '無',
            remarks: booking.remarks
          };
          sendBookingNotification(emailBookingData, calendarEventResult);
        } catch (notificationError) {
          console.error('發送通知失敗:', notificationError);
        }
      }

    } catch (calendarError) {
      console.error('建立Google日曆活動時發生錯誤:', calendarError);
      calendarEventResult = {
        success: false,
        error: calendarError.message,
        message: '日曆活動建立失敗，但預約資料已儲存'
      };
    }

    // 發送 LINE 預約確認訊息
    let lineMessageResult = null;
    try {
      const lineBookingData = {
        lineUserId: booking.lineUserId,
        customerName: booking.customerName,
        phone: booking.phone,
        date: booking.date,
        time: booking.time,
        services: booking.serviceText || services,
        removal: booking.removalText || booking.removal,
        quantity: (booking.quantityText || booking.quantity) || '無',
        remarks: booking.remarks
      };

      lineMessageResult = sendLineBookingConfirmation(lineBookingData);
    } catch (lineError) {
      console.error('發送 LINE 訊息時發生錯誤:', lineError);
      lineMessageResult = { success: false, message: `LINE 訊息發送錯誤: ${lineError.message}` };
    }

    const result = {
      success: true,
      message: '預約儲存成功',
      calendarEvent: calendarEventResult,
      lineMessage: lineMessageResult,
      bookingData: {
        customerName: booking.customerName,
        phone: booking.phone,
        date: booking.date,
        time: booking.time,
        services: services
      },
      timestamp: new Date().toISOString()
    };

    Logger.performance('預約處理完成', bookingStartTime, 'booking');
    return result;

  } catch (error) {
    console.error('儲存預約資料時發生嚴重錯誤:', error);
    throw error;

  } finally {
    bookingLock.releaseLock();
    console.log('已釋放預約鎖定');
  }
}

/**
 * 寫入預約操作稽核紀錄（永久保存於獨立工作表）
 *
 * 目的：執行記錄保留期短，過期後無法查證某筆預約是哪個 LINE 帳號、何時送出。
 * 此函式把「實際操作者的真實 lineUserId（經 Access Token 驗證）+ 時間 + 結果」
 * 永久寫進稽核表，供日後「我沒約過」爭議查證。
 *
 * 注意：稽核寫入失敗絕不可影響預約主流程，整個函式以 try/catch 吞掉錯誤。
 *
 * @param {string} operatorUserId - 經驗證的真實操作者 LINE User ID（可能為空）
 * @param {Object} booking - 前端送出的預約資料
 * @param {Object} result - handleSaveBooking 的回傳結果
 */
function logBookingAudit(operatorUserId, booking, result) {
  try {
    booking = booking || {};
    result = result || {};

    const eventId = (result.calendarEvent && result.calendarEvent.eventId) || '';
    const outcome = result.success
      ? '成功'
      : '失敗:' + (result.error || result.message || '未知錯誤');

    const auditSheet = getSheet(BOOKING_AUDIT_SHEET_NAME);
    const newRow = auditSheet.getLastRow() + 1;

    auditSheet.appendRow([
      new Date(),
      'saveBooking',
      operatorUserId || '',
      booking.lineUserId || '',
      booking.customerName || '',
      booking.phone || '',       // 手機欄改為文字格式後再覆寫，避免被當數字
      booking.date || '',
      booking.time || '',
      eventId,
      outcome
    ]);

    // 手機欄（第 6 欄）設為文字格式，比照預約記錄表寫法
    if (booking.phone) {
      const phoneCell = auditSheet.getRange(newRow, 6);
      phoneCell.setNumberFormat('@');
      phoneCell.setValue(booking.phone);
    }
  } catch (auditError) {
    console.error('寫入預約操作稽核紀錄失敗（不影響預約）:', auditError);
  }
}

// ==================== Sheets 衝突查詢 ====================

/**
 * 將 YYYY-MM-DD 格式轉換為 Sheets 中儲存的中文日期格式
 * 例：'2025-07-01' → '2025年7月1日'（月日不補零）
 * @param {string} dateStr - YYYY-MM-DD 格式
 * @returns {string} - "YYYY年M月D日" 格式
 */
function formatDateForSheet(dateStr) {
  var parts = dateStr.split('-');
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  return year + '年' + month + '月' + day + '日';
}

/**
 * 在日期與時間資料陣列中尋找衝突（純函式，方便單元測試）
 * @param {Array} dateValues - 日期欄位二維陣列 [[date1], [date2], ...]
 * @param {Array} timeValues - 時間欄位二維陣列 [[time1], [time2], ...]
 * @param {string} storedDate - 已轉換為 Sheets 格式的日期字串
 * @param {string} timeStr - 時間字串 HH:MM
 * @returns {boolean} - true 表示有衝突
 */
function hasConflictInBookingData(dateValues, timeValues, storedDate, timeStr) {
  for (var i = 0; i < dateValues.length; i++) {
    var rowDate = String(dateValues[i][0]);
    var rowTime = String(timeValues[i][0]).trim();
    if (rowDate === storedDate && rowTime === timeStr) {
      return true;
    }
  }
  return false;
}

/**
 * 在鎖內查詢 Sheets，確認指定日期時間是否已有預約（強一致性）
 * Sheets 的 getValues() 反映 flush() 後的最新狀態，不受 Calendar API 傳播延遲影響
 * @param {Sheet} bookingSheet - 預約工作表
 * @param {string} dateStr - YYYY-MM-DD 格式
 * @param {string} timeStr - HH:MM 格式
 * @returns {boolean} - true 表示有衝突
 */
function checkBookingConflictInSheets(bookingSheet, dateStr, timeStr) {
  try {
    var lastRow = bookingSheet.getLastRow();
    if (lastRow < 2) return false; // 只有標頭或空表

    // 只讀取日期欄（第4欄）與時間欄（第5欄），避免讀取整列造成效能浪費
    var dateValues = bookingSheet.getRange(2, 4, lastRow - 1, 1).getValues();
    var timeValues = bookingSheet.getRange(2, 5, lastRow - 1, 1).getValues();
    var storedDate = formatDateForSheet(dateStr);

    return hasConflictInBookingData(dateValues, timeValues, storedDate, timeStr);
  } catch (error) {
    Logger.warn('Sheets 衝突檢查失敗，略過（讓 Calendar 檢查繼續）', error, 'booking');
    return false;
  }
}

// ==================== 後端時段驗證 ====================

/**
 * 在後端再次確認指定日期與時間是否仍可預約
 * @param {string} dateStr - 預約日期（YYYY-MM-DD）
 * @param {string} timeStr - 預約時間（HH:MM）
 * @returns {Object} - 驗證結果
 */
function verifyBackendTimeSlotAvailability(dateStr, timeStr) {
  console.log('後端二次驗證開始');

  const defaultResponse = {
    available: false,
    errorCode: 'TIME_SLOT_CHECK_FAILED',
    slotStatus: null,
    message: '系統忙碌中，請稍後再試',
    date: dateStr,
    time: timeStr
  };

  try {
    if (!dateStr || !timeStr) {
      defaultResponse.errorCode = 'MISSING_SLOT_PARAMS';
      defaultResponse.message = '缺少時段參數，無法完成預約';
      return defaultResponse;
    }

    if (!CALENDAR_CONFIG.calendarId || CALENDAR_CONFIG.calendarId === 'YOUR_CALENDAR_ID@gmail.com') {
      defaultResponse.errorCode = 'CALENDAR_NOT_CONFIGURED';
      defaultResponse.message = '預約日曆尚未設定，請聯絡系統管理員';
      return defaultResponse;
    }

    const queryDate = createTaipeiDateFromYMD(dateStr);
    const availabilityMap = checkTimeSlotsAvailability(queryDate, dateStr, [timeStr], CALENDAR_CONFIG.calendarId);
    const slotStatus = availabilityMap ? availabilityMap[timeStr] : null;

    if (!slotStatus) {
      defaultResponse.errorCode = 'SLOT_STATUS_MISSING';
      defaultResponse.message = '無法確認時段狀態，請重新選擇';
      return defaultResponse;
    }

    return {
      available: slotStatus.available === true,
      errorCode: slotStatus.available === true ? null : 'TIME_SLOT_CONFLICT',
      slotStatus: slotStatus,
      message: slotStatus.available === true ? '時段可用' : (slotStatus.reason || '該時段已被預約'),
      date: dateStr,
      time: timeStr
    };

  } catch (error) {
    console.error('後端時段驗證失敗:', error);
    defaultResponse.message = '後端驗證失敗，請稍後再試';
    return defaultResponse;
  }
}
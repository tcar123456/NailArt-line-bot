// ==================== 全域狀態 ====================
let isCustomerVerificationComplete = false;
let customerVerificationPromise = null;

/**
 * 使用LINE User ID檢查客戶資料
 * 採用「快取優先 (Cache-First)」策略
 * 1. 先檢查 LocalStorage 是否有客戶資料
 * 2. 若有，直接回傳 true (秒開)
 * 3. 若無，才進行 LIFF 初始化與 API 查詢
 */
async function checkCustomerByLineId() {
    console.log('🔍 開始檢查客戶資料...');
    
    // 🚀 階段零：檢查 SessionStorage 接力快取 (來自首頁的預查)
    try {
        const prefetchStr = sessionStorage.getItem('auth_prefetch_result');
        if (prefetchStr) {
            const prefetchData = JSON.parse(prefetchStr);
            const now = Date.now();
            
            // 檢查時效性 (例如 60 秒內有效)
            if (now - prefetchData.timestamp < 60000) {
                console.log('⚡ [快取接力] 發現首頁預查結果，直接使用！');
                
                // 確保 LIFF 已就緒 (為了比對 UserID)
                await ensureLiffReady();
                const currentUserId = getLineUserId();
                
                // 驗證 UserID 是否匹配
                if (currentUserId === prefetchData.userId) {
                    const result = prefetchData.result;
                    
                    if (result.success && result.customer) {
                        console.log('✅ [接力命中] 客戶已建檔:', SecurityUtils.maskCustomer(result.customer));
                        // 寫入本地快取，方便下次使用
                        await ApiService.safeSetLocalStorage('latestCustomerData', {
                            ...result.customer,
                            customerName: result.customer.name, 
                            lastVerified: new Date().toISOString()
                        });
                        // 清除接力快取 (用完即丟)
                        sessionStorage.removeItem('auth_prefetch_result');
                        return true;
                    } else {
                        console.log('❌ [接力命中] 客戶未建檔');
                        // 清除接力快取
                        sessionStorage.removeItem('auth_prefetch_result');
                        return false;
                    }
                } else {
                    console.warn('⚠️ 接力快取 UserID 不匹配，捨棄');
                }
            } else {
                console.log('⚠️ 接力快取已過期');
                sessionStorage.removeItem('auth_prefetch_result');
            }
        }
    } catch (e) {
        console.warn('讀取接力快取失敗:', e);
    }

    // 🚀 階段一：快取優先檢查
    try {
        // 嘗試讀取本地快取 (支援加密)
        // 注意：這裡假設 ApiService 已載入。若未載入，safeGetLocalStorage 會失敗，自然進入階段二
        if (typeof ApiService !== 'undefined') {
            const cachedData = await ApiService.safeGetLocalStorage('latestCustomerData');
            
            // 驗證快取資料的有效性
            if (cachedData && (cachedData.name || cachedData.customerName)) {
                console.log('✅ [快取命中] 發現本地客戶資料:', SecurityUtils.maskCustomer(cachedData));
                
                // 檢查資料時效性 (例如超過 30 天強制更新)
                const lastVerified = cachedData.lastVerified ? new Date(cachedData.lastVerified) : null;
                const now = new Date();
                const daysDiff = lastVerified ? (now - lastVerified) / (1000 * 60 * 60 * 24) : 999;
                
                if (daysDiff < 30) {
                    console.log(`✅ 快取資料有效 (上次驗證: ${Math.round(daysDiff)} 天前)，跳過 API 查詢`);
                    return true;
                } else {
                    console.log('⚠️ 快取資料過期，將嘗試更新...');
                    // 過期則繼續往下執行 API 查詢，但不刪除舊資料以防查詢失敗
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ 讀取本地客戶快取時發生錯誤，將改用 API 查詢:', e);
    }

    // 🚀 階段二：API 查詢 (無快取或快取過期時執行)
    console.log('🔄 無有效快取，開始執行完整驗證流程 (LIFF + API)...');
    
    try {
        // 確保 LIFF 已就緒 (這是查詢 User ID 的前提)
        // 注意：在主流程中，如果走到這裡，表示必須等待 LIFF
        await ensureLiffReady();
        
        // 取得LINE User ID
        const lineUserId = getLineUserId();
        
        // 🔒 安全日誌：遮罩敏感資訊
        console.log('🆔 取得的LINE User ID:', SecurityUtils.maskUserId(lineUserId));
        
        if (!lineUserId) {
            console.log('❌ 無法取得LINE User ID');
            return false;
        }
        
        console.log('📡 向伺服器查詢客戶資料...');
        
        // 向伺服器查詢客戶資料
        const result = await ApiService.getCustomerByLineId(lineUserId);
        
        if (result.success && result.customer) {
            console.log('✅ [API] 找到客戶資料:', SecurityUtils.maskCustomer(result.customer));
            
            // 🔐 更新本地快取
            await ApiService.safeSetLocalStorage('latestCustomerData', {
                ...result.customer,
                customerName: result.customer.name, 
                lastVerified: new Date().toISOString()
            });
            
            return true;
        } else {
            console.log('❌ 伺服器中找不到客戶資料');
            return false;
        }
        
    } catch (error) {
        console.error('💥 檢查客戶資料時發生錯誤:', error);
        throw error;
    }
}

// ==================== 常數定義 ====================
const ELEMENTS = {
    INITIAL_LOADING: 'initialLoadingContainer',
    MAIN_CONTENT: 'mainContent',
    SERVICE_FORM: 'serviceForm',
    QUANTITY_SELECTOR: 'quantitySelector',
    BACK_BTN: 'backBtn',
    QUANTITY_MODAL: 'quantityModal',
    CONFIRM_MODAL: 'confirmModal',
    SUCCESS_MODAL: 'successModal',
    LOADING_MODAL: 'loadingModal'
};

const REQUIRED_DOM_ELEMENTS = ['serviceForm', 'quantitySelector', 'backBtn'];

const MESSAGES = {
    SYSTEM_LOAD_FAILED: '系統載入失敗，請重新整理頁面',
    LIFF_LOGIN_REQUIRED: '請重新進入LINE應用程式',
    LIFF_INIT_FAILED: '系統初始化失敗，請重新進入LINE應用程式',
    SYSTEM_ERROR: '系統錯誤，請重試',
    MISSING_BOOKING_INFO: '缺少預約資訊，跳轉到首頁',
    CUSTOMER_NOT_REGISTERED: '客戶未建檔，跳轉到建檔頁面'
};

// ==================== 工具函數 ====================

/**
 * 🚨 預約前最終時段檢查函數
 * 在用戶確認預約前，檢查預約日曆的時段是否已被占用
 * 
 * 使用情境：
 * - 下個月開放時，約15人同時使用系統預約
 * - 需要在最後一刻確認時段是否仍然可用
 * 
 * 日期格式處理：
 * - 自動將 ISO 格式 (2025-07-28T16:00:00.000Z) 轉換為 YYYY-MM-DD 格式
 * - 支援多種輸入格式，確保後端能正確解析
 * 
 * 日曆檢查邏輯：
 * - 後端會使用 CALENDAR_CONFIG.calendarId (來自 GOOGLE_CALENDAR_ID 屬性)
 * - 這與儲存預約的日曆是同一個，確保檢查的準確性
 * - 如果該時段已有預約事件，則返回不可用
 * 
 * @param {string} date - 預約日期 (支援多種格式，會自動轉換為 YYYY-MM-DD)
 * @param {string} time - 預約時間 (格式: HH:MM)
 * @returns {Promise<Object>} - 時段可用性結果 {available: boolean, message: string}
 */
async function checkTimeSlotBeforeBooking(date, time) {
    try {
        console.log('🔍 開始檢查時段可用性...');
        console.log('📅 原始日期:', date);
        console.log('⏰ 目標時間:', time);
        
        // 🔧 將日期轉換為後端期望的 YYYY-MM-DD 格式
        let formattedDate;
        if (typeof date === 'string' && date.includes('T')) {
            // ISO 格式：2025-07-28T16:00:00.000Z -> 2025-07-28
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
        } else if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // 已經是 YYYY-MM-DD 格式
            formattedDate = date;
        } else {
            // 其他格式，嘗試轉換
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
        }
        
        console.log('📅 格式化後日期:', formattedDate);

        // ============= 新增：先檢查是否為「開放時段」 =============
        // 業務規則：只有被「開放清單（時段日曆/掃描結果）」列出的時間，才允許進一步做「是否被占用」檢查
        // 目的：防止未開放的日期/時間被繞過前端 UI 直接提交
        console.log('📡 先向後端查詢該日期的開放時段...');
        const openSlotsResult = await ApiService.getAvailableTimeSlots(formattedDate);
        console.log('📡 後端（開放時段）回應:', openSlotsResult);

        if (!openSlotsResult || openSlotsResult.success !== true) {
            console.warn('⚠️ 無法取得開放時段，為安全起見視為未開放');
            return {
                available: false,
                message: '目前無法確認開放時段，請稍後再試'
            };
        }

        // 從回應中萃取所有可用的時段字串（支援物件或字串）
        const openTimeStrings = (openSlotsResult.availableSlots || []).map(slot => slot.time || slot);
        const isOpenSlot = openTimeStrings.includes(time);

        if (!isOpenSlot) {
            console.log('❌ 此時段未開放，拒絕預約');
            return {
                available: false,
                message: '此時段未開放'
            };
        }
        // ==================== 開放時段檢查通過 ====================
        console.log('✅ 已確認此時段為開放時段，繼續檢查是否被占用...');
        
        // 🔧 注意：這裡不需要硬編碼日曆ID，後端會自動使用正確的預約日曆ID
        // 後端會使用 CALENDAR_CONFIG.calendarId (來自 GOOGLE_CALENDAR_ID 屬性)
        // 確保檢查的是與儲存預約相同的日曆
        
        // 將時間轉換為檢查用的時段陣列
        const timeSlots = [time];
        
        console.log('📡 向後端發送時段檢查請求...');
        console.log('📡 檢查參數:', {
            originalDate: date,
            formattedDate: formattedDate,
            timeSlots: timeSlots,
            note: '後端會自動使用正確的預約日曆ID進行檢查'
        });
        
        // 呼叫後端API檢查時段可用性（使用格式化後的日期）
        const result = await ApiService.checkTimeSlotAvailability(formattedDate, timeSlots);
        
        console.log('📡 後端回應:', result);
        
        if (result.success && result.availability) {
            // 檢查指定時間是否可用
            const timeSlotStatus = result.availability[time];
            
            if (timeSlotStatus && timeSlotStatus.available === true) {
                console.log('✅ 時段檢查結果: 可用');
                return {
                    available: true,
                    message: '時段可用'
                };
            } else {
                console.log('❌ 時段檢查結果: 不可用');
                console.log('❌ 時段狀態:', timeSlotStatus);
                return {
                    available: false,
                    message: '時段已被占用'
                };
            }
        } else {
            console.error('❌ 時段檢查API回應異常:', result);
            // API回應異常，為了安全起見，視為不可用
            return {
                available: false,
                message: '無法確認時段狀態，請重試'
            };
        }
        
    } catch (error) {
        console.error('💥 檢查時段可用性時發生錯誤:', error);
        console.error('💥 錯誤詳情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // 發生錯誤時，為了安全起見，視為不可用
        return {
            available: false,
            message: '系統錯誤，無法確認時段狀態'
        };
    }
}

/**
 * 顯示載入指示器
 */
function showInitialLoading() {
    const loadingContainer = document.getElementById(ELEMENTS.INITIAL_LOADING);
    const mainContent = document.getElementById(ELEMENTS.MAIN_CONTENT);
    
    if (loadingContainer) loadingContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
}

/**
 * 隱藏載入指示器，顯示主要內容
 */
function hideInitialLoading() {
    const loadingContainer = document.getElementById(ELEMENTS.INITIAL_LOADING);
    const mainContent = document.getElementById(ELEMENTS.MAIN_CONTENT);
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
}

/**
 * 統一的錯誤處理和頁面跳轉
 * @param {string} message - 錯誤訊息
 * @param {string} redirectUrl - 跳轉URL，預設為首頁
 */
function handleError(message, redirectUrl = 'index.html') {
    hideInitialLoading();
    alert(message);
    window.location.href = redirectUrl;
}

/**
 * 檢查必要的DOM元素是否存在
 * @throws {Error} 如果缺少必要元素
 */
function validateRequiredElements() {
    console.log('🔍 檢查 DOM 元素...');
    
    for (const elementId of REQUIRED_DOM_ELEMENTS) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`必要的 DOM 元素不存在: ${elementId}`);
        }
    }
    
    console.log('✅ DOM 元素檢查通過');
}

/**
 * 確保 LIFF 已準備就緒
 * 強制進行 LIFF 初始化，確保系統穩定運作
 * @returns {Promise<boolean>} LIFF是否準備就緒
 */
async function ensureLiffReady() {
    console.log('🔍 開始 LIFF 初始化...');
    
    try {
        // 檢查基本的 LIFF 服務可用性
        if (typeof liff === 'undefined' || typeof initLiff === 'undefined') {
            console.error('❌ LIFF 服務不可用');
            throw new Error(MESSAGES.SYSTEM_LOAD_FAILED);
        }

        // 強制進行 LIFF 初始化
        console.log('🔄 正在初始化 LIFF...');
        const initSuccess = await initLiff();
        
        if (!initSuccess) {
            console.error('❌ LIFF 初始化失敗');
            throw new Error(MESSAGES.LIFF_INIT_FAILED);
        }
        
        // 驗證初始化結果
        if (!isLiffReady()) {
            console.error('❌ LIFF 初始化後仍未準備就緒');
            throw new Error(MESSAGES.LIFF_LOGIN_REQUIRED);
        }
        
        // 驗證能否獲取用戶ID
        const userId = getLineUserId();
        if (!userId) {
            console.error('❌ 無法獲取 LINE User ID');
            throw new Error(MESSAGES.LIFF_LOGIN_REQUIRED);
        }
        
        console.log('✅ LIFF 初始化成功，User ID:', userId);
        return true;
        
    } catch (error) {
        console.error('💥 LIFF 初始化失敗:', error);
        throw error;
    }
}

// ==================== 系統初始化 ====================

/**
 * 初始化所有UI組件
 */
function initializeAllComponents() {
    console.log('✅ 客戶已建檔，初始化服務選擇系統');
    
    const initSteps = [
        { name: '服務項目選擇', func: initServiceSelection },
        { name: '卸甲選擇', func: initRemovalSelection },
        { name: '數量選擇', func: initQuantitySelection },
        { name: '確認按鈕', func: initConfirmButton },
        { name: '返回按鈕', func: initBackButton },
        { name: '預約資訊顯示', func: displayBookingInfo }
    ];
    
    for (const step of initSteps) {
        try {
            console.log(`🔧 初始化${step.name}...`);
            step.func();
        } catch (error) {
            console.error(`💥 初始化${step.name}失敗:`, error);
            throw error;
        }
    }
    
    // 檢查 API 服務是否可用
    if (typeof ApiService !== 'undefined') {
        console.log('服務選擇頁面 - ApiService 已載入');
    } else {
        console.warn('服務選擇頁面 - ApiService 未載入');
    }
    
    console.log('✅ 服務選擇系統初始化完成');
}

/**
 * 🔐 處理客戶未建檔的情況（支援加密）
 */
async function handleUnregisteredCustomer() {
    console.log('❌ 客戶未建檔，跳轉到建檔頁面');
    console.log('💾 保存當前預約資訊，建檔完成後返回');
    
    // 🔐 保存預約資訊（加密），確保建檔完成後能返回
    const bookingInfo = await getCurrentBookingInfo();
    await ApiService.safeSetLocalStorage('pendingBookingInfo', bookingInfo);
    
    console.log('➡️ 導向 customer-registration.html');
    window.location.href = 'customer-registration.html';
}

// ==================== 主要初始化流程 ====================

/**
 * 當 DOM 載入完成後初始化系統
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 確保載入指示器顯示
        showInitialLoading();
        
        // ⏱️ 啟動最小等待時間計時器 (1秒) - 創造穩定的載入體驗，避免畫面閃爍
        const minLoadingPromise = new Promise(resolve => setTimeout(resolve, 1000));
        
        // 第一步：檢查預約資訊 (同步/極快)
        console.log('🔍 檢查預約資訊...');
        if (!await checkBookingInfo()) {
            console.log('❌ 缺少預約資訊，跳轉到首頁');
            handleError(MESSAGES.MISSING_BOOKING_INFO);
            return;
        }
        console.log('✅ 預約資訊檢查通過');
        
        // 第二步：檢查必要的DOM元素
        validateRequiredElements();
        
        // 判斷是否為老用戶（檢查本地快取）
        let hasLocalCache = false;
        try {
            // 簡單檢查 localStorage key 是否存在，用來決定載入策略
            // 只要有資料，無論是否過期，都先視為老用戶以提供秒開體驗
            hasLocalCache = localStorage.getItem('latestCustomerData') !== null;
        } catch (e) {
            console.warn('檢查本地快取失敗:', e);
        }

        // 第三步：並行執行任務
        
        // 任務 A: 初始化 UI 組件
        const uiInitPromise = (async () => {
            try {
                initializeAllComponents();
                return true;
            } catch (e) {
                console.error('UI 初始化失敗', e);
                throw e;
            }
        })();

        // 任務 B: 客戶驗證 (背景執行)
        // 將 promise 存到全域變數，以便提交表單時檢查
        customerVerificationPromise = (async () => {
            try {
                // 嘗試驗證 (包含快取檢查與 API 呼叫)
                // 🚀 優化：checkCustomerByLineId 內部已實作快取優先邏輯
                const hasCustomerRecord = await checkCustomerByLineId();
                
                // 🔄 背景任務：確保 LIFF 初始化 (為了後續功能如關閉視窗)
                ensureLiffReady().catch(err => console.warn('⚠️ 背景 LIFF 初始化非致命錯誤:', err));
                
                if (hasCustomerRecord) {
                    isCustomerVerificationComplete = true;
                    console.log('✅ 客戶驗證完成');
                    return true;
                } else {
                    // 客戶未建檔：跳轉到建檔頁面
                    console.warn('⚠️ 客戶未建檔，準備跳轉...');
                    await handleUnregisteredCustomer();
                    return false;
                }
            } catch (error) {
                console.error('💥 背景客戶驗證失敗:', error);
                const errorMessage = error.message ? `系統錯誤：${error.message}` : MESSAGES.SYSTEM_ERROR;
                alert(errorMessage);
                return false;
            }
        })();
        
        // 第四步：根據用戶類型決定等待策略
        
        if (hasLocalCache) {
            // 🚀 【老用戶策略】：快取優先，秒開
            console.log('🚀 [老用戶] 偵測到本地快取，採用快速載入模式');
            
            // 只等待最小載入時間和 UI 初始化，不等待驗證結果
            await Promise.all([minLoadingPromise, uiInitPromise]);
            
            // 立即顯示 UI (背景繼續驗證)
            hideInitialLoading();
            console.log('🎨 UI 已顯示 (背景驗證中...)');
            
        } else {
            // 🆕 【新用戶策略】：無快取，強制等待完整驗證
            console.log('🆕 [新用戶] 無本地快取，等待完整驗證...');
            
            // 等待所有任務完成，包括驗證結果
            // 這樣如果驗證失敗（未註冊），用戶就不會看到 UI，而是直接看到 Loading 直到跳轉
            const [, , verificationResult] = await Promise.all([
                minLoadingPromise, 
                uiInitPromise, 
                customerVerificationPromise
            ]);
            
            if (verificationResult) {
                // 驗證成功，才顯示 UI
                hideInitialLoading();
                console.log('🎨 驗證通過，顯示 UI');
            } else {
                // 驗證失敗（未註冊），保持 Loading 顯示，直到頁面跳轉完成
                // 注意：handleUnregisteredCustomer 已經在 customerVerificationPromise 內被呼叫
                console.log('🛑 驗證未通過，保持 Loading 狀態等待跳轉');
            }
        }
        
    } catch (error) {
        // ... 全域錯誤處理保持不變 ...
        console.error('💥 初始化服務選擇系統時發生錯誤:', error);
        const errorMsg = error.message ? 
            `系統初始化失敗: ${error.message}` : 
            '系統初始化失敗，請重新整理頁面';
        handleError(errorMsg);
    }
});

// ==================== UI 組件初始化函數 ====================

/**
 * 服務項目選擇功能初始化
 */
function initServiceSelection() {
    // 取得所有服務項目元素
    const serviceItems = document.querySelectorAll('.service-item');
    
    // 為每個服務項目添加點擊事件監聽器
    serviceItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有服務項目的選中狀態
            serviceItems.forEach(otherItem => {
                otherItem.classList.remove('selected');
                const otherCheckIcon = otherItem.querySelector('.check-icon');
                otherCheckIcon.classList.add('hidden');
            });
            
            // 為當前點擊的項目添加選中狀態
            this.classList.add('selected');
            
            // 取得打勾圖示元素並顯示
            const checkIcon = this.querySelector('.check-icon');
                checkIcon.classList.remove('hidden');
        });
    });
}

/**
 * 卸甲服務選擇功能初始化
 */
function initRemovalSelection() {
    // 取得所有卸甲選項元素
    const removalItems = document.querySelectorAll('.removal-item');
    
    // 為每個卸甲選項添加點擊事件監聽器
    removalItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有卸甲選項的選中狀態
            removalItems.forEach(otherItem => {
                otherItem.classList.remove('selected');
            });
            
            // 為當前點擊的選項添加選中狀態
            this.classList.add('selected');
        });
    });
}

/**
 * 數量選擇功能初始化
 */
function initQuantitySelection() {
    // 取得數量選擇器和模態框相關元素
    const quantitySelector = document.getElementById('quantitySelector');
    const quantityModal = document.getElementById('quantityModal');
    const quantityOptions = document.querySelectorAll('.quantity-option');
    const confirmQuantityBtn = document.getElementById('confirmQuantity');
    const removeQuantityBtn = document.getElementById('removeQuantity');
    const quantityText = document.getElementById('quantityText');
    const checkIcon = quantitySelector.querySelector('.check-icon');
    
    // 儲存選中的數量選項
    let selectedQuantity = null;
    
    // 數量選擇器點擊事件 - 開啟模態框
    quantitySelector.addEventListener('click', function() {
        quantityModal.classList.remove('hidden');
    });
    
    // 數量選項點擊事件
    quantityOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除所有選項的選中狀態
            quantityOptions.forEach(otherOption => {
                otherOption.classList.remove('selected');
            });
            
            // 為當前選項添加選中狀態
            this.classList.add('selected');
            
            // 儲存選中的數量值
            selectedQuantity = this.dataset.quantity;
            
            // 啟用確認按鈕
            confirmQuantityBtn.disabled = false;
        });
    });
    
    // 確認數量按鈕點擊事件
    confirmQuantityBtn.addEventListener('click', function() {
        if (selectedQuantity) {
            // 根據選中的數量值更新顯示文字
            const quantityTexts = {
                '1-3': '一到三隻',
                '4-7': '四到七隻',
                '7+': '七隻以上'
            };
            
            // 更新數量選擇器的顯示文字為"延甲 - 選項"
            quantityText.textContent = `延甲 - ${quantityTexts[selectedQuantity]}`;
            
            // 為數量選擇器添加選中樣式
            quantitySelector.classList.add('selected');
            
            // 顯示打勾圖示
            checkIcon.classList.remove('hidden');
            
            // 關閉模態框
            quantityModal.classList.add('hidden');
            
            // 重置模態框狀態
            resetModalState();
        }
    });
    
    // 移除數量選擇按鈕點擊事件
    removeQuantityBtn.addEventListener('click', function() {
        // 重置數量選擇器到預設狀態
        resetQuantitySelector();
        
        // 關閉模態框
        quantityModal.classList.add('hidden');
        
        // 重置模態框狀態
        resetModalState();
    });
    
    // 重置模態框狀態的函數
    function resetModalState() {
        // 重置選項狀態
        quantityOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // 重置選中的數量
        selectedQuantity = null;
        
        // 禁用確認按鈕
        confirmQuantityBtn.disabled = true;
    }
    
    // 重置數量選擇器到預設狀態的函數
    function resetQuantitySelector() {
        // 重置顯示文字
        quantityText.textContent = '延甲';
        
        // 移除選中樣式
        quantitySelector.classList.remove('selected');
        
        // 隱藏打勾圖示
        checkIcon.classList.add('hidden');
    }
    
    // 點擊模態框背景關閉模態框
    quantityModal.addEventListener('click', function(e) {
        if (e.target === quantityModal) {
            // 關閉模態框但不重置選擇器狀態
            quantityModal.classList.add('hidden');
            resetModalState();
        }
    });
}

/**
 * 表單提交功能初始化
 */
function initConfirmButton() {
    // 取得表單和相關模態框元素
    const serviceForm = document.getElementById('serviceForm');
    const confirmModal = document.getElementById('confirmModal');
    const successModal = document.getElementById('successModal');
    const serviceDetails = document.getElementById('serviceDetails');
    const confirmServiceBtn = document.getElementById('confirmService');
    const cancelServiceBtn = document.getElementById('cancelService');
    const closeSuccessBtn = document.getElementById('closeSuccess');
    
    // 表單提交事件
    serviceForm.addEventListener('submit', async function(e) {
        // 阻止表單預設提交行為
        e.preventDefault();
        
        // 先驗證表單基本欄位
        if (!validateForm()) return;

        // ⏳ 防護機制：若客戶驗證尚未完成（使用者填表太快），需在此攔截並等待
        // 這是配合「預先顯示 UI」策略的重要一環
        if (!isCustomerVerificationComplete) {
            console.log('⏳ 使用者提交表單，但客戶驗證尚未完成，顯示等待中...');
            
            // 顯示載入模態框，並修改提示文字
            const loadingModal = document.getElementById('loadingModal');
            const loadingTextElement = loadingModal.querySelector('h3');
            const originalText = loadingTextElement ? loadingTextElement.textContent : '處理中...';
            
            if (loadingTextElement) loadingTextElement.textContent = '正在確認會員資料...';
            loadingModal.classList.remove('hidden');

            try {
                // 等待背景驗證任務完成
                const result = await customerVerificationPromise;
                
                // 還原 loading 文字 (無論成功失敗)
                if (loadingTextElement) loadingTextElement.textContent = originalText;
                
                if (!result) {
                    // 驗證失敗 (例如未註冊)，此時應該已經觸發跳轉，這裡只需停止後續動作
                    console.warn('❌ 會員驗證失敗，停止提交');
                    return; 
                }
                
                // 驗證成功，繼續執行
                // 先隱藏 loading modal (因為 showServiceConfirmation 之後會開 confirmModal)
                loadingModal.classList.add('hidden');
                console.log('✅ 會員驗證通過，繼續提交流程');
                
            } catch (err) {
                loadingModal.classList.add('hidden');
                if (loadingTextElement) loadingTextElement.textContent = originalText;
                alert('會員資料驗證失敗，請重新整理頁面試試');
                return;
            }
        }

        // 驗證通過，顯示確認視窗
        await showServiceConfirmation();
        confirmModal.classList.remove('hidden');
    });
    
    // 確認服務按鈕點擊事件
    confirmServiceBtn.addEventListener('click', async function() {
        try {
            confirmModal.classList.add('hidden');
            const loadingModal = document.getElementById('loadingModal');
            const loadingModalContent = loadingModal.querySelector('h3');
            loadingModal.classList.remove('hidden');
            if (loadingModalContent) loadingModalContent.textContent = '正在為您預約...';

            const bookingData = await prepareBookingData();

            // 防止重複預約由後端 ScriptLock + Sheets 衝突查詢負責
            // 後端回傳 TIME_SLOT_UNAVAILABLE / TIME_SLOT_CONFLICT 時由 submitBooking 處理
            await submitBooking(bookingData, loadingModal, {
                onSuccess: function() {
                    saveServiceData();
                    successModal.classList.remove('hidden');
                }
            });

        } catch (error) {
            document.getElementById('loadingModal').classList.add('hidden');
            console.error('💥 預約失敗:', error);
            alert(error.message || '預約過程中發生錯誤，請重試');
        }
    });
    
    // 取消服務按鈕點擊事件
    cancelServiceBtn.addEventListener('click', function() {
        confirmModal.classList.add('hidden');
    });
    
    // 關閉成功模態框按鈕點擊事件
    closeSuccessBtn.addEventListener('click', function() {
        successModal.classList.add('hidden');
        
        // 預約成功後關閉瀏覽器確定要刪除
        console.log('🚪 準備關閉頁面...');
        
        try {
            // 在 LIFF 環境中，優先使用 LIFF 的關閉方法
            if (typeof liff !== 'undefined' && liff.isInClient()) {
                console.log('📱 使用 LIFF 關閉視窗');
                liff.closeWindow();
                return;
            }
            
            // 一般瀏覽器環境，嘗試關閉當前視窗
            console.log('🌐 使用瀏覽器關閉視窗');
            window.close();
            
            // 如果 window.close() 無法執行（某些瀏覽器限制），則顯示提示
            setTimeout(() => {
                alert('預約完成！請手動關閉此頁面。');
            }, 500);
            
        } catch (error) {
            console.warn('⚠️ 無法自動關閉瀏覽器:', error);
            alert('預約完成！請手動關閉此頁面。');
        }
    });
}

// ==================== 表單驗證和資料處理 ====================

/**
 * 驗證表單是否已正確填寫
 * @returns {boolean} 表單是否有效
 */
function validateForm() {
    // 檢查是否選擇了服務項目
    const selectedService = document.querySelector('.service-item.selected');
    if (!selectedService) {
        alert('請選擇服務項目');
        return false;
    }
    
    // 檢查是否選擇了卸甲選項
    const selectedRemoval = document.querySelector('.removal-item.selected');
    if (!selectedRemoval) {
        alert('請選擇是否需要卸甲');
        return false;
    }
    
    return true;
}

/**
 * 🔐 獲取快取的基本資料（支援加密）
 * 
 * 使用 ApiService.safeGetLocalStorage() 自動處理解密
 * 
 * @returns {Promise<Object>} 快取的基本資料
 */
async function getCachedBasicData() {
    try {
        // 🔐 使用支援加密的安全讀取方法
        const cachedData = await ApiService.safeGetLocalStorage('latestCustomerData', null);
        return cachedData;
    } catch (error) {
        console.error('獲取快取資料失敗:', error);
        return null;
    }
}

/**
 * 獲取當前服務選擇資料
 * @returns {Object} 服務選擇資料
 */
function getCurrentServiceData() {
    const selectedService = document.querySelector('.service-item.selected');
    const selectedRemoval = document.querySelector('.removal-item.selected');
    const quantitySelector = document.getElementById('quantitySelector');
    const remarks = document.getElementById('remarks').value;
    
    return {
        service: selectedService ? selectedService.dataset.service : null,
        serviceText: selectedService ? selectedService.querySelector('.service-text').textContent : '',
        removal: selectedRemoval ? selectedRemoval.dataset.removal : null,
        removalText: selectedRemoval ? selectedRemoval.querySelector('.removal-text').textContent : '',
        hasQuantity: quantitySelector ? quantitySelector.classList.contains('selected') : false,
        quantityText: quantitySelector ? document.getElementById('quantityText').textContent : '',
        remarks: remarks
    };
}

/**
 * 🔐 顯示服務確認詳情（支援加密）
 * 🎯 智慧處理各種日期時間格式，統一轉換為用戶友善的中文顯示
 */
async function showServiceConfirmation() {
    const serviceData = getCurrentServiceData();
    const bookingInfo = await getCurrentBookingInfo();
    const serviceDetails = document.getElementById('serviceDetails');
    
    // 🔧 統一處理日期格式：將各種可能的日期格式轉換為友善的中文格式
    const displayDate = formatBookingDate(bookingInfo.date);
    const displayTime = formatBookingTime(bookingInfo.time);
    
    let detailsHTML = `
        <div class="detail-item">
            <strong>預約日期：</strong>${displayDate}
        </div>
        <div class="detail-item">
            <strong>預約時間：</strong>${displayTime}
        </div>
        <div class="detail-item">
            <strong>服務項目：</strong>${serviceData.serviceText}
        </div>
        <div class="detail-item">
            <strong>卸甲服務：</strong>${serviceData.removalText}
        </div>
    `;
    
    if (serviceData.hasQuantity) {
        detailsHTML += `
            <div class="detail-item">
                <strong>延甲數量：</strong>${serviceData.quantityText}
            </div>
        `;
    }
    
    if (serviceData.remarks) {
        detailsHTML += `
            <div class="detail-item">
                <strong>其他備註：</strong>${serviceData.remarks}
            </div>
        `;
    }
    
    serviceDetails.innerHTML = detailsHTML;
}

/**
 * 🗓️ 格式化預約日期為友善的中文顯示
 * 處理各種可能的日期格式：ISO字串、YYYY-MM-DD、Date物件等
 * 
 * @param {string|Date} dateInput - 各種格式的日期輸入
 * @returns {string} 格式化後的中文日期，如 "2025年7月15日（二）"
 */
function formatBookingDate(dateInput) {
    if (!dateInput) {
        return '未指定日期';
    }
    
    try {
        let dateObj;
        
        // 🔍 識別並處理不同的日期格式
        if (typeof dateInput === 'string') {
            // ISO 格式：2025-07-15T16:00:00.000Z
            if (dateInput.includes('T')) {
                dateObj = new Date(dateInput);
                console.log('📅 處理 ISO 格式日期:', dateInput);
            }
            // YYYY-MM-DD 格式：2025-07-15
            else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // 避免時區問題：直接解析年月日
                const [year, month, day] = dateInput.split('-').map(Number);
                dateObj = new Date(year, month - 1, day); // 月份需要減1
                console.log('📅 處理 YYYY-MM-DD 格式日期:', dateInput);
            }
            // 其他格式嘗試直接解析
            else {
                dateObj = new Date(dateInput);
                console.log('📅 處理其他格式日期:', dateInput);
            }
        } 
        // Date 物件
        else if (dateInput instanceof Date) {
            dateObj = new Date(dateInput);
            console.log('📅 處理 Date 物件:', dateInput);
        }
        // 無法識別的格式
        else {
            console.warn('⚠️ 無法識別的日期格式:', dateInput);
            return String(dateInput);
        }
        
        // 驗證日期有效性
        if (isNaN(dateObj.getTime())) {
            console.warn('⚠️ 無效的日期:', dateInput);
            return String(dateInput);
        }
        
        // 🎨 轉換為友善的中文格式
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[dateObj.getDay()];
        
        const formattedDate = `${year}年${month}月${day}日（${weekday}）`;
        
        console.log('✅ 日期格式化完成:', {
            原始: dateInput,
            格式化後: formattedDate
        });
        
        return formattedDate;
        
    } catch (error) {
        console.error('❌ 日期格式化失敗:', error, '原始輸入:', dateInput);
        return String(dateInput); // 失敗時返回原始字串
    }
}

/**
 * 🕐 格式化預約時間為標準的 HH:MM 格式
 * 處理各種可能的時間格式
 * 
 * @param {string} timeInput - 各種格式的時間輸入
 * @returns {string} 格式化後的時間，如 "14:30"
 */
function formatBookingTime(timeInput) {
    if (!timeInput) {
        return '未指定時間';
    }
    
    try {
        // 已經是 HH:MM 格式，直接返回
        if (typeof timeInput === 'string' && timeInput.match(/^\d{1,2}:\d{2}$/)) {
            console.log('🕐 時間已是標準格式:', timeInput);
            return timeInput;
        }
        
        // 包含 T 的 ISO 格式，提取時間部分
        if (typeof timeInput === 'string' && timeInput.includes('T')) {
            const timeObj = new Date(timeInput);
            if (!isNaN(timeObj.getTime())) {
                const hours = timeObj.getHours();
                const minutes = timeObj.getMinutes();
                const formattedTime = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
                
                console.log('🕐 從 ISO 格式提取時間:', {
                    原始: timeInput,
                    格式化後: formattedTime
                });
                
                return formattedTime;
            }
        }
        
        // 其他格式嘗試轉換
        console.log('🕐 保持原始時間格式:', timeInput);
        return String(timeInput);
        
    } catch (error) {
        console.error('❌ 時間格式化失敗:', error, '原始輸入:', timeInput);
        return String(timeInput); // 失敗時返回原始字串
    }
}

/**
 * 準備預約資料
 * @returns {Promise<Object>} 完整的預約資料
 */
async function prepareBookingData() {
    try {
        const serviceData = getCurrentServiceData();
        const bookingInfo = await getCurrentBookingInfo();
        const customerData = await getCachedBasicData();
        
        console.log('🔍 準備預約資料中...', {
            serviceData,
            bookingInfo,
            customerData
        });
        
        // 詳細記錄客戶資料狀態
        console.log('📋 客戶資料詳細檢查:', {
            hasCustomerData: !!customerData,
            customerName: customerData?.customerName,
            name: customerData?.name,
            phone: customerData?.phone,
            lineUserId: customerData?.lineUserId
        });
        
        if (!customerData) {
            throw new Error('找不到客戶資料，請重新建檔');
        }
        
        if (!customerData.customerName && !customerData.name) {
            console.error('❌ 客戶資料中缺少姓名欄位:', customerData);
            throw new Error('客戶資料異常，請重新建檔');
        }
        
        if (!bookingInfo || !bookingInfo.date || !bookingInfo.time) {
            throw new Error('缺少預約時間資訊，請重新選擇時段');
        }
        
        if (!serviceData.service) {
            throw new Error('請選擇服務項目');
        }
        
        const bookingData = {
            // 客戶資訊
            lineUserId: customerData.lineUserId,
            customerName: customerData.customerName || customerData.name, // 確保有客戶姓名
            phone: customerData.phone,
            
            // 預約資訊
            date: bookingInfo.date,
            time: bookingInfo.time,
            // 做法B：帶 +08:00 的 ISO 絕對時刻，避免時區位移（若存在）
            isoStart: bookingInfo.isoStart,
            
            // 服務資訊
            service: serviceData.service,
            serviceText: serviceData.serviceText,
            removal: serviceData.removal,
            removalText: serviceData.removalText,
            hasQuantity: serviceData.hasQuantity,
            quantityText: serviceData.hasQuantity ? serviceData.quantityText : '', // 只有選擇延甲時才傳送文字
            remarks: serviceData.remarks,
            
            // 時間戳記
            createdAt: new Date().toISOString()
        };
        
        console.log('✅ 預約資料準備完成:', bookingData);
        return bookingData;
        
    } catch (error) {
        console.error('💥 準備預約資料失敗:', error);
        throw error;
    }
}

/**
 * 🔐 保存服務資料到本地存儲（支援加密）
 */
async function saveServiceData() {
    try {
        const serviceData = getCurrentServiceData();
        const bookingInfo = await getCurrentBookingInfo();
        
        const serviceRecord = {
            ...serviceData,
            ...bookingInfo,
            timestamp: new Date().toISOString()
        };
        
        // 獲取現有記錄
        const existingRecords = getServiceRecords();
        
        // 添加新記錄到開頭
        existingRecords.unshift(serviceRecord);
        
        // 只保留最近10筆記錄
        const recentRecords = existingRecords.slice(0, 10);
        
        // 保存到localStorage
        localStorage.setItem('serviceHistory', JSON.stringify(recentRecords));
        
        console.log('服務資料已保存:', serviceRecord);
        
    } catch (error) {
        console.error('保存服務資料失敗:', error);
    }
}

/**
 * 獲取服務記錄
 * @returns {Array} 服務記錄陣列
 */
function getServiceRecords() {
    try {
        const records = localStorage.getItem('serviceHistory');
        return records ? JSON.parse(records) : [];
    } catch (error) {
        console.error('獲取服務記錄失敗:', error);
        return [];
    }
}

/**
 * 獲取最新的服務選擇
 * @returns {Object|null} 最新的服務選擇
 */
function getLatestServiceSelection() {
    const records = getServiceRecords();
    return records.length > 0 ? records[0] : null;
}

/**
 * 清除服務資料
 */
function clearServiceData() {
    try {
        localStorage.removeItem('serviceHistory');
        console.log('服務資料已清除');
    } catch (error) {
        console.error('清除服務資料失敗:', error);
    }
}

// ==================== 其他 UI 功能 ====================

/**
 * 返回按鈕功能初始化
 */
function initBackButton() {
    const backBtn = document.getElementById('backBtn');
    
    backBtn.addEventListener('click', function() {
        // 返回首頁
        window.location.href = 'index.html';
    });
}

/**
 * 🔐 顯示預約資訊（支援加密）
 */
async function displayBookingInfo() {
    const bookingInfo = await getCurrentBookingInfo();
    
    if (bookingInfo && bookingInfo.date && bookingInfo.time) {
        console.log('📅 預約資訊:', bookingInfo);
        
        // 可以在這裡添加在頁面上顯示預約資訊的邏輯
        // 例如：在頁面頂部顯示預約日期和時間
    }
}

// ==================== 資料存取輔助函數 ====================

/**
 * 🔐 獲取最新的客戶資料（支援加密）
 * @returns {Promise<Object|null>} 客戶資料
 */
async function getLatestCustomerData() {
    return await getCachedBasicData();
}

/**
 * 🔐 獲取當前預約資訊（支援加密）
 * @returns {Promise<Object|null>} 預約資訊
 */
async function getCurrentBookingInfo() {
    try {
        // 🔐 使用支援加密的安全讀取方法
        const bookingData = await ApiService.safeGetLocalStorage('currentBookingInfo', null);
        return bookingData;
    } catch (error) {
        console.error('獲取預約資訊失敗:', error);
        return null;
    }
}

/**
 * 🔐 檢查預約資訊是否存在（支援加密）
 * @returns {Promise<boolean>} 預約資訊是否有效
 */
async function checkBookingInfo() {
    const bookingInfo = await getCurrentBookingInfo();
    return bookingInfo && bookingInfo.date && bookingInfo.time;
} 
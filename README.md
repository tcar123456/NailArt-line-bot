# 美甲工作室 LINE 預約系統

單人美甲工作室的 **LINE 官方帳號 + LIFF 線上預約**系統。客人從加好友、看價目表、選時段到查詢取消，全程留在 LINE 裡，不用下載 App 或註冊帳號。

**狀態**：已交付客戶並上線運作。這是我的第一個接案專案；後續重寫的多人版本見 [2-4ReservationSystem](https://github.com/tcar123456/2-4ReservationSystem)。

---

## 系統組成

| 目錄 | 內容 |
|------|------|
| `NailArt-line-bot/` | LINE Bot webhook（Python / Flask，部署於 Zeabur） |
| `Reserve-web/public/` | LIFF 前台與店家後台（原生 HTML / CSS / JS） |
| `Reserve-web/rear-end-fire/modular/` | 後端 API（Google Apps Script，12 個模組） |

資料存在客戶原本就在用的 Google 工具上：**Sheets**（客戶、預約、稽核紀錄）與 **Calendar**（可預約時段與已排定事件）。

## 技術棧

Python + Flask + line-bot-sdk · 原生 HTML/CSS/JS · Google Apps Script · Google Sheets / Calendar · LIFF · Jest

## 設計重點

**用 Sheets 與 Calendar 當資料層，是為了讓系統掛掉時客戶還能營運。** 客戶是單人工作室，沒有 IT 支援。就算網站整個掛了，她打開手機上的 Google 日曆，今天有誰要來還是看得到。代價是查詢效能與一致性保證都弱，這也是後來重寫的主因。

**時段衝突用兩道防線擋。** GAS 沒有資料庫層的約束可用，所以先用 `LockService` 鎖住建立預約的流程，鎖內**先查 Sheets 再查 Calendar**——Sheets 讀取是強一致的，Calendar API 有寫入後的傳播延遲，只靠 Calendar 檢查時，幾秒內搶同一時段的第二個人可能查不到第一筆。衝突判斷抽成純函式，可單元測試。

**前端不用框架。** 頁面要在 LIFF 的 WebView 裡快速開啟，客戶端網路不見得好。原生 HTML/JS 沒有 bundle 也沒有 hydration，第一屏就是可用的。

**做了又拿掉的分頁優化。** 原本對 Calendar 查詢實作自適應分頁，實測發現查 30 天時反而比一次取 2500 筆慢 3–5 倍。程式碼保留但關閉，並在 `config.gs` 註記原因與實測數字——留著關掉的程式碼與理由，比刪掉更有用。

**多層記憶體快取。** GAS 每次讀 `PropertiesService` 與 `SpreadsheetApp` 都是實際 I/O 且有配額，因此對配置、試算表、客戶索引、預約索引各做一層 5 分鐘快取，首頁另合併成單一 API 呼叫。

## 開始開發

```bash
# LINE Bot
cd NailArt-line-bot
pip install -r requirements.txt
cp .env.example .env        # LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET
python app.py

# 前端測試
cd Reserve-web
npm install && npm test
```

GAS 後端需將 `rear-end-fire/modular/` 貼進 Apps Script 專案，並在「指令碼屬性」設定 `LINE_CHANNEL_ACCESS_TOKEN`、`GOOGLE_CALENDAR_ID`、`TIMESLOTS_CALENDAR_ID`、`SPREADSHEET_ID`。

## 已知限制

- 併發保證停在應用層的鎖，沒有資料庫層的約束
- GAS 有每日執行配額，尖峰可能被限流
- 只支援單一服務人員，沒有員工與班表的概念
- 服務價格沒有快照，改價會影響舊預約的金額顯示
- 自動化測試只覆蓋前端與部分後端純函式

## 安全性

LIFF access token 一律送到後端由 `verifyLineAccessToken()` 打 LINE API 驗證後才取得 `lineUserId`，前端傳來的 user ID 不被信任。所有金鑰放在 GAS 指令碼屬性與環境變數，不進版控。

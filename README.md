# LINE Bot 美甲預約服務

這是一個 LINE Bot 美甲預約服務，包含主要服務程式和快捷選單設定工具。

## 系統需求

- Python 3.9 或更高版本
- pip（Python 套件管理器）
- Git
- LINE Messaging API 帳號

## 專案結構

```
├── app.py                 # 主要的 LINE Bot 服務程式
├── create_rich_menu.py    # 快捷選單設定工具（本地執行）
├── rich_menu_image.png    # 快捷選單圖片
├── requirements.txt       # Python 套件依賴
└── .env                  # 環境變數設定（需自行建立）
```

## 安裝步驟

1. 複製專案：
```bash
git clone [你的GitHub倉庫URL]
cd [專案資料夾名稱]
```

2. 建立虛擬環境：
```bash
# 建立虛擬環境
python -m venv venv

# 啟動虛擬環境
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

3. 安裝依賴套件：
```bash
pip install -r requirements.txt
```

4. 設定環境變數：
建立 `.env` 檔案並填入：
   ```
   LINE_CHANNEL_ACCESS_TOKEN=你的頻道存取權杖
   LINE_CHANNEL_SECRET=你的頻道密鑰
   ```

## 使用方式

### 設定快捷選單（本地執行）

1. 確保 `rich_menu_image.png` 檔案存在且尺寸為 2500x1686 像素
2. 執行快捷選單設定工具：
```bash
python create_rich_menu.py
```

### 執行主要服務

```bash
python app.py
```

### LINE Developers 設定

1. 在 LINE Developers Console 中：
   - 設定 Webhook URL
   - 開啟 Use webhook
   - 關閉自動回覆訊息

## 開發說明

- `app.py`：主要的 LINE Bot 服務
- `create_rich_menu.py`：快捷選單設定工具，只在本地執行
- 更新快捷選單時只需在本地執行 `create_rich_menu.py`

## 注意事項

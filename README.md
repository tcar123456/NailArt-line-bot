# LINE Bot 範例

這是一個簡單的 LINE Bot 範例，當收到訊息時會回覆「你好！」。

## 環境需求

- Python 3.7 或更高版本
- pip（Python 套件管理器）
- Git
- Google Cloud Platform 帳號
- Docker（選用，用於本地測試）

## 安裝步驟

1. 複製專案：
```bash
git clone [你的GitHub倉庫URL]
cd [專案資料夾名稱]
```

2. 安裝所需套件：
```bash
pip install -r requirements.txt
```

3. 設定環境變數：
   - 建立 `.env` 檔案
   - 填入以下內容：
   ```
   LINE_CHANNEL_ACCESS_TOKEN=你的頻道存取權杖
   LINE_CHANNEL_SECRET=你的頻道密鑰
   ```

4. 準備快捷選單圖片：
   - 建立一個 2500x1686 像素的 Rich Menu 圖片檔案
   - 將檔案命名為 `rich_menu_image.png` 並放在專案根目錄下
   - 圖片內容應對應程式碼中定義的按鈕區域

5. 在 LINE Developers 後台設定：
   - Webhook URL：https://你的網域/callback
   - 開啟 Use webhook
   - 關閉自動回覆訊息

## 執行方式

本地執行：
```bash
python app.py
```

使用 Docker 執行：
```bash
docker build -t line-bot .
docker run -p 8080:8080 line-bot
```

## 部署到 GitHub

1. 初始化 Git 倉庫：
```bash
git init
```

2. 添加檔案到暫存區：
```bash
git add .
```

3. 提交變更：
```bash
git commit -m "初始化 LINE Bot 專案"
```

4. 添加遠端倉庫：
```bash
git remote add origin [你的GitHub倉庫URL]
```

5. 推送到 GitHub：
```bash
git push -u origin main
```

## 部署到 Google Cloud Platform

### 前置準備

1. 建立 GCP 專案並啟用必要的 API：
   - Cloud Run API
   - Artifact Registry API
   - Cloud Build API
   - Cloud Resource Manager API
   - Identity and Access Management (IAM) API

2. 建立服務帳號（Service Account）：
   - 前往 GCP Console > IAM & Admin > Service Accounts
   - 建立新的服務帳號
   - 賦予必要權限：
     - Service Usage Admin
     - Service Usage Consumer
     - Service Management Administrator
     - Project IAM Admin
     - Cloud Run Admin
     - Storage Admin
     - Artifact Registry Administrator
     - Security Reviewer

3. 下載服務帳號金鑰（JSON 格式）

### 設定 GitHub Secrets

在 GitHub 倉庫設定中添加以下 Secrets：
- `GCP_PROJECT_ID`：你的 GCP 專案 ID
- `GCP_SA_KEY`：服務帳號金鑰的 JSON 內容
- `GCP_SA_EMAIL`：服務帳號電子郵件地址
- `LINE_CHANNEL_ACCESS_TOKEN`：LINE Channel Access Token
- `LINE_CHANNEL_SECRET`：LINE Channel Secret

### 自動部署

- 推送到 main 分支時會自動觸發部署
- 部署進度可在 GitHub Actions 頁面查看
- 部署完成後，在 Cloud Run 控制台獲取服務 URL
- 將 Cloud Run 服務 URL 更新到 LINE Developers 的 Webhook URL

注意事項：
- 請確保 `.env` 檔案已加入 `.gitignore`
- 不要將敏感資訊上傳到 GitHub
- 本地開發時需要使用 ngrok 等工具來建立 HTTPS 連線
- 確保 GCP 專案已啟用帳單功能
- 確保 `rich_menu_image.png` 檔案存在於專案根目錄下 
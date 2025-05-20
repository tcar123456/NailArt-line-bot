# LINE Bot 範例

這是一個簡單的 LINE Bot 範例，當收到訊息時會回覆「你好！」。

## 環境需求

- Python 3.7 或更高版本
- pip（Python 套件管理器）
- Git

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

4. 在 LINE Developers 後台設定：
   - Webhook URL：https://你的網域/callback
   - 開啟 Use webhook
   - 關閉自動回覆訊息

## 執行方式

```bash
python app.py
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

注意事項：
- 請確保 `.env` 檔案已加入 `.gitignore`
- 不要將敏感資訊（如 Channel Access Token）上傳到 GitHub
- 本地開發時需要使用 ngrok 等工具來建立 HTTPS 連線 
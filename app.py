# 匯入必要的套件
from flask import Flask, request, abort  # Flask 網頁框架，用於建立 webhook 伺服器
from linebot import LineBotApi, WebhookHandler  # LINE Bot SDK 的核心類別
from linebot.exceptions import InvalidSignatureError  # LINE Bot 簽名驗證錯誤例外
from linebot.models import MessageEvent, TextMessage, TextSendMessage, ImageSendMessage  # LINE Bot 訊息相關類別
from message_templates import get_booking_template  # 匯入自訂的訊息模板函數
import os  # 作業系統相關功能，用於讀取環境變數
from dotenv import load_dotenv  # 載入 .env 檔案中的環境變數
import logging  # 日誌記錄功能

# 設定日誌系統，用於記錄程式運行狀況和除錯
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 載入環境變數檔案 (.env)，包含 LINE Bot 的金鑰和權杖
load_dotenv()

# 建立 Flask 應用程式實例，這是整個 web 伺服器的核心
app = Flask(__name__)

# 初始化 LINE Bot API 相關設定
# LINE_CHANNEL_ACCESS_TOKEN: 用於發送訊息給用戶的權杖
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
# LINE_CHANNEL_SECRET: 用於驗證 webhook 請求真實性的密鑰
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))

# 定義 webhook 端點，LINE 伺服器會將用戶訊息發送到這個網址
@app.route("/callback", methods=['POST'])
def callback():
    # 獲取 LINE 伺服器發送的簽名，用於驗證請求的真實性
    signature = request.headers['X-Line-Signature']

    # 獲取 LINE 伺服器發送的請求內容（用戶的訊息資料）
    body = request.get_data(as_text=True)
    logger.info("收到 webhook 請求")  # 記錄收到請求的日誌

    try:
        # 使用 handler 處理收到的訊息，並驗證簽名
        handler.handle(body, signature)
    except InvalidSignatureError:
        # 如果簽名驗證失敗，記錄錯誤並回傳 400 錯誤
        logger.error("無效的簽名")
        abort(400)

    # 成功處理請求後回傳 'OK' 給 LINE 伺服器
    return 'OK'

# 定義訊息處理器，當收到文字訊息時會觸發這個函數
@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 取得用戶發送的文字訊息內容
    message_text = event.message.text
    logger.info(f"收到訊息: {message_text}")  # 記錄收到的訊息內容
    
    # 判斷用戶發送的訊息內容，並做出相應回應
    #if message_text == '馬上預約':
    #    try:
    #         主要功能：使用 Flex Message 回覆預約訊息
    #        line_bot_api.reply_message(
    #            event.reply_token,  # 回覆權杖，用於回覆特定訊息
    #            get_booking_template()  # 使用 Flex Message
    #        )
    #        logger.info("已發送預約模板訊息（Flex Message）")  # 記錄成功發送訊息的日誌
    #    except Exception as e:
            # 如果發送訊息時發生錯誤，記錄錯誤資訊
    #        logger.error(f"發送 Flex Message 訊息時發生錯誤: {str(e)}")
    
    if message_text == '價目表':
        try:
            # 回傳價目表圖片
            line_bot_api.reply_message(
                event.reply_token,
                ImageSendMessage(
                    original_content_url="https://res.cloudinary.com/div4nzzda/image/upload/v1749912191/WEII_nail_20250614_202005_0000_nstev5.png",
                    preview_image_url="https://res.cloudinary.com/div4nzzda/image/upload/v1749912191/WEII_nail_20250614_202005_0000_nstev5.png"
                )
            )
            logger.info("已發送價目表圖片")  # 記錄成功發送圖片的日誌
        except Exception as e:
            # 如果發送圖片時發生錯誤，記錄錯誤資訊
            logger.error(f"發送價目表圖片時發生錯誤: {str(e)}")
    
    elif message_text == '預約須知':
        try:
            # 回傳兩張預約須知圖片
            line_bot_api.reply_message(
                event.reply_token,
                [
                    ImageSendMessage(
                        original_content_url="https://res.cloudinary.com/div4nzzda/image/upload/v1749912192/WEII_nail_20250614_202005_0002_rleygj.png",
                        preview_image_url="https://res.cloudinary.com/div4nzzda/image/upload/v1749912192/WEII_nail_20250614_202005_0002_rleygj.png"
                    ),
                    ImageSendMessage(
                        original_content_url="https://res.cloudinary.com/div4nzzda/image/upload/v1749912192/WEII_nail_20250614_202005_0003_amx87y.png",
                        preview_image_url="https://res.cloudinary.com/div4nzzda/image/upload/v1749912192/WEII_nail_20250614_202005_0003_amx87y.png"
                    )
                ]
            )
            logger.info("已發送預約須知圖片")  # 記錄成功發送圖片的日誌
        except Exception as e:
            # 如果發送圖片時發生錯誤，記錄錯誤資訊
            logger.error(f"發送預約須知圖片時發生錯誤: {str(e)}")

# 程式進入點，當直接執行此檔案時會啟動 Flask 伺服器
if __name__ == "__main__":
    # 啟動 Flask 應用程式，debug=True 表示開發模式（會自動重載程式碼）
    app.run(debug=True) 
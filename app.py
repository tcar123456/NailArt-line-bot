from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    PostbackEvent
)
from message_templates import get_booking_template
import os
from dotenv import load_dotenv
import logging
from datetime import datetime

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 載入環境變數
load_dotenv()

app = Flask(__name__)

# LINE Bot 設定
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))

@app.route("/callback", methods=['POST'])
def callback():
    # 獲取 X-Line-Signature header 值
    signature = request.headers['X-Line-Signature']

    # 獲取請求內容
    body = request.get_data(as_text=True)
    logger.info("收到 webhook 請求")
    logger.info(f"Request body: {body}")

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        logger.error("無效的簽名")
        abort(400)

    return 'OK'

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 記錄收到的訊息
    message_text = event.message.text
    logger.info(f"收到訊息: {message_text}")
    
    # 處理訊息
    if message_text == '馬上預約':
        try:
            line_bot_api.reply_message(
                event.reply_token,
                get_booking_template()
            )
            logger.info("已發送預約按鈕模板訊息")
        except Exception as e:
            logger.error(f"發送預約按鈕模板訊息時發生錯誤: {str(e)}")

@handler.add(PostbackEvent)
def handle_postback(event):
    if event.postback.data == 'datetime_postback':
        # 獲取使用者選擇的日期時間
        selected_datetime = event.postback.params['datetime']
        # 將日期時間字串轉換為 datetime 物件
        dt = datetime.fromisoformat(selected_datetime.replace('T', ' '))
        formatted_dt = dt.strftime('%Y年%m月%d日 %H:%M')
        
        # 記錄預約資訊
        user_id = event.source.user_id
        logger.info(f"使用者 {user_id} 選擇預約時間: {formatted_dt}")
        
        # 回覆確認訊息
        confirmation_message = f"您選擇的預約時間是：{formatted_dt}\n請問確認要預約這個時段嗎？"
        try:
            line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text=confirmation_message)
            )
        except Exception as e:
            logger.error(f"發送確認訊息時發生錯誤: {str(e)}")

if __name__ == "__main__":
    # 啟動應用程式
    app.run(debug=True) 
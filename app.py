from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    RichMenu, RichMenuArea, RichMenuBounds,
    RichMenuSize, PostbackAction, MessageAction
)
import os
from dotenv import load_dotenv
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 載入環境變數
load_dotenv()

app = Flask(__name__)

# LINE Bot 設定
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))

def create_rich_menu():
    # 創建 Rich Menu
    rich_menu_to_create = RichMenu(
        size=RichMenuSize(width=2500, height=1686),
        selected=True,
        name="Nice rich menu",
        chat_bar_text="點擊開啟選單",
        areas=[
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=0, width=833, height=843),
                action=MessageAction(label='馬上預約', text='馬上預約')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=0, width=833, height=843),
                action=PostbackAction(label='B', data='action=B')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1666, y=0, width=834, height=843),
                action=PostbackAction(label='C', data='action=C')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=843, width=833, height=843),
                action=PostbackAction(label='D', data='action=D')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=843, width=833, height=843),
                action=PostbackAction(label='E', data='action=E')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1666, y=843, width=834, height=843),
                action=PostbackAction(label='F', data='action=F')
            )
        ]
    )
    
    rich_menu_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_to_create)
    
    # 上傳 Rich Menu 的圖片
    with open("rich_menu_image.png", 'rb') as f:
        line_bot_api.set_rich_menu_image(rich_menu_id, "image/png", f)
    
    # 將 Rich Menu 設定為預設選單
    line_bot_api.set_default_rich_menu(rich_menu_id)
    
    return rich_menu_id

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
    
    # 根據不同的訊息內容做出不同的回覆
    if message_text == '馬上預約':
        reply_text = '好的，我們來安排預約時間。請問您想要預約哪一天呢？'
    else:
        reply_text = '您好！請問有什麼我可以幫您的嗎？'
    
    # 發送回覆
    try:
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=reply_text)
        )
        logger.info(f"已回覆訊息: {reply_text}")
    except Exception as e:
        logger.error(f"回覆訊息時發生錯誤: {str(e)}")

if __name__ == "__main__":
    # 建立 Rich Menu
    try:
        rich_menu_id = create_rich_menu()
        logger.info(f"成功建立 Rich Menu，ID: {rich_menu_id}")
    except Exception as e:
        logger.error(f"建立 Rich Menu 時發生錯誤: {str(e)}")
    
    # 啟動應用程式
    app.run(debug=True) 
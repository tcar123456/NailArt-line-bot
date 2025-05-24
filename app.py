from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    RichMenu, RichMenuArea, RichMenuBounds,
    RichMenuSize, PostbackAction, MessageAction,
    PostbackEvent
)
import os
from dotenv import load_dotenv

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
    app.logger.info("Request body: " + body)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return 'OK'

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 處理文字訊息
    if event.message.text == '馬上預約':
        line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text='您已點擊馬上預約，我們將為您安排預約服務！')]
        )
    else:
        line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text='您好！請問有什麼可以為您服務的嗎？')]
        )

@handler.add(PostbackEvent)
def handle_postback(event):
    # 處理 Postback 事件（圖片區域點擊）
    data = event.postback.data
    if data == 'action=B':
        line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text='您點擊了區域 B')]
        )
    elif data == 'action=C':
        line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text='您點擊了區域 C')]
        )
    # ... 可以根據需要添加其他區域的處理邏輯 ...

if __name__ == "__main__":
    # 建立 Rich Menu
    create_rich_menu()
    app.run() 
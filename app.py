from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    RichMenu, RichMenuArea, RichMenuBounds,
    RichMenuSize, PostbackAction, PostbackEvent
)
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

app = Flask(__name__)

# LINE Bot 設定
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))

# 建立選單 A
def create_rich_menu_a():
    rich_menu_to_create = RichMenu(
        size=RichMenuSize(width=2500, height=1686),
        selected=True,
        name="Menu A",
        chat_bar_text="選單 A",
        areas=[
            # 切換到選單 B 的按鈕
            RichMenuArea(
                bounds=RichMenuBounds(x=1250, y=0, width=1250, height=200),
                action=PostbackAction(label='B', data='switch_to_menu_b')
            ),
            # A1-A6 按鈕
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=200, width=833, height=743),
                action=PostbackAction(label='A1', data='action_a1')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=200, width=834, height=743),
                action=PostbackAction(label='A2', data='action_a2')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1667, y=200, width=833, height=743),
                action=PostbackAction(label='A3', data='action_a3')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=943, width=833, height=743),
                action=PostbackAction(label='A4', data='action_a4')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=943, width=834, height=743),
                action=PostbackAction(label='A5', data='action_a5')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1667, y=943, width=833, height=743),
                action=PostbackAction(label='A6', data='action_a6')
            )
        ]
    )
    return rich_menu_to_create

# 建立選單 B
def create_rich_menu_b():
    rich_menu_to_create = RichMenu(
        size=RichMenuSize(width=2500, height=1686),
        selected=True,
        name="Menu B",
        chat_bar_text="選單 B",
        areas=[
            # 切換到選單 A 的按鈕
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=0, width=1250, height=200),
                action=PostbackAction(label='A', data='switch_to_menu_a')
            ),
            # B1-B6 按鈕
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=200, width=833, height=743),
                action=PostbackAction(label='B1', data='action_b1')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=200, width=834, height=743),
                action=PostbackAction(label='B2', data='action_b2')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1667, y=200, width=833, height=743),
                action=PostbackAction(label='B3', data='action_b3')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=943, width=833, height=743),
                action=PostbackAction(label='B4', data='action_b4')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=943, width=834, height=743),
                action=PostbackAction(label='B5', data='action_b5')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1667, y=943, width=833, height=743),
                action=PostbackAction(label='B6', data='action_b6')
            )
        ]
    )
    return rich_menu_to_create

# 初始化 Rich Menu
def setup_rich_menus():
    # 創建選單 A
    rich_menu_a = create_rich_menu_a()
    rich_menu_a_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_a)
    
    # 上傳選單 A 的圖片
    with open("menu_a.png", "rb") as f:
        line_bot_api.set_rich_menu_image(rich_menu_a_id, "image/png", f)

    # 創建選單 B
    rich_menu_b = create_rich_menu_b()
    rich_menu_b_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_b)
    
    # 上傳選單 B 的圖片
    with open("menu_b.png", "rb") as f:
        line_bot_api.set_rich_menu_image(rich_menu_b_id, "image/png", f)

    # 儲存選單 ID
    global RICH_MENU_A_ID, RICH_MENU_B_ID
    RICH_MENU_A_ID = rich_menu_a_id
    RICH_MENU_B_ID = rich_menu_b_id

    # 設定預設選單為 A
    line_bot_api.set_default_rich_menu(rich_menu_a_id)

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

@handler.add(PostbackEvent)
def handle_postback(event):
    if event.postback.data == 'switch_to_menu_b':
        line_bot_api.link_rich_menu_to_user(event.source.user_id, RICH_MENU_B_ID)
    elif event.postback.data == 'switch_to_menu_a':
        line_bot_api.link_rich_menu_to_user(event.source.user_id, RICH_MENU_A_ID)
    elif event.postback.data.startswith('action_'):
        action = event.postback.data
        responses = {
            'action_a1': '您點選了 A1',
            'action_a2': '您點選了 A2',
            'action_a3': '您點選了 A3',
            'action_a4': '您點選了 A4',
            'action_a5': '您點選了 A5',
            'action_a6': '您點選了 A6',
            'action_b1': '您點選了 B1',
            'action_b2': '您點選了 B2',
            'action_b3': '您點選了 B3',
            'action_b4': '您點選了 B4',
            'action_b5': '您點選了 B5',
            'action_b6': '您點選了 B6'
        }
        response_text = responses.get(action, '未知的操作')
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=response_text)
        )

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 當收到文字訊息時，回覆「你好！請使用下方選單。」
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text='你好！請使用下方選單。')
    )

if __name__ == "__main__":
    # 初始化 Rich Menu
    setup_rich_menus()
    app.run() 
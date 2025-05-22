from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError, LineBotApiError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    RichMenu, RichMenuArea, RichMenuBounds,
    RichMenuSize, PostbackAction, PostbackEvent
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

# 全域變數儲存選單 ID
RICH_MENU_A_ID = None
RICH_MENU_B_ID = None

# 建立選單 A
def create_rich_menu_a():
    try:
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
    except Exception as e:
        logger.error(f"建立選單 A 時發生錯誤: {str(e)}")
        raise

# 建立選單 B
def create_rich_menu_b():
    try:
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
    except Exception as e:
        logger.error(f"建立選單 B 時發生錯誤: {str(e)}")
        raise

def delete_all_rich_menus():
    try:
        # 獲取所有 rich menu
        rich_menu_list = line_bot_api.get_rich_menu_list()
        # 刪除所有 rich menu
        for rich_menu in rich_menu_list:
            line_bot_api.delete_rich_menu(rich_menu.rich_menu_id)
        logger.info("已刪除所有現有的 Rich Menu")
    except LineBotApiError as e:
        logger.error(f"刪除 Rich Menu 時發生錯誤: {str(e)}")

# 初始化 Rich Menu
def setup_rich_menus():
    try:
        global RICH_MENU_A_ID, RICH_MENU_B_ID

        # 刪除所有現有的 Rich Menu
        delete_all_rich_menus()

        logger.info("開始建立 Rich Menu A")
        # 創建選單 A
        rich_menu_a = create_rich_menu_a()
        rich_menu_a_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_a)
        RICH_MENU_A_ID = rich_menu_a_id
        
        # 上傳選單 A 的圖片
        with open("menu_a.png", "rb") as f:
            line_bot_api.set_rich_menu_image(rich_menu_a_id, "image/png", f)
        logger.info(f"Rich Menu A 建立完成，ID: {rich_menu_a_id}")

        logger.info("開始建立 Rich Menu B")
        # 創建選單 B
        rich_menu_b = create_rich_menu_b()
        rich_menu_b_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_b)
        RICH_MENU_B_ID = rich_menu_b_id
        
        # 上傳選單 B 的圖片
        with open("menu_b.png", "rb") as f:
            line_bot_api.set_rich_menu_image(rich_menu_b_id, "image/png", f)
        logger.info(f"Rich Menu B 建立完成，ID: {rich_menu_b_id}")

        # 設定預設選單為 A
        line_bot_api.set_default_rich_menu(rich_menu_a_id)
        logger.info("已設定預設 Rich Menu")

        return True
    except Exception as e:
        logger.error(f"設定 Rich Menu 時發生錯誤: {str(e)}")
        return False

@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return 'OK'

@handler.add(PostbackEvent)
def handle_postback(event):
    try:
        if event.postback.data == 'switch_to_menu_b':
            line_bot_api.link_rich_menu_to_user(event.source.user_id, RICH_MENU_B_ID)
            logger.info(f"用戶 {event.source.user_id} 切換到選單 B")
        elif event.postback.data == 'switch_to_menu_a':
            line_bot_api.link_rich_menu_to_user(event.source.user_id, RICH_MENU_A_ID)
            logger.info(f"用戶 {event.source.user_id} 切換到選單 A")
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
            logger.info(f"用戶 {event.source.user_id} 點選了 {action}")
    except Exception as e:
        logger.error(f"處理 Postback 事件時發生錯誤: {str(e)}")

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    try:
        if event.message.text == "初始化選單":
            success = setup_rich_menus()
            response = "選單初始化成功！" if success else "選單初始化失敗，請查看日誌"
        else:
            response = "你好！請使用下方選單。"
        
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=response)
        )
    except Exception as e:
        logger.error(f"處理訊息時發生錯誤: {str(e)}")

if __name__ == "__main__":
    # 初始化 Rich Menu
    logger.info("應用程式啟動，開始初始化 Rich Menu")
    setup_rich_menus()
    app.run() 
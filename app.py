from flask import Flask, request, abort
from linebot.v3 import WebhookHandler
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    RichMenuRequest,
    RichMenuArea,
    RichMenuBounds,
    RichMenuSize,
    PostbackAction,
    TextMessage
)
from linebot.v3.exceptions import InvalidSignatureError
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

app = Flask(__name__)

# LINE Bot 設定
configuration = Configuration(access_token=os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))

def delete_all_rich_menu():
    """刪除所有現有的 Rich Menu"""
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        try:
            rich_menu_list = line_bot_api.get_rich_menu_list()
            for rich_menu in rich_menu_list:
                line_bot_api.delete_rich_menu(rich_menu.rich_menu_id)
        except Exception as e:
            print(f"刪除 Rich Menu 時發生錯誤: {e}")

def create_rich_menu():
    """創建新的 Rich Menu"""
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        try:
            # 先刪除所有現有的 Rich Menu
            delete_all_rich_menu()
            
            # 創建新的 Rich Menu
            rich_menu_request = RichMenuRequest(
                size=RichMenuSize(width=2500, height=1686),
                selected=True,
                name="Nice rich menu",
                chat_bar_text="點擊開啟選單",
                areas=[
                    RichMenuArea(
                        bounds=RichMenuBounds(x=0, y=0, width=833, height=843),
                        action=PostbackAction(label='A', data='action=A')
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
            
            # 創建 Rich Menu
            rich_menu = line_bot_api.create_rich_menu(rich_menu_request=rich_menu_request)
            print(f"Created rich menu with ID: {rich_menu.rich_menu_id}")
            
            # 上傳 Rich Menu 圖片
            try:
                with open("rich_menu_image.png", 'rb') as f:
                    line_bot_api.set_rich_menu_image(
                        rich_menu_id=rich_menu.rich_menu_id,
                        body=f.read(),
                        _content_type='image/png'
                    )
                    print("Uploaded rich menu image")
            except Exception as e:
                print(f"上傳圖片時發生錯誤: {e}")
                return None
            
            # 設置為預設選單
            line_bot_api.set_default_rich_menu(rich_menu_id=rich_menu.rich_menu_id)
            print("Set as default rich menu")
            
            return rich_menu.rich_menu_id
        except Exception as e:
            print(f"創建 Rich Menu 時發生錯誤: {e}")
            return None

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

@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        # 當收到文字訊息時，回覆「你好！」
        line_bot_api.reply_message(
            reply_token=event.reply_token,
            messages=[TextMessage(text='你好！')]
        )

if __name__ == "__main__":
    # 建立 Rich Menu
    rich_menu_id = create_rich_menu()
    if rich_menu_id:
        print(f"Successfully created rich menu with ID: {rich_menu_id}")
    else:
        print("Failed to create rich menu")
    
    app.run() 
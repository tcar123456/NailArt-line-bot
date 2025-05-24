from linebot import LineBotApi
from linebot.models import (
    RichMenu, RichMenuArea, RichMenuBounds,
    RichMenuSize, MessageAction, URIAction
)
import os
from dotenv import load_dotenv
import logging

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 載入環境變數
load_dotenv()

def create_rich_menu():
    # 取得 LINE Bot API 實例
    line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
    
    # 創建 Rich Menu
    rich_menu_to_create = RichMenu(
        size=RichMenuSize(width=2500, height=1686),
        selected=True,
        name="Nail Art Menu",
        chat_bar_text="點擊開啟選單",
        areas=[
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=0, width=833, height=843),
                action=MessageAction(label='馬上預約', text='馬上預約')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=0, width=833, height=843),
                action=MessageAction(label='服務項目', text='服務項目')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1666, y=0, width=834, height=843),
                action=MessageAction(label='價目表', text='價目表')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=843, width=833, height=843),
                action=URIAction(label='作品集', uri='https://www.instagram.com/weii_nail')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=843, width=833, height=843),
                action=MessageAction(label='店家資訊', text='店家資訊')
            ),
            RichMenuArea(
                bounds=RichMenuBounds(x=1666, y=843, width=834, height=843),
                action=MessageAction(label='聯絡我們', text='聯絡我們')
            )
        ]
    )
    
    try:
        # 創建 Rich Menu
        rich_menu_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_to_create)
        logger.info(f"成功建立 Rich Menu，ID: {rich_menu_id}")
        
        # 上傳 Rich Menu 圖片
        with open("rich_menu_image.png", 'rb') as f:
            line_bot_api.set_rich_menu_image(rich_menu_id, "image/png", f)
        logger.info("成功上傳 Rich Menu 圖片")
        
        # 設定為預設選單
        line_bot_api.set_default_rich_menu(rich_menu_id)
        logger.info("成功設定為預設 Rich Menu")
        
        return rich_menu_id
        
    except Exception as e:
        logger.error(f"建立 Rich Menu 時發生錯誤: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        # 建立新的 Rich Menu
        rich_menu_id = create_rich_menu()
        logger.info(f"完成！新的 Rich Menu ID 為: {rich_menu_id}")
        
    except Exception as e:
        logger.error("程式執行失敗")
        logger.error(str(e)) 
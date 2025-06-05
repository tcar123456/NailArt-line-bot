from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # 使用 GitHub 作為圖片託管服務
    # 
    # 您的圖片網址：
    # https://raw.githubusercontent.com/tcar123456/images/refs/heads/main/message_templates2-1040.png
    # https://raw.githubusercontent.com/tcar123456/images/refs/heads/main/message_templates2-700.png
    #
    # 範例：如果您的 GitHub 使用者名稱是 'username'，倉庫名稱是 'line-bot'
    # 則 base_url 應該是：
    # https://raw.githubusercontent.com/username/line-bot/main/images/message_templates
    
    width = 1040
    height = 1040

    return ImagemapSendMessage(
        # 使用正確的 GitHub refs/heads 格式
        base_url='https://raw.githubusercontent.com/tcar123456/images/refs/heads/main/message_templates2',
        alt_text='預約資訊',
        base_size=BaseSize(height=height, width=width),
        actions=[
            URIImagemapAction(
                link_uri='https://jp-tutor.pages.dev/date',
                area=ImagemapArea(
                    x=0,
                    y=0,
                    width=width,
                    height=height
                )
            )
        ]
    )
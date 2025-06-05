from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # 解決版本號碼不同的問題：
    # 1. 找出兩張圖片中較新的版本號碼
    # 2. 在 base_url 中指定該版本號碼
    # 3. 確保兩張圖片都能用相同版本號碼存取
    
    # 請檢查您的兩張圖片的版本號碼，使用較新的那個
    # 例如：如果 message_templates2-1040 是 v1749104975
    #      如果 message_templates2-700 是 v1749105123
    #      則使用 v1749105123
    
    width = 1040
    height = 1040

    return ImagemapSendMessage(
        # 請將 v1749105123 替換為您實際的較新版本號碼
        base_url='https://res.cloudinary.com/div4nzzda/image/upload/v1749109784/message_templates2',
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
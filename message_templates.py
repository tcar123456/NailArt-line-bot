from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # ImagemapSendMessage 的嚴格圖片要求：
    # 1. Cloudinary 上必須有兩張圖片，且公開 ID (Public ID) 如下：
    #    - message_templates2-1040  (尺寸必須精確為 1040x1040 像素)
    #    - message_templates2-700   (尺寸必須精確為 700x700 像素)
    #    (注意：公開 ID 不包含副檔名，例如 .png 或 .jpg)
    #
    # 2. 下方的 `base_url` 必須是圖片的基礎路徑，LINE 會自動在此路徑後添加 "-1040" 和 "-700"
    #    例如，LINE 會嘗試讀取：
    #    'https://res.cloudinary.com/div4nzzda/image/upload/message_templates2-1040'
    #    'https://res.cloudinary.com/div4nzzda/image/upload/message_templates2-700'

    width = 1040  # Imagemap 基礎寬度
    height = 1040 # Imagemap 基礎高度 (必須與 1040px 圖片的實際高度相符)

    return ImagemapSendMessage(
        base_url='https://res.cloudinary.com/div4nzzda/image/upload/message_templates2',
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
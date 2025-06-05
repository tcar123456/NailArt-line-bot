from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # LINE Imagemap 有嚴格的圖片規範:
    # 1. base_url 不應包含尺寸參數，LINE 會自動添加 "-1040" 和 "-700" 後綴
    # 2. 需要準備兩張圖片:
    #    - {base_url}-1040 (1040×1040 像素)
    #    - {base_url}-700 (700×700 像素)
    
    # 使用 Cloudinary 上傳的圖片 ID (不包含副檔名)
    # 確保您在 Cloudinary 上傳了兩個符合命名規範的圖片:
    # 1. message_templates-1040
    # 2. message_templates-700
    
    width = 1040  # 寬度固定 1040
    height = 1040  # 高度固定 1040 (正方形)
    
    return ImagemapSendMessage(
        # base_url 不應包含檔案格式或尺寸參數
        base_url='https://res.cloudinary.com/div4nzzda/image/upload/v1748184390/message_templates2',
        alt_text='預約資訊',
        base_size=BaseSize(height=height, width=width),
        actions=[
            URIImagemapAction(
                link_uri='https://jp-tutor.pages.dev/date',
                area=ImagemapArea(
                    x=0, 
                    y=height-208,  # 從底部向上 208 像素作為點擊區域
                    width=width, 
                    height=208
                )
            )
        ]
    ) 
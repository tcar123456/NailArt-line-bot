from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # LINE Imagemap 需要兩個尺寸的圖片：
    # 1. 大圖：{base_url}-1040 (1040x最大高度)
    # 2. 小圖：{base_url}-700 (700x按比例縮小的高度)
    #
    # 您可以使用 Cloudinary 的動態轉換功能來自動產生不同大小的圖片：
    # 在原始圖片網址上加上 w_1040 或 w_700 以及 c_fit 參數
    # 例如：https://res.cloudinary.com/[cloud_name]/image/upload/w_1040,c_fit/[public_id]
    
    # 可自訂的高度和寬度比例
    width = 1040  # 最大寬度固定 1040
    height = 1040  # 可以根據您的圖片比例調整
    
    return ImagemapSendMessage(
        base_url='https://res.cloudinary.com/div4nzzda/image/upload/c_fit,w_1040/v1748184390/message_templates',
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
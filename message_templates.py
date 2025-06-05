from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # 取消動態轉檔，使用 preview_image_url 讓兩個 URL 都指向同一張圖片
    # 這樣可以避免 LINE 自動加上 "-1040" 和 "-700" 後綴造成的問題
    
    # 你的 Cloudinary 設定
    cloud_name = "div4nzzda"
    public_id = "message_templates2"
    
    # 使用同一張 1040x1040 的圖片 URL
    image_url = f'https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}'
    
    width = 1040
    height = 1040

    return ImagemapSendMessage(
        # base_url 和 preview_image_url 都指向同一張圖片
        base_url=image_url,
        preview_image_url=image_url,
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


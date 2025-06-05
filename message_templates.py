from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction,
    ButtonsTemplate,
    TemplateSendMessage,
    URIAction
)

def get_booking_template():
    # 取消動態轉檔，使用 preview_image_url 讓兩個 URL 都指向同一張圖片
    # 這樣可以避免 LINE 自動加上 "-1040" 和 "-700" 後綴造成的問題
    
    # 改回 Cloudinary 設定
    cloud_name = "div4nzzda"
    public_id = "message_templates2"
    
    # 使用 Cloudinary URL
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

# ButtonsTemplate 測試版本
def get_booking_template_buttons():
    cloud_name = "div4nzzda"
    public_id = "message_templates2"
    
    return TemplateSendMessage(
        alt_text='預約資訊',
        template=ButtonsTemplate(
            thumbnail_image_url=f'https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}',
            title='美甲預約',
            text='點擊下方按鈕進行預約',
            actions=[
                URIAction(
                    label='馬上預約',
                    uri='https://jp-tutor.pages.dev/date'
                )
            ]
        )
    )


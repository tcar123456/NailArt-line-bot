from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # LINE ImagemapSendMessage 的 URL 處理機制：
    # 1. LINE 會在 base_url 後自動加上 "-1040" 和 "-700"
    # 2. 所以 base_url 必須是一個「基礎路徑」，不能包含完整的圖片 URL
    # 3. 我們需要讓 LINE 加上後綴後，能正確對應到 Cloudinary 的動態轉檔 URL
    
    # 你的 Cloudinary 設定
    cloud_name = "div4nzzda"
    public_id = "message_templates2"
    
    width = 1040
    height = 1040

    # 方法一：使用 preview_image_url 完全控制兩個 URL
    return ImagemapSendMessage(
        # base_url 指向 1040x1040 的動態轉檔 URL（不讓 LINE 加後綴）
        base_url=f'https://res.cloudinary.com/{cloud_name}/image/upload/c_fill,q_auto,w_1040,h_1040/{public_id}',
        # preview_image_url 明確指定 700x700 的動態轉檔 URL
        preview_image_url=f'https://res.cloudinary.com/{cloud_name}/image/upload/c_fill,q_auto,w_700,h_700/{public_id}',
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


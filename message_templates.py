from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize,
    MessageImagemapAction
)

def get_booking_template():
    # 使用 Cloudinary 動態轉檔：
    # 1. 只需要上傳一張原始圖片到 Cloudinary
    # 2. 透過 URL 參數動態產生不同尺寸
    # 3. LINE 會自動在 base_url 後加上 "-1040" 和 "-700"
    # 4. 我們在 base_url 中加入轉檔參數，讓 Cloudinary 動態產生對應尺寸
    
    # 你的 Cloudinary 設定
    cloud_name = "div4nzzda"
    public_id = "message_templates2"  # 原始圖片的 Public ID（不含尺寸後綴）
    
    # 使用動態轉檔的 base_url
    # c_fill 會填滿指定尺寸，q_auto 自動優化品質
    base_url = f'https://res.cloudinary.com/{cloud_name}/image/upload/c_fill,q_auto/w_{{width}},h_{{height}}/{public_id}'
    
    # 替換 {width} 和 {height} 為實際數值
    # LINE 會在此 URL 後加上 "-1040" 和 "-700"，所以我們需要特殊處理
    
    width = 1040
    height = 1040

    return ImagemapSendMessage(
        # 使用不含轉檔參數的 base_url，讓 LINE 自動加上 -1040/-700 後綴
        # 然後透過 preview_image_url 指定預覽圖的動態轉檔 URL
        base_url=f'https://res.cloudinary.com/{cloud_name}/image/upload/c_fill,q_auto,w_1040,h_1040/{public_id}',
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
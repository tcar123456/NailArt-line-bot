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
    
    # Google Drive 圖片設定
    # 原始分享連結：https://drive.google.com/file/d/10eYCtkWj8PteawTM38wPzazExMM4OyhP/view?usp=drive_link
    # 轉換為直接下載連結：
    file_id = "10eYCtkWj8PteawTM38wPzazExMM4OyhP"
    image_url = f'https://drive.google.com/uc?export=download&id={file_id}'
    
    # 注意：Google Drive 圖片必須設定為「知道連結的任何人都可以檢視」
    
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


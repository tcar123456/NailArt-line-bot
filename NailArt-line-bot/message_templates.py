from linebot.models import (
    FlexSendMessage,
    BubbleContainer,
    ImageComponent,
    BoxComponent,
    TextComponent,
    ButtonComponent,
    SeparatorComponent,
    URIAction,
    MessageAction
)

# 主要預約功能 - Flex Message（圖片直接連接按鈕，無文字）
def get_booking_template():
    cloud_name = "div4nzzda"
    public_id = "message_templates2"
    
    # LIFF 設定說明：
    # 1. 需要建立一個新的 "LINE Login" Channel（不是 Messaging API Channel）
    # 2. 在 LINE Login Channel 的 LIFF 分頁中建立 LIFF 應用程式
    # 3. 取得 LIFF URL 並替換下面的網址
    # 格式：https://liff.line.me/xxxxxxxxx-xxxxxxxx
    liff_url = "https://liff.line.me/2007532770-0bqJlAgm"  # 請替換為實際的 LIFF URL
    
    return FlexSendMessage(
        alt_text='美甲預約',
        contents=BubbleContainer(
            # 主圖片區域（純展示，不可點擊）
            hero=ImageComponent(
                url=f'https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}',
                size='full',
                aspect_ratio='1:1',  # 圖片比例 (寬:高)
                aspect_mode='cover'    # 圖片填滿模式
            ),
            # 按鈕區域
            footer=BoxComponent(
                layout='vertical',
                spacing='none',  # 移除按鈕間距
                contents=[
                    # 主要預約按鈕（使用 LIFF，在 LINE 內開啟）
                    ButtonComponent(
                        style='primary',
                        height='sm',
                        color='#FF69B4',  # 自訂按鈕顏色
                        action=URIAction(
                            label='🗓️ 立即預約',
                            uri=liff_url  # 使用 LIFF URL
                        )
                    ),
                    # 作品集按鈕
                    ButtonComponent(
                        style='secondary',
                        height='sm',
                        action=URIAction(
                            label='💅 查看作品集',
                            uri='https://www.instagram.com/weii_nail'
                        )
                    ),
                ]
            )
        )
    )


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
                    # 主要預約按鈕
                    ButtonComponent(
                        style='primary',
                        height='sm',
                        color='#FF69B4',  # 自訂按鈕顏色
                        action=URIAction(
                            label='🗓️ 立即預約',
                            uri='https://jp-tutor.pages.dev/date'
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


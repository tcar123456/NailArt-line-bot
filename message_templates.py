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

# 主要預約功能 - Flex Message
def get_booking_template():
    cloud_name = "div4nzzda"
    public_id = "message_templates2"
    
    return FlexSendMessage(
        alt_text='美甲預約',
        contents=BubbleContainer(
            # 主圖片區域
            hero=ImageComponent(
                url=f'https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}',
                size='full',
                aspect_ratio='20:13',  # 圖片比例 (寬:高)
                aspect_mode='cover',   # 圖片填滿模式
                action=URIAction(      # 點擊圖片的動作
                    uri='https://jp-tutor.pages.dev/date'
                )
            ),
            # 內容區域
            body=BoxComponent(
                layout='vertical',
                contents=[
                    # 主標題
                    TextComponent(
                        text='✨ 美甲預約服務',
                        weight='bold',
                        size='xl',
                        color='#FF69B4',  # 粉紅色
                        align='center'
                    ),
                    # 副標題
                    TextComponent(
                        text='專業美甲 • 精緻服務',
                        size='md',
                        color='#666666',
                        margin='md',
                        align='center'
                    ),
                    # 分隔線
                    SeparatorComponent(margin='xl'),
                    # 服務特色區域
                    BoxComponent(
                        layout='vertical',
                        margin='xl',
                        spacing='sm',
                        contents=[
                            # 特色標題
                            TextComponent(
                                text='🌟 服務特色',
                                weight='bold',
                                size='md',
                                color='#333333',
                                margin='md'
                            ),
                            # 特色列表
                            BoxComponent(
                                layout='vertical',
                                spacing='xs',
                                contents=[
                                    TextComponent(
                                        text='💅 專業美甲設計師',
                                        size='sm',
                                        color='#555555',
                                        flex=0
                                    ),
                                    TextComponent(
                                        text='⏰ 彈性預約時間',
                                        size='sm',
                                        color='#555555',
                                        flex=0
                                    ),
                                    TextComponent(
                                        text='💎 高品質進口材料',
                                        size='sm',
                                        color='#555555',
                                        flex=0
                                    ),
                                    TextComponent(
                                        text='🎨 客製化設計服務',
                                        size='sm',
                                        color='#555555',
                                        flex=0
                                    )
                                ]
                            )
                        ]
                    ),
                    # 價格資訊
                    BoxComponent(
                        layout='baseline',
                        margin='xl',
                        contents=[
                            TextComponent(
                                text='起價：',
                                size='sm',
                                color='#999999',
                                flex=0
                            ),
                            TextComponent(
                                text='NT$ 800',
                                size='lg',
                                weight='bold',
                                color='#FF1493',  # 深粉紅色
                                flex=0,
                                margin='sm'
                            ),
                            TextComponent(
                                text='起',
                                size='sm',
                                color='#999999',
                                flex=0
                            )
                        ]
                    )
                ]
            ),
            # 按鈕區域
            footer=BoxComponent(
                layout='vertical',
                spacing='sm',
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
                    # 次要按鈕
                    ButtonComponent(
                        style='secondary',
                        height='sm',
                        action=MessageAction(
                            label='💅 查看作品集',
                            text='作品集'
                        )
                    ),
                    # 第三個按鈕
                    ButtonComponent(
                        style='link',
                        height='sm',
                        action=MessageAction(
                            label='💰 價目表',
                            text='價目表'
                        )
                    )
                ]
            )
        )
    )


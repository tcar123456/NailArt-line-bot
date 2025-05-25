from linebot.models import (
    TemplateSendMessage,
    ButtonsTemplate,
    URIAction,
)

def get_booking_template():
    return TemplateSendMessage(
        alt_text='預約資訊',
        template=ButtonsTemplate(
            thumbnail_image_url='https://res.cloudinary.com/div4nzzda/image/upload/v1748183723/message_templates1_jqpdsw.png',  # 請替換為你的美甲店照片URL
            title=None,
            text=' ',  # LINE Bot 要求必須要有 text，但可以是空白
            actions=[
                URIAction(
                    label='開始預約',
                    uri='https://jp-tutor.pages.dev/date'  # 請替換為你的預約網站網址
                )
            ]
        )
    ) 
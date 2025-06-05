from linebot.models import (
    TemplateSendMessage,
    ButtonsTemplate,
    URIAction
)

def get_booking_template():
    return TemplateSendMessage(
        alt_text='預約資訊',
        template=ButtonsTemplate(
            thumbnail_image_url='https://res.cloudinary.com/div4nzzda/image/upload/v1748184390/message_templates2_ugvpah.png',
            title=None,
            text=' ',  # LINE Bot 要求必須要有 text，但可以是空白
            actions=[
                URIAction(
                    label='開始預約',
                    uri='https://jp-tutor.pages.dev/date'
                )
            ]
        )
    ) 
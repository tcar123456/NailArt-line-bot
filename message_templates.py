from linebot.models import (
    TemplateSendMessage,
    ButtonsTemplate,
    URIAction,
)

def get_booking_template():
    return TemplateSendMessage(
        alt_text='預約資訊',
        template=ButtonsTemplate(
            thumbnail_image_url='https://storage.cloud.google.com/your-project-id-line-bot-images/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',  # 請替換為你的美甲店照片URL
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
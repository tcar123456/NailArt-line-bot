from linebot.models import (
    TemplateSendMessage,
    ButtonsTemplate,
    URIAction,
    DatetimePickerAction
)

def get_booking_template():
    return TemplateSendMessage(
        alt_text='預約資訊',
        template=ButtonsTemplate(
            thumbnail_image_url='https://storage.cloud.google.com/your-project-id-line-bot-images/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',  # 請替換為你的美甲店照片URL
            title='預約美甲服務',
            text='親愛的顧客您好！\n請選擇以下服務：',
            actions=[
                DatetimePickerAction(
                    label='選擇預約時間',
                    data='datetime_postback',
                    mode='datetime',
                    initial='2024-03-01T10:00',
                    min='2024-03-01T10:00',
                    max='2024-12-31T19:00'
                ),
                URIAction(
                    label='查看作品集',
                    uri='https://www.instagram.com/weii_nail'
                )
            ]
        )
    ) 
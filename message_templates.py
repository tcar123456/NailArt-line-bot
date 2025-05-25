from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize
)

def get_booking_template():
    return ImagemapSendMessage(
        base_url='https://res.cloudinary.com/div4nzzda/image/upload/v1748184390/message_templates2_ugvpah.png',
        alt_text='預約資訊',
        base_size=BaseSize(height=1024, width=1024),
        actions=[
            URIImagemapAction(
                link_uri='https://jp-tutor.pages.dev/date',
                area=ImagemapArea(
                    x=0, y=820, width=1024, height=204
                )
            )
        ]
    ) 
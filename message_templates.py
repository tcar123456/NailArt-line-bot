from linebot.models import (
    ImagemapSendMessage,
    ImagemapArea,
    URIImagemapAction,
    BaseSize
)

def get_booking_template():
    return ImagemapSendMessage(
        base_url='https://res.cloudinary.com/div4nzzda/image/upload/w_1040,h_1040,c_fill/v1748184390/message_templates2_ugvpah',
        alt_text='預約資訊',
        base_size=BaseSize(height=1040, width=1040),
        actions=[
            URIImagemapAction(
                link_uri='https://jp-tutor.pages.dev/date',
                area=ImagemapArea(
                    x=0, y=832, width=1040, height=208
                )
            )
        ]
    ) 
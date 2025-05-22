from PIL import Image, ImageDraw, ImageFont
import os

def create_rich_menu_image():
    # 創建一個新的圖片，使用 RGB 模式
    img = Image.new('RGB', (2500, 1686), 'white')
    draw = ImageDraw.Draw(img)
    
    # 定義區域
    areas = [
        # 第一行
        {'x': 0, 'y': 0, 'w': 833, 'h': 843, 'label': 'A'},
        {'x': 833, 'y': 0, 'w': 833, 'h': 843, 'label': 'B'},
        {'x': 1666, 'y': 0, 'w': 834, 'h': 843, 'label': 'C'},
        # 第二行
        {'x': 0, 'y': 843, 'w': 833, 'h': 843, 'label': 'D'},
        {'x': 833, 'y': 843, 'w': 833, 'h': 843, 'label': 'E'},
        {'x': 1666, 'y': 843, 'w': 834, 'h': 843, 'label': 'F'}
    ]
    
    # 繪製每個區域
    for area in areas:
        # 繪製邊框
        draw.rectangle(
            [(area['x'], area['y']), 
             (area['x'] + area['w'], area['y'] + area['h'])],
            outline='black',
            width=5
        )
        
        # 計算文字位置（置中）
        font_size = 120
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
            
        # 獲取文字大小
        text_width = draw.textlength(area['label'], font=font)
        text_height = font_size
        
        # 計算文字的位置（置中）
        text_x = area['x'] + (area['w'] - text_width) / 2
        text_y = area['y'] + (area['h'] - text_height) / 2
        
        # 繪製文字
        draw.text(
            (text_x, text_y),
            area['label'],
            fill='black',
            font=font
        )
    
    # 儲存圖片
    img.save('rich_menu_image.png')

if __name__ == "__main__":
    create_rich_menu_image() 
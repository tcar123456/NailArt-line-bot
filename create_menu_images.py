from PIL import Image, ImageDraw, ImageFont
import os

def create_menu_image(menu_type):
    # 創建基本圖片
    img = Image.new('RGB', (2500, 1686), 'white')
    draw = ImageDraw.Draw(img)
    
    # 繪製邊框
    draw.rectangle([(0, 0), (2499, 1685)], outline='black', width=2)
    
    # 繪製標籤區域分隔線
    draw.line([(1250, 0), (1250, 200)], fill='black', width=2)
    draw.line([(0, 200), (2500, 200)], fill='black', width=2)
    
    # 繪製按鈕區域分隔線
    for x in [833, 1667]:
        draw.line([(x, 200), (x, 1686)], fill='black', width=2)
    draw.line([(0, 943), (2500, 943)], fill='black', width=2)
    
    # 添加文字
    try:
        font = ImageFont.truetype("arial.ttf", 60)
    except:
        font = ImageFont.load_default()
    
    # 繪製標籤文字
    if menu_type == 'A':
        draw.text((625, 70), 'A', fill='black', font=font, anchor="mm")
        draw.text((1875, 70), 'B', fill='gray', font=font, anchor="mm")
        # 繪製按鈕文字
        buttons = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
    else:
        draw.text((625, 70), 'A', fill='gray', font=font, anchor="mm")
        draw.text((1875, 70), 'B', fill='black', font=font, anchor="mm")
        # 繪製按鈕文字
        buttons = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']
    
    # 按鈕位置
    positions = [
        (416, 571),  # 1
        (1250, 571), # 2
        (2083, 571), # 3
        (416, 1314), # 4
        (1250, 1314),# 5
        (2083, 1314) # 6
    ]
    
    # 繪製按鈕文字
    for text, pos in zip(buttons, positions):
        draw.text(pos, text, fill='black', font=font, anchor="mm")
    
    # 儲存圖片
    img.save(f'menu_{menu_type.lower()}.png')

if __name__ == "__main__":
    create_menu_image('A')
    create_menu_image('B')
    print("選單圖片已生成：menu_a.png 和 menu_b.png") 
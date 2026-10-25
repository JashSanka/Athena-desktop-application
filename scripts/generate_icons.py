import os
import math
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def create_athena_icon():
    os.makedirs('build', exist_ok=True)
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Base macOS app squircle radius and padding
    pad = 80
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad
    radius = 190

    # Draw soft shadow behind squircle
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([x0, y0 + 18, x1, y1 + 18], radius=radius, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    img.paste(shadow, (0, 0), shadow)

    # Gradient background: Deep Obsidian / Royal Indigo
    # Render gradient mask
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(base)
    bdraw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=(255, 255, 255, 255))

    grad = Image.new('RGBA', (size, size))
    for y in range(size):
        ratio = y / size
        # #0f172a (15, 23, 42) -> #1e1b4b (30, 27, 75) -> #0f172a
        r = int(15 + 20 * math.sin(ratio * math.pi))
        g = int(23 + 12 * (1 - ratio))
        b = int(42 + 45 * ratio)
        for x in range(size):
            grad.putpixel((x, y), (r, g, b, 255))

    # Apply rounded rect mask
    base_box = Image.composite(grad, Image.new('RGBA', (size, size), (0,0,0,0)), base)
    img.paste(base_box, (0, 0), base_box)

    # Draw border highlight
    border_draw = ImageDraw.Draw(img)
    border_draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=(99, 102, 241, 140), width=4)

    # Subtle inner glow line at the top
    top_glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    tgdraw = ImageDraw.Draw(top_glow)
    tgdraw.rounded_rectangle([x0 + 6, y0 + 6, x1 - 6, y0 + 20], radius=radius, fill=(255, 255, 255, 50))
    img.paste(top_glow, (0, 0), top_glow)

    # 2. Athena Shield Crest
    shield_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shield_img)

    # Center is at (512, 512)
    cx, cy = 512, 500
    w = 190
    top_y = cy - 200
    mid_y = cy + 40
    bot_y = cy + 220

    # Shield polygon / path points
    shield_pts = [
        (cx - w, top_y),
        (cx + w, top_y),
        (cx + w, mid_y),
        (cx, bot_y),
        (cx - w, mid_y),
    ]

    # Outer shield glow
    s_draw.polygon(shield_pts, fill=(99, 102, 241, 60))
    shield_blur = shield_img.filter(ImageFilter.GaussianBlur(18))
    img.paste(shield_blur, (0, 0), shield_blur)

    # Inner shield background
    idraw = ImageDraw.Draw(img)
    idraw.polygon(shield_pts, fill=(17, 24, 39, 230), outline=(56, 189, 248, 220), width=7)

    # Stylized "A" (Athena / Proctoring emblem)
    # Peak at (512, cy - 130)
    # Left leg at (cx - 105, cy + 120), Right leg at (cx + 105, cy + 120)
    # Crossbar at (cy + 25)
    idraw.line([(cx, cy - 130), (cx - 95, cy + 110)], fill=(248, 250, 252, 255), width=22)
    idraw.line([(cx, cy - 130), (cx + 95, cy + 110)], fill=(248, 250, 252, 255), width=22)
    idraw.line([(cx - 55, cy + 25), (cx + 55, cy + 25)], fill=(56, 189, 248, 255), width=18)

    # Camera / Eye Iris emblem in the center of the crossbar
    iris_r = 30
    idraw.ellipse([cx - iris_r, cy + 25 - iris_r, cx + iris_r, cy + 25 + iris_r], fill=(15, 23, 42, 255), outline=(56, 189, 248, 255), width=6)
    pupil_r = 12
    idraw.ellipse([cx - pupil_r, cy + 25 - pupil_r, cx + pupil_r, cy + 25 + pupil_r], fill=(56, 189, 248, 255))
    glint_r = 4
    idraw.ellipse([cx - glint_r - 3, cy + 25 - glint_r - 3, cx + glint_r - 3, cy + 25 + glint_r - 3], fill=(255, 255, 255, 240))

    # Save 1024x1024 png
    png_path = 'build/icon.png'
    img.save(png_path, 'PNG')
    print(f"Generated {png_path}")

    # Generate .iconset for iconutil
    iconset_dir = 'build/icon.iconset'
    os.makedirs(iconset_dir, exist_ok=True)

    sizes = [
        ('icon_16x16.png', 16),
        ('icon_16x16@2x.png', 32),
        ('icon_32x32.png', 32),
        ('icon_32x32@2x.png', 64),
        ('icon_128x128.png', 128),
        ('icon_128x128@2x.png', 256),
        ('icon_256x256.png', 256),
        ('icon_256x256@2x.png', 512),
        ('icon_512x512.png', 512),
        ('icon_512x512@2x.png', 1024)
    ]

    for name, s in sizes:
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, name), 'PNG')

    icns_path = 'build/icon.icns'
    subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path], check=True)
    print(f"Generated {icns_path}")

if __name__ == '__main__':
    create_athena_icon()

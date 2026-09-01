from PIL import Image, ImageDraw
import os

os.makedirs('public', exist_ok=True)

bg_color = (249, 115, 22)
text_color = (255, 255, 255)
accent_color = (254, 240, 220)

for size in [192, 512]:
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    radius = size // 10
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=bg_color)
    slice_w = size * 0.34
    slice_h = size * 0.48
    x0 = (size - slice_w) / 2
    y0 = (size - slice_h) / 2
    x1 = x0 + slice_w
    y1 = y0 + slice_h
    draw.polygon([(x0, y1), ((x0 + x1) / 2, y0), (x1, y1)], fill=accent_color)
    dot_radius = size * 0.04
    offsets = [(-0.1, 0.25), (0.15, 0.18), (0.17, 0.45), (-0.05, 0.55)]
    for ox, oy in offsets:
        cx = size / 2 + slice_w * ox
        cy = y0 + slice_h * oy
        draw.ellipse([cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius], fill=text_color)
    img.save(f'public/icon-{size}.png')

size = 512
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
margin = size * 0.08
radius = size // 8
draw.rounded_rectangle([(margin, margin), (size - margin, size - margin)], radius=radius, fill=bg_color)
slice_w = size * 0.34
slice_h = size * 0.48
x0 = (size - slice_w) / 2
y0 = (size - slice_h) / 2
x1 = x0 + slice_w
y1 = y0 + slice_h
draw.polygon([(x0, y1), ((x0 + x1) / 2, y0), (x1, y1)], fill=accent_color)
dot_radius = size * 0.04
offsets = [(-0.1, 0.25), (0.15, 0.18), (0.17, 0.45), (-0.05, 0.55)]
for ox, oy in offsets:
    cx = size / 2 + slice_w * ox
    cy = y0 + slice_h * oy
    draw.ellipse([cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius], fill=text_color)
img.save('public/icon-maskable.png')
print('Generated icon-192.png, icon-512.png, icon-maskable.png')

from PIL import Image, ImageDraw
import os

os.makedirs('public', exist_ok=True)

background = (122, 29, 24)
background_light = (190, 48, 31)
crust = (238, 151, 61)
cheese = (255, 224, 126)
pepperoni = (190, 54, 43)
basil = (47, 112, 62)
cream = (255, 248, 226)


def draw_icon(size, maskable=False):
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0) if maskable else background)
    draw = ImageDraw.Draw(image)
    margin = int(size * (0.08 if maskable else 0.035))
    radius = int(size * (0.22 if maskable else 0.18))
    draw.rounded_rectangle((margin, margin, size - margin - 1, size - margin - 1), radius=radius, fill=background)

    # Subtle badge highlight keeps the mark legible on light and dark launchers.
    highlight = int(size * 0.025)
    draw.ellipse((size * 0.18, size * 0.12, size * 0.82, size * 0.76), fill=background_light)
    draw.ellipse((size * 0.22, size * 0.16, size * 0.78, size * 0.70), fill=background)

    center = size / 2
    top = size * 0.24
    bottom = size * 0.76
    left = size * 0.23
    right = size * 0.77
    draw.pieslice((left, top, right, bottom), 205, 335, fill=crust)
    draw.pieslice((left + size * 0.035, top + size * 0.04, right - size * 0.035, bottom - size * 0.025), 205, 335, fill=cheese)
    draw.arc((left, top, right, bottom), 205, 335, fill=cream, width=max(2, int(size * 0.018)))

    pepperoni_radius = size * 0.055
    for ox, oy in [(-0.19, -0.02), (0.06, -0.12), (0.2, 0.1), (-0.02, 0.18)]:
        cx = center + size * ox
        cy = center + size * oy
        draw.ellipse((cx - pepperoni_radius, cy - pepperoni_radius, cx + pepperoni_radius, cy + pepperoni_radius), fill=pepperoni)
        draw.ellipse((cx - pepperoni_radius * 0.3, cy - pepperoni_radius * 0.3, cx + pepperoni_radius * 0.3, cy + pepperoni_radius * 0.3), fill=(228, 92, 59))

    leaf_w = size * 0.045
    draw.ellipse((center + size * 0.12, center - size * 0.31, center + size * 0.12 + leaf_w, center - size * 0.31 + leaf_w * 2.1), fill=basil)
    draw.ellipse((center - size * 0.26, center + size * 0.02, center - size * 0.26 + leaf_w, center + size * 0.02 + leaf_w * 2.1), fill=basil)

    # Small cream wordmark cue, preserved as a graphic rather than font-dependent text.
    draw.rounded_rectangle((size * 0.28, size * 0.82, size * 0.72, size * 0.85), radius=highlight, fill=cream)
    return image

for size in [192, 512]:
    draw_icon(size).save(f'public/icon-{size}.png')

draw_icon(512, maskable=True).save('public/icon-maskable.png')
print('Generated icon-192.png, icon-512.png, icon-maskable.png')

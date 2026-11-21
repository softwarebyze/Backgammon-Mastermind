#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('/workspace/qa-clips/pr-389/9e36ee4')

def font(size):
    for p in (
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def label_bar(width, text, fill=(28, 24, 20)):
    h = 36
    im = Image.new('RGB', (width, h), fill)
    d = ImageDraw.Draw(im)
    f = font(16)
    bbox = d.textbbox((0, 0), text, font=f)
    x = 10
    y = (h - (bbox[3] - bbox[1])) // 2
    d.text((x, y), text, fill=(250, 245, 235), font=f)
    return im

def stack_pair(left_path, right_path, left_label, right_label, out_path, target_h=None):
    L = Image.open(left_path).convert('RGB')
    R = Image.open(right_path).convert('RGB')
    if target_h:
        def resize(im):
            w = int(im.width * (target_h / im.height))
            return im.resize((w, target_h), Image.Resampling.NEAREST)
        L, R = resize(L), resize(R)
    else:
        h = max(L.height, R.height)
        def pad(im):
            if im.height == h:
                return im
            canvas = Image.new('RGB', (im.width, h), (20, 18, 16))
            canvas.paste(im, (0, (h - im.height) // 2))
            return canvas
        L, R = pad(L), pad(R)
    gap = 8
    w = L.width + gap + R.width
    top_l = label_bar(L.width, left_label)
    top_r = label_bar(R.width, right_label)
    out = Image.new('RGB', (w, top_l.height + L.height), (20, 18, 16))
    out.paste(top_l, (0, 0))
    out.paste(top_r, (L.width + gap, 0))
    out.paste(L, (0, top_l.height))
    out.paste(R, (L.width + gap, top_l.height))
    out.save(out_path, 'PNG')
    print('wrote', out_path, out.size)

def zoom_nearest(src, out, scale=8, clip=None):
    im = Image.open(src).convert('RGB')
    if clip:
        im = im.crop(clip)
    z = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
    z.save(out, 'PNG')
    print('wrote', out, z.size)

pairs = [
    # 7 off iPhone landscape (user-requested)
    ('prod-iphone-landscape-874x402-w7-b7-tray.png', 'cmp-iphone-landscape-874x402-w7-b7-tray.png',
     'Production — 7 off, iPhone landscape',
     'PR #389 @ 9e36ee4 — 7 off, iPhone landscape',
     'compare-iphone-landscape-w7-before-after.png'),
    ('prod-iphone-landscape-874x402-w15-b15-tray.png', 'cmp-iphone-landscape-874x402-w15-b15-tray.png',
     'Production — 15 off, iPhone landscape',
     'PR #389 @ 9e36ee4 — 15 off, iPhone landscape',
     'compare-iphone-landscape-w15-before-after.png'),
    ('prod-iphone-portrait-402x874-w7-b7-tray.png', 'cmp-iphone-portrait-402x874-w7-b7-tray.png',
     'Production — 7 off, iPhone portrait',
     'PR #389 @ 9e36ee4 — 7 off, iPhone portrait',
     'compare-iphone-portrait-w7-before-after.png'),
    ('prod-iphone-portrait-402x874-w15-b15-tray.png', 'cmp-iphone-portrait-402x874-w15-b15-tray.png',
     'Production — 15 off, iPhone portrait',
     'PR #389 @ 9e36ee4 — 15 off, iPhone portrait',
     'compare-iphone-portrait-w15-before-after.png'),
    ('prod-iphone-landscape-874x402-w7-b7-board.png', 'cmp-iphone-landscape-874x402-w7-b7-board.png',
     'Production — 7 off, iPhone landscape board',
     'PR #389 @ 9e36ee4 — 7 off, iPhone landscape board',
     'compare-iphone-landscape-w7-board-before-after.png'),
    ('prod-iphone-landscape-874x402-w15-b15-board.png', 'cmp-iphone-landscape-874x402-w15-b15-board.png',
     'Production — 15 off, iPhone landscape board',
     'PR #389 @ 9e36ee4 — 15 off, iPhone landscape board',
     'compare-iphone-landscape-w15-board-before-after.png'),
]

for a, b, la, lb, out in pairs:
    pa, pb = OUT / a, OUT / b
    if pa.exists() and pb.exists():
        stack_pair(pa, pb, la, lb, OUT / out)
    else:
        print('skip missing', a if not pa.exists() else b)

# 3x-DPR already captured; also make a nearest-neighbor zoom of the landscape 15-off tray
src = OUT / 'after-iphone-landscape-w15-b15-tray.png'
if src.exists():
    zoom_nearest(src, OUT / 'iphone-landscape-w15-tray-zoom8x.png', scale=8)
    # tighter crop of one stack if the tray is tall
    im = Image.open(src)
    w, h = im.size
    # bottom (white) half of tray, middle third of width already cropped to tray
    zoom_nearest(src, OUT / 'iphone-landscape-w15-white-zoom8x.png', scale=8, clip=(0, h // 2, w, h))
    zoom_nearest(src, OUT / 'iphone-landscape-w15-black-zoom8x.png', scale=8, clip=(0, 0, w, h // 2))

print('done')

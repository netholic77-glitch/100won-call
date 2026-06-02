"""
백원콜 Play Store 제출용 PNG 생성기 (Pillow only)
- 앱 아이콘 512x512, 192x192  -> www/ 및 play_store_kit/
- 피처 그래픽 1024x500       -> play_store_kit/
Play Console이 마스킹·둥근모서리 자동 처리하므로 정사각/직사각 그대로 출력.
"""
from PIL import Image, ImageDraw, ImageFont
import os

KIT = os.path.dirname(os.path.abspath(__file__))
WWW = os.path.join(os.path.dirname(KIT), "www")

ORANGE = (245, 158, 11)
ORANGE_L = (251, 191, 36)
ORANGE_D = (180, 83, 9)
BROWN = (124, 45, 18)
CREAM = (255, 247, 237)
INK = (31, 41, 55)
COIN = (253, 230, 138)
WHITE = (255, 255, 255)


def font(size, bold=True):
    for p in ([r"C:\Windows\Fonts\malgunbd.ttf"] if bold else []) + [
        r"C:\Windows\Fonts\malgun.ttf",
        r"C:\Windows\Fonts\NanumGothicBold.ttf",
        r"C:\Windows\Fonts\NanumGothic.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_taxi(d, cx, cy, s):
    """중심 cx,cy 기준 택시. s = 스케일(택시 폭의 절반)."""
    # 본체
    d.rounded_rectangle([cx - s, cy - s * 0.2, cx + s, cy + s * 0.6], radius=int(s * 0.18), fill=CREAM)
    # 지붕
    d.polygon([
        (cx - s * 0.8, cy - s * 0.2),
        (cx - s * 0.5, cy - s * 0.72),
        (cx + s * 0.5, cy - s * 0.72),
        (cx + s * 0.8, cy - s * 0.2),
    ], fill=CREAM)
    # 창문
    d.rounded_rectangle([cx - s * 0.48, cy - s * 0.62, cx - s * 0.08, cy - s * 0.24], radius=int(s * 0.05), fill=BROWN)
    d.rounded_rectangle([cx + s * 0.08, cy - s * 0.62, cx + s * 0.48, cy - s * 0.24], radius=int(s * 0.05), fill=BROWN)
    # 표시등
    d.rounded_rectangle([cx - s * 0.2, cy - s * 0.92, cx + s * 0.2, cy - s * 0.72], radius=int(s * 0.05), fill=BROWN)
    tf = font(int(s * 0.18))
    d.text((cx, cy - s * 0.82), "TAXI", font=tf, fill=ORANGE_L, anchor="mm")
    # 체크무늬 띠
    bw = s * 0.2
    y0 = cy + s * 0.12
    for i in range(-5, 5):
        x = cx + i * bw
        if (i % 2 == 0):
            d.rectangle([x, y0, x + bw, y0 + bw * 0.6], fill=INK)
        else:
            d.rectangle([x, y0 + bw * 0.6, x + bw, y0 + bw * 1.2], fill=INK)
    # 바퀴
    for wx in (cx - s * 0.6, cx + s * 0.6):
        d.ellipse([wx - s * 0.2, cy + s * 0.45, wx + s * 0.2, cy + s * 0.85], fill=INK)
        d.ellipse([wx - s * 0.08, cy + s * 0.57, wx + s * 0.08, cy + s * 0.73], fill=(156, 163, 175))


def make_icon(size, path):
    img = Image.new("RGB", (size, size), ORANGE)
    d = ImageDraw.Draw(img)
    for y in range(size):
        r = int(ORANGE_L[0] + (ORANGE[0] - ORANGE_L[0]) * y / size)
        g = int(ORANGE_L[1] + (ORANGE[1] - ORANGE_L[1]) * y / size)
        b = int(ORANGE_L[2] + (ORANGE[2] - ORANGE_L[2]) * y / size)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    cx, cy = size * 0.5, size * 0.56
    draw_taxi(d, cx, cy, size * 0.30)
    # 100원 동전
    r = size * 0.13
    coin_cx, coin_cy = size * 0.74, size * 0.27
    d.ellipse([coin_cx - r, coin_cy - r, coin_cx + r, coin_cy + r], fill=COIN, outline=BROWN, width=max(3, int(size * 0.012)))
    d.text((coin_cx, coin_cy), "100", font=font(int(size * 0.09)), fill=BROWN, anchor="mm")
    img.save(path)
    print("saved", path)


def make_feature(path):
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), ORANGE)
    d = ImageDraw.Draw(img)
    for y in range(H):
        r = int(ORANGE_L[0] + (ORANGE_D[0] - ORANGE_L[0]) * y / H)
        g = int(ORANGE_L[1] + (ORANGE_D[1] - ORANGE_L[1]) * y / H)
        b = int(ORANGE_L[2] + (ORANGE_D[2] - ORANGE_L[2]) * y / H)
        d.line([(0, y), (W, y)], fill=(r, g, b))
    # 택시 (오른쪽)
    draw_taxi(d, 800, 270, 150)
    # 100원 동전
    d.ellipse([905, 60, 1005, 160], fill=COIN, outline=BROWN, width=6)
    d.text((955, 110), "100", font=font(44), fill=BROWN, anchor="mm")
    # 텍스트 (왼쪽)
    d.text((70, 150), "백원콜", font=font(110), fill=WHITE, anchor="lm")
    d.text((74, 250), "100원·행복택시 한 번에 부르기", font=font(40), fill=CREAM, anchor="lm")
    d.text((74, 320), "큰 글씨 · 음성안내 · 보호자 위치문자", font=font(30), fill=CREAM, anchor="lm")
    img.save(path)
    print("saved", path)


if __name__ == "__main__":
    make_icon(512, os.path.join(WWW, "icon_512.png"))
    make_icon(192, os.path.join(WWW, "icon_192.png"))
    make_icon(512, os.path.join(KIT, "icon_512.png"))
    make_feature(os.path.join(KIT, "feature_graphic_1024x500.png"))
    print("done")

# -*- coding: utf-8 -*-
"""백원콜 Play Store 휴대전화 스크린샷 6컷 자동 캡처 (playwright).
출력: play_store_kit/screenshot/01..06.png  (1080x1920, 16:9)
"""
import os
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot")
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:8533/index.html"

DEMO = {
    "bw_taxi_num": "0312345678",
    "bw_taxi_label": "우리면 행복택시",
    "bw_guardian_name": "큰딸",
    "bw_guardian_num": "01012345678",
    "bw_places": '["군청 앞 ○○내과","면사무소","장날 ○○장터"]',
    "bw_pickup": "○○면 ○○리 12-3, 파란 대문 집, 마을회관 옆",
    "bw_voice": "on",
}

# viewport 432x768 @ scale 2.5  ->  1080x1920 png (16:9, 비율 1.78 <2:1 OK)
VW, VH, SCALE = 432, 768, 2.5


def shot(page, name, scroll_to_selector=None, scroll_y=0):
    if scroll_to_selector:
        page.eval_on_selector(
            scroll_to_selector,
            "el => el.scrollIntoView({block:'start'})",
        )
    page.evaluate(f"window.scrollBy(0,{scroll_y})")
    page.wait_for_timeout(350)
    page.screenshot(path=os.path.join(OUT, name))  # viewport only (full_page=False)
    print("saved", name)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": VW, "height": VH},
                        device_scale_factor=SCALE, locale="ko-KR")
    page = ctx.new_page()
    # 데모 데이터 주입 (앱 로드 전에 localStorage 세팅)
    page.add_init_script(
        "(()=>{const d=%s;for(const k in d)localStorage.setItem(k,d[k]);})()"
        % __import__("json").dumps(DEMO)
    )
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(600)

    # 01 인트로 (시작하기 버튼 보이는 화면)
    shot(page, "01_intro.png")

    # 인트로 닫기
    page.click("#btn_start")
    page.wait_for_timeout(700)

    # 02 메인 상단 — 택시 부르기 큰 버튼 + 보호자/위치
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(300)
    shot(page, "02_main.png")

    # 03 내 택시 번호 (데모값 채워짐)
    shot(page, "03_taxi.png", "#setup")

    # 04 내가 탈 위치 (기사님께 음성으로 읽어줄 주소)
    shot(page, "04_pickup.png", "#pickup_card")

    # 05 보호자
    shot(page, "05_guardian.png", "#guardian")

    # 06 자주 가는 곳
    shot(page, "06_places.png", "#places")

    # 07 정부 안내전화 (맨 아래)
    page.evaluate("window.scrollTo(0,document.body.scrollHeight)")
    page.wait_for_timeout(400)
    shot(page, "07_info.png")

    ctx.close()
    b.close()
    print("done ->", OUT)

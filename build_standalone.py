"""
백원콜 빌드 스크립트
1) 백원콜_핸드폰용.html  — 한 파일짜리 단독 실행본 (카톡 공유·즉시 사용용)
   - CSS/JS/지역데이터를 모두 index.html 안에 인라인
   - fetch·서비스워커 제거 (file:// 에서도 동작)
2) 백원콜_PWA_배포용.zip   — www 폴더 통째 압축 (Netlify Drop 업로드용)
"""
import os, re, json, base64, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
WWW = os.path.join(ROOT, "www")


def read(p):
    with open(os.path.join(WWW, p), encoding="utf-8") as f:
        return f.read()


def b64img(p):
    with open(os.path.join(WWW, p), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def build_standalone():
    html = read("index.html")
    css = read("style.css")
    js = read("app.js")
    regions = read("data/regions.json")

    icon192 = b64img("icon_192.png")

    # 단일 파일은 모든 스크립트가 인라인이므로 CSP에 'unsafe-inline' 허용 (외부 통신은 여전히 'self'로 차단)
    html = re.sub(r"script-src 'self'", "script-src 'self' 'unsafe-inline'", html)

    # <link stylesheet> -> 인라인 <style>
    html = re.sub(r'<link rel="stylesheet"[^>]*>', "<style>\n" + css + "\n</style>", html)
    # manifest / 외부 아이콘 링크 제거 (단일 파일에서는 불필요)
    html = re.sub(r'<link rel="manifest"[^>]*>\s*', "", html)
    html = re.sub(r'<link rel="icon"[^>]*>\s*', "", html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\s*',
                  '<link rel="apple-touch-icon" href="' + icon192 + '" />\n  ', html)

    # 지역 데이터 + app.js 를 인라인 스크립트로 치환
    data_script = "<script>window.__REGIONS__ = " + regions + ";</script>"
    html = html.replace('<script src="app.js"></script>', data_script + "\n  <script>\n" + js + "\n</script>")

    out = os.path.join(ROOT, "백원콜_핸드폰용.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("saved", out, "(", round(os.path.getsize(out) / 1024, 1), "KB )")


def build_zip():
    out = os.path.join(ROOT, "백원콜_PWA_배포용.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for base, _, files in os.walk(WWW):
            for fn in files:
                full = os.path.join(base, fn)
                rel = os.path.relpath(full, WWW)
                z.write(full, rel)
    print("saved", out, "(", round(os.path.getsize(out) / 1024, 1), "KB )")


if __name__ == "__main__":
    build_standalone()
    build_zip()
    print("done")

"""
Screenshots real Tanzim screens for the explainer video, in Arabic or English.

Signs in through the local API (POST /api/login/), stores the tokens and language the way the app does
(localStorage tanzim.accessToken / tanzim.refreshToken / tanzim.lang / tanzim.theme), then opens each shot's path
in installed Edge (headless, through Playwright) and saves a 1920x1080 PNG.

Usage:
  python capture_app.py --shots shots.json --lang ar --out work/ar/shots \
      --base http://localhost:4200 --email owner@example.com --password ...
shots.json: [{"name": "dashboard", "path": "/dashboard", "click": "optional CSS/text selector",
              "wait": 1500, "scroll": 0, "account": "staff (optional)"}]
Credentials: --email / --password, or TANZIM_EMAIL / TANZIM_PASSWORD; shots with "account": "staff" use
TANZIM_STAFF_EMAIL / TANZIM_STAFF_PASSWORD (a platform-staff user).
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


def login(base, email, password):
    req = urllib.request.Request(
        f"{base}/api/login/",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
    )
    body = json.load(urllib.request.urlopen(req))
    data = body.get("data", body)
    access = data.get("access") or data.get("access_token") or (data.get("tokens") or {}).get("access")
    refresh = data.get("refresh") or data.get("refresh_token") or (data.get("tokens") or {}).get("refresh")
    if not access:
        sys.exit(f"login: no access token in response keys {list(data)}")
    return access, refresh


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", required=True)
    ap.add_argument("--lang", default="en", choices=["en", "ar"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--base", default="http://localhost:4200")
    ap.add_argument("--email", default=os.environ.get("TANZIM_EMAIL"))
    ap.add_argument("--password", default=os.environ.get("TANZIM_PASSWORD"))
    ap.add_argument("--theme", default="light")
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--only", nargs="*", help="capture only these shot names")
    a = ap.parse_args()

    shots = json.loads(Path(a.shots).read_text(encoding="utf-8"))
    if a.only:
        shots = [s for s in shots if s["name"] in a.only]
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    w, h = (int(x) for x in a.size.split("x"))
    creds = {"main": (a.email, a.password),
             "staff": (os.environ.get("TANZIM_STAFF_EMAIL"), os.environ.get("TANZIM_STAFF_PASSWORD"))}

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        pages = {}

        def page_for(account):
            if account not in pages:
                access, refresh = login(a.base, *creds[account])
                ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                          locale="ar-EG" if a.lang == "ar" else "en-US")
                ctx.add_init_script(
                    f"""localStorage.setItem('tanzim.accessToken', {json.dumps(access)});
                    {f"localStorage.setItem('tanzim.refreshToken', {json.dumps(refresh)});" if refresh else ""}
                    localStorage.setItem('tanzim.lang', '{a.lang}');
                    localStorage.setItem('tanzim.theme', '{a.theme}');"""
                )
                pages[account] = ctx.new_page()
            return pages[account]

        for s in shots:
            page = page_for(s.get("account", "main"))
            page.goto(a.base + s["path"], wait_until="networkidle")
            if s.get("click"):
                page.locator(s["click"]).first.click()
                page.wait_for_load_state("networkidle")
            if s.get("scroll"):
                page.mouse.wheel(0, s["scroll"])
            page.wait_for_timeout(s.get("wait", 1200))
            page.screenshot(path=str(out / f"{s['name']}.png"))
            print(s["name"], page.url)
        browser.close()


if __name__ == "__main__":
    main()

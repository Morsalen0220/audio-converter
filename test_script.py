from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.goto("file:///app/test.html")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_cuj(page)
        browser.close()

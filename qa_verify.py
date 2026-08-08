from playwright.sync_api import sync_playwright
import time
import json

def verify_env(url):
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Onboarding Flow
        try:
            context = browser.new_context()
            page = context.new_page()
            page.goto(f"{url}/details")
            # Submit empty to trigger validation
            page.click("button:has-text('Get My Strategy')", timeout=5000)
            
            # Check for error state
            error_el = page.locator(".text-red-500").first
            error_text = error_el.inner_text() if error_el.count() > 0 else "No error text found"
            
            # Check if inline validation exists
            has_validation = "No error text found" not in error_text
            results['onboarding'] = {"has_validation": has_validation, "error_text": error_text}
            context.close()
        except Exception as e:
            results['onboarding'] = {"error": str(e)}

        # 2. Admin Knowledge Library Pagination
        try:
            context = browser.new_context()
            page = context.new_page()
            page.goto(f"{url}/admin/knowledge")
            page.wait_for_selector("table", timeout=5000)
            
            # Look for pagination buttons (Next, Previous)
            has_pagination = page.locator("button:has-text('Next')").count() > 0
            has_search = page.locator("input[placeholder*='Search']").count() > 0
            
            results['admin_library'] = {"has_pagination": has_pagination, "has_search": has_search}
            context.close()
        except Exception as e:
            results['admin_library'] = {"error": str(e)}

        # 3. Knowledge Editor JSON Validation
        try:
            context = browser.new_context()
            page = context.new_page()
            page.goto(f"{url}/admin/knowledge/edit") # Might redirect if no ID, but let's see
            time.sleep(2)
            has_change_summary = page.locator("input[placeholder*='Summary']").count() > 0 or page.locator("textarea[placeholder*='Summary']").count() > 0
            
            results['admin_editor'] = {"has_change_summary": has_change_summary}
            context.close()
        except Exception as e:
            results['admin_editor'] = {"error": str(e)}

        browser.close()
    return results

print("=== LOCAL (http://localhost:8788) ===")
local_results = verify_env("http://localhost:8788")
print(json.dumps(local_results, indent=2))

print("\n=== PRODUCTION (https://main.cac-web-app.pages.dev) ===")
prod_results = verify_env("https://main.cac-web-app.pages.dev")
print(json.dumps(prod_results, indent=2))

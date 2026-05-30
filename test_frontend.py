from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 打开页面
    page.goto('http://localhost:5000')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    
    # 截图登录页面
    page.screenshot(path='d:/Desktop/tokenplan/screenshots/01_login_page.png', full_page=True)
    print("1. 登录页面截图完成")
    
    # 测试注册功能
    page.click('#authToggleLink')
    time.sleep(0.5)
    page.fill('#authUsername', 'playwright_user1')
    page.fill('#authPassword', 'test123')
    page.click('#authSubmitBtn')
    time.sleep(2)
    
    # 截图主页面
    page.screenshot(path='d:/Desktop/tokenplan/screenshots/02_main_page.png', full_page=True)
    print("2. 注册并登录成功，主页面截图完成")
    
    # 测试贡献资源功能 - 选择已知平台，不填模型
    page.click('button[data-page="contribute"]')
    time.sleep(1)
    
    # 选择OpenAI平台
    page.select_option('#platformSelect', 'OpenAI')
    time.sleep(0.5)
    
    # 截图贡献页面（显示模型字段为选填）
    page.screenshot(path='d:/Desktop/tokenplan/screenshots/03_contribute_page.png', full_page=True)
    print("3. 贡献页面截图完成（OpenAI已选，模型字段选填）")
    
    # 填写API Key（不填模型）
    page.fill('#apiKeysInput', 'sk-test-playwright-key-12345')
    page.fill('#quotaInput', '$100/月')
    
    # 提交贡献
    page.click('button[type="submit"]')
    time.sleep(2)
    
    # 截图提交成功
    page.screenshot(path='d:/Desktop/tokenplan/screenshots/04_contribute_success.png', full_page=True)
    print("4. 贡献资源提交成功截图完成")
    
    # 切换到浏览页面
    page.click('button[data-page="browse"]')
    time.sleep(2)
    
    # 截图浏览页面
    page.screenshot(path='d:/Desktop/tokenplan/screenshots/05_browse_page.png', full_page=True)
    print("5. 浏览资源页面截图完成")
    
    # 测试申请使用按钮
    assign_buttons = page.locator('button[data-action="assign"]').all()
    if len(assign_buttons) > 0:
        print(f"6. 找到 {len(assign_buttons)} 个申请使用按钮")
        
        # 先设置对话框处理，再点击按钮
        page.on('dialog', lambda dialog: dialog.accept())
        
        # 点击第一个申请使用按钮
        assign_buttons[0].click()
        time.sleep(2)
        
        # 截图申请结果
        page.screenshot(path='d:/Desktop/tokenplan/screenshots/06_assign_result.png', full_page=True)
        print("7. 申请使用结果截图完成")
    else:
        print("6. 没有找到申请使用按钮，可能没有可用资源")
    
    # 检查是否有弹窗显示
    modal = page.locator('#keyModal')
    if modal.is_visible():
        print("8. 成功弹窗显示！申请使用功能正常")
        page.screenshot(path='d:/Desktop/tokenplan/screenshots/07_success_modal.png', full_page=True)
        page.click('#closeKeyModal')
        time.sleep(0.5)
    else:
        print("8. 没有检测到成功弹窗")
    
    # 测试我的资源页面
    page.click('button[data-page="mykeys"]')
    time.sleep(1)
    page.screenshot(path='d:/Desktop/tokenplan/screenshots/08_mykeys_page.png', full_page=True)
    print("9. 我的资源页面截图完成")
    
    # 检查控制台错误
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    
    print("\n=== 测试完成 ===")
    if errors:
        print(f"控制台错误: {errors}")
    else:
        print("没有检测到控制台错误")
    
    browser.close()

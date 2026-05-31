const API_BASE = '';
let currentUser = null;
let isLoginMode = true;

// 平台API地址和文档链接映射
const platformInfo = {
    'OpenAI': { url: 'https://api.openai.com/v1', docs: 'https://platform.openai.com/docs/models' },
    'Claude': { url: 'https://api.anthropic.com/v1', docs: 'https://docs.anthropic.com/claude/docs/models-overview' },
    'Gemini': { url: 'https://generativelanguage.googleapis.com/v1beta', docs: 'https://ai.google.dev/gemini-api/docs/models/gemini' },
    'Mistral': { url: 'https://api.mistral.ai/v1', docs: 'https://docs.mistral.ai/getting-started/models/' },
    'Grok': { url: 'https://api.x.ai/v1', docs: 'https://docs.x.ai/' },
    'Meta': { url: 'https://api.llama.com/v1', docs: 'https://docs.llama.com/' },
    'Together': { url: 'https://api.together.xyz/v1', docs: 'https://docs.together.ai/docs/models' },
    'Fireworks': { url: 'https://api.fireworks.ai/inference/v1', docs: 'https://docs.fireworks.ai/guides/getting-started/models' },
    'Groq': { url: 'https://api.groq.com/openai/v1', docs: 'https://console.groq.com/docs/models' },
    'Cohere': { url: 'https://api.cohere.ai/v1', docs: 'https://docs.cohere.com/docs/models' },
    'Perplexity': { url: 'https://api.perplexity.ai', docs: 'https://docs.perplexity.ai/guides/model-cards' },
    'Replicate': { url: 'https://api.replicate.com/v1', docs: 'https://replicate.com/docs' },
    'HuggingFace': { url: 'https://api-inference.huggingface.co/models', docs: 'https://huggingface.co/docs/api-inference/' },
    'DeepSeek': { url: 'https://api.deepseek.com/v1', docs: 'https://platform.deepseek.com/api-docs/zh-cn/' },
    'Doubao': { url: 'https://ark.cn-beijing.volces.com/api/v3', docs: 'https://www.volcengine.com/docs/82379/1099320' },
    'Spark': { url: 'https://spark-api-open.xf-yun.com/v1', docs: 'https://www.xfyun.cn/doc/spark/HTTP%E8%B0%83%E7%94%A8%E6%96%87%E6%A1%A3.html' },
    'Wenxin': { url: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop', docs: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu' },
    'Qwen': { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', docs: 'https://help.aliyun.com/zh/dashscope/developer-reference/api-details' },
    'GLM': { url: 'https://open.bigmodel.cn/api/paas/v4', docs: 'https://open.bigmodel.cn/dev/howuse/model' },
    'Kimi': { url: 'https://api.moonshot.cn/v1', docs: 'https://platform.moonshot.cn/docs/intro' },
    'MiniMax': { url: 'https://api.minimax.chat/v1', docs: 'https://platform.minimaxi.com/document/guides/chat-model/V2' },
    'Yi': { url: 'https://api.lingyiwanwu.com/v1', docs: 'https://platform.lingyiwanwu.com/docs' },
    'Baichuan': { url: 'https://api.baichuan-ai.com/v1', docs: 'https://platform.baichuan-ai.com/docs/api' },
    'StepFun': { url: 'https://api.stepfun.com/v1', docs: 'https://platform.stepfun.com/docs/overview' },
    'SiliconFlow': { url: 'https://api.siliconflow.cn/v1', docs: 'https://docs.siliconflow.cn/api-reference' },
    'Hunyuan': { url: 'https://api.hunyuan.cloud.tencent.com/v1', docs: 'https://cloud.tencent.com/document/product/1729/97731' },
    'SenseTime': { url: 'https://api.sensenova.cn/v1', docs: 'https://platform.sensenova.cn/doc' },
    'Zhipu': { url: 'https://api.360.cn/v1', docs: 'https://ai.360.cn/platform/overview' },
    'Tiangong': { url: 'https://api.tiangong.cn/v1', docs: 'https://model-platform.tiangong.cn/api-reference' },
    'Huawei': { url: 'https://api.pangu.huaweicloud.com/v1', docs: 'https://www.huaweicloud.com/product/pangu/nlp.html' },
    'MiMo': { url: 'https://api.xiaomimimo.com/v1', docs: 'https://platform.xiaomimimo.com/docs/zh-CN/welcome' },
    'BlueLM': { url: 'https://api.vivo.com.cn/v1', docs: 'https://developers.vivo.com/product/ai/bluelm' }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }
    animateAuthPage();
    initEventListeners();
});

// 初始化事件监听器
function initEventListeners() {
    // 认证表单提交
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);

    // 贡献表单提交
    document.getElementById('contributeForm').addEventListener('submit', handleContributeSubmit);

    // 退出按钮
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 认证模式切换
    document.getElementById('authToggleLink').addEventListener('click', toggleAuthMode);

    // 导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchPage(e.target.dataset.page, e.target));
    });

    // Key网格按钮委托
    document.getElementById('keysGrid').addEventListener('click', (e) => {
        const platformCard = e.target.closest('[data-action="assign-platform"]');
        if (platformCard) {
            const platform = platformCard.dataset.platform;
            assignByPlatform(platform);
            return;
        }

        const btn = e.target.closest('[data-action]');
        if (btn) {
            const action = btn.dataset.action;
            const keyId = btn.dataset.keyId;
            if (action === 'assign') assignKey(keyId);
        }
    });

    // 我的Key网格按钮委托
    document.getElementById('contributedKeysGrid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (btn) {
            const action = btn.dataset.action;
            const keyId = btn.dataset.keyId;
            if (action === 'disable') disableKey(keyId);
        }
    });

    // 使用中的Key复制按钮委托
    document.getElementById('usingKeysGrid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (btn) {
            const action = btn.dataset.action;
            if (action === 'copy') copyToClipboard(btn.dataset.text);
        }
    });

    // 初始化自定义下拉菜单
    initCustomSelect();

    // 初始化日期选择器
    initDatePicker();

    // 弹窗关闭
    document.getElementById('closeKeyModal').addEventListener('click', closeKeyModal);
    document.getElementById('closeToolModal').addEventListener('click', closeToolModal);

    // 工具横幅按钮
    document.getElementById('showToolBtn').addEventListener('click', showToolDownload);
    document.getElementById('dismissToolBtn').addEventListener('click', () => {
        document.querySelector('.tool-banner').style.display = 'none';
    });

    // 下载工具按钮
    document.getElementById('downloadToolBtn').addEventListener('click', downloadTool);

    // 模型列表链接点击
    document.getElementById('modelListLink').addEventListener('click', (e) => {
        if (e.target.href === '#') e.preventDefault();
    });
}

// 认证页面动画 - Apple风格简洁动画
function animateAuthPage() {
    if (typeof gsap === 'undefined') return;

    // 卡片淡入上浮
    gsap.fromTo('.auth-card',
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }
    );

    // 标题动画
    gsap.fromTo('.auth-title',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.2 }
    );

    // 副标题动画
    gsap.fromTo('.auth-subtitle',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.3 }
    );

    // 表单元素错位动画
    gsap.fromTo('.form-group',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.3, ease: 'power2.out', delay: 0.4 }
    );

    // 按钮动画
    gsap.fromTo('.auth-card .btn',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.6 }
    );
}

// 切换登录/注册模式 - Apple风格动画
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const btn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const toggleLink = document.getElementById('authToggleLink');

    btn.textContent = isLoginMode ? '登录' : '注册';
    toggleText.textContent = isLoginMode ? '没有账号？' : '已有账号？';
    toggleLink.textContent = isLoginMode ? '立即注册' : '去登录';

    if (typeof gsap !== 'undefined') {
        // 按钮文字切换动画
        gsap.fromTo(btn, 
            { opacity: 0.5, y: 5 },
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
        );
        
        // 切换链接动画
        gsap.fromTo('.auth-toggle',
            { opacity: 0.5 },
            { opacity: 1, duration: 0.2, ease: 'power2.out' }
        );
    }
}

// 认证表单提交 - Apple风格动画
async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');

    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    btn.textContent = '处理中...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // 按钮加载动画
    if (typeof gsap !== 'undefined') {
        gsap.to(btn, { scale: 0.97, duration: 0.1, ease: 'power2.out' });
    }

    try {
        const response = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = { user_id: data.user_id, username: data.username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            if (typeof gsap !== 'undefined') {
                // 成功动画 - 卡片上浮消失
                gsap.to('.auth-card', {
                    opacity: 0,
                    y: -30,
                    scale: 0.98,
                    duration: 0.4,
                    ease: 'power2.in',
                    onComplete: () => {
                        showToast('登录成功', 'success');
                        setTimeout(() => showMainApp(), 200);
                    }
                });
            } else {
                showToast('登录成功', 'success');
                showMainApp();
            }
        } else {
            showToast(data.error || '操作失败', 'error');
            shakeElement(document.getElementById('authPassword'));
            resetButton(btn);
        }
    } catch (error) {
        showToast('网络错误，请检查连接', 'error');
        resetButton(btn);
    }
}

// 重置按钮状态
function resetButton(btn) {
    btn.textContent = isLoginMode ? '登录' : '注册';
    btn.disabled = false;
    btn.style.opacity = '1';
}

// 显示主应用 - Apple风格简洁动画
function showMainApp() {
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('usernameDisplay').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username[0].toUpperCase();

    if (typeof gsap !== 'undefined') {
        // 主应用淡入
        gsap.fromTo('#mainApp',
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );

        // Header动画
        gsap.from('header', {
            y: -20,
            opacity: 0,
            duration: 0.4,
            ease: 'power2.out',
            delay: 0.1
        });

        // 导航动画
        gsap.from('nav', {
            opacity: 0,
            y: 15,
            duration: 0.3,
            ease: 'power2.out',
            delay: 0.2
        });
    }

    loadStats();
    loadKeys();
}

// 退出登录 - Apple风格动画
function logout() {
    if (typeof gsap !== 'undefined') {
        // 主应用淡出
        gsap.to('#mainApp', {
            opacity: 0,
            y: -20,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                currentUser = null;
                localStorage.removeItem('currentUser');
                document.getElementById('authPage').style.display = 'flex';
                document.getElementById('mainApp').style.display = 'none';
                gsap.set('#mainApp', { opacity: 1, y: 0 });
                gsap.set('.auth-card', { opacity: 1, y: 0, scale: 1 });
                animateAuthPage();
            }
        });
    } else {
        currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('authPage').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
}

// 切换页面 - Apple风格简洁动画
function switchPage(pageName, btn) {
    const currentPage = document.querySelector('.page.active');
    const nextPage = document.getElementById(`page-${pageName}`);

    if (currentPage === nextPage) return;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 页面切换动画
    if (typeof gsap !== 'undefined') {
        gsap.to(currentPage, {
            opacity: 0,
            y: -10,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                currentPage.classList.remove('active');
                nextPage.classList.add('active');
                
                gsap.fromTo(nextPage,
                    { opacity: 0, y: 10 },
                    { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
                );
            }
        });
    } else {
        currentPage.classList.remove('active');
        nextPage.classList.add('active');
    }

    if (pageName === 'mykeys') loadMyKeys();
    if (pageName === 'browse') {
        loadStats();
        loadKeys();
    }
}

// 加载统计数据 - Apple风格动画
async function loadStats() {
    try {
        const response = await fetch(API_BASE + '/api/stats');
        const data = await response.json();

        animateCounter('statUsers', data.user_count);
        animateCounter('statAvailable', data.available_keys);
        animateCounter('statAssigned', data.assigned_keys);
        animateCounter('statPlatforms', data.platforms.length);

        if (typeof gsap !== 'undefined') {
            // 统计卡片错位动画
            gsap.from('.stat-card', {
                opacity: 0,
                y: 20,
                scale: 0.95,
                stagger: 0.1,
                duration: 0.4,
                ease: 'power2.out',
                clearProps: 'all'
            });
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 数字递增动画 - Apple风格
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const startValue = parseInt(element.textContent) || 0;

    if (typeof gsap !== 'undefined') {
        // 先缩放一下，再递增
        gsap.fromTo(element, 
            { scale: 0.95 },
            { scale: 1, duration: 0.3, ease: 'power2.out' }
        );
        
        gsap.to({ value: startValue }, {
            value: targetValue,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: function() {
                element.textContent = Math.round(this.targets()[0].value);
            }
        });
    } else {
        element.textContent = targetValue;
    }
}

// 加载可用资源（按平台聚合）- Apple风格动画
async function loadKeys(platform = '') {
    try {
        const url = API_BASE + '/api/keys?status=available' + (platform ? `&platform=${platform}` : '');
        const response = await fetch(url);
        const keys = await response.json();

        const grid = document.getElementById('keysGrid');

        if (keys.length === 0) {
            grid.innerHTML = `
            <div class="empty-state">
                <p>暂无可用资源</p>
            </div>
        `;
            return;
        }

        // 按平台聚合
        const platformMap = {};
        keys.forEach(key => {
            if (!platformMap[key.platform]) {
                platformMap[key.platform] = {
                    platform: key.platform,
                    count: 0,
                    base_url: key.base_url,
                    expires_at: key.expires_at
                };
            }
            platformMap[key.platform].count++;
            if (key.expires_at && (!platformMap[key.platform].expires_at || key.expires_at < platformMap[key.platform].expires_at)) {
                platformMap[key.platform].expires_at = key.expires_at;
            }
        });

        const platforms = Object.values(platformMap);
        grid.innerHTML = platforms.map(p => renderPlatformCard(p)).join('');

        if (typeof gsap !== 'undefined') {
            // 平台卡片错位动画
            gsap.fromTo('.platform-card',
                { opacity: 0, y: 25, scale: 0.95 },
                { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.4, ease: 'power2.out' }
            );
            
            // 统计卡片动画
            gsap.fromTo('.stat-card',
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, stagger: 0.1, duration: 0.3, ease: 'power2.out', delay: 0.2 }
            );
        }
    } catch (error) {
        console.error('加载资源列表失败:', error);
    }
}

// 渲染平台卡片
function renderPlatformCard(platform) {
    const expiresInfo = platform.expires_at ? `<div class="platform-card-expires">有效期至 ${platform.expires_at}</div>` : '';
    return `
        <div class="platform-card" data-action="assign-platform" data-platform="${platform.platform}">
            <div class="platform-card-name">${platform.platform}</div>
            <div class="platform-card-count">${platform.count} 个可用</div>
            ${expiresInfo}
            <div class="platform-card-hint">点击获取</div>
        </div>
    `;
}

// 按平台申请使用Key
async function assignByPlatform(platform) {
    console.log('点击平台:', platform);
    console.log('当前用户:', currentUser);
    
    if (!confirm(`确定要申请使用 ${platform} 的资源吗？`)) {
        console.log('用户取消了确认');
        return;
    }

    console.log('用户确认，开始申请...');
    try {
        const response = await fetch(API_BASE + '/api/platforms/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, platform: platform })
        });

        console.log('API响应状态:', response.status);
        const data = await response.json();
        console.log('API响应数据:', data);

        if (response.ok) {
            document.getElementById('modalPlatform').textContent = data.platform;
            document.getElementById('modalBaseUrl').textContent = data.base_url;
            document.getElementById('modalApiKey').textContent = data.api_key;
            document.getElementById('keyModal').classList.add('active');
            console.log('弹窗已显示');

            if (typeof gsap !== 'undefined') {
                // 背景淡入
                gsap.fromTo('#keyModal',
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: 'power2.out' }
                );
                
                // 弹窗缩放淡入
                gsap.fromTo('#keyModal .modal',
                    { opacity: 0, scale: 0.92, y: 20 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out', delay: 0.1 }
                );
            }

            loadStats();
        } else {
            console.log('申请失败:', data.error);
            showToast(data.error || '申请失败', 'error');
        }
    } catch (error) {
        console.error('申请使用失败:', error);
        showToast('网络错误，请检查连接', 'error');
    }
}

// 申请使用Key
async function assignKey(keyId) {
    if (!confirm('确定要申请使用这个Key吗？')) return;

    try {
        const response = await fetch(API_BASE + `/api/keys/${keyId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('modalPlatform').textContent = data.platform;
            document.getElementById('modalBaseUrl').textContent = data.base_url;
            document.getElementById('modalApiKey').textContent = data.api_key;
            document.getElementById('keyModal').classList.add('active');

            if (typeof gsap !== 'undefined') {
                // 背景淡入
                gsap.fromTo('#keyModal',
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: 'power2.out' }
                );
                
                // 弹窗缩放淡入
                gsap.fromTo('#keyModal .modal',
                    { opacity: 0, scale: 0.92, y: 20 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out', delay: 0.1 }
                );
            }

            loadStats();
            loadKeys();
        } else {
            showToast(data.error || '申请失败', 'error');
        }
    } catch (error) {
        console.error('申请使用失败:', error);
        showToast('网络错误，请检查连接', 'error');
    }
}

// 关闭Key详情弹窗 - Apple风格动画
function closeKeyModal() {
    if (typeof gsap !== 'undefined') {
        // 弹窗缩小淡出
        gsap.to('#keyModal .modal', {
            opacity: 0,
            scale: 0.92,
            y: 20,
            duration: 0.25,
            ease: 'power2.in'
        });
        
        // 背景淡出
        gsap.to('#keyModal', {
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in',
            delay: 0.1,
            onComplete: () => {
                document.getElementById('keyModal').classList.remove('active');
                gsap.set('#keyModal', { opacity: 1 });
                gsap.set('#keyModal .modal', { opacity: 1, scale: 1, y: 0 });
                loadKeys();
            }
        });
    } else {
        document.getElementById('keyModal').classList.remove('active');
        loadKeys();
    }
}

// 复制文本
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板', 'success');
    });
}

// 贡献表单提交 - Apple风格动画
async function handleContributeSubmit(e) {
    e.preventDefault();

    const platform = document.getElementById('platformSelect').value;
    const baseUrl = document.getElementById('baseUrlInput').value;
    const apiKeys = document.getElementById('apiKeysInput').value.split('\n').filter(k => k.trim());
    const claimedQuota = document.getElementById('quotaInput').value;
    const expiresAt = document.getElementById('expiresAtInput').value;
    const modelsText = document.getElementById('modelsInput').value;
    const selectedModels = modelsText.split('\n').filter(m => m.trim());

    const isKnownPlatform = platformInfo[platform] !== undefined;

    if (!isKnownPlatform && selectedModels.length === 0) {
        showToast('自定义平台请至少填写一个模型', 'error');
        shakeElement(document.getElementById('modelsInput'));
        return;
    }

    if (!expiresAt) {
        showToast('请选择失效时间', 'error');
        shakeElement(document.getElementById('expiresAtInput'));
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = '提交中...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // 按钮加载动画
    if (typeof gsap !== 'undefined') {
        gsap.to(btn, { scale: 0.97, duration: 0.1, ease: 'power2.out' });
    }

    try {
        const response = await fetch(API_BASE + '/api/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contributor_id: currentUser.user_id,
                platform,
                base_url: baseUrl,
                models: selectedModels,
                api_keys: apiKeys,
                claimed_quota: claimedQuota,
                expires_at: expiresAt
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            
            // 表单重置动画
            if (typeof gsap !== 'undefined') {
                gsap.to('#contributeForm', {
                    opacity: 0.5,
                    y: -5,
                    duration: 0.2,
                    ease: 'power2.in',
                    onComplete: () => {
                        document.getElementById('contributeForm').reset();
                        gsap.to('#contributeForm', {
                            opacity: 1,
                            y: 0,
                            duration: 0.3,
                            ease: 'power2.out'
                        });
                    }
                });
            } else {
                document.getElementById('contributeForm').reset();
            }
            
            loadStats();
        } else {
            showToast(data.error || '提交失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', 'error');
    }

    btn.textContent = '提交贡献';
    btn.disabled = false;
    btn.style.opacity = '1';
    
    if (typeof gsap !== 'undefined') {
        gsap.to(btn, { scale: 1, duration: 0.2, ease: 'power2.out' });
    }
}

// 抖动效果 - 用于错误提示
function shakeElement(element) {
    if (typeof gsap === 'undefined') return;
    
    gsap.to(element, {
        x: [-5, 5, -3, 3, 0],
        duration: 0.4,
        ease: 'power2.out'
    });
}

// 选择平台后自动填入API地址 - Apple风格动画
function fillBaseUrl() {
    const select = document.getElementById('platformSelect');
    const baseUrlInput = document.getElementById('baseUrlInput');
    const modelListLink = document.getElementById('modelListLink');
    const modelsInput = document.getElementById('modelsInput');
    const platform = select.value;

    if (platformInfo[platform]) {
        baseUrlInput.value = platformInfo[platform].url;
        modelListLink.href = platformInfo[platform].docs;
        modelListLink.style.display = 'inline';
        modelsInput.placeholder = '选填，使用者可前往官网查看支持的模型列表';

        if (typeof gsap !== 'undefined') {
            // 输入框填充动画
            gsap.fromTo(baseUrlInput, 
                { backgroundColor: 'rgba(0, 113, 227, 0.15)', scale: 1.01 },
                { backgroundColor: 'rgba(0, 0, 0, 0.3)', scale: 1, duration: 0.4, ease: 'power2.out' }
            );
            
            // 链接淡入
            gsap.fromTo(modelListLink,
                { opacity: 0, x: -5 },
                { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', delay: 0.1 }
            );
        }
    } else {
        baseUrlInput.value = '';
        modelListLink.href = '#';
        modelListLink.style.display = 'none';
        modelsInput.placeholder = '每行一个模型名称，例如:\ngpt-4o\ngpt-4-turbo\ngpt-3.5-turbo\n\n自定义平台请填写支持的模型';
    }
}

// 加载我的Key - Apple风格动画
async function loadMyKeys() {
    try {
        const response = await fetch(API_BASE + `/api/my-keys?user_id=${currentUser.user_id}`);
        const data = await response.json();

        const contributedGrid = document.getElementById('contributedKeysGrid');
        if (data.contributed.length === 0) {
            contributedGrid.innerHTML = `
                <div class="empty-state">
                    <p>您还没有贡献过 Key</p>
                </div>
            `;
        } else {
            contributedGrid.innerHTML = data.contributed.map(key => renderKeyCard(key, 'contributed')).join('');
        }

        const usingGrid = document.getElementById('usingKeysGrid');
        if (data.using.length === 0) {
            usingGrid.innerHTML = `
                <div class="empty-state">
                    <p>您还没有使用中的 Key</p>
                </div>
            `;
        } else {
            usingGrid.innerHTML = data.using.map(key => renderKeyCard(key, 'using')).join('');
        }

        if (typeof gsap !== 'undefined') {
            // 卡片错位动画
            gsap.fromTo('.key-card',
                { opacity: 0, y: 20, scale: 0.98 },
                { opacity: 1, y: 0, scale: 1, stagger: 0.05, duration: 0.35, ease: 'power2.out' }
            );
            
            // 标题动画
            gsap.fromTo('.section-subtitle',
                { opacity: 0, x: -10 },
                { opacity: 1, x: 0, stagger: 0.1, duration: 0.3, ease: 'power2.out' }
            );
        }
    } catch (error) {
        console.error('加载我的Key失败:', error);
    }
}

// 渲染Key卡片（统一函数）
function renderKeyCard(key, type) {
    const docsUrl = platformInfo[key.platform]?.docs || '#';

    let statusHtml = '';
    if (type === 'browse') {
        statusHtml = '<span class="key-status status-available">可用</span>';
    } else if (type === 'contributed') {
        const statusMap = { 'available': '可用', 'assigned': '已分配', 'disabled': '已禁用' };
        statusHtml = `<span class="key-status status-${key.status}">${statusMap[key.status] || key.status}</span>`;
    }

    let actionsHtml = '';
    if (type === 'browse') {
        actionsHtml = `
            <div class="key-actions">
                <button class="btn btn-link" data-action="assign" data-key-id="${key.id}">申请使用</button>
            </div>
        `;
    } else if (type === 'contributed' && key.status === 'assigned') {
        actionsHtml = `
            <div class="key-actions">
                <button class="btn btn-danger" data-action="disable" data-key-id="${key.id}">禁用</button>
            </div>
        `;
    }

    let extraInfo = '';
    if (type === 'browse') {
        extraInfo = `
            <div><a href="${docsUrl}" target="_blank" class="info-link">查看官方文档</a></div>
            <div>额度: ${key.claimed_quota || '未填写'}</div>
            <div>贡献者: ${key.contributor_name}</div>
        `;
    } else if (type === 'contributed') {
        if (key.assigned_to_name) {
            extraInfo = `<div>使用者: ${key.assigned_to_name}</div>`;
        }
    } else if (type === 'using') {
        extraInfo = `<div>贡献者: ${key.contributor_name}</div>`;
    }

    let keyDisplayHtml = '';
    if (type === 'using') {
        keyDisplayHtml = `
            <div class="key-display" style="margin-top: 16px;">
                <span>${key.api_key}</span>
                <button class="copy-btn" data-action="copy" data-text="${key.api_key}">复制</button>
            </div>
        `;
    }

    return `
        <div class="key-card">
            <div class="key-header">
                <span class="platform-badge">${key.platform}</span>
                ${statusHtml}
            </div>
            <div class="key-models">
                ${key.models.map(m => `<span class="model-tag">${m}</span>`).join('')}
            </div>
            <div class="key-info">
                <div>${type === 'browse' ? `<a href="${key.base_url}" target="_blank" style="color: var(--apple-blue); text-decoration: none;">${key.base_url}</a>` : key.base_url}</div>
                ${extraInfo}
            </div>
            ${keyDisplayHtml}
            ${actionsHtml}
        </div>
    `;
}

// 禁用Key
async function disableKey(keyId) {
    if (!confirm('确定要禁用这个Key吗？使用者将无法继续使用。')) return;

    try {
        const response = await fetch(API_BASE + `/api/keys/${keyId}/disable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('已禁用', 'success');
            loadMyKeys();
        } else {
            showToast(data.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', 'error');
    }
}

// 显示统计工具弹窗 - Apple风格动画
function showToolDownload() {
    document.getElementById('toolModal').classList.add('active');

    if (typeof gsap !== 'undefined') {
        // 背景淡入
        gsap.fromTo('#toolModal',
            { opacity: 0 },
            { opacity: 1, duration: 0.2, ease: 'power2.out' }
        );
        
        // 弹窗缩放淡入
        gsap.fromTo('#toolModal .modal',
            { opacity: 0, scale: 0.92, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out', delay: 0.1 }
        );
    }
}

// 关闭统计工具弹窗 - Apple风格动画
function closeToolModal() {
    if (typeof gsap !== 'undefined') {
        // 弹窗缩小淡出
        gsap.to('#toolModal .modal', {
            opacity: 0,
            scale: 0.92,
            y: 20,
            duration: 0.25,
            ease: 'power2.in'
        });
        
        // 背景淡出
        gsap.to('#toolModal', {
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in',
            delay: 0.1,
            onComplete: () => {
                document.getElementById('toolModal').classList.remove('active');
                gsap.set('#toolModal', { opacity: 1 });
                gsap.set('#toolModal .modal', { opacity: 1, scale: 1, y: 0 });
            }
        });
    } else {
        document.getElementById('toolModal').classList.remove('active');
    }
}

// 下载工具
function downloadTool() {
    showToast('工具下载链接已复制到剪贴板', 'success');
    closeToolModal();
}

// Toast提示 - Apple风格
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    if (typeof gsap !== 'undefined') {
        // 从右侧滑入
        gsap.fromTo(toast,
            { opacity: 0, x: 30, scale: 0.95 },
            { opacity: 1, x: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
        );

        setTimeout(() => {
            gsap.to(toast, {
                opacity: 0,
                x: 20,
                scale: 0.95,
                duration: 0.25,
                ease: 'power2.in',
                onComplete: () => toast.className = 'toast'
            });
        }, 3000);
    } else {
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.className = 'toast';
        }, 3000);
    }
}

// 页面加载完成后的动画
window.addEventListener('load', () => {
    if (typeof gsap !== 'undefined') {
        // Logo动画
        gsap.from('.logo-icon', {
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            ease: 'power2.out'
        });

        // 导航按钮错位动画
        gsap.from('.nav-btn', {
            opacity: 0,
            y: 10,
            stagger: 0.05,
            duration: 0.3,
            ease: 'power2.out',
            delay: 0.2
        });

        // 用户信息动画
        gsap.from('.user-info', {
            opacity: 0,
            x: 20,
            duration: 0.4,
            ease: 'power2.out',
            delay: 0.3
        });
    }
});

// 滚动淡入动画
function initScrollAnimations() {
    if (typeof gsap === 'undefined') return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.fromTo(entry.target, 
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
                );
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stat-card, .platform-card, .key-card, .form-card').forEach(el => {
        observer.observe(el);
    });
}

// 按钮点击反馈动画
function initButtonFeedback() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousedown', () => {
            gsap.to(btn, { scale: 0.97, duration: 0.1, ease: 'power2.out' });
        });
        
        btn.addEventListener('mouseup', () => {
            gsap.to(btn, { scale: 1, duration: 0.2, ease: 'power2.out' });
        });
        
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { scale: 1, duration: 0.2, ease: 'power2.out' });
        });
    });
}

// 输入框聚焦动画
function initInputAnimations() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.form-input, .form-textarea, .form-select').forEach(input => {
        input.addEventListener('focus', () => {
            gsap.to(input, { 
                y: -1, 
                duration: 0.2, 
                ease: 'power2.out',
                boxShadow: '0 0 0 4px rgba(0, 113, 227, 0.15)'
            });
        });
        
        input.addEventListener('blur', () => {
            gsap.to(input, { 
                y: 0, 
                duration: 0.2, 
                ease: 'power2.out',
                boxShadow: 'none'
            });
        });
    });
}

// 初始化所有动画
function initAllAnimations() {
    initScrollAnimations();
    initButtonFeedback();
    initInputAnimations();
}

// 在DOM加载完成后初始化动画
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initAllAnimations, 100);
});

// 自定义下拉菜单 - 弹窗风格
function initCustomSelect() {
    const wrapper = document.getElementById('platformSelectWrapper');
    const trigger = document.getElementById('platformTrigger');
    const overlay = document.getElementById('platformDropdownOverlay');
    const dropdown = document.getElementById('platformDropdown');
    const closeBtn = document.getElementById('platformDropdownClose');
    const searchInput = document.getElementById('platformSearch');
    const hiddenInput = document.getElementById('platformSelect');
    const options = dropdown.querySelectorAll('.dropdown-option');
    const triggerText = trigger.querySelector('.select-value');

    function openDropdown() {
        overlay.classList.add('open');
        trigger.classList.add('active');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 100);
            filterOptions('');
        }
    }

    function closeDropdown() {
        overlay.classList.remove('open');
        trigger.classList.remove('active');
    }

    // 切换下拉菜单
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = overlay.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
            openDropdown();
        }
    });

    // 关闭按钮
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDropdown();
        });
    }

    // 选择选项
    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const text = option.textContent;

            // 更新显示
            triggerText.textContent = text;
            trigger.classList.add('has-value');
            hiddenInput.value = value;

            // 更新选中状态
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            // 关闭下拉菜单
            closeDropdown();

            // 触发change事件
            hiddenInput.dispatchEvent(new Event('change'));
            fillBaseUrl();
        });
    });

    // 搜索功能
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterOptions(e.target.value.toLowerCase());
        });

        searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDropdown();
        }
    });

    // 阻止下拉菜单内部点击冒泡
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 键盘导航
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeDropdown();
            trigger.focus();
        }
    });
}

// 过滤选项
function filterOptions(searchTerm) {
    const dropdown = document.getElementById('platformDropdown');
    const options = dropdown.querySelectorAll('.dropdown-option');
    const groups = dropdown.querySelectorAll('.dropdown-group');

    if (!searchTerm) {
        options.forEach(opt => opt.classList.remove('hidden'));
        groups.forEach(group => group.style.display = '');
        return;
    }

    groups.forEach(group => {
        const groupOptions = group.querySelectorAll('.dropdown-option');
        let hasVisible = false;

        groupOptions.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.dataset.value.toLowerCase();
            if (text.includes(searchTerm) || value.includes(searchTerm)) {
                option.classList.remove('hidden');
                hasVisible = true;
            } else {
                option.classList.add('hidden');
            }
        });

        group.style.display = hasVisible ? '' : 'none';
    });
}

// 关闭所有下拉菜单
function closeAllDropdowns() {
    // 关闭平台选择弹窗
    document.querySelectorAll('.select-dropdown-overlay').forEach(o => {
        o.classList.remove('open');
    });
    document.querySelectorAll('.select-trigger').forEach(t => t.classList.remove('active'));

    // 关闭日历弹窗
    document.querySelectorAll('.calendar-dropdown-overlay').forEach(o => {
        o.classList.remove('open');
    });
    document.querySelectorAll('.date-display').forEach(d => d.classList.remove('active'));

    // 恢复页面滚动
    document.body.style.overflow = '';
}

// 日期选择器 - Apple风格
function initDatePicker() {
    const datePicker = document.getElementById('datePicker');
    const dateDisplayTrigger = document.getElementById('dateDisplayTrigger');
    const dateDisplay = document.getElementById('dateDisplay');
    const overlay = document.getElementById('calendarDropdownOverlay');
    const calendarDropdown = document.getElementById('calendarDropdown');
    const closeBtn = document.getElementById('calendarDropdownClose');
    const calendarTitle = document.getElementById('calendarTitle');
    const calendarDays = document.getElementById('calendarDays');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');
    const hiddenInput = document.getElementById('expiresAtInput');

    let currentDate = new Date();
    let selectedDate = null;

    const originalParent = overlay.parentNode;

    function openCalendar() {
        document.body.appendChild(overlay);
        overlay.classList.add('open');
        dateDisplayTrigger.classList.add('active');
        renderCalendar();
    }

    function closeCalendar() {
        overlay.classList.remove('open');
        dateDisplayTrigger.classList.remove('active');
        originalParent.appendChild(overlay);
    }

    // 切换日历显示
    dateDisplayTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = overlay.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
            openCalendar();
        }
    });

    // 关闭按钮
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeCalendar();
        });
    }

    // 上个月
    prevMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    // 下个月
    nextMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // 今天
    todayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const today = new Date();
        selectDate(today);
        closeCalendar();
    });

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeCalendar();
        }
    });

    // 阻止日历内部点击冒泡
    calendarDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 键盘导航
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeCalendar();
        }
    });

    // 渲染日历
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 更新标题
        calendarTitle.textContent = `${year}年${month + 1}月`;

        // 获取月份信息
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        // 清空日历
        calendarDays.innerHTML = '';

        // 添加上个月的日期
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = document.createElement('button');
            day.className = 'calendar-day other-month';
            day.textContent = prevMonthLastDay - i;
            day.disabled = true;
            calendarDays.appendChild(day);
        }

        // 添加本月的日期
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const day = document.createElement('button');
            day.className = 'calendar-day';
            day.textContent = i;

            const date = new Date(year, month, i);
            const dateStr = formatDate(date);

            // 检查是否是今天
            if (date.toDateString() === today.toDateString()) {
                day.classList.add('today');
            }

            // 检查是否是选中的日期
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
                day.classList.add('selected');
            }

            // 检查是否是过去的日期（可选：禁用过去的日期）
            // if (date < today.setHours(0,0,0,0)) {
            //     day.disabled = true;
            // }

            day.addEventListener('click', () => {
                selectDate(date);
                closeCalendar();
            });

            calendarDays.appendChild(day);
        }

        // 添加下个月的日期
        const remainingDays = 42 - (startDay + totalDays);
        for (let i = 1; i <= remainingDays; i++) {
            const day = document.createElement('button');
            day.className = 'calendar-day other-month';
            day.textContent = i;
            day.disabled = true;
            calendarDays.appendChild(day);
        }
    }

    // 选择日期
    function selectDate(date) {
        selectedDate = date;
        const dateStr = formatDate(date);
        hiddenInput.value = dateStr;
        dateDisplay.textContent = dateStr;
        dateDisplay.classList.add('has-value');
        renderCalendar();
    }

    // 格式化日期
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 初始化渲染
    renderCalendar();
}
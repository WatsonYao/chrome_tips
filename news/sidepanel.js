// 获取DOM元素
const settingsBtn = document.getElementById('settingsBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const modelsBtn = document.getElementById('modelsBtn');
const modal = document.getElementById('settingsModal');
const closeBtn = document.querySelector('.close');
const resultsDiv = document.getElementById('results');
const saveBtn = document.querySelector('.save-button');

// 设置按钮点击事件
settingsBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    // 加载已保存的API Key
    chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            document.getElementById('apiKeyInput').value = result.geminiApiKey;
        }
    });
});

// 关闭模态框
function closeModal() {
    modal.style.display = 'none';
}

// 关闭按钮点击事件
closeBtn.addEventListener('click', closeModal);

// 点击模态框外部关闭
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// 保存API Key
saveBtn.addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
        try {
            await chrome.storage.local.set({ geminiApiKey: apiKey });
            closeModal();
            alert('API Key已保存！');
        } catch (error) {
            alert('保存失败：' + error.message);
        }
    } else {
        alert('请输入有效的API Key');
    }
});

// 模型能力按钮点击事件
modelsBtn.addEventListener('click', async () => {
    // 检查是否设置了API Key
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    if (!geminiApiKey) {
        alert('请先设置Gemini API Key');
        modal.style.display = 'block';
        return;
    }

    // 获取模型列表
    await fetchModelCapabilities(geminiApiKey);
});

// 获取模型能力
async function fetchModelCapabilities(apiKey) {
    resultsDiv.innerHTML = '<p>正在获取模型信息...</p>';
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET'
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || '获取模型列表失败');
        }
        displayModelCapabilities(data);
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">获取模型信息失败：${error.message}</p>`;
    }
}

// 显示模型能力
function displayModelCapabilities(data) {
    let html = '<h3>可用模型列表</h3>';
    
    if (!data.models || data.models.length === 0) {
        html += '<p>未找到可用模型</p>';
    } else {
        data.models.forEach(model => {
            html += `
                <div class="model-card">
                    <div class="model-name">${model.name}</div>
                    <div class="model-version">版本：${model.version || '未指定'}</div>
                    <div class="model-description">${model.description || '无描述'}</div>
                    <div style="margin-top: 5px; font-size: 0.9em;">
                        <strong>支持的生成类型：</strong> ${model.supportedGenerationMethods?.join(', ') || '未指定'}
                    </div>
                </div>
            `;
        });
    }
    
    resultsDiv.innerHTML = html;
}

// 分析按钮点击事件
analyzeBtn.addEventListener('click', async () => {
    console.log('分析按钮被点击');
    resultsDiv.innerHTML = '<p>正在初始化分析...</p>';
    
    try {
        // 检查是否设置了API Key
        const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
        if (!geminiApiKey) {
            console.log('未设置API Key');
            alert('请先设置Gemini API Key');
            modal.style.display = 'block';
            return;
        }
        console.log('API Key 验证通过');

        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.log('未找到活动标签页');
            throw new Error('未找到活动标签页');
        }
        console.log('当前标签页ID:', tab.id);

        resultsDiv.innerHTML = '<p>正在注入内容脚本...</p>';
        
        // 确保content script已注入
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            console.log('Content script 已注入');
        } catch (error) {
            console.log('Content script 注入错误（如果已存在则忽略）:', error);
        }

        resultsDiv.innerHTML = '<p>正在收集新闻标题...</p>';
        
        // 发送消息给content script
        console.log('开始向content script发送消息');
        chrome.tabs.sendMessage(tab.id, { action: 'analyzeNews' }, async (response) => {
            console.log('收到content script响应:', response);
            
            if (chrome.runtime.lastError) {
                console.error('消息发送错误:', chrome.runtime.lastError);
                resultsDiv.innerHTML = `<p style="color: red;">错误：${chrome.runtime.lastError.message}</p>`;
                return;
            }

            if (!response || !response.titles || response.titles.length === 0) {
                console.log('未找到新闻标题');
                resultsDiv.innerHTML = '<p>未找到任何新闻标题</p>';
                return;
            }

            console.log('收集到的标题数量:', response.titles.length);
            console.log('标题列表:', response.titles);
            
            resultsDiv.innerHTML = `<p>已收集到 ${response.titles.length} 个标题，正在分析...</p>`;
            await analyzeNewsTitles(response.titles, geminiApiKey);
        });
    } catch (error) {
        console.error('分析过程出错:', error);
        resultsDiv.innerHTML = `<p style="color: red;">分析过程出错：${error.message}</p>`;
    }
});

// 分析新闻标题
async function analyzeNewsTitles(titles, apiKey) {
    resultsDiv.innerHTML = '<p>正在分析中...</p>';
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `请分析以下新闻标题，判断哪些适合作为大学英语四六级或考研英语阅读材料，选择标准：
                        选材原则:
思辨性和学术性强: 文章通常包含复杂的观点、论证和逻辑关系。
关注社会热点和前沿问题: 内容常涉及近几年全球关注的经济、科技、社会、文化、环境等议题。
语言难度较高: 词汇量要求大，长难句常见。
文化背景知识要求: 对西方主流社会文化、价值观和历史背景有一定了解有助于理解文章。
体裁以议论文和说明文为主: 着重考查逻辑分析和信息获取能力。
一般不包括的题源类型:
政治体制改革相关的；
乌克兰、巴基斯坦等边缘政治和战争相关的；
文学作品（尤其是小说、诗歌、戏剧）: 考研英语的核心是学术英语和媒体英语，而非文学英语。
非正式的个人博客、论坛帖子等网络文本。
过于口语化或充满俚语的材料。
内容肤浅、缺乏深度和逻辑性的文章。
纯粹的故事性叙述（除非用作例子来支持论点）。
与中国国情直接相关的、由中国作者撰写的英文宣传材料（倾向于选择西方视角和语言习惯的材料）。
时效性过强且缺乏普适性分析的新闻短讯（更倾向于有深度分析的评论文章）。
高度专业化且背景知识要求极高的论文（会选择有一定普适性，可以通过上下文理解的学术文章）。
                        标题列表：${JSON.stringify(titles)}
                        请用JSON格式返回结果，格式为：
                        {
                            "suitable_titles": [
                                {
                                    "title": "标题内容",
                                    "cn": "翻译",
                                    "reason": "理由",
                                    "type": "不适/CET4/CET6/考研"
                                }
                            ]
                        }
                        注意：请直接返回JSON，不要添加markdown代码块标记。`
                    }]
                }]
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || '分析失败');
        }

        // 获取响应文本
        let jsonText = data.candidates[0].content.parts[0].text;
        
        // 如果响应包含markdown代码块标记，去除它们
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
        
        // 尝试解析JSON
        let analysisResult;
        try {
            analysisResult = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            console.log('尝试解析的文本:', jsonText);
            throw new Error('无法解析分析结果');
        }
        
        // 显示分析结果
        displayResults(analysisResult);
        
        // 发送消息给content script高亮符合条件的标题
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
            action: 'highlightTitles',
            titles: analysisResult.suitable_titles
                .filter(item => item.type !== '不适')
                .map(item => item.title)
        });
    } catch (error) {
        console.error('分析错误:', error);
        resultsDiv.innerHTML = `<p style="color: red;">分析出错：${error.message}</p>`;
    }
}

// 显示分析结果
function displayResults(results) {
    let html = '<h3>分析结果</h3>';
    if (results.suitable_titles.length === 0) {
        html += '<p>未找到适合的文章</p>';
    } else {
        // 添加底部内边距，防止被按钮栏遮挡
        html += '<div style="margin: 0; padding: 0 0 60px 0;">';
        results.suitable_titles.forEach((item, index) => {
            // 根据类型决定指示器颜色
            const isUnsuitable = item.type === '不适';
            const indicatorColor = isUnsuitable ? '#ff4444' : '#4CAF50';
            
            // 使用更暗的分割线颜色
            const borderBottom = index < results.suitable_titles.length - 1 ? 'border-bottom: 1px solid rgba(0, 0, 0, 0.08);' : '';
            
            html += `
                <div class="result-item" data-title="${item.title}" style="padding: 12px 0 12px 12px; position: relative; ${borderBottom}; cursor: pointer;">
                    <div style="position: absolute; left: 0; top: 12px; bottom: 12px; width: 2px; background-color: ${indicatorColor};"></div>
                    <div style="font-weight: bold; margin-bottom: 8px;">${item.title}</div>
                    <div style="margin-bottom: 8px;">${item.cn || '无翻译'}</div>
                    <div style="margin-bottom: 8px;">类型：${item.type}</div>
                    <div>原因：${item.reason}</div>
                </div>
            `;
        });
        html += '</div>';
    }
    resultsDiv.innerHTML = html;

    // 添加点击事件监听器
    document.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', async () => {
            const title = item.dataset.title;
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, {
                action: 'scrollToTitle',
                title: title
            });
        });

        // 添加悬停效果
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
        });
    });
} 
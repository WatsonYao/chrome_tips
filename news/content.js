// 存储原始标题元素的映射
let titleElementsMap = new Map();

// 监听来自sidepanel的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeNews') {
        const titles = collectNewsTitles();
        console.log('Collected titles:', titles); // 添加调试日志
        sendResponse({ titles });
        return true; // 确保异步响应正确处理
    } else if (request.action === 'highlightTitles') {
        highlightTitles(request.titles);
        return true;
    } else if (request.action === 'scrollToTitle') {
        scrollToTitle(request.title);
        return true;
    }
});

// 滚动到指定标题
function scrollToTitle(title) {
    const element = titleElementsMap.get(title);
    if (element) {
        // 临时添加闪烁效果
        const originalBackgroundColor = element.style.backgroundColor;
        element.style.backgroundColor = '#ffa50088';
        
        // 平滑滚动到元素位置
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });

        // 1秒后恢复原来的背景色
        setTimeout(() => {
            element.style.backgroundColor = originalBackgroundColor;
        }, 1000);
    }
}

// 收集页面上的新闻标题
function collectNewsTitles() {
    titleElementsMap.clear();
    
    // 新闻网站常用的标题选择器
    const selectors = [
        '.article-headline',
        '.article-title',
        '.article-heading',
        '.news-title',
        '.news-headline',
        '.headline',
        '.story-title',
        '.post-title',
        '.entry-title',
        'h1.title',
        'h2.title',
        'h3.title',
        // 特定网站的标题类
        '.content-title',
        '.article__title',
        '.article_title',
        '.articleTitle',
        '.story__title',
        // 通用标题标签（作为后备）
        'article h1',
        'article h2',
        '.main-content h1',
        '.main-content h2'
    ];

    const titles = [];
    console.log('开始搜索新闻标题...');
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`使用选择器 "${selector}" 找到 ${elements.length} 个元素`);
        
        elements.forEach(element => {
            const title = element.innerText.trim();
            if (title && title.length > 10) { // 过滤掉太短的标题
                titles.push(title);
                titleElementsMap.set(title, element);
                console.log(`找到标题: ${title}`);
            }
        });
    });

    const uniqueTitles = [...new Set(titles)]; // 去重
    console.log(`总共找到 ${uniqueTitles.length} 个唯一标题`);
    return uniqueTitles;
}

// 高亮匹配的标题
function highlightTitles(matchedTitles) {
    // 首先移除所有已有的高亮
    document.querySelectorAll('.news-analyzer-highlight').forEach(el => {
        el.classList.remove('news-analyzer-highlight');
    });

    // 添加高亮样式
    const style = document.createElement('style');
    style.textContent = `
        .news-analyzer-highlight {
            background-color: #ffa50033 !important;
            transition: background-color 0.3s ease;
        }
        .news-analyzer-highlight:hover {
            background-color: #ffa50066 !important;
        }
    `;
    document.head.appendChild(style);

    // 高亮匹配的标题
    matchedTitles.forEach(title => {
        const element = titleElementsMap.get(title);
        if (element) {
            element.classList.add('news-analyzer-highlight');
        }
    });
} 
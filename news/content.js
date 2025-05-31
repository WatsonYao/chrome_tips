// 存储原始标题元素和描述的映射
let titleElementsMap = new Map();
let titleDescriptionMap = new Map();

// 监听来自sidepanel的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeNews') {
        const newsData = collectNewsData();
        console.log('Collected news data:', newsData); // 添加调试日志
        sendResponse(newsData);
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

// 收集页面上的新闻标题和描述
function collectNewsData() {
    titleElementsMap.clear();
    titleDescriptionMap.clear();
    
    const newsItems = [];
    console.log('开始搜索新闻标题和描述...');

    // 1. 查找所有新闻容器
    const newsContainers = document.querySelectorAll('div[direction="column"]');
    console.log(`找到 ${newsContainers.length} 个新闻容器`);

    newsContainers.forEach(container => {
        // 2. 在每个容器中查找标题和描述
        const titleElement = container.querySelector('.article-headline, .article-title, h1, h2, h3, a[role="link"]');
        if (!titleElement) return;

        const title = titleElement.innerText.trim();
        if (!title || title.length < 10) return; // 过滤掉太短的标题

        // 3. 查找描述
        // 首先尝试查找紧跟标题的链接中的段落
        let description = '';
        let descElement = titleElement.closest('a')?.nextElementSibling?.querySelector('p');
        
        if (!descElement) {
            // 如果没找到，尝试查找容器中的第一个段落
            descElement = container.querySelector('p');
        }

        if (!descElement) {
            // 继续尝试其他常见的描述元素
            descElement = container.querySelector(
                '.article-description, .article-summary, .description, .summary, ' +
                '.article-excerpt, .news-description, .subtitle, .lead'
            );
        }

        if (descElement) {
            description = descElement.innerText.trim();
        }

        // 如果还是没找到描述，尝试查找标题元素后的第一个段落
        if (!description) {
            let nextElement = titleElement.nextElementSibling;
            while (nextElement && !description) {
                if (nextElement.tagName.toLowerCase() === 'p' || 
                    nextElement.querySelector('p')) {
                    description = (nextElement.tagName.toLowerCase() === 'p' ? 
                        nextElement : nextElement.querySelector('p')).innerText.trim();
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }
        }

        // 4. 查找发布时间
        let publishTime = '';
        // 查找时间标签
        const timeElement = container.querySelector('.css-n2r6lw, time, .time, .date, .publish-time, [data-testid="tag-and-flag"] span');
        if (timeElement) {
            publishTime = timeElement.innerText.trim();
        }

        // 限制描述长度
        if (description && description.length > 500) {
            description = description.substring(0, 497) + '...';
        }

        const newsItem = {
            title,
            description: description || '无描述',
            publishTime: publishTime || '无时间',
            url: titleElement.closest('a')?.href || ''
        };

        newsItems.push(newsItem);
        titleElementsMap.set(title, titleElement);
        titleDescriptionMap.set(title, description || '无描述');
        console.log(`找到新闻:`, newsItem);
    });

    // 如果没有找到新闻，尝试使用备用方法
    if (newsItems.length === 0) {
        // 查找可能的新闻标题
        const possibleTitles = document.querySelectorAll('h1, h2, h3, .headline, .title');
        possibleTitles.forEach(titleElement => {
            const title = titleElement.innerText.trim();
            if (title && title.length > 10) {
                let description = '';
                let publishTime = '';
                let nextElement = titleElement.nextElementSibling;
                
                // 查找紧跟标题的段落作为描述
                while (nextElement && !description) {
                    if (nextElement.tagName.toLowerCase() === 'p') {
                        description = nextElement.innerText.trim();
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }

                // 查找时间
                const timeElement = titleElement.closest('article, section, div')?.querySelector('time, .time, .date, .publish-time');
                if (timeElement) {
                    publishTime = timeElement.innerText.trim();
                }

                if (description && description.length > 500) {
                    description = description.substring(0, 497) + '...';
                }

                const newsItem = {
                    title,
                    description: description || '无描述',
                    publishTime: publishTime || '无时间',
                    url: titleElement.closest('a')?.href || ''
                };

                newsItems.push(newsItem);
                titleElementsMap.set(title, titleElement);
                titleDescriptionMap.set(title, description || '无描述');
                console.log(`找到备用新闻:`, newsItem);
            }
        });
    }
    
    console.log(`总共找到 ${newsItems.length} 个新闻条目`);
    return { newsItems };
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
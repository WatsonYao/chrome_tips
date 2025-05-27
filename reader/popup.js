document.addEventListener('DOMContentLoaded', function() {
  const pasteButton = document.getElementById('pasteButton');
  const readCurrentButton = document.getElementById('readCurrentButton');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const statusText = document.getElementById('statusText');
  
  function updateProgress(percent, message) {
    progressBar.style.width = `${percent}%`;
    statusText.textContent = message;
  }

  function showProgress() {
    progressContainer.style.display = 'block';
    readCurrentButton.disabled = true;
  }

  function hideProgress() {
    progressContainer.style.display = 'none';
    readCurrentButton.disabled = false;
  }
  
  pasteButton.addEventListener('click', async function() {
    try {
      // 读取剪贴板内容
      const text = await navigator.clipboard.readText();
      
      // 将内容保存到本地存储
      localStorage.setItem('readerContent', text);
      
      // 打开阅读页面
      chrome.tabs.create({url: 'reader.html'});
    } catch (err) {
      console.error('无法访问剪贴板:', err);
      alert('无法访问剪贴板，请确保已授予相应权限。');
    }
  });

  readCurrentButton.addEventListener('click', async function() {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 注入 turndown.min.js 到页面
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['turndown.min.js']
      });
      
      // 执行内容提取脚本
      const [{result}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 创建 Turndown 实例
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            emDelimiter: '*'
          });

          // 配置 Turndown 规则
          
          // 1. 移除脚本和不需要的元素
          turndownService.addRule('removeScripts', {
            filter: ['script', 'style', 'noscript', 'iframe', 'canvas'],
            replacement: () => ''
          });

          // 2. 移除图片和图片说明
          turndownService.addRule('removeImagesAndCaptions', {
            filter: ['img', 'figure', 'figcaption'],
            replacement: () => ''
          });

          // 3. 移除相关文章部分
          turndownService.addRule('removeRelatedContent', {
            filter: function (node) {
              // 检查元素及其父元素的类名、ID和文本内容
              const checkElement = (element) => {
                if (!element || !element.getAttribute) return false;
                
                const className = element.className || '';
                const id = element.id || '';
                const text = element.textContent || '';
                
                const relatedPatterns = [
                  /related/i,
                  /相关/,
                  /推荐/,
                  /更多文章/,
                  /more articles/i,
                  /recommended/i,
                  /suggestions/i,
                  /read next/i,
                  /read more/i
                ];

                // 检查类名、ID和文本是否包含相关内容的关键词
                return relatedPatterns.some(pattern => 
                  pattern.test(className) || 
                  pattern.test(id) || 
                  pattern.test(text)
                );
              };

              // 检查当前元素及其父元素
              let current = node;
              while (current && current !== document.body) {
                if (checkElement(current)) return true;
                current = current.parentElement;
              }
              return false;
            },
            replacement: () => ''
          });

          // 4. 移除图片说明文字
          turndownService.addRule('removeImageCaptions', {
            filter: function (node) {
              if (!node || !node.getAttribute) return false;
              
              const className = (node.className || '').toLowerCase();
              const id = (node.id || '').toLowerCase();
              
              // 检查常见的图片说明类名和ID
              const captionPatterns = [
                /caption/i,
                /图片说明/,
                /pic-desc/i,
                /image-desc/i,
                /img-desc/i,
                /photo-desc/i,
                /picture-desc/i,
                /wp-caption/i,
                /image-caption/i,
                /figure-caption/i
              ];

              // 检查元素的类名和ID
              if (captionPatterns.some(pattern => 
                pattern.test(className) || 
                pattern.test(id)
              )) {
                return true;
              }

              // 检查元素是否在figure标签内部的p或div标签
              if ((node.tagName === 'P' || node.tagName === 'DIV') && 
                  node.parentElement && 
                  node.parentElement.tagName === 'FIGURE') {
                return true;
              }

              return false;
            },
            replacement: () => ''
          });

          // 尝试找到文章主体
          const selectors = [
            'article',
            '[role="article"]',
            '[role="main"]',
            'main',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content',
            '#content'
          ];

          let contentElement = null;
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              contentElement = element;
              break;
            }
          }

          // 预处理函数：移除不需要的元素
          function preprocessContent(element) {
            const clone = element.cloneNode(true);
            
            // 移除不需要的元素
            const selectorsToRemove = [
              'script', 'style', 'iframe', 'nav', 'header', 'footer',
              '.ad', '.advertisement', '.social-share', '.related',
              '.recommended', '.suggestions', '[class*="related"]',
              '[class*="recommend"]', '[id*="related"]', '[id*="recommend"]',
              'aside', '.sidebar', '.widget', '.share', '.social',
              '.comment', '.comments', '#comments', '.meta', '.author-info',
              '.pagination', '.nav-links', '.post-navigation',
              // 添加图片说明相关的选择器
              'figcaption', '.caption', '.wp-caption-text',
              '[class*="caption"]', '[class*="img-desc"]',
              '[class*="pic-desc"]', '[class*="image-desc"]',
              '.figure-caption', '.image-caption', '.photo-caption'
            ];
            
            const elementsToRemove = clone.querySelectorAll(selectorsToRemove.join(','));
            elementsToRemove.forEach(el => el.remove());
            
            return clone;
          }

          // 如果找到了内容容器
          if (contentElement) {
            // 预处理内容
            const processedContent = preprocessContent(contentElement);
            
            // 获取标题
            const title = document.title;
            
            // 转换为 Markdown
            const markdown = `# ${title}\n\n${turndownService.turndown(processedContent)}`;
            console.log('提取的 Markdown 内容:', markdown); // 在页面控制台打印
            return markdown;
          } else {
            // 如果没有找到特定容器，获取 body 的主要内容
            const processedBody = preprocessContent(document.body);
            
            const title = document.title;
            const markdown = `# ${title}\n\n${turndownService.turndown(processedBody)}`;
            console.log('提取的 Markdown 内容:', markdown); // 在页面控制台打印
            return markdown;
          }
        }
      });
      
      // 在扩展的控制台打印结果
      console.log('提取的内容:', result);
      
      if (!result) {
        throw new Error('未能成功提取内容');
      }
      
      // 将内容保存到本地存储
      localStorage.setItem('readerContent', result);
      
      // 打开阅读页面
      chrome.tabs.create({url: 'reader.html'});
    } catch (err) {
      console.error('内容提取错误:', err);
      alert('提取页面内容时出错：' + err.message);
    }
  });
}); 
document.addEventListener('DOMContentLoaded', async function() {
  const contentElement = document.getElementById('content');
  const decreaseFontBtn = document.getElementById('decrease-font');
  const increaseFontBtn = document.getElementById('increase-font');
  const clipboardBtn = document.getElementById('clipboard-btn');
  const saveBtn = document.getElementById('save-btn');
  const saveMarkdownBtn = document.getElementById('save-markdown-btn');
  const saveImageBtn = document.getElementById('save-image-btn');
  const markdownToggleBtn = document.getElementById('markdown-toggle');
  const decreaseLineHeightBtn = document.getElementById('decrease-line-height');
  const increaseLineHeightBtn = document.getElementById('increase-line-height');
  const decreaseParagraphSpacingBtn = document.getElementById('decrease-paragraph-spacing');
  const increaseParagraphSpacingBtn = document.getElementById('increase-paragraph-spacing');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const settingsBtn = document.getElementById('settings-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  const sidebar = document.querySelector('.sidebar');
  const fontSizeValueEl = document.getElementById('font-size-value');
  const lineHeightValueEl = document.getElementById('line-height-value');
  const paragraphSpacingValueEl = document.getElementById('paragraph-spacing-value');
  const wordCountValueEl = document.getElementById('word-count-value');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;
  const formatDialog = document.getElementById('format-dialog');
  const saveTextBtn = document.getElementById('save-text-btn');
  
  // 默认设置
  let currentFontSize = 22;
  let currentLineHeight = 1.6;
  let currentParagraphSpacing = 15;
  
  // 侧边栏切换 - 通过侧边栏上的按钮
  sidebarToggleBtn.addEventListener('click', toggleSidebar);
  
  // 侧边栏切换 - 通过顶部设置按钮
  settingsBtn.addEventListener('click', toggleSidebar);
  
  // 侧边栏关闭 - 通过侧边栏上的关闭按钮
  sidebarCloseBtn.addEventListener('click', closeSidebar);
  
  // 侧边栏切换函数
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    // 更新设置按钮样式
    if (sidebar.classList.contains('open')) {
      settingsBtn.classList.add('active');
    } else {
      settingsBtn.classList.remove('active');
    }
    // 保存侧边栏状态
    localStorage.setItem('sidebarOpen', sidebar.classList.contains('open'));
  }
  
  // 侧边栏关闭函数
  function closeSidebar() {
    sidebar.classList.remove('open');
    settingsBtn.classList.remove('active');
    // 保存侧边栏状态
    localStorage.setItem('sidebarOpen', 'false');
  }
  
  // 当前内容
  let currentContent = '';
  
  // Markdown 模式（默认启用）
  let markdownMode = true;
  
  // 主题配色定义
  const themes = {
    light1: { bodyBg: '#F5F5F5', bodyColor: '#1A1A1A' },
    light2: { bodyBg: '#FFF8E1', bodyColor: '#3E2723' },
    light3: { bodyBg: '#E0F2F1', bodyColor: '#37474F' },
    dark1:  { bodyBg: '#1E1F22', bodyColor: '#BCBEC4' },
    dark2:  { bodyBg: '#212121', bodyColor: '#FFF9C4' },
    dark3:  { bodyBg: '#415062', bodyColor: '#fff6e6' }
  };
  let currentTheme = 'dark1';
  
  // 从本地存储加载设置
  function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('readerSettings') || '{}');
    
    // 加载主题设置，默认为夜间模式
    currentTheme = settings.theme || 'dark1';
    
    // 加载其他设置，使用默认值
    currentFontSize = settings.fontSize || 22;
    currentLineHeight = settings.lineHeight || 1.6;
    currentParagraphSpacing = settings.paragraphSpacing || 15;
    markdownMode = settings.markdownMode !== undefined ? settings.markdownMode : true;
    
    // 应用主题
    applyTheme(currentTheme);
    
    // 高亮当前主题按钮
    themeButtons.forEach(btn => {
      if (btn.dataset.theme === currentTheme) {
        btn.style.outline = '2px solid #4b8bf4';
      } else {
        btn.style.outline = 'none';
      }
    });
  }
  
  // 加载设置
  loadSettings();
  
  // 应用样式
  applyStyles();
  updateToggleButtonText();
  updateDisplayValues();
  
  // 设置 marked 选项
  marked.setOptions({
    breaks: true,        // 允许换行
    gfm: true,           // 启用 GitHub 风格的 Markdown
    mangle: false,       // 不转义标记
    headerIds: false,    // 不添加 header id
    smartLists: true,    // 优化列表输出
    smartypants: true    // 优化标点符号
  });
  
  // 加载主题设置 (不再需要，由loadSettings替代)
  function loadTheme() {
    const settings = JSON.parse(localStorage.getItem('readerSettings') || '{}');
    currentTheme = settings.theme || 'dark1';
    applyTheme(currentTheme);
  }
  
  // 应用主题
  function applyTheme(themeKey) {
    const t = themes[themeKey] || themes.dark1;
    body.style.backgroundColor = t.bodyBg;
    body.style.color = t.bodyColor;
    
    // 兼容 h1
    const h1 = document.querySelector('.reader-container h1');
    if (h1) h1.style.color = t.bodyColor;
    
    // 高亮当前按钮
    themeButtons.forEach(btn => {
      if (btn.dataset.theme === themeKey) {
        btn.style.outline = '2px solid #4b8bf4';
      } else {
        btn.style.outline = 'none';
      }
    });
  }
  
  // 主题按钮事件
  themeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const theme = btn.dataset.theme;
      currentTheme = theme;
      applyTheme(theme);
      saveSettings();
    });
  });
  
  // 更新显示的当前值
  function updateDisplayValues() {
    fontSizeValueEl.textContent = currentFontSize + 'px';
    lineHeightValueEl.textContent = currentLineHeight.toFixed(1);
    paragraphSpacingValueEl.textContent = currentParagraphSpacing + 'px';
  }
  
  // 计算文本字数
  function countWords(text) {
    // 移除HTML标签
    const cleanText = text.replace(/<[^>]*>/g, '');
    // 移除特殊字符和多余空格
    const trimmedText = cleanText.replace(/[\r\n\t]+/g, ' ').trim();
    // 如果是空文本，返回0
    if (!trimmedText) return 0;
    
    // 中文字数统计（直接计算字符数）
    return trimmedText.length;
  }
  
  // 更新字数显示
  function updateWordCount(text) {
    const count = countWords(text);
    wordCountValueEl.textContent = count + '字';
  }
  
  // 保存设置到本地存储
  function saveSettings() {
    const settings = {
      fontSize: currentFontSize,
      lineHeight: currentLineHeight,
      paragraphSpacing: currentParagraphSpacing,
      markdownMode: markdownMode,
      theme: currentTheme
    };
    localStorage.setItem('readerSettings', JSON.stringify(settings));
    updateDisplayValues();
  }
  
  // 应用段落间距
  function applyParagraphSpacing() {
    // 获取所有段落元素
    const paragraphs = contentElement.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.style.marginBottom = currentParagraphSpacing + 'px';
    });
  }
  
  // 应用样式设置
  function applyStyles() {
    contentElement.style.fontSize = currentFontSize + 'px';
    contentElement.style.lineHeight = currentLineHeight;
    applyParagraphSpacing();
  }
  
  // 获取文件名
  function getFileName(content) {
    // 获取内容的第一行作为标题
    let title = content.split('\n')[0].trim();
    
    // 如果标题超过20个字，截断它
    if (title.length > 50) {
      title = title.substring(0, 20) + '...';
    }
    
    // 获取当前时间戳
    const now = new Date();
    const timestamp = now.getFullYear() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2) +
      ('0' + now.getHours()).slice(-2) +
      ('0' + now.getMinutes()).slice(-2) +
      ('0' + now.getSeconds()).slice(-2);
    
    return `${title}_${timestamp}`;
  }
  
  // 渲染内容时根据模式选择渲染方式
  function renderContent(text) {
    currentContent = text;
    
    // 更新字数统计
    updateWordCount(text);
    
    // 获取模式
    const readMode = localStorage.getItem('readMode');
    
    // 如果存在readMode，则同步更新markdownMode
    if (readMode) {
      markdownMode = (readMode !== 'text');
      updateToggleButtonText();
    }
    
    // 根据markdownMode决定渲染方式
    if (markdownMode) {
      try {
        const processedText = text
          .replace(/\n{3,}/g, '\n\n')
          .replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
        
        contentElement.innerHTML = marked.parse(processedText);
      } catch (error) {
        console.error('Markdown 解析错误:', error);
        contentElement.textContent = text;
      }
    } else {
      // 纯文本模式 - 清空内容区域
      contentElement.textContent = '';
      
      // 先按段落分割文本
      const paragraphs = text.split(/\n{2,}/);
      
      paragraphs.forEach(paragraph => {
        if (!paragraph.trim()) return;
        
        // 创建段落容器
        const paragraphDiv = document.createElement('div');
        paragraphDiv.className = 'text-paragraph';
        paragraphDiv.style.marginBottom = (currentParagraphSpacing + 10) + 'px';
        
        // 按句子分割段落（中文句号、问号、感叹号，以及英文句号+空格）
        const sentences = paragraph.split(/([。！？\.\?!](\s|$))/);
        
        let currentSentence = '';
        
        // 重建句子并添加到段落
        for (let i = 0; i < sentences.length; i++) {
          if (!sentences[i]) continue;
          
          currentSentence += sentences[i];
          
          // 如果是句子结尾标点或者是最后一个部分
          if (i % 3 === 1 || i === sentences.length - 1) {
            if (currentSentence.trim()) {
              const sentenceP = document.createElement('p');
              sentenceP.textContent = currentSentence.trim();
              sentenceP.style.marginBottom = '1em'; // 每句话之间添加空间
              paragraphDiv.appendChild(sentenceP);
              currentSentence = '';
            }
          }
        }
        
        // 如果没有检测到句子结构，则作为一个整体显示
        if (paragraphDiv.childNodes.length === 0 && paragraph.trim()) {
          const p = document.createElement('p');
          p.textContent = paragraph.trim();
          p.style.marginBottom = '1em';
          paragraphDiv.appendChild(p);
        }
        
        contentElement.appendChild(paragraphDiv);
      });
    }
    
    // 应用段落间距 - 在纯文本模式下，我们已经在上面处理了段落间距
    if (markdownMode) {
      applyParagraphSpacing();
    }
  }
  
  // 更新切换按钮显示文本
  function updateToggleButtonText() {
    markdownToggleBtn.textContent = markdownMode ? "纯文本模式" : "Markdown 模式"; 
  }
  
  // 切换 Markdown/纯文本模式
  markdownToggleBtn.addEventListener('click', function() {
    markdownMode = !markdownMode;
    updateToggleButtonText();
    
    // 更新readMode值
    const newReadMode = markdownMode ? 'markdown' : 'text';
    localStorage.setItem('readMode', newReadMode);
    
    // 同时更新chrome.storage.local
    chrome.storage.local.set({ readMode: newReadMode }).catch(err => {
      console.error('更新存储时出错:', err);
    });
    
    // 重新渲染内容
    renderContent(currentContent);
    saveSettings();
  });
  
  // 获取本地存储中的内容
  try {
    // 首先尝试从 chrome.storage.local 获取内容
    const { readerContent, readMode } = await chrome.storage.local.get(['readerContent', 'readMode']);
    
    // 如果从 chrome.storage.local 获取到内容
    if (readerContent) {
      localStorage.setItem('readerContent', readerContent);
      localStorage.setItem('readMode', readMode || '');
      renderContent(readerContent);
    } else {
      // 如果没有从 chrome.storage.local 获取到内容，则尝试从 localStorage 获取
      const localContent = localStorage.getItem('readerContent');
      const localReadMode = localStorage.getItem('readMode');
      
      if (localContent) {
        renderContent(localContent);
      } else {
        contentElement.textContent = '没有找到内容。请返回并重新粘贴文本。';
      }
    }
  } catch (err) {
    console.error('读取存储内容时出错:', err);
    
    // 发生错误时尝试从 localStorage 获取
    try {
      const localContent = localStorage.getItem('readerContent');
      if (localContent) {
        renderContent(localContent);
      } else {
        contentElement.textContent = '读取内容时出错，请重试。';
      }
    } catch (localErr) {
      console.error('从 localStorage 读取内容时出错:', localErr);
      contentElement.textContent = '读取内容时出错，请重试。';
    }
  }
  
  // 增加字体大小
  increaseFontBtn.addEventListener('click', function() {
    if (currentFontSize < 40) {  // 最大字体也相应增大
      currentFontSize += 2;
      contentElement.style.fontSize = currentFontSize + 'px';
      saveSettings();
    }
  });
  
  // 减小字体大小
  decreaseFontBtn.addEventListener('click', function() {
    if (currentFontSize > 16) {  // 最小字体也相应增大
      currentFontSize -= 2;
      contentElement.style.fontSize = currentFontSize + 'px';
      saveSettings();
    }
  });
  
  // 增加行间距
  increaseLineHeightBtn.addEventListener('click', function() {
    if (currentLineHeight < 3.0) {
      currentLineHeight += 0.1;
      contentElement.style.lineHeight = currentLineHeight.toFixed(1);
      saveSettings();
    }
  });
  
  // 减小行间距
  decreaseLineHeightBtn.addEventListener('click', function() {
    if (currentLineHeight > 1.1) {
      currentLineHeight -= 0.1;
      contentElement.style.lineHeight = currentLineHeight.toFixed(1);
      saveSettings();
    }
  });
  
  // 增加段落间距
  increaseParagraphSpacingBtn.addEventListener('click', function() {
    if (currentParagraphSpacing < 50) {
      currentParagraphSpacing += 5;
      applyParagraphSpacing();
      saveSettings();
    }
  });
  
  // 减小段落间距
  decreaseParagraphSpacingBtn.addEventListener('click', function() {
    if (currentParagraphSpacing > 0) {
      currentParagraphSpacing -= 5;
      applyParagraphSpacing();
      saveSettings();
    }
  });
  
  // 点击内容区域时关闭侧边栏（可选功能，取消注释即可启用）
  // contentElement.addEventListener('click', function() {
  //   if (sidebar.classList.contains('open')) {
  //     sidebar.classList.remove('open');
  //     localStorage.setItem('sidebarOpen', 'false');
  //   }
  // });
  
  // 重新从剪贴板获取内容
  clipboardBtn.addEventListener('click', async function() {
    try {
      const text = await navigator.clipboard.readText();
      
      // 获取当前模式
      const readMode = markdownMode ? 'markdown' : 'text';
      
      // 更新本地存储
      localStorage.setItem('readerContent', text);
      localStorage.setItem('readMode', readMode);
      
      // 同时更新chrome.storage.local
      await chrome.storage.local.set({ 
        readerContent: text, 
        readMode: readMode 
      });
      
      // 渲染内容
      renderContent(text);
    } catch (err) {
      console.error('无法访问剪贴板:', err);
      alert('无法访问剪贴板，请确保已授予相应权限。');
    }
  });
  
  // 显示格式选择对话框
  saveBtn.addEventListener('click', function() {
    formatDialog.style.display = 'block';
  });

  // 点击对话框外部关闭对话框
  document.addEventListener('click', function(event) {
    if (!formatDialog.contains(event.target) && event.target !== saveBtn) {
      formatDialog.style.display = 'none';
    }
  });

  // 保存为 Markdown 文件
  saveMarkdownBtn.addEventListener('click', function() {
    formatDialog.style.display = 'none';
    const fileName = getFileName(currentContent);
    const blob = new Blob([currentContent], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // 保存为纯文本
  saveTextBtn.addEventListener('click', function() {
    formatDialog.style.display = 'none';
    const fileName = getFileName(currentContent);
    const blob = new Blob([currentContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // 保存为图片
  saveImageBtn.addEventListener('click', async function() {
    formatDialog.style.display = 'none';
    try {
      const container = document.querySelector('.reader-container');
      
      // 创建加载提示
      const loadingDiv = document.createElement('div');
      loadingDiv.style.position = 'fixed';
      loadingDiv.style.top = '50%';
      loadingDiv.style.left = '50%';
      loadingDiv.style.transform = 'translate(-50%, -50%)';
      loadingDiv.style.padding = '20px';
      loadingDiv.style.background = 'rgba(0, 0, 0, 0.8)';
      loadingDiv.style.color = 'white';
      loadingDiv.style.borderRadius = '10px';
      loadingDiv.style.zIndex = '9999';
      loadingDiv.textContent = '正在生成图片，请稍候...';
      document.body.appendChild(loadingDiv);

      // 使用html2canvas捕获页面内容
      const canvas = await html2canvas(container, {
        backgroundColor: body.style.backgroundColor,
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY
      });

      // 移除加载提示
      document.body.removeChild(loadingDiv);

      // 将canvas转换为图片并下载
      const link = document.createElement('a');
      const fileName = getFileName(currentContent);
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('保存图片时出错:', err);
      alert('保存图片时出错，请重试。');
    }
  });
  
  // 不再需要此行，因为loadSettings函数已经应用了主题
  // loadTheme(); 
}); 
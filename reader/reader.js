document.addEventListener('DOMContentLoaded', function() {
  const contentElement = document.getElementById('content');
  const decreaseFontBtn = document.getElementById('decrease-font');
  const increaseFontBtn = document.getElementById('increase-font');
  const clipboardBtn = document.getElementById('clipboard-btn');
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
  let currentTheme = 'dark1'; // 默认夜间深灰
  
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
    headerIds: false     // 不添加 header id
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
  
  // 应用样式设置
  function applyStyles() {
    contentElement.style.fontSize = currentFontSize + 'px';
    contentElement.style.lineHeight = currentLineHeight;
    applyParagraphSpacing();
  }
  
  // 渲染 Markdown 内容
  function renderMarkdown(text) {
    currentContent = text;
    
    // 更新字数统计
    updateWordCount(text);
    
    if (markdownMode) {
      try {
        contentElement.innerHTML = marked.parse(text);
      } catch (error) {
        // 如果 marked.parse 失败，尝试使用 marked 函数
        try {
          contentElement.innerHTML = marked(text);
        } catch (err) {
          console.error('Markdown 解析错误:', err);
          contentElement.textContent = text; // 回退到纯文本
        }
      }
    } else {
      contentElement.textContent = text; // 纯文本模式
    }
    
    // 应用段落间距
    applyParagraphSpacing();
  }
  
  // 应用段落间距
  function applyParagraphSpacing() {
    if (markdownMode) {
      // 如果是 Markdown 模式，为段落元素添加样式
      const paragraphs = contentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, table');
      paragraphs.forEach(p => {
        p.style.marginBottom = currentParagraphSpacing + 'px';
      });
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
    renderMarkdown(currentContent);
    saveSettings();
  });
  
  // 获取本地存储中的内容
  const savedContent = localStorage.getItem('readerContent');
  if (savedContent) {
    renderMarkdown(savedContent);
  } else {
    contentElement.textContent = '没有找到内容。请返回并重新粘贴文本。';
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
      renderMarkdown(text);
      localStorage.setItem('readerContent', text);
    } catch (err) {
      console.error('无法访问剪贴板:', err);
      alert('无法访问剪贴板，请确保已授予相应权限。');
    }
  });
  
  // 不再需要此行，因为loadSettings函数已经应用了主题
  // loadTheme(); 
}); 
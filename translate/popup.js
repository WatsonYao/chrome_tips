document.addEventListener('DOMContentLoaded', function() {
  console.log('init');
  
  const originalTextArea = document.getElementById('originalText');
  const translatedTextArea = document.getElementById('translatedText');
  const translateBtn = document.getElementById('translateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const saveBtn = document.getElementById('saveBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const historyBtn = document.getElementById('historyBtn');
  const themeBtn = document.getElementById('themeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const saveStatus = document.getElementById('saveStatus');
  
  let GEMINI_API_KEY = '';
  
  // 初始化时加载API key
  chrome.storage.local.get(['geminiApiKey'], function(result) {
    if (result.geminiApiKey) {
      GEMINI_API_KEY = result.geminiApiKey;
      apiKeyInput.value = GEMINI_API_KEY;
    }
  });
  
  // 设置按钮点击事件
  settingsBtn.addEventListener('click', function() {
    settingsModal.style.display = 'block';
    apiKeyInput.value = GEMINI_API_KEY;
  });
  
  // 保存设置按钮点击事件
  saveSettingsBtn.addEventListener('click', function() {
    const newApiKey = apiKeyInput.value.trim();
    if (newApiKey) {
      GEMINI_API_KEY = newApiKey;
      chrome.storage.local.set({ geminiApiKey: newApiKey }, function() {
        settingsModal.style.display = 'none';
        saveStatus.textContent = 'API Key已保存';
        saveStatus.style.display = 'block';
        setTimeout(() => {
          saveStatus.style.display = 'none';
        }, 3000);
      });
    } else {
      alert('请输入有效的API Key');
    }
  });
  
  // 取消设置按钮点击事件
  cancelSettingsBtn.addEventListener('click', function() {
    settingsModal.style.display = 'none';
    apiKeyInput.value = GEMINI_API_KEY;
  });
  
  // 点击模态框外部关闭模态框
  window.addEventListener('click', function(event) {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
      apiKeyInput.value = GEMINI_API_KEY;
    }
  });
  
  // 初始化主题
  chrome.storage.local.get(['theme'], function(result) {
    const currentTheme = result.theme || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeBtn.textContent = currentTheme === 'light' ? '日间' : '夜间';
  });
  
  // 主题切换按钮点击事件
  themeBtn.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeBtn.textContent = newTheme === 'light' ? '日间' : '夜间';
    chrome.storage.local.set({ theme: newTheme });
  });
  
  // 监听来自 background.js 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_TRANSLATION_REQUEST') {
      originalTextArea.value = message.text;
      translateText();
    }
  });
  
  // 检查是否有从右键菜单传入的选中文本
  chrome.storage.local.get(['selectedTextForTranslation'], function(result) {
    if (result.selectedTextForTranslation) {
      console.log('从右键菜单获取到选中文本:', result.selectedTextForTranslation);
      originalTextArea.value = result.selectedTextForTranslation;
      
      // 清除存储的选中文本，避免下次打开时仍然存在
      chrome.storage.local.remove(['selectedTextForTranslation']);
      
      // 自动触发翻译
      setTimeout(() => {
        translateText();
      }, 300);
    } else {
      // 没有选中文本时，尝试读取剪贴板
      tryReadClipboard();
    }
  });
  
  // 尝试读取剪贴板内容
  function tryReadClipboard() {
    navigator.clipboard.readText()
      .then(text => {
        if (text) {
          originalTextArea.value = text;
        }
      })
      .catch(err => {
        console.log('无法读取剪贴板内容: ', err);
      });
  }
  
  // 粘贴按钮点击事件
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('originalText').value = text;
    } catch (err) {
      console.error('无法访问剪贴板:', err);
    }
  });
  
  document.getElementById('pasteAndTranslateBtn').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('originalText').value = text;
      // 自动触发翻译
      translateText();
    } catch (err) {
      console.error('无法访问剪贴板:', err);
    }
  });
  
  // 历史按钮点击事件
  historyBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'history.html'});
  });
  
  // 读取剪贴板函数
  function readClipboard() {
    navigator.clipboard.readText()
      .then(text => {
        if (text) {
          originalTextArea.value = text;
        }
      })
      .catch(err => {
        console.error('无法读取剪贴板内容: ', err);
        originalTextArea.value = "无法读取剪贴板内容，请确保已授予剪贴板权限，并手动粘贴文本。";
      });
  }
  
  // 翻译按钮点击事件
  translateBtn.addEventListener('click', function() {
    translateText();
  });
  
  // 复制按钮点击事件
  copyBtn.addEventListener('click', function() {
    translatedTextArea.select();
    document.execCommand('copy');
  });
  
  // 清空按钮点击事件
  clearBtn.addEventListener('click', function() {
    originalTextArea.value = '';
    translatedTextArea.value = '';
  });
  
  // 保存按钮点击事件
  saveBtn.addEventListener('click', function() {
    saveToStorage(false);
  });
  
  // 保存到Chrome存储中
  function saveToStorage(shouldClose) {
    const originalText = originalTextArea.value.trim();
    const translatedText = translatedTextArea.value.trim();
    
    if (!originalText || !translatedText) {
      saveStatus.textContent = '请先完成翻译';
      saveStatus.style.display = 'block';
      setTimeout(() => {
        saveStatus.style.display = 'none';
      }, 3000);
      return;
    }
    
    const timestamp = new Date().toLocaleString();
    const newItem = {
      id: Date.now(),
      timestamp: timestamp,
      original: originalText,
      translated: translatedText
    };
    
    // 获取已存储的翻译历史记录
    chrome.storage.local.get(['translationHistory'], function(result) {
      let history = result.translationHistory || [];
      
      // 添加新记录到历史列表
      history.push(newItem);
      
      // 限制存储的记录数量，保留最新的100条
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      // 保存更新后的历史记录
      chrome.storage.local.set({translationHistory: history}, function() {
        if (chrome.runtime.lastError) {
          saveStatus.textContent = '保存失败: ' + chrome.runtime.lastError.message;
          saveStatus.style.display = 'block';
          setTimeout(() => {
            saveStatus.style.display = 'none';
          }, 3000);
        } else {
          saveStatus.textContent = '已成功保存到翻译历史';
          saveStatus.style.display = 'block';
          setTimeout(() => {
            saveStatus.style.display = 'none';
          }, 3000);
        }
      });
    });
  }
  
  // 翻译函数
  function translateText() {
    const text = originalTextArea.value.trim();
    
    if (!text) {
      return;
    }
    
    if (!GEMINI_API_KEY) {
      alert('请先在设置中配置Gemini API Key');
      settingsModal.style.display = 'block';
      return;
    }

    console.log(text);
    
    loadingIndicator.style.display = 'block';
    translatedTextArea.value = '';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{
        parts: [{
          text: `指令：

识别输入语言： 我将提供一段文本。请首先确定这段文本是英语还是汉语。
执行翻译：
如果输入是英语，请将其翻译成流畅、自然的汉语。
如果输入是汉语，请将其翻译成地道、符合语境的英语。
输出格式：
直接输出翻译结果，无需额外说明或解释。
请尽量保持原文的格式（例如，分段、列表等），除非翻译需要调整。
对于专业术语或特定语境，请尽量使用恰当的译法。
准确性和自然度： 请确保翻译在意义上忠实于原文，同时在目标语言中听起来自然、地道，符合语法和表达习惯。避免生硬的直译。
示例（供你参考，实际使用时无需包含）：

输入 (英文): "The quick brown fox jumps over the lazy dog."

预期输出 (中文): 敏捷的棕色狐狸跳过了懒狗。

输入 (中文): "长风破浪会有时，直挂云帆济沧海。"

预期输出 (英文): "There will be times when I will ride the wind and cleave the waves and set my cloud-like sail to cross the vast sea." (或者其他合适的译法)

现在，请翻译以下文本：${text}`
        }]
      }]
    };
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
      loadingIndicator.style.display = 'none';
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && data.candidates[0].content.parts && 
          data.candidates[0].content.parts.length > 0) {
        
        const translation = data.candidates[0].content.parts[0].text;
        translatedTextArea.value = translation;
      } else {
        translatedTextArea.value = '翻译失败，请检查API服务是否正常' + data;
      }
    })
    .catch(error => {
      loadingIndicator.style.display = 'none';
      translatedTextArea.value = '翻译出错: ' + error.message;
    });
  }
}); 
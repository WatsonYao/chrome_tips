document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const wordInput = document.getElementById('wordInput');
  const translateBtn = document.getElementById('translateBtn');
  const translationResult = document.getElementById('translationResult');
  const saveBtn = document.getElementById('saveBtn');
  const wordsList = document.getElementById('wordsList');
  const wordCount = document.getElementById('wordCount');
  const settingsBtn = document.getElementById('settingsBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const closeBtn = document.getElementById('closeBtn');
  const settingsModal = document.getElementById('settingsModal');
  const confirmModal = document.getElementById('confirmModal');
  const exportModal = document.getElementById('exportModal');
  const closeModal = document.querySelector('.close');
  const closeConfirmModal = document.querySelector('.close-confirm');
  const closeExportModal = document.querySelector('.close-export');
  const cancelClearBtn = document.getElementById('cancelClear');
  const confirmClearBtn = document.getElementById('confirmClear');
  const exportJsonBtn = document.getElementById('exportJson');
  const exportTxtBtn = document.getElementById('exportTxt');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  
  // Establish a connection with the background script to track panel state
  const port = chrome.runtime.connect({ name: "sidepanel" });
  
  // Notify background script that sidepanel is ready
  chrome.runtime.sendMessage({ action: "sidepanelReady" }, function(response) {
    // If panel was already open and has new text selected, it will be handled by the message listener
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "newTextSelected" && message.text) {
      wordInput.value = message.text.trim();
      // Automatically trigger translation
      translateWord();
    }
    return true;
  });
  
  // Get the selected text from background script
  chrome.runtime.sendMessage({ action: "getSelectedText" }, function(response) {
    if (response && response.text) {
      wordInput.value = response.text.trim();
      
      // Check if we should auto-translate
      chrome.storage.local.get(['shouldTranslate'], function(result) {
        if (result.shouldTranslate) {
          // Clear the flag
          chrome.storage.local.remove(['shouldTranslate']);
          // Trigger translation
          translateWord();
        }
      });
    }
  });
  
  // Alternatively, get it from storage
  chrome.storage.local.get(['selectedText'], function(result) {
    if (result.selectedText) {
      wordInput.value = result.selectedText.trim();
      // Clear after retrieving
      chrome.storage.local.remove(['selectedText']);
      
      // Check if we should auto-translate
      chrome.storage.local.get(['shouldTranslate'], function(result) {
        if (result.shouldTranslate) {
          // Clear the flag
          chrome.storage.local.remove(['shouldTranslate']);
          // Trigger translation
          translateWord();
        }
      });
    }
  });
  
  // Load saved API key
  chrome.storage.local.get(['geminiApiKey'], function(result) {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });
  
  // Load saved theme preference
  chrome.storage.local.get(['darkTheme'], function(result) {
    if (result.darkTheme) {
      document.body.classList.add('dark-theme');
    }
  });
  
  // Load saved words
  loadSavedWords();
  
  // Event Listeners
  translateBtn.addEventListener('click', translateWord);
  saveBtn.addEventListener('click', saveWord);
  settingsBtn.addEventListener('click', openSettings);
  exportBtn.addEventListener('click', openExportOptions);
  clearBtn.addEventListener('click', openClearConfirmation);
  closeBtn.addEventListener('click', closeSidePanel);
  closeModal.addEventListener('click', closeSettings);
  closeConfirmModal.addEventListener('click', closeClearConfirmation);
  closeExportModal.addEventListener('click', closeExportOptions);
  cancelClearBtn.addEventListener('click', closeClearConfirmation);
  confirmClearBtn.addEventListener('click', clearAllWords);
  exportJsonBtn.addEventListener('click', () => exportWords('json'));
  exportTxtBtn.addEventListener('click', () => exportWords('txt'));
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Close modals when clicking outside of them
  window.addEventListener('click', function(event) {
    if (event.target === settingsModal) {
      settingsModal.style.display = "none";
    }
    if (event.target === confirmModal) {
      confirmModal.style.display = "none";
    }
    if (event.target === exportModal) {
      exportModal.style.display = "none";
    }
  });
  
  // Functions
  function toggleTheme() {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
    
    // Save theme preference
    chrome.storage.local.set({ darkTheme: isDarkTheme });
  }
  
  function openClearConfirmation() {
    confirmModal.style.display = "block";
  }
  
  function closeClearConfirmation() {
    confirmModal.style.display = "none";
  }
  
  function clearAllWords() {
    chrome.storage.local.set({ savedWords: [] }, function() {
      loadSavedWords();
      closeClearConfirmation();
    });
  }
  
  // Update word count display
  function updateWordCount(count) {
    wordCount.textContent = count;
  }
  
  async function translateWord() {
    const word = wordInput.value.trim();
    if (!word) {
      alert('请输入要翻译的单词');
      return;
    }
    
    // Get API key
    const apiKeyResult = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = apiKeyResult.geminiApiKey;
    
    if (!apiKey) {
      alert('请先在设置中设置 Gemini API Key');
      openSettings();
      return;
    }
    
    translationResult.value = "翻译中...";
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate this English word or phrase to Chinese: "${word}". Only return the Chinese translation, no explanation.`
            }]
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
        translationResult.value = data.candidates[0].content.parts[0].text.trim();
      } else {
        translationResult.value = "翻译失败，请稍后再试";
        console.error("Translation API error:", data);
      }
    } catch (error) {
      translationResult.value = "翻译出错，请检查网络连接和API KEY";
      console.error("Translation error:", error);
    }
  }
  
  function saveWord() {
    const english = wordInput.value.trim();
    const chinese = translationResult.value.trim();
    
    if (!english || !chinese) {
      alert('请先输入英文并翻译');
      return;
    }
    
    chrome.storage.local.get(['savedWords'], function(result) {
      const savedWords = result.savedWords || [];
      
      // Check if word already exists
      const exists = savedWords.some(word => word.en === english);
      if (exists) {
        alert('该单词已存在');
        return;
      }
      
      // Add new word to the beginning of the array (instead of pushing to the end)
      savedWords.unshift({ en: english, cn: chinese });
      
      chrome.storage.local.set({ savedWords: savedWords }, function() {
        wordInput.value = '';
        translationResult.value = '';
        loadSavedWords();
      });
    });
  }
  
  function loadSavedWords() {
    chrome.storage.local.get(['savedWords'], function(result) {
      const savedWords = result.savedWords || [];
      
      // Update word count
      updateWordCount(savedWords.length);
      
      wordsList.innerHTML = '';
      
      if (savedWords.length === 0) {
        wordsList.innerHTML = '<div class="empty-message">暂无保存的单词</div>';
        return;
      }
      
      savedWords.forEach((word, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        
        const wordText = document.createElement('div');
        wordText.className = 'word-text';
        
        const englishText = document.createElement('div');
        englishText.className = 'english';
        englishText.textContent = word.en;
        
        const chineseText = document.createElement('div');
        chineseText.className = 'chinese';
        chineseText.textContent = word.cn;
        
        wordText.appendChild(englishText);
        wordText.appendChild(chineseText);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', function() {
          deleteWord(index);
        });
        
        wordItem.appendChild(wordText);
        wordItem.appendChild(deleteBtn);
        wordsList.appendChild(wordItem);
      });
    });
  }
  
  function deleteWord(index) {
    chrome.storage.local.get(['savedWords'], function(result) {
      const savedWords = result.savedWords || [];
      savedWords.splice(index, 1);
      chrome.storage.local.set({ savedWords: savedWords }, function() {
        loadSavedWords();
      });
    });
  }
  
  function openSettings() {
    settingsModal.style.display = "block";
  }
  
  function closeSettings() {
    settingsModal.style.display = "none";
  }
  
  function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      alert('请输入有效的API Key');
      return;
    }
    
    chrome.storage.local.set({ geminiApiKey: apiKey }, function() {
      alert('API Key 已保存');
      closeSettings();
    });
  }
  
  function openExportOptions() {
    exportModal.style.display = "block";
  }
  
  function closeExportOptions() {
    exportModal.style.display = "none";
  }
  
  function closeSidePanel() {
    // First, apply the closing animation for visual feedback
    document.body.classList.add('closing');
    
    // Message the background script to help close the panel
    chrome.runtime.sendMessage({ action: "closeSidePanel" });
    
    // Use the chrome extension API's dedicated method if available
    if (chrome.sidePanel && chrome.sidePanel.close) {
      try {
        chrome.sidePanel.close();
      } catch (e) {
        console.log("sidePanel.close failed:", e);
      }
    }
    
    // Final fallback: just hide the UI if nothing else works
    // After animation completes (300ms) + some buffer
    setTimeout(() => {
      if (document.body.classList.contains('closing')) {
        document.body.style.display = 'none';
      }
    }, 500);
  }
  
  function exportWords(format) {
    chrome.storage.local.get(['savedWords'], function(result) {
      const savedWords = result.savedWords || [];
      
      if (savedWords.length === 0) {
        alert('暂无保存的单词');
        return;
      }
      
      // Create timestamp for filename (YYYYMMDD_HHMMSS format)
      const now = new Date();
      const timestamp = now.getFullYear() +
                       String(now.getMonth() + 1).padStart(2, '0') +
                       String(now.getDate()).padStart(2, '0') + '_' +
                       String(now.getHours()).padStart(2, '0') +
                       String(now.getMinutes()).padStart(2, '0') +
                       String(now.getSeconds()).padStart(2, '0');
      
      let content;
      let mimeType;
      let fileName;
      
      if (format === 'json') {
        content = JSON.stringify(savedWords, null, 2);
        mimeType = 'application/json';
        fileName = `saved_words_${timestamp}.json`;
      } else {
        // TXT format: English, Chinese translation, blank line, repeat
        content = savedWords.map(word => `${word.en}\n${word.cn}\n`).join('\n');
        mimeType = 'text/plain';
        fileName = `saved_words_${timestamp}.txt`;
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      
      URL.revokeObjectURL(url);
      closeExportOptions();
    });
  }
}); 
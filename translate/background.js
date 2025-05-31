// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'geminiTranslate',
    title: 'Gemini 翻译',
    contexts: ['selection']  // 只在选中文本时显示
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'geminiTranslate') {
    const selectedText = info.selectionText;
    translateText(selectedText, tab.windowId);
  }
});

// 点击扩展图标时打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 翻译文本的通用函数
function translateText(text, windowId) {
  if (!text || text.trim() === '') {
    console.error('没有选中文本或文本为空');
    return;
  }
  
  // 将选中的文本保存到本地存储
  chrome.storage.local.set({ 'selectedTextForTranslation': text }, () => {
    console.log('选中的文本已保存:', text);
    
    // 打开扩展的侧边栏，并指定 windowId
    chrome.sidePanel.open({ windowId: windowId }).then(() => {
      // 发送消息通知侧边栏需要翻译新文本
      chrome.runtime.sendMessage({
        type: 'NEW_TRANSLATION_REQUEST',
        text: text
      });
    });
  });
} 
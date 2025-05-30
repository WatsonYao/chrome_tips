// Add listener to open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on a Bilibili page
  if (tab.url && tab.url.includes('bilibili.com')) {
    // Open the side panel
    chrome.sidePanel.open({ tabId: tab.id });
  } else {
    // Show notification if not on a Bilibili page
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: 'B站字幕下载器',
      message: '请在B站视频页面使用此扩展'
    });
  }
}); 
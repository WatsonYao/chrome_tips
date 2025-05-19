document.addEventListener('DOMContentLoaded', function() {
  const pasteButton = document.getElementById('pasteButton');
  
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
}); 
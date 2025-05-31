document.addEventListener('DOMContentLoaded', function() {
  console.log('history.html 页面加载完成');
  
  const historyContainer = document.getElementById('historyContainer');
  const clearBtn = document.getElementById('clearBtn');
  
  console.log('获取DOM元素成功');
  
  // 加载翻译历史
  function loadHistory() {
    console.log('开始加载历史记录...');
    
    chrome.storage.local.get(['translationHistory'], function(result) {
      console.log('从chrome.storage.local获取数据完成');
      
      const history = result.translationHistory || [];
      console.log('获取到的历史记录数量:', history.length);
      
      if (history.length === 0) {
        console.log('历史记录为空，显示空消息');
        historyContainer.innerHTML = '<div class="empty-message">暂无翻译历史记录</div>';
        return;
      }
      
      // 从最新到最旧排序
      console.log('开始对历史记录进行排序');
      const sortedHistory = [...history].reverse();
      console.log('排序完成，开始生成HTML');
      
      let html = '';
      sortedHistory.forEach((item, index) => {
        console.log(`处理第 ${index+1}/${sortedHistory.length} 条记录, ID: ${item.id}`);
        html += `
          <div class="history-item" data-id="${item.id}">
            <div class="item-header">
              <div class="timestamp">${item.timestamp}</div>
              <button class="delete-btn" data-id="${item.id}" title="删除此记录">×</button>
            </div>
            <div class="content">
              <div class="original">${escapeHtml(item.original)}</div>
              <div class="translated">${escapeHtml(item.translated)}</div>
            </div>
          </div>
        `;
      });
      
      console.log('HTML生成完成，准备渲染到页面');
      historyContainer.innerHTML = html;
      console.log('历史记录渲染完成');
      
      // 为所有删除按钮添加事件监听
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          const itemId = Number(this.getAttribute('data-id'));
          deleteHistoryItem(itemId);
          e.stopPropagation(); // 阻止事件冒泡
        });
      });
    });
  }
  
  // 删除单条历史记录
  function deleteHistoryItem(itemId) {
    console.log(`准备删除历史记录，ID: ${itemId}`);
    
    chrome.storage.local.get(['translationHistory'], function(result) {
      let history = result.translationHistory || [];
      
      // 过滤掉要删除的记录
      const newHistory = history.filter(item => item.id !== itemId);
      
      if (history.length === newHistory.length) {
        console.log('未找到指定ID的记录');
        return;
      }
      
      console.log(`删除历史记录，原数量: ${history.length}, 新数量: ${newHistory.length}`);
      
      // 保存更新后的历史记录
      chrome.storage.local.set({translationHistory: newHistory}, function() {
        console.log('历史记录已更新');
        
        // 重新加载历史记录
        loadHistory();
      });
    });
  }
  
  // 转义HTML特殊字符
  function escapeHtml(text) {
    console.log('转义HTML字符，文本长度:', text.length);
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
  
  // 清空历史记录
  clearBtn.addEventListener('click', function() {
    console.log('清空按钮被点击');
    
    if (confirm('确定要清空所有翻译历史记录吗？')) {
      console.log('用户确认清空历史记录');
      
      chrome.storage.local.remove(['translationHistory'], function() {
        console.log('历史记录已从存储中删除');
        loadHistory();
      });
    } else {
      console.log('用户取消清空操作');
    }
  });
  
  // 初始加载历史记录
  console.log('开始初始化加载历史记录');
  loadHistory();
}); 
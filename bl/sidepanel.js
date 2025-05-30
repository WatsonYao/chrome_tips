document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadBtn');
  const batchDownloadBtn = document.getElementById('batchDownloadBtn');
  const statusDiv = document.getElementById('status');
  const totalCountElement = document.getElementById('totalCount');
  const successCountElement = document.getElementById('successCount');
  const errorCountElement = document.getElementById('errorCount');

  // 统计数据
  let stats = {
    total: 0,
    success: 0,
    error: 0
  };

  // 更新统计显示
  function updateStats() {
    totalCountElement.textContent = stats.total;
    successCountElement.textContent = stats.success;
    errorCountElement.textContent = stats.error;
  }

  // 重置统计数据
  function resetStats() {
    stats = {
      total: 0,
      success: 0,
      error: 0
    };
    updateStats();
  }

  function updateStatus(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    // Create a new paragraph for each message
    const messageElement = document.createElement('p');
    messageElement.textContent = formattedMessage;
    messageElement.style.margin = '8px 0';
    messageElement.style.color = isError ? '#e74c3c' : '#2ecc71';
    
    // Add the new message at the top
    statusDiv.insertBefore(messageElement, statusDiv.firstChild);
    
    // Limit the number of messages shown to prevent the panel from becoming too cluttered
    while (statusDiv.children.length > 10) {
      statusDiv.removeChild(statusDiv.lastChild);
    }
  }

  // Function to download subtitles for a single video
  async function downloadSubtitle(bvid, cookies) {
    try {
      // 1. 请求第一个API获取aid和cid
      const viewApiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const viewResponse = await fetch(viewApiUrl, {
        headers: {
          'Cookie': cookies
        }
      });
      if (!viewResponse.ok) {
        throw new Error(`API请求失败: ${viewResponse.status} ${viewResponse.statusText} (view API)`);
      }
      const viewData = await viewResponse.json();
      
      if (viewData.code !== 0 || !viewData.data || !viewData.data.aid || !viewData.data.cid || !viewData.data.title) {
        throw new Error(`获取aid/cid/title失败: ${viewData.message || '响应数据格式不正确'}`);
      }
      const aid = viewData.data.aid;
      const cid = viewData.data.cid;
      const videoTitle = viewData.data.title;
      updateStatus(`获取 ${bvid} (${videoTitle.substring(0,20)}...) 的信息成功`);

      // 2. 请求第二个API获取字幕元数据
      const playerApiUrl = `https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`;
      const playerResponse = await fetch(playerApiUrl, {
        headers: {
          'Cookie': cookies
        }
      });
      if (!playerResponse.ok) {
        throw new Error(`API请求失败: ${playerResponse.status} ${playerResponse.statusText} (player API)`);
      }
      const playerData = await playerResponse.json();

      if (playerData.code !== 0 || !playerData.data || !playerData.data.subtitle || !playerData.data.subtitle.subtitles) {
        throw new Error(`获取字幕元数据失败: ${playerData.message || '响应数据格式不正确或无字幕信息'}`);
      }
      
      const subtitlesArray = playerData.data.subtitle.subtitles;
      if (!subtitlesArray || subtitlesArray.length === 0) {
        throw new Error('未找到可用字幕条目');
      }
      
      // 默认选择第一个字幕
      let subtitleJsonFileUrl = subtitlesArray[0].subtitle_url;
      if (!subtitleJsonFileUrl) {
        throw new Error('字幕条目中未找到字幕JSON文件的URL');
      }
      subtitleJsonFileUrl = subtitleJsonFileUrl.startsWith('//') ? 'https:' + subtitleJsonFileUrl : subtitleJsonFileUrl;

      // 3. 下载并解析字幕内容
      const subtitleJsonResponse = await fetch(subtitleJsonFileUrl);
      if (!subtitleJsonResponse.ok) {
        throw new Error(`获取字幕JSON文件失败: ${subtitleJsonResponse.status} ${subtitleJsonResponse.statusText}`);
      }
      const subtitleJsonData = await subtitleJsonResponse.json();

      if (!subtitleJsonData || !subtitleJsonData.body || !Array.isArray(subtitleJsonData.body)) {
        throw new Error('字幕JSON内容格式不正确');
      }

      // 4. 转换为TXT格式
      let txtContent = "";
      subtitleJsonData.body.forEach(item => {
        if (typeof item.from === 'number' && typeof item.content === 'string') {
          const timestamp = item.from.toFixed(3);
          txtContent += `[${timestamp}] ${item.content}\n`;
        }
      });

      if (txtContent.trim() === "") {
        throw new Error('未能从字幕数据中提取有效内容，或字幕为空');
      }
      
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const txtFileUrl = URL.createObjectURL(blob);
      
      // 清理文件名中的非法字符
      function sanitizeFilename(name) {
        return name.replace(/[<>:"\/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[.]+|[.]+$/g, '') || 'untitled';
      }
      const sanitizedVideoTitle = sanitizeFilename(videoTitle);
      const filename = `${bvid}+${sanitizedVideoTitle}.txt`;

      // 5. 下载文件
      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: txtFileUrl,
          filename: filename
        }, (downloadId) => {
          URL.revokeObjectURL(txtFileUrl);
          if (chrome.runtime.lastError) {
            reject(new Error(`下载失败: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(filename);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // 单个视频下载按钮事件处理
  downloadBtn.addEventListener('click', async () => {
    statusDiv.innerHTML = '';
    resetStats();
    updateStatus('正在处理...');
    
    try {
      // 1. 获取当前tab的URL
      const tabs = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (tabs && tabs.length > 0) {
            resolve(tabs);
          } else {
            reject(new Error('无法获取当前标签页。'));
          }
        });
      });
      
      const currentTab = tabs[0];
      const url = currentTab.url;
      updateStatus('获取URL成功: ' + url.substring(0, 50) + '...');

      // 2. 取出URL中video后面的第一个参数 (bvid)
      const bvidMatch = url.match(/video\/(BV[a-zA-Z0-9]+)/i);
      if (!bvidMatch || !bvidMatch[1]) {
        updateStatus('无法从URL中提取bvid。请确保您在B站视频页面。', true);
        return;
      }
      const bvid = bvidMatch[1];
      updateStatus('提取bvid成功: ' + bvid);

      // 3. 取出b站的cookie
      const cookies = await new Promise((resolve, reject) => {
        chrome.cookies.getAll({ domain: 'bilibili.com' }, (cookies) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(cookies);
        });
      });

      if (!cookies || cookies.length === 0) {
        updateStatus('无法获取B站Cookie。', true);
        return;
      }
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      updateStatus('获取Cookie成功.');

      // 4. 下载字幕
      stats.total = 1;
      updateStats();
      const filename = await downloadSubtitle(bvid, cookieString);
      stats.success = 1;
      updateStats();
      updateStatus(`字幕文件 ${filename} 下载成功!`);

    } catch (error) {
      console.error('错误:', error);
      stats.error = 1;
      updateStats();
      updateStatus(`发生错误: ${error.message}`, true);
    }
  });

  // 批量下载按钮事件处理
  batchDownloadBtn.addEventListener('click', async () => {
    statusDiv.innerHTML = '';
    resetStats();
    updateStatus('正在处理批量下载...');
    
    try {
      // 1. 获取当前tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 2. 获取cookie
      const cookies = await new Promise((resolve, reject) => {
        chrome.cookies.getAll({ domain: 'bilibili.com' }, (cookies) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(cookies);
        });
      });

      if (!cookies || cookies.length === 0) {
        throw new Error('无法获取B站Cookie');
      }
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      // 3. 注入脚本获取视频列表
      const videoList = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const container = document.querySelector('.action-list-container');
          if (!container) {
            return [];
          }
          
          const items = container.querySelectorAll('.action-list-item-wrap');
          return Array.from(items).map(item => ({
            bvid: item.getAttribute('data-key'),
            title: item.querySelector('.title')?.textContent || ''
          })).filter(item => item.bvid);
        }
      });

      if (!videoList || !videoList[0] || !videoList[0].result || videoList[0].result.length === 0) {
        throw new Error('未找到可下载的视频列表');
      }

      const videos = videoList[0].result;
      stats.total = videos.length;
      updateStats();
      updateStatus(`找到 ${videos.length} 个视频，开始下载字幕...`);

      // 4. 批量下载字幕
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        try {
          await downloadSubtitle(video.bvid, cookieString);
          stats.success++;
          updateStats();
          updateStatus(`(${i + 1}/${videos.length}) ${video.bvid} 下载成功`);
          
          // 每下载10个暂停1秒
          if ((i + 1) % 10 === 0 && i < videos.length - 1) {
            updateStatus('暂停1秒...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          stats.error++;
          updateStats();
          updateStatus(`(${i + 1}/${videos.length}) ${video.bvid} 下载失败: ${error.message}`, true);
        }
      }

      updateStatus('批量下载完成!');
    } catch (error) {
      console.error('错误:', error);
      updateStatus(`批量下载失败: ${error.message}`, true);
    }
  });
}); 
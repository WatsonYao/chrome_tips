document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadBtn');
  const statusDiv = document.getElementById('status');

  function updateStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';
  }

  downloadBtn.addEventListener('click', async () => {
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
      updateStatus('1. 获取URL成功: ' + url.substring(0, 50) + '...');

      // 2. 取出URL中video后面的第一个参数 (bvid)
      const bvidMatch = url.match(/video\/(BV[a-zA-Z0-9]+)/i);
      if (!bvidMatch || !bvidMatch[1]) {
        updateStatus('2. 无法从URL中提取bvid。请确保您在B站视频页面。', true);
        return;
      }
      const bvid = bvidMatch[1];
      updateStatus('2. 提取bvid成功: ' + bvid);

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
        updateStatus('3. 无法获取B站Cookie。', true);
        return;
      }
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      updateStatus('3. 获取Cookie成功.');

      // 4. 请求第一个API获取aid和cid
      updateStatus('4. 正在请求视频信息...');
      const viewApiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const viewResponse = await fetch(viewApiUrl, {
        headers: {
          'Cookie': cookieString
        }
      });
      if (!viewResponse.ok) {
        throw new Error(`API请求失败: ${viewResponse.status} ${viewResponse.statusText} (view API)`);
      }
      const viewData = await viewResponse.json();
      
      if (viewData.code !== 0 || !viewData.data || !viewData.data.aid || !viewData.data.cid || !viewData.data.title) {
        updateStatus(`4. 获取aid/cid/title失败: ${viewData.message || '响应数据格式不正确'}`, true);
        return;
      }
      const aid = viewData.data.aid;
      const cid = viewData.data.cid;
      const videoTitle = viewData.data.title;
      updateStatus(`4. 获取aid: ${aid}, cid: ${cid}, 标题: ${videoTitle.substring(0,20)}... 成功.`);

      // 5. 请求第二个API获取字幕元数据，然后获取并解析字幕JSON内容
      updateStatus('5. 正在请求字幕元数据...');
      const playerApiUrl = `https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`;
      const playerResponse = await fetch(playerApiUrl, {
        headers: {
          'Cookie': cookieString
        }
      });
      if (!playerResponse.ok) {
        throw new Error(`API请求失败: ${playerResponse.status} ${playerResponse.statusText} (player API)`);
      }
      const playerData = await playerResponse.json();

      if (playerData.code !== 0 || !playerData.data || !playerData.data.subtitle || !playerData.data.subtitle.subtitles) {
        updateStatus(`5a. 获取字幕元数据失败: ${playerData.message || '响应数据格式不正确或无字幕信息'}`, true);
        return;
      }
      
      const subtitlesArray = playerData.data.subtitle.subtitles;
      if (!subtitlesArray || subtitlesArray.length === 0) {
        updateStatus('5b. 未找到可用字幕条目。', true);
        return;
      }
      
      // 默认选择第一个字幕，通常是中文
      let subtitleJsonFileUrl = subtitlesArray[0].subtitle_url;
      if (!subtitleJsonFileUrl) {
          updateStatus('5c. 字幕条目中未找到字幕JSON文件的URL。', true);
          return;
      }
      // B站字幕URL可能不带协议头，需要补上
      subtitleJsonFileUrl = subtitleJsonFileUrl.startsWith('//') ? 'https:' + subtitleJsonFileUrl : subtitleJsonFileUrl;
      updateStatus('5d. 获取字幕JSON文件URL成功: ' + subtitleJsonFileUrl.substring(0,70) + '...');

      updateStatus('5e. 正在下载并解析字幕内容 (JSON)...');
      const subtitleJsonResponse = await fetch(subtitleJsonFileUrl);
      if (!subtitleJsonResponse.ok) {
        throw new Error(`获取字幕JSON文件失败: ${subtitleJsonResponse.status} ${subtitleJsonResponse.statusText} (URL: ${subtitleJsonFileUrl})`);
      }
      const subtitleJsonData = await subtitleJsonResponse.json(); // Expected structure like s3.json

      // 6. 转换字幕格式并下载为 .txt 文件
      updateStatus('6. 正在转换字幕为TXT格式...');
      
      // 根据s3.json的结构，我们假设字幕数据在 subtitleJsonData.body 中
      // 每个元素 { from: time_in_seconds, content: "text" }
      if (!subtitleJsonData || !subtitleJsonData.body || !Array.isArray(subtitleJsonData.body)) {
          updateStatus('6a. 字幕JSON内容格式不正确 (预期结构: { "body": [...] })。', true);
          return;
      }

      let txtContent = "";
      subtitleJsonData.body.forEach(item => {
          if (typeof item.from === 'number' && typeof item.content === 'string') {
              const timestamp = item.from.toFixed(3); // 保留三位小数
              txtContent += `[${timestamp}] ${item.content}\n`;
          }
      });

      if (txtContent.trim() === "") {
          updateStatus('6b. 未能从字幕数据中提取有效内容，或字幕为空。', true);
          return;
      }
      
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const txtFileUrl = URL.createObjectURL(blob);
      
      // 清理文件名中的非法字符
      function sanitizeFilename(name) {
        // 替换常见非法字符为空格或下划线，或直接移除
        // Windows文件名中不允许的字符: < > : " / \ | ? *
        // 同时去除可能导致问题的首尾空格和点
        return name.replace(/[<>:"\/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[.]+|[.]+$/g, '') || 'untitled';
      }
      const sanitizedVideoTitle = sanitizeFilename(videoTitle);
      const filename = `${bvid}+${sanitizedVideoTitle}.txt`;

      updateStatus(`6c. 准备下载 ${filename}...`);
      chrome.downloads.download({
        url: txtFileUrl,
        filename: filename
      }, (downloadId) => {
        URL.revokeObjectURL(txtFileUrl); // 下载开始或失败后都释放对象URL
        if (chrome.runtime.lastError) {
          updateStatus(`6d. 下载 ${filename} 失败: ${chrome.runtime.lastError.message}`, true);
          return;
        }
        updateStatus(`6d. 字幕文件 ${filename} 开始下载! (ID: ${downloadId})`);
      });

    } catch (error) {
      console.error('错误:', error);
      updateStatus(`发生错误: ${error.message}`, true);
    }
  });
}); 
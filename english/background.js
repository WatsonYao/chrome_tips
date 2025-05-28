// Create a context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveWord",
    title: "记单词",
    contexts: ["selection"]
  });
});

// Set up message listener once, outside the click handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSelectedText") {
    chrome.storage.local.get(['selectedText'], (result) => {
      sendResponse({ text: result.selectedText || "" });
      // Clear after sending
      chrome.storage.local.remove(['selectedText']);
    });
    return true; // Indicates async response
  } else if (message.action === "sidepanelReady") {
    // Sidepanel is telling us it's ready to receive data
    chrome.storage.local.get(['panelOpenState'], (result) => {
      const isOpen = result.panelOpenState || false;
      chrome.storage.local.set({ 'panelOpenState': true });
      sendResponse({ wasAlreadyOpen: isOpen });
    });
    return true; // Indicates async response
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveWord") {
    // Store the selected text and flag for translation
    chrome.storage.local.set({ 
      "selectedText": info.selectionText,
      "shouldTranslate": true // Flag to indicate automatic translation
    });
    
    // Always open the side panel and broadcast the message
    chrome.sidePanel.open({ windowId: tab.windowId }).then(() => {
      // After panel is opened, broadcast the message to all listeners
      // The panel will pick it up if it's already open
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: "newTextSelected", 
          text: info.selectionText 
        });
      }, 300); // Small delay to ensure panel is ready
    });
  }
});

// Set the side panel options when the extension's action button is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
  
  // Update panel state when manually opened
  chrome.storage.local.set({ 'panelOpenState': true });
});

// Track when side panel is closed
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    port.onDisconnect.addListener(() => {
      chrome.storage.local.set({ 'panelOpenState': false });
    });
  }
}); 
// Popup script - Works without permissions
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh-stats');
  const infoDiv = document.querySelector('.info');
  const headerDiv = document.querySelector('.header');
  
  // Function to show normal UI (on Telegram Ads site)
  function showNormalUI(tab) {
    refreshBtn.style.display = 'block';
    if (infoDiv) {
      infoDiv.style.display = 'block';
    }
    
    refreshBtn.addEventListener('click', () => {
      if (tab && tab.url && tab.url.includes('ads.telegram.org/account/ad/')) {
        // Reload the page to trigger the extension
        try {
          if (tab.id) {
            chrome.tabs.reload(tab.id, () => {
              if (chrome.runtime.lastError) {
                // Fallback if no permission
                window.location.reload();
              }
              window.close();
            });
          } else {
            window.location.reload();
            window.close();
          }
        } catch (e) {
          window.location.reload();
          window.close();
        }
      } else {
        // Navigate to account page
        try {
          if (tab && tab.id) {
            chrome.tabs.update(tab.id, { url: 'https://ads.telegram.org/account' }, () => {
              if (chrome.runtime.lastError) {
                window.open('https://ads.telegram.org/account', '_blank');
              }
              window.close();
            });
          } else {
            window.open('https://ads.telegram.org/account', '_blank');
            window.close();
          }
        } catch (e) {
          window.open('https://ads.telegram.org/account', '_blank');
          window.close();
        }
      }
    });
  }
  
  // Function to show navigation message
  function showNavigationMessage() {
    if (headerDiv) {
      headerDiv.innerHTML = `
        <h2>TeleAd Assistant</h2>
        <p style="color: #dc3545;">Please navigate to Telegram Ads</p>
      `;
    }

    if (infoDiv) {
      infoDiv.innerHTML = `
        <strong>This extension works on Telegram Ads</strong>
        <p style="margin: 12px 0 0 0;">Navigate to <a href="https://ads.telegram.org/" target="_blank" style="color: #0088cc; text-decoration: none; font-weight: 500;">ads.telegram.org</a> to use this extension.</p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #6c757d;">Data is processed locally in your browser.</p>
      `;
    }
    
    refreshBtn.textContent = 'Go to Telegram Ads';
    refreshBtn.style.background = '#0088cc';
    refreshBtn.style.display = 'block';
    refreshBtn.addEventListener('click', () => {
      window.open('https://ads.telegram.org/account', '_blank');
      window.close();
    });
  }
  
  // Try to get current tab
  // Since we removed permissions, chrome.tabs.query might not work
  // But we can still try, and if it fails, show normal UI (content script handles the actual work)
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        // No permissions - show normal UI anyway (content script will work on Telegram Ads pages)
        // The popup is just informational, the content script does the actual work
        console.log('Could not query tabs (no permissions), showing normal UI');
        showNormalUI(null);
        return;
      }
      
      const tab = tabs && tabs[0];
      
      // Check if we're on Telegram Ads site
      if (tab && tab.url && tab.url.includes('ads.telegram.org')) {
        // On Telegram Ads site - show normal UI
        showNormalUI(tab);
      } else if (tab && tab.url) {
        // Confirmed NOT on Telegram Ads - show warning
        showNavigationMessage();
      } else {
        // Can't determine - show normal UI (content script handles it)
        showNormalUI(null);
      }
    });
  } catch (e) {
    // If tabs API fails completely, show normal UI
    // The content script will handle the actual functionality
    console.log('Tabs API not available, showing normal UI');
    showNormalUI(null);
  }
});

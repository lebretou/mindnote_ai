document.addEventListener('DOMContentLoaded', function() {
  const openaiApiKeyInput = document.getElementById('openai-api-key');
  const anthropicApiKeyInput = document.getElementById('anthropic-api-key');
  const preferredApiSelect = document.getElementById('preferred-api');
  const autoCaptureToggle = document.getElementById('auto-capture');
  const saveSettingsButton = document.getElementById('save-settings');
  const backToPopupButton = document.getElementById('back-to-popup');
  const statusMessage = document.getElementById('status-message');
  
  // Load stored settings
  chrome.storage.local.get([
    'openAIApiKey',
    'anthropicApiKey',
    'preferredApi',
    'autoCapture'
  ], function(result) {
    if (result.openAIApiKey) {
      openaiApiKeyInput.value = result.openAIApiKey;
    }
    
    if (result.anthropicApiKey) {
      anthropicApiKeyInput.value = result.anthropicApiKey;
    }
    
    if (result.preferredApi) {
      preferredApiSelect.value = result.preferredApi;
    }
    
    if (result.autoCapture !== undefined) {
      autoCaptureToggle.checked = result.autoCapture;
    }
  });
  
  // Toggle visibility of API key inputs
  document.querySelectorAll('.toggle-visibility').forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const inputElement = document.getElementById(targetId);
      
      if (inputElement.type === 'password') {
        inputElement.type = 'text';
        this.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path d="M2 4L22 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 4C4 4 1 12 1 12C1 12 4 20 12 20C20 20 23 12 23 12C23 12 20 4 12 4Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        `;
      } else {
        inputElement.type = 'password';
        this.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path d="M12 4C4 4 1 12 1 12C1 12 4 20 12 20C20 20 23 12 23 12C23 12 20 4 12 4Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        `;
      }
    });
  });
  
  // Save settings
  saveSettingsButton.addEventListener('click', function() {
    const openAIApiKey = openaiApiKeyInput.value.trim();
    const anthropicApiKey = anthropicApiKeyInput.value.trim();
    const preferredApi = preferredApiSelect.value;
    const autoCapture = autoCaptureToggle.checked;
    
    // Validate that at least one API key is provided
    if (!openAIApiKey && !anthropicApiKey) {
      showStatus('Please provide at least one API key', 'error');
      return;
    }
    
    // Save settings to storage
    chrome.storage.local.set({
      openAIApiKey: openAIApiKey,
      anthropicApiKey: anthropicApiKey,
      preferredApi: preferredApi,
      autoCapture: autoCapture
    }, function() {
      showStatus('Settings saved successfully!', 'success');
    });
  });
  
  // Navigate back to popup
  backToPopupButton.addEventListener('click', function() {
    window.location.href = 'popup.html';
  });
  
  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    
    // Clear the message after a delay
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
}); 
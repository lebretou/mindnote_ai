document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const exportBtn = document.getElementById('exportBtn');
  const viewNotesBtn = document.getElementById('viewNotesBtn');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const pageCount = document.getElementById('pageCount');
  const websitesList = document.getElementById('websitesList');
  const notesPreview = document.getElementById('notesPreview');
  const openOptionsBtn = document.getElementById('openOptions');
  const clearSessionBtn = document.getElementById('clearSessionBtn');
  
  let isRecording = false;
  let capturedWebsites = [];
  let generatedNotes = '';
  
  // Initialize UI based on current state
  chrome.storage.local.get(['isRecording', 'capturedWebsites', 'generatedNotes'], function(result) {
    if (result.isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
    
    if (result.capturedWebsites && result.capturedWebsites.length > 0) {
      capturedWebsites = result.capturedWebsites;
      updateWebsitesList();
      pageCount.textContent = capturedWebsites.length;
    }
    
    if (result.generatedNotes) {
      generatedNotes = result.generatedNotes;
      updateNotesPreview();
      exportBtn.disabled = false;
      viewNotesBtn.disabled = false;
    }
    updateClearButtonState();
  });
  
  // Start recording button
  startBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'startRecording' }, function(response) {
      if (response && response.success) {
        startRecording();
        chrome.storage.local.set({ isRecording: true });
      }
    });
  });
  
  // Stop recording and generate notes button
  stopBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'stopRecording' }, function(response) {
      if (response && response.success) {
        stopRecording();
        chrome.storage.local.set({ isRecording: false });
        
        // If we have captured websites, generate notes
        if (capturedWebsites.length > 0) {
          generateNotes();
        }
      }
    });
  });
  
  // Export notes button
  exportBtn.addEventListener('click', function() {
    if (!generatedNotes) return;
    
    // Create a blob and download it
    const blob = new Blob([generatedNotes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindnote-' + new Date().toISOString().slice(0, 10) + '.md';
    a.click();
    
    URL.revokeObjectURL(url);
  });
  
  // View notes button
  viewNotesBtn.addEventListener('click', function() {
    if (generatedNotes) {
      chrome.tabs.create({ url: chrome.runtime.getURL('notes_view.html') });
    } else {
      // Optional: Alert user if no notes exist, though button should be disabled
      alert("No notes generated yet."); 
    }
  });
  
  // Open options page
  openOptionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage ? 
      chrome.runtime.openOptionsPage() : 
      window.open(chrome.runtime.getURL('popup/options.html'));
  });
  
  // Clear session button
  clearSessionBtn.addEventListener('click', function() {
    // Confirm with the user before clearing
    if (confirm("Are you sure you want to clear the current session? This will remove all captured websites and generated notes.")) {
      clearSessionData();
    }
  });
  
  // Listen for updates from background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'websiteCaptured') {
      capturedWebsites = request.capturedWebsites;
      updateWebsitesList();
      pageCount.textContent = capturedWebsites.length;
      chrome.storage.local.set({ capturedWebsites: capturedWebsites });
      updateClearButtonState();
    } else if (request.action === 'notesGenerated') {
      generatedNotes = request.notes;
      updateNotesPreview();
      exportBtn.disabled = false;
      viewNotesBtn.disabled = false;
      chrome.storage.local.set({ generatedNotes: generatedNotes });
      updateClearButtonState();
    }
  });
  
  function startRecording() {
    isRecording = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusIndicator.classList.add('active');
    statusText.textContent = 'Recording';
  }
  
  function stopRecording() {
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusIndicator.classList.remove('active');
    statusText.textContent = 'Not recording';
  }
  
  function updateWebsitesList() {
    // Clear existing list except for the empty message
    websitesList.innerHTML = '';
    
    if (capturedWebsites.length === 0) {
      websitesList.innerHTML = '<div class="empty-message">No websites captured yet</div>';
      return;
    }
    
    capturedWebsites.forEach(function(site, index) {
      const websiteItem = document.createElement('div');
      websiteItem.className = 'website-item';
      
      const urlSpan = document.createElement('span');
      urlSpan.className = 'website-url';
      urlSpan.textContent = site.url;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.setAttribute('data-index', index);
      deleteBtn.addEventListener('click', function() {
        removeWebsite(parseInt(this.getAttribute('data-index')));
      });
      
      websiteItem.appendChild(urlSpan);
      websiteItem.appendChild(deleteBtn);
      websitesList.appendChild(websiteItem);
    });
  }
  
  function removeWebsite(index) {
    capturedWebsites.splice(index, 1);
    updateWebsitesList();
    pageCount.textContent = capturedWebsites.length;
    chrome.storage.local.set({ capturedWebsites: capturedWebsites });
    
    // Notify background script
    chrome.runtime.sendMessage({ 
      action: 'websiteRemoved', 
      capturedWebsites: capturedWebsites 
    });
    updateClearButtonState();
  }
  
  function updateNotesPreview() {
    if (!generatedNotes) {
      notesPreview.innerHTML = '<div class="empty-message">Notes will appear here after generation</div>';
      exportBtn.disabled = true;
      viewNotesBtn.disabled = true;
      return;
    }
    
    // Convert markdown to HTML for preview (simplified version)
    let html = generatedNotes
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>');
    
    notesPreview.innerHTML = html;
    exportBtn.disabled = false;
    viewNotesBtn.disabled = false;
  }
  
  function generateNotes() {
    // Show generating indicator
    notesPreview.innerHTML = '<div class="empty-message">Generating notes...</div>';
    
    // Request note generation from background script
    chrome.runtime.sendMessage({ 
      action: 'generateNotes',
      capturedWebsites: capturedWebsites
    });
  }
  
  // Function to clear session data
  function clearSessionData() {
    console.log("Clearing session in popup...");
    // Clear local state
    capturedWebsites = [];
    generatedNotes = '';

    // Update UI
    updateWebsitesList();
    updateNotesPreview();
    pageCount.textContent = '0';

    // Reset button states (assuming stopRecording() handles most of this)
    if (isRecording) {
      // If recording, stop it first (optional, depends on desired UX)
      // For now, just reset UI assuming recording is already stopped or shouldn't be running
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    exportBtn.disabled = true;
    viewNotesBtn.disabled = true;
    clearSessionBtn.disabled = capturedWebsites.length === 0 && !generatedNotes; // Disable if already empty

    // Clear storage via background script
    chrome.runtime.sendMessage({ action: 'clearSession' }, function(response) {
      if (response && response.success) {
        console.log("Background session cleared successfully.");
      } else {
        console.error("Error clearing background session:", response?.error);
        // Handle error (e.g., show an alert to the user)
        alert("Failed to clear session completely. Please try again.");
      }
    });

    // Update the disabled state of the clear button immediately
    clearSessionBtn.disabled = true;
  }

  // Update clear button state initially and whenever data changes
  function updateClearButtonState() {
    clearSessionBtn.disabled = capturedWebsites.length === 0 && !generatedNotes;
  }
}); 
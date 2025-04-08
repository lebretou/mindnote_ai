// Global variables
let isRecording = false;
let sidebarVisible = false;
let capturedWebsites = [];

// Create sidebar element
const createSidebar = () => {
  const sidebar = document.createElement('div');
  sidebar.id = 'mindnote-sidebar';
  
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h2>mindnote.ai</h2>
      <button class="sidebar-close">&times;</button>
    </div>
    <div class="recording-badge">
      <div class="recording-indicator"></div>
      <div class="recording-text">Recording active</div>
    </div>
    <div class="sidebar-content">
      <div class="sidebar-section">
        <h3>Captured Websites</h3>
        <div id="mindnote-websites-list"></div>
      </div>
    </div>
    <div class="sidebar-footer">
      <button class="sidebar-button secondary-button" id="mindnote-cancel">Cancel</button>
      <button class="sidebar-button primary-button" id="mindnote-generate">Generate Notes</button>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  
  // Add event listeners
  document.querySelector('.sidebar-close').addEventListener('click', toggleSidebar);
  document.getElementById('mindnote-cancel').addEventListener('click', toggleSidebar);
  document.getElementById('mindnote-generate').addEventListener('click', requestNoteGeneration);
  
  return sidebar;
};

// Show/hide the sidebar
const toggleSidebar = () => {
  const sidebar = document.getElementById('mindnote-sidebar') || createSidebar();
  
  if (sidebarVisible) {
    sidebar.classList.remove('active');
  } else {
    sidebar.classList.add('active');
    updateWebsitesList();
  }
  
  sidebarVisible = !sidebarVisible;
};

// Update the list of captured websites in the sidebar
const updateWebsitesList = () => {
  const websitesList = document.getElementById('mindnote-websites-list');
  if (!websitesList) return;
  
  websitesList.innerHTML = '';
  
  if (capturedWebsites.length === 0) {
    websitesList.innerHTML = '<div class="empty-message">No websites captured yet</div>';
    return;
  }
  
  capturedWebsites.forEach((site, index) => {
    const websiteItem = document.createElement('div');
    websiteItem.className = 'captured-website';
    
    websiteItem.innerHTML = `
      <div>
        <div class="website-title">${site.title || 'Untitled'}</div>
        <div class="website-url">${site.url}</div>
      </div>
      <button class="remove-website" data-index="${index}">&times;</button>
    `;
    
    websitesList.appendChild(websiteItem);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-website').forEach(button => {
    button.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      removeWebsite(index);
    });
  });
};

// Remove a website from the captured list
const removeWebsite = (index) => {
  capturedWebsites.splice(index, 1);
  updateWebsitesList();
  
  // Notify background
  chrome.runtime.sendMessage({ 
    action: 'websiteRemoved', 
    capturedWebsites: capturedWebsites 
  });
};

// Show a toast notification
const showToast = (message, duration = 3000) => {
  // Remove existing toast if any
  const existingToast = document.querySelector('.mindnote-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'mindnote-toast';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Show the toast with a slight delay
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide and remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
};

// Extract content from the webpage
const extractContent = () => {
  // Helper to check if an element is visible
  const isVisible = (element) => {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  
  // Extract headings
  const headings = [];
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    if (isVisible(heading)) {
      headings.push({
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent.trim()
      });
    }
  });
  
  // Extract code blocks
  const codeBlocks = [];
  document.querySelectorAll('pre, code, .code, .syntax, .highlight').forEach(codeElement => {
    if (isVisible(codeElement)) {
      codeBlocks.push(codeElement.textContent.trim());
    }
  });
  
  // Extract paragraphs
  const paragraphs = [];
  document.querySelectorAll('p').forEach(paragraph => {
    if (isVisible(paragraph) && paragraph.textContent.trim().length > 20) {
      paragraphs.push(paragraph.textContent.trim());
    }
  });
  
  // Extract list items
  const listItems = [];
  document.querySelectorAll('ul li, ol li').forEach(item => {
    if (isVisible(item)) {
      listItems.push(item.textContent.trim());
    }
  });
  
  // Get main content area (assuming most documentation sites have a main container)
  const mainContent = document.querySelector('main, article, .content, .documentation, .doc-content');
  let mainContentText = '';
  
  if (mainContent && isVisible(mainContent)) {
    mainContentText = mainContent.textContent.trim();
  }
  
  return {
    url: window.location.href,
    title: document.title,
    headings: headings,
    codeBlocks: codeBlocks,
    paragraphs: paragraphs,
    listItems: listItems,
    mainContent: mainContentText
  };
};

// Capture the current page
const capturePage = () => {
  if (!isRecording) return;
  
  const extractedContent = extractContent();
  
  // Check if this URL is already captured
  const existingIndex = capturedWebsites.findIndex(site => site.url === extractedContent.url);
  
  if (existingIndex !== -1) {
    // Update existing entry
    capturedWebsites[existingIndex] = extractedContent;
    showToast('Page content updated');
  } else {
    // Add new entry
    capturedWebsites.push(extractedContent);
    showToast('Page content captured');
  }
  
  // Update sidebar if visible
  if (sidebarVisible) {
    updateWebsitesList();
  }
  
  // Notify background script
  chrome.runtime.sendMessage({ 
    action: 'contentExtracted', 
    capturedWebsites: capturedWebsites 
  });
};

// Request note generation
const requestNoteGeneration = () => {
  if (capturedWebsites.length === 0) {
    showToast('No website content captured');
    return;
  }
  
  chrome.runtime.sendMessage({ 
    action: 'generateNotes',
    capturedWebsites: capturedWebsites
  });
  
  showToast('Generating notes...');
  toggleSidebar(); // Hide sidebar
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    isRecording = true;
    capturePage(); // Capture the current page immediately
    sendResponse({ success: true });
  } else if (request.action === 'stopRecording') {
    isRecording = false;
    sendResponse({ success: true });
  } else if (request.action === 'toggleSidebar') {
    toggleSidebar();
    sendResponse({ success: true });
  } else if (request.action === 'updateCapturedWebsites') {
    capturedWebsites = request.capturedWebsites;
    if (sidebarVisible) {
      updateWebsitesList();
    }
    sendResponse({ success: true });
  } else if (request.action === 'notesGenerated') {
    showToast('Notes generated successfully!');
    sendResponse({ success: true });
  }
  
  return true;
});

// Initialize: check if recording is active
chrome.storage.local.get(['isRecording', 'capturedWebsites'], function(result) {
  isRecording = result.isRecording || false;
  capturedWebsites = result.capturedWebsites || [];
  
  // If we're recording, capture this page after a short delay
  if (isRecording) {
    setTimeout(capturePage, 1000);
  }
}); 
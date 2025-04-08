// Global variables
let isRecording = false;
let capturedWebsites = [];
let openAIApiKey = ''; // Will be stored in chrome.storage.local

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('mindnote.ai extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    isRecording: false,
    capturedWebsites: [],
    generatedNotes: ''
  });
});

// Function to capture screenshot
const captureScreenshot = async (tabId) => {
  try {
    return await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
};

// Function to send data to all content scripts
const broadcastToContentScripts = (message) => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(err => {
        // Silently fail if the tab doesn't have the content script
      });
    });
  });
};

// Function to generate markdown notes using OpenAI API
const generateMarkdownNotes = async (capturedWebsites) => {
  // Get API key from storage
  const storage = await chrome.storage.local.get(['openAIApiKey']);
  const apiKey = storage.openAIApiKey;
  
  if (!apiKey) {
    console.error('OpenAI API key not set');
    return 'ERROR: API key not set. Please set your API key in the extension options.';
  }
  
  // Prepare the prompt
  const prompt = `
You are an expert documentation summarizer. Create concise, well-structured markdown notes from the following website content.
Focus on key concepts, definitions, and examples. Use proper markdown formatting with headings, lists, and code blocks.
Include a brief summary at the beginning.

CAPTURED WEBSITE CONTENT:
${capturedWebsites.map((site, index) => `
WEBSITE ${index + 1}: ${site.title || 'Untitled'}
URL: ${site.url}

HEADINGS:
${site.headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}

CODE BLOCKS:
${site.codeBlocks.map(code => '```\n' + code + '\n```').join('\n\n')}

KEY CONTENT:
${site.paragraphs.slice(0, 10).join('\n\n')}

LIST ITEMS:
${site.listItems.map(item => '- ' + item).join('\n')}
`).join('\n\n-----------------\n\n')}

Generate comprehensive technical documentation notes in markdown format based on the above content.
Organize the content logically, with proper headings, sections, and code blocks.
Remove any redundant information and focus on the technical details.
Ensure all code blocks are properly formatted within markdown code fences.
`;

  try {
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert documentation summarizer that produces well-formatted markdown notes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 12000
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return `ERROR: ${data.error.message}`;
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return `ERROR: ${error.message}`;
  }
};

// Alternative function to generate markdown notes using Anthropic API
const generateMarkdownNotesWithAnthropic = async (capturedWebsites) => {
  // Get API key from storage
  const storage = await chrome.storage.local.get(['anthropicApiKey']);
  const apiKey = storage.anthropicApiKey;
  
  if (!apiKey) {
    console.error('Anthropic API key not set');
    return 'ERROR: API key not set. Please set your API key in the extension options.';
  }
  
  // Prepare the prompt
  const prompt = `
You are an expert documentation summarizer. Create concise, well-structured markdown notes from the following website content.
Focus on key concepts, definitions, and examples. Use proper markdown formatting with headings, lists, and code blocks.
Include a brief summary at the beginning.

CAPTURED WEBSITE CONTENT:
${capturedWebsites.map((site, index) => `
WEBSITE ${index + 1}: ${site.title || 'Untitled'}
URL: ${site.url}

HEADINGS:
${site.headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}

CODE BLOCKS:
${site.codeBlocks.map(code => '```\n' + code + '\n```').join('\n\n')}

KEY CONTENT:
${site.paragraphs.slice(0, 10).join('\n\n')}

LIST ITEMS:
${site.listItems.map(item => '- ' + item).join('\n')}
`).join('\n\n-----------------\n\n')}

Generate comprehensive technical documentation notes in markdown format based on the above content.
Organize the content logically, with proper headings, sections, and code blocks.
Remove any redundant information and focus on the technical details.
Ensure all code blocks are properly formatted within markdown code fences.
`;

  try {
    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 12000
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return `ERROR: ${data.error.message}`;
    }
    
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return `ERROR: ${error.message}`;
  }
};

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Start recording
  if (request.action === 'startRecording') {
    isRecording = true;
    chrome.storage.local.set({ isRecording: true });
    
    // Broadcast to all content scripts
    broadcastToContentScripts({ action: 'startRecording' });
    
    sendResponse({ success: true });
  }
  
  // Stop recording
  else if (request.action === 'stopRecording') {
    isRecording = false;
    chrome.storage.local.set({ isRecording: false });
    
    // Broadcast to all content scripts
    broadcastToContentScripts({ action: 'stopRecording' });
    
    sendResponse({ success: true });
  }
  
  // Content extracted from a page
  else if (request.action === 'contentExtracted') {
    // Handle extracted content
    capturedWebsites = request.capturedWebsites;
    chrome.storage.local.set({ capturedWebsites: capturedWebsites });
    
    // Capture screenshot
    if (sender.tab && isRecording) {
      captureScreenshot(sender.tab.id).then(dataUrl => {
        // Find the website entry and add the screenshot
        const website = capturedWebsites.find(site => site.url === sender.tab.url);
        if (website) {
          website.screenshot = dataUrl;
          chrome.storage.local.set({ capturedWebsites: capturedWebsites });
        }
      });
    }
    
    // Broadcast update to popup
    chrome.runtime.sendMessage({ 
      action: 'websiteCaptured', 
      capturedWebsites: capturedWebsites 
    });
    
    sendResponse({ success: true });
  }
  
  // Website removed from the list
  else if (request.action === 'websiteRemoved') {
    capturedWebsites = request.capturedWebsites;
    chrome.storage.local.set({ capturedWebsites: capturedWebsites });
    
    // Broadcast update to all content scripts and popup
    broadcastToContentScripts({ 
      action: 'updateCapturedWebsites', 
      capturedWebsites: capturedWebsites 
    });
    
    chrome.runtime.sendMessage({ 
      action: 'websiteCaptured', 
      capturedWebsites: capturedWebsites 
    });
    
    sendResponse({ success: true });
  }
  
  // Generate notes
  else if (request.action === 'generateNotes') {
    // Use the websites provided in the request or the stored ones
    const websites = request.capturedWebsites || capturedWebsites;
    
    // Generate notes
    generateMarkdownNotes(websites).then(notes => {
      // Store the generated notes
      chrome.storage.local.set({ generatedNotes: notes });
      
      // Broadcast to popup
      chrome.runtime.sendMessage({ 
        action: 'notesGenerated', 
        notes: notes 
      });
      
      // Broadcast to content scripts
      broadcastToContentScripts({ action: 'notesGenerated' });
    });
    
    sendResponse({ success: true });
  }
  
  // Return true to indicate that the response will be sent asynchronously
  return true;
});

// Listen for tab updates to capture content when recording
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isRecording) {
    // Wait a moment for the page to fully render
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: 'startRecording' }).catch(err => {
        // Silently fail if the content script isn't loaded yet
      });
    }, 1000);
  }
}); 
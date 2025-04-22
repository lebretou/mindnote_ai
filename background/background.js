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
${site.videoTitle ? `\nVIDEO TITLE: ${site.videoTitle}\n` : ''}

HEADINGS:
${site.headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}

CODE BLOCKS:
${site.codeBlocks.map(code => '```\n' + code + '\n```').join('\n\n')}

KEY CONTENT:
${site.paragraphs.slice(0, 10).join('\n\n')}

LIST ITEMS:
${site.listItems.map(item => '- ' + item).join('\n')}
${site.transcript ? `\nVIDEO TRANSCRIPT:\n${site.transcript}\n` : ''}
`).join('\n\n-----------------\n\n')}

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
        max_tokens: 32000
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

// Function to generate markdown notes using Anthropic API
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
${site.videoTitle ? `\nVIDEO TITLE: ${site.videoTitle}\n` : ''}

HEADINGS:
${site.headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}

CODE BLOCKS:
${site.codeBlocks.map(code => '```\n' + code + '\n```').join('\n\n')}

KEY CONTENT:
${site.paragraphs.slice(0, 10).join('\n\n')}

LIST ITEMS:
${site.listItems.map(item => '- ' + item).join('\n')}
${site.transcript ? `\nVIDEO TRANSCRIPT:\n${site.transcript}\n` : ''}
`).join('\n\n-----------------\n\n')}

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
        max_tokens: 32000
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

// Function to extract transcript and title from YouTube video (runs in YouTube tab context via injection)
async function extractTranscriptFromPage() {
  const videoUrl = window.location.href;
  const apiBaseUrl = 'https://transcript.andreszenteno.com'; // Using the API from the provided code
  const payload = { url: videoUrl };

  try {
    const response = await fetch(`${apiBaseUrl}/simple-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Transcript API error:', response.status, await response.text());
      throw new Error(`Error fetching transcript (${response.status})`);
    }

    const data = await response.json();
    // Ensure title and transcript exist, provide defaults if not
    const title = data.title || document.title || 'Untitled Video'; // Fallback title
    const transcript = data.transcript || 'Transcript not available';
    return { title: title, transcript: transcript };
    
  } catch (error) {
    console.error('Error in extractTranscriptFromPage:', error);
    // Return structured error/defaults
    return { 
      title: document.title || 'Untitled Video', // Still provide a title
      transcript: `Error fetching transcript: ${error.message}` 
    };
  }
}

// Function to fetch YouTube transcript using script injection
const fetchYouTubeTranscript = async (videoId, tabId) => {
  if (!videoId || !tabId) return null;

  console.log(`Attempting to inject script into tab ${tabId} for video ID: ${videoId}`);

  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: extractTranscriptFromPage, // Inject the function defined above
    });

    // Check results
    if (chrome.runtime.lastError) {
      console.error('Script injection error:', chrome.runtime.lastError.message);
      return { title: 'Error', transcript: `Injection failed: ${chrome.runtime.lastError.message}` };
    }
    
    if (injectionResults && injectionResults.length > 0 && injectionResults[0].result) {
      const result = injectionResults[0].result;
      console.log(`Successfully extracted transcript data for video ID: ${videoId}`);
      // Return the structured result {title, transcript}
      return result; 
    } else {
      console.warn(`No result or unexpected result from script injection for video ID ${videoId}. Results:`, injectionResults);
      return { title: 'Error', transcript: 'Failed to get transcript from page.' };
    }

  } catch (error) {
    console.error(`Error injecting or executing script for video ID ${videoId} in tab ${tabId}:`, error);
    return { title: 'Error', transcript: `Execution failed: ${error.message}` }; // Indicate failure
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
    // **Important**: contentExtracted now sends only the *single* page data
    // Let's adjust the logic to handle one page at a time
    const newData = request.pageData; // Assuming content script sends { action: 'contentExtracted', pageData: {...} }

    if (!newData || !newData.url) {
      console.warn('Received contentExtracted message with invalid data', request);
      sendResponse({ success: false, error: 'Invalid page data' });
      return false; // Don't send async response
    }

    const processPage = async () => {
      try {
        // Check if this page is already captured
        const existingIndex = capturedWebsites.findIndex(site => site.url === newData.url);

        // Fetch transcript if it's a YouTube video
        if (newData.videoId && sender.tab) {
          const transcriptData = await fetchYouTubeTranscript(newData.videoId, sender.tab.id);
          if (transcriptData) {
            newData.transcript = transcriptData.transcript; // Store the text transcript
            newData.videoTitle = transcriptData.title;     // Store the video title
          } else {
            // Handle cases where transcript fetching failed gracefully
            newData.transcript = 'Transcript could not be fetched.';
            newData.videoTitle = 'Unknown Video';
          }
        } else if (newData.videoId && !sender.tab) {
            console.warn('Cannot fetch transcript: sender.tab is missing.');
            newData.transcript = 'Transcript fetch skipped (no tab info).';
            newData.videoTitle = 'Unknown Video';
        }

        // Capture screenshot if recording
        if (sender.tab && isRecording) {
           try {
             newData.screenshot = await captureScreenshot(sender.tab.id);
           } catch (screenshotError) {
             console.error('Failed to capture screenshot:', screenshotError);
             newData.screenshot = null; // Indicate screenshot failure
           }
        } else {
          newData.screenshot = null;
        }

        // Update or add the website data
        if (existingIndex !== -1) {
          // Update existing entry, preserving existing screenshot if new one failed
           const existingScreenshot = capturedWebsites[existingIndex].screenshot;
           capturedWebsites[existingIndex] = { 
             ...newData, 
             screenshot: newData.screenshot === null ? existingScreenshot : newData.screenshot 
           };
          console.log('Updated captured website:', newData.url);
        } else {
          capturedWebsites.push(newData);
          console.log('Added new captured website:', newData.url);
        }

        // Save and broadcast update
        await chrome.storage.local.set({ capturedWebsites: capturedWebsites });
        chrome.runtime.sendMessage({ 
          action: 'websiteCaptured', 
          capturedWebsites: capturedWebsites 
        });
        sendResponse({ success: true });

      } catch (error) {
        console.error("Error processing captured content for URL:", newData.url, error);
        sendResponse({ success: false, error: error.message });
      }
    };

    processPage(); // Execute the async processing
    return true; // Indicate async response
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
      // Store the generated notes AND the sources used to generate them
      chrome.storage.local.set({
        generatedNotes: notes,
        recordedSources: websites // Save the sources as well
      });
      
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
  
  // Clear the current session
  else if (request.action === 'clearSession') {
    console.log("Clearing session data...");
    capturedWebsites = []; // Clear in-memory array
    // Clear data from storage
    chrome.storage.local.remove(['capturedWebsites', 'generatedNotes', 'recordedSources'], () => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing storage:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Storage cleared successfully.");
        // Optionally broadcast this clearing if needed by other components
        // broadcastToContentScripts({ action: 'sessionCleared' }); 
        sendResponse({ success: true });
      }
    });
    return true; // Indicate async response for storage removal
  }

  return true; // Keep for other async handlers
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
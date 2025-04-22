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
        max_tokens: 16384
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
        max_tokens: 16384
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

// Function to generate quiz questions and answers from notes
const generateQuizQuestions = async (notesContent, questionCount = 5) => {
  // First try to get OpenAI key, fall back to Anthropic
  const storage = await chrome.storage.local.get(['openAIApiKey', 'anthropicApiKey']);
  let apiKey = storage.openAIApiKey;
  let isOpenAI = true;
  
  if (!apiKey) {
    console.log('OpenAI API key not found, trying Anthropic API...');
    apiKey = storage.anthropicApiKey;
    isOpenAI = false;
  }
  
  if (!apiKey) {
    console.error('No API keys found for quiz generation');
    return { error: 'No API keys configured. Please set an API key in the extension options.' };
  }
  
  // Prepare the prompt
  const prompt = `
You are an expert educator. Based on the following notes, create ${questionCount} quiz questions in a flashcard format.
For each question:
1. Write a clear, specific question that tests understanding of an important concept from the notes
2. Provide a concise but complete answer
3. Include a brief explanation of why the answer is correct and how it relates to the material

Format your response as a JSON array with objects containing question, answer, and explanation fields.

NOTES CONTENT:
${notesContent}

Your response should be valid JSON in this exact format without any markdown formatting (no \`\`\` tags):
[
  {
    "question": "What is...",
    "answer": "The answer is...",
    "explanation": "This is because..."
  },
  ...
]

IMPORTANT: Return ONLY the JSON array with no surrounding text, code block markers, or other formatting.
Make the questions varied and representative of the most important concepts in the notes.
`;

  try {
    let response;
    
    if (isOpenAI) {
      // Call OpenAI API
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are an expert educator creating quiz questions to help users learn.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2048
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('OpenAI API error:', data.error);
        return { error: data.error.message };
      }

      try {
        // Extract the JSON part from the response
        const jsonContent = data.choices[0].message.content;
        // Clean the content to remove markdown formatting
        const cleanedJson = cleanJsonResponse(jsonContent);
        // Parse the JSON
        const quizData = JSON.parse(cleanedJson);
        return { quiz: quizData };
      } catch (parseError) {
        console.error('Error parsing quiz JSON from OpenAI:', parseError);
        console.log('Raw content received:', data.choices[0].message.content);
        return { error: 'Failed to parse quiz data from API response' };
      }
    } else {
      // Call Anthropic API
      response = await fetch('https://api.anthropic.com/v1/messages', {
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
          max_tokens: 2048
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Anthropic API error:', data.error);
        return { error: data.error.message };
      }
      
      try {
        // Extract the response content and parse the JSON part
        const jsonContent = data.content[0].text;
        // Clean the content to remove markdown formatting
        const cleanedJson = cleanJsonResponse(jsonContent);
        // Parse the JSON response
        const quizData = JSON.parse(cleanedJson);
        return { quiz: quizData };
      } catch (parseError) {
        console.error('Error parsing quiz JSON from Anthropic:', parseError);
        console.log('Raw content received:', data.content[0].text);
        return { error: 'Failed to parse quiz data from API response' };
      }
    }
  } catch (error) {
    console.error(`Error calling ${isOpenAI ? 'OpenAI' : 'Anthropic'} API:`, error);
    return { error: error.message };
  }
};

// Helper function to clean JSON response from LLMs
function cleanJsonResponse(response) {
  // Remove markdown code block syntax if present
  const jsonRegex = /```(?:json)?\s*(\[[\s\S]*?\])\s*```/;
  const match = response.match(jsonRegex);
  
  if (match && match[1]) {
    console.log('Found JSON in markdown block, extracting...');
    return match[1];
  }
  
  // If no markdown block found, check if it starts with [ and ends with ]
  if (response.trim().startsWith('[') && response.trim().endsWith(']')) {
    console.log('JSON appears to be clean already');
    return response;
  }
  
  // Last resort - try to find anything that looks like a JSON array
  const lastResortMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (lastResortMatch) {
    console.log('Extracting JSON array using last resort method');
    return lastResortMatch[0];
  }
  
  console.log('Could not extract JSON from response, returning as-is');
  return response;
}

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

  // Generate quiz questions
  else if (request.type === 'GENERATE_QUIZ') {
    console.log('Received quiz generation request');
    if (!request.content) {
      console.error('No content provided for quiz generation');
      sendResponse({ error: 'No content provided for quiz generation' });
      return false;
    }

    // Generate quiz questions
    generateQuizQuestions(request.content, request.count || 5)
      .then(result => {
        console.log('Quiz generation completed:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error generating quiz:', error);
        sendResponse({ error: error.message });
      });
    
    return true; // Indicate we will send an asynchronous response
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
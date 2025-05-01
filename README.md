# mindnote.ai

Chrome extension that automatically generates markdown notes and quizzes from documentation websites and YouTube videos using LLMs.

## Features

- Browse and record multiple pages in a session via an in-page sidebar UI  
- Capture page screenshots automatically  
- Extract headings, paragraphs, code blocks, and list items via DOM analysis  
- Support YouTube transcripts by injecting a content-extraction script  
- Generate concise, well-structured markdown notes using OpenAI GPT-4o or Anthropic Claude  
- Interactive exploration roadmap rendered with Mermaid.js, linking captured sources  
- Generate quiz questions, answers, and explanations based on your notes  
- Export notes as `.md` files with one-click download  
- Manage API keys and extension settings via the options page

## Installation

1. Clone this repository  
2. Open Chrome and navigate to `chrome://extensions/`  
3. Enable **Developer mode** in the top-right corner  
4. Click **Load unpacked** and select the repository folder  
5. Click the mindnote.ai icon in the toolbar to open the popup

## Usage

1. Click **Start Recording** in the popup to begin capturing pages  
2. Browse documentation or YouTube pages; captured sites appear in the sidebar  
3. In the popup, click **Stop & Generate** to summarize captured content  
4. Click **View Notes** to open the notes view and see rendered markdown and roadmap  
5. Use **Download** in the notes view to save as markdown  
6. Click **Start Quiz** in the popup or notes view to generate and take quizzes

## Configuration

1. In the popup, click **Settings** or open the **Options** page  
2. Enter your OpenAI API key (GPT-4o) or Anthropic API key (Claude)  
3. Select your preferred provider and click **Save**

## Architecture Overview

1. **manifest.json**  
   - Permissions: `activeTab`, `scripting`, `storage`, `tabs`  
   - Host permissions: `<all_urls>`, `*://*.youtube.com/*`  
   - Declares background service worker, content scripts, popup, and options page  
2. **Background Service Worker** (`background/background.js`)  
   - Manages recording state and captured site list in `chrome.storage.local`  
   - Handles messages: `startRecording`, `stopRecording`, `generateNotes`, `clearSession`, `GENERATE_QUIZ`  
   - Captures screenshots and injects transcript-extraction on YouTube via `chrome.scripting.executeScript`  
   - Calls OpenAI and Anthropic APIs for note summarization and quiz generation  
   - Stores `generatedNotes` and `recordedSources`, broadcasts updates to UI  
3. **Content Script** (`content/content.js` + `css/content.css`)  
   - Injects a sidebar UI into every page for recording controls  
   - Extracts page metadata: URL, title, headings, paragraphs, code blocks, list items  
   - Detects YouTube video IDs and includes transcripts  
4. **Popup UI** (`popup/popup.html`, `popup/popup.js`, `css/popup.css`)  
   - Start/Stop Recording, Generate Notes, View Notes, Start Quiz controls  
   - Link to the Options page (`popup/options.html`, `popup/options.js`, `css/options.css`)  
5. **Notes View** (`notes_view.html`, `js/notes_view.js`, `css/notes_view.css`)  
   - Retrieves and renders markdown via `marked.js`  
   - Builds exploration flowchart with `mermaid.min.js`  
   - Displays clickable source thumbnails and download button  
6. **Quiz View** (`quiz.html`, `js/quiz.js`, `css/quiz.css`)  
   - Retrieves notes for quiz and sends `GENERATE_QUIZ` to background  
   - Displays questions, answers, explanations, and progress bar  
7. **Assets & Libraries**  
   - `images/` contains extension icons  
   - `js/marked.min.js`, `js/mermaid.min.js` for markdown and diagrams

## Project Structure

```
.  
├── manifest.json
├── package.json
├── README.md
├── background/
│   └── background.js
├── content/
│   └── content.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   ├── options.html
│   └── options.js
├── css/
│   ├── content.css
│   ├── popup.css
│   ├── options.css
│   ├── notes_view.css
│   └── quiz.css
├── js/
│   ├── marked.min.js
│   ├── mermaid.min.js
│   ├── notes_view.js
│   └── quiz.js
├── notes_view.html
├── quiz.html
└── images/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

- Install dependencies (if any) with `npm install`  
- Regenerate icons with `npm run build-icons`  
- Load as an unpacked extension for testing  
- Use `pre-commit` hooks if configured to lint and format

## License

MIT

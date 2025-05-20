# mindnote.ai

Chrome extension that automatically generates markdown notes and quizzes from documentation websites and YouTube videos using LLMs.


![Screenshot 2025-05-01 at 5 54 25 PM](https://github.com/user-attachments/assets/98496d8a-6da4-4458-ba18-e6cca2b47ee8)

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


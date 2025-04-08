# mindnote.ai

A Chrome extension that automatically generates markdown notes from documentation websites.

## Features

- Take screenshots of documentation websites
- Extract relevant content using DOM analysis
- Generate concise, well-structured markdown notes using LLM AI
- Track visited websites and manage them in a sidebar
- Export notes as markdown files

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the repository folder
5. The mindnote.ai extension should now be installed and visible in your extension toolbar

## Usage

1. Navigate to the documentation website you want to capture
2. Click the mindnote.ai extension icon in your toolbar
3. Click "Start Recording" to begin capturing websites
4. Browse through the documentation pages you want to include in your notes
5. Click "Stop & Generate" when finished
6. Review the generated notes and click "Export" to save as markdown

## Configuration

You'll need to provide your own API key:

1. Click the "Settings" link in the extension popup
2. Enter your OpenAI API key (for GPT-4) or Anthropic API key (for Claude)
3. Select your preferred API provider
4. Click "Save Settings"

## Development

### Project Structure

```
.
├── manifest.json           # Extension configuration
├── background/             # Background service worker
├── content/                # Content scripts for page interaction
├── popup/                  # Extension popup UI
├── js/                     # JavaScript modules
├── css/                    # Stylesheets
└── images/                 # Icons and images
```

### Building for Production

For production use, you may want to:

1. Minify JavaScript and CSS files
2. Optimize images
3. Package the extension as a .crx file or .zip for Chrome Web Store submission

## License

MIT

## Credits

Created by [Your Name]

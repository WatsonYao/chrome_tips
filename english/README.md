# English Word Saver Chrome Extension

This Chrome extension allows you to save and translate English words or phrases using the Gemini API. Words are saved in the browser's local storage and can be exported as a JSON file.

## Features

- Right-click on selected text to add it to your word list
- Translate English words to Chinese using the Gemini AI API
- Save and manage your word list
- Export your word list as a JSON file
- Clear all saved words with confirmation
- Word counter showing the total number of saved words
- Side panel interface for easy access
- Dark/Light theme toggle for comfortable reading in any environment
- Minimalist outline button styling for a clean interface
- Clean, header-free design focusing on functionality

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. Make sure to add your own icons in the `images` folder before loading the extension

## Setting Up

1. After installing the extension, click on the extension icon in the Chrome toolbar
2. Click the "Settings" button in the side panel
3. Enter your Gemini API key (you can get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
4. Click "Save" to store your API key

## Usage

### Saving a word from a webpage

1. Select any text on a webpage
2. Right-click and select "记单词" from the context menu
3. The side panel will open with the selected text in the input field
4. Click "翻译" to translate the word or phrase
5. Click "保存" to add it to your word list

### Managing your word list

- Words are displayed in the middle section of the side panel
- The total number of saved words is shown next to the "已保存单词" heading
- Click the "删除" button next to a word to remove it from the list
- Click the "清空" button to remove all words (a confirmation dialog will appear)
- Click the "导出" button to export your word list as a JSON file

### Changing the theme

- Click the theme toggle button (○/◑ icon) next to the settings button to switch between light and dark themes
- Your theme preference will be saved and remembered the next time you open the extension

## Development

To modify or enhance this extension:

1. Edit the HTML, CSS, and JavaScript files as needed
2. Reload the extension in Chrome's extension management page
3. Test your changes

## Note

This extension requires a Gemini API key to perform translations. You can obtain one from [Google AI Studio](https://makersuite.google.com/app/apikey).

## License

This project is open source and available under the MIT License. 
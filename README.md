# YouTube Summary Manager

## First pass:
Create a chrome extension that scrapes what ever youtube you are looking at inside Chrome and save<br>
this information to a json file for later processing.<br>
For example, downloading the youtube video and transcribing it for later use in an *GPT like LLM.<br>
//---------------------------------------------------------------------------------------------------<br>
A Chrome extension that helps you save and manage YouTube video information. The extension allows you to:
- Save video information including title, channel details, and metadata for later processing
- Organize saved videos by channel
- Allow one to search for relevent youtube information after processing
- Manage your saved video collection
- Add filters when saving like "extract what car parts video talks about" etc.

## Features
- One-click video information saving
- Organized storage by channel
- JSON export functionality
- Easy video management interface

## Installation
1. Clone this repository into your Windows "Documents" folder, or where ever.
2. Open Chrome and navigate to `chrome://extensions/` or click the extensions icon
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory where you saved the code

## Usage
1. Navigate to any YouTube video
2. Click the extension icon or use the keyboard shortcut
3. Save video information with a single click
4. Access your saved videos through the extension popup

## Development
This extension is built using vanilla JavaScript and Chrome Extension APIs.

## License
MIT License 

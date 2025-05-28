# YouTube Summary Manager

## First pass, create a chrome extension that scrapes what ever youtube you are looking at inside Chrome and save
## this information to a json file for later processing.
## For example, downloading the youtube video and transcribing it for later use in an *GPT like LLM.

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
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage
1. Navigate to any YouTube video
2. Click the extension icon or use the keyboard shortcut
3. Save video information with a single click
4. Access your saved videos through the extension popup

## Development
This extension is built using vanilla JavaScript and Chrome Extension APIs.

## License
MIT License 

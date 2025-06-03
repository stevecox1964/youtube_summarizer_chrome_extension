const SAVED_VIDEOS_KEY = 'youtubeSavedVideos';

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started');
});

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('Service worker installed');
});

// Keep service worker alive
setInterval(() => {
  console.log('Service worker heartbeat');
}, 30000);

// --- YouTube Info Scraper Function (to be injected) ---
function scrapeYouTubePageInfo() {
  console.log('Starting YouTube page info scraping...');
  
  const videoId = new URLSearchParams(window.location.search).get('v');
  console.log('Extracted videoId:', videoId);
  
  let videoTitle = document.title.replace(/ - YouTube$/, "").trim();
  console.log('Initial videoTitle from document.title:', videoTitle);

  const metaTitleTag = document.querySelector('meta[name="title"]');
  console.log('Meta title tag found:', metaTitleTag?.content);
  
  if (metaTitleTag && metaTitleTag.content && (videoTitle === "YouTube" || videoTitle === "")) {
    videoTitle = metaTitleTag.content;
    console.log('Updated videoTitle from meta tag:', videoTitle);
  } else {
    const h1Title = document.querySelector('#title h1.ytd-watch-metadata yt-formatted-string, h1.title.ytd-video-primary-info-renderer');
    console.log('H1 title element found:', h1Title?.textContent);
    
    if (h1Title && h1Title.textContent && (videoTitle === "YouTube" || videoTitle === "" || videoTitle.length < 5)) {
      videoTitle = h1Title.textContent.trim();
      console.log('Updated videoTitle from H1:', videoTitle);
    }
  }

  let channelId = null;
  let channelName = null;
  let channelUrl = null;
  let channelHandle = null;
  let channelIdSource = 'none';

  const channelMetaTag = document.querySelector('meta[itemprop="channelId"]');
  console.log('Channel meta tag found:', channelMetaTag?.content);
  
  if (channelMetaTag && channelMetaTag.content) {
    channelId = channelMetaTag.content;
    channelIdSource = 'meta';
    console.log('Channel ID from meta tag:', channelId);
  }

  const ownerElement = document.querySelector(
    'ytd-video-owner-renderer #channel-name a.yt-simple-endpoint, '+
    '#meta-contents ytd-channel-name a.yt-simple-endpoint, '+
    '#upload-info #channel-name a.yt-simple-endpoint, '+
    'ytd-channel-name .yt-simple-endpoint'
  );
  console.log('Owner element found:', ownerElement?.textContent, 'URL:', ownerElement?.href);

  if (ownerElement) {
    channelName = ownerElement.textContent.trim();
    channelUrl = ownerElement.href;
    console.log('Channel info from owner element:', { channelName, channelUrl });
    
    if (channelUrl && !channelId) {
      const pathSegments = new URL(channelUrl).pathname.split('/');
      const lastSegment = pathSegments.pop() || pathSegments.pop();
      console.log('Path segments from channel URL:', pathSegments, 'Last segment:', lastSegment);
      
      if (lastSegment && lastSegment.startsWith('UC')) {
        channelId = lastSegment;
        channelIdSource = 'url_UC';
        console.log('Channel ID extracted from URL (UC...):', channelId);
      } else if (lastSegment && lastSegment.startsWith('@')) {
        channelHandle = lastSegment;
        channelIdSource = 'url_handle';
        console.log('Channel handle extracted from URL:', channelHandle);
      }
    }
  }

  if (!channelName) {
    const authorMetaTag = document.querySelector('meta[itemprop="author"]');
    console.log('Author meta tag found:', authorMetaTag?.content);
    
    if (authorMetaTag && authorMetaTag.content) {
      channelName = authorMetaTag.content;
      console.log('Channel name from author meta tag:', channelName);
    }
  }
  
  if (!channelId) {
    try {
      console.log('Attempting to extract channel ID from ytInitialData...');
      const ytInitialData = window.ytInitialData || JSON.parse(Array.from(document.scripts).find(s => s.textContent.includes("ytInitialData ="))?.textContent?.match(/ytInitialData\s*=\s*(\{.+?\});/)?.[1]);
      
      if (ytInitialData) {
        console.log('ytInitialData found, searching for channel ID...');
        const idFromData = ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents
          ?.find(c => c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer
          ?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId;
        
        console.log('Channel ID from ytInitialData:', idFromData);
        
        if (idFromData && idFromData.startsWith('UC')) {
          channelId = idFromData;
          channelIdSource = 'ytInitialData';
          console.log('Channel ID set from ytInitialData:', channelId);
        }
      }
    } catch(e) { 
      console.warn("Error parsing ytInitialData for channelId:", e); 
    }
  }

  // If we only have a handle, try to fetch the channel page and extract the UC... ID, canonical URL, and channel name
  if ((!channelId || channelIdSource === 'handle_only' || channelIdSource === 'url_handle') && channelHandle) {
    try {
      console.log('Attempting to fetch channel page to extract UC... channel ID, canonical URL, and channel name from handle:', channelHandle);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', `https://www.youtube.com/${channelHandle}`, false); // synchronous request
      xhr.send(null);
      if (xhr.status === 200) {
        const html = xhr.responseText;
        const idMatch = html.match(/"channelId":"(UC[^"]+)"/);
        if (idMatch && idMatch[1]) {
          channelId = idMatch[1];
          channelIdSource = 'fetched_from_handle';
          console.log('Fetched UC... channel ID from channel page:', channelId);
        } else {
          console.warn('Could not find UC... channel ID in fetched channel page.');
        }
        // Extract canonical URL
        const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
        if (canonicalMatch && canonicalMatch[1]) {
          channelUrl = canonicalMatch[1];
          console.log('Fetched canonical channel URL from channel page:', channelUrl);
        } else {
          console.warn('Could not find canonical channel URL in fetched channel page.');
        }
        // Extract channel name
        const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
          channelName = nameMatch[1];
          console.log('Fetched channel name from channel page:', channelName);
        } else {
          console.warn('Could not find channel name in fetched channel page.');
        }
      } else {
        console.warn('Failed to fetch channel page for handle:', channelHandle, 'Status:', xhr.status);
      }
    } catch (e) {
      console.warn('Error fetching channel page for handle:', channelHandle, e);
    }
  }

  if (!channelId && channelHandle) {
    console.warn('WARNING: Only found channel handle, not UC... channel ID. Some features may not work as expected.');
    channelId = channelHandle;
    channelIdSource = 'handle_only';
  }

  const result = {
    scrapedAt: new Date().toISOString(),
    videoId: videoId || null,
    videoTitle: videoTitle || "N/A",
    channelId: channelId || "N/A_ChannelID_Unavailable",
    channelName: channelName || "N/A",
    channelUrl: channelUrl || "N/A",
    videoUrl: window.location.href,
    channelIdSource: channelIdSource
  };
  
  console.log('Final scraped data:', result);
  return result;
}
// --- End of Scraper Function ---

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-manager") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === "getCurrentVideoInfo") {
    console.log('Starting getCurrentVideoInfo handler');
    (async () => {
      try {
        // Query for ALL tabs and find the YouTube video tab
        console.log('Querying for YouTube video tab...');
        const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/watch*" });
        console.log('Found YouTube tabs:', tabs);
        
        // Get the most recently active YouTube tab
        const youtubeTab = tabs[0];
        
        if (youtubeTab && youtubeTab.url && youtubeTab.url.includes("youtube.com/watch")) {
          console.log('Found YouTube video tab:', youtubeTab.url);
          try {
            console.log('Executing script on tab:', youtubeTab.id);
            const results = await chrome.scripting.executeScript({
              target: { tabId: youtubeTab.id },
              function: scrapeYouTubePageInfo,
            });
            console.log('Script execution results:', results);
            if (results && results[0] && results[0].result && results[0].result.videoId) {
              console.log('Successfully extracted video info');
              sendResponse({ success: true, data: results[0].result });
            } else {
              console.log('Failed to extract video info from results');
              sendResponse({ success: false, error: "Could not extract info or not a video page." });
            }
          } catch (e) {
            console.error("Error scripting for current video info:", e);
            sendResponse({ success: false, error: e.message });
          }
        } else {
          console.log('No YouTube video tab found');
          sendResponse({ success: false, error: "No YouTube video tab found. Please navigate to a YouTube video page." });
        }
      } catch (error) {
        console.error("Error querying tabs:", error);
        sendResponse({ success: false, error: "Error accessing tab information." });
      }
    })();
    return true; // Keep the message channel open for async response
  }
  else if (request.action === "saveVideo") {
    (async () => {
      const videoInfo = request.data;
      if (!videoInfo || !videoInfo.videoId) {
        sendResponse({ success: false, error: "Invalid video data provided." });
        return;
      }
      if (!videoInfo.channelId || videoInfo.channelId === "N/A_ChannelID_Unavailable") {
        sendResponse({ success: false, error: "Channel ID is missing, cannot create folder structure." });
        notify("Save Failed", "Channel ID could not be determined for this video.", true);
        return;
      }

      const jsonString = JSON.stringify(videoInfo, null, 2);
      // Create a data URL instead of using createObjectURL
      const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);

      const sanitizePathComponent = (component) => component.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_');
      
      const safeChannelId = sanitizePathComponent(videoInfo.channelId);
      const safeVideoId = sanitizePathComponent(videoInfo.videoId);
      const safeTitle = sanitizePathComponent(videoInfo.videoTitle).substring(0, 50); // Limit title length to 50 chars
      
      // UPDATED FILENAME PATH with title prefix
      const filename = `you_tube_summaries/${safeChannelId}/${safeTitle}_${safeVideoId}.json`;

      try {
        const downloadId = await chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false
        });

        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: "Download failed: " + chrome.runtime.lastError.message });
          notify("Download Failed", `Error: ${chrome.runtime.lastError.message}`, true);
          return;
        }
        
        const storageData = await chrome.storage.local.get(SAVED_VIDEOS_KEY);
        const savedVideos = storageData[SAVED_VIDEOS_KEY] || [];
        
        const existingIndex = savedVideos.findIndex(v => v.videoId === videoInfo.videoId);
        const entry = { ...videoInfo, savedTimestamp: new Date().toISOString(), filename: filename }; 

        if (existingIndex > -1) {
          savedVideos[existingIndex] = entry;
        } else {
          savedVideos.unshift(entry);
        }
        
        await chrome.storage.local.set({ [SAVED_VIDEOS_KEY]: savedVideos });
        sendResponse({ success: true, filename: filename, message: "Video info saved."});
        notify("Video Info Saved", `Saved to Downloads/${filename}`);
      } catch (error) {
        console.error("Error during save:", error);
        sendResponse({ success: false, error: "Error during save: " + error.message });
        notify("Save Failed", `Error: ${error.message}`, true);
      }
    })();
    return true;
  }
  else if (request.action === "getSavedVideos") {
    (async () => {
      const data = await chrome.storage.local.get(SAVED_VIDEOS_KEY);
      sendResponse(data[SAVED_VIDEOS_KEY] || []);
    })();
    return true; 
  }
  else if (request.action === "deleteVideo") {
    (async () => {
      const videoId = request.videoId;
      const data = await chrome.storage.local.get(SAVED_VIDEOS_KEY);
      let savedVideos = data[SAVED_VIDEOS_KEY] || [];
      const initialLength = savedVideos.length;
      savedVideos = savedVideos.filter(v => v.videoId !== videoId);
      
      if (savedVideos.length < initialLength) {
        await chrome.storage.local.set({ [SAVED_VIDEOS_KEY]: savedVideos });
        sendResponse({ success: true, message: "Video removed from list." });
        notify("Video Info Removed", `Item with ID ${videoId} removed from your list.`);
      } else {
        sendResponse({ success: false, error: "Video not found in list." });
      }
    })();
    return true;
  }
});

function notify(title, message, isError = false) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: title,
    message: message,
    priority: isError ? 1 : 0
  });
}
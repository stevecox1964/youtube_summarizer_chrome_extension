document.addEventListener('DOMContentLoaded', () => {
  const currentVideoInfoDiv = document.getElementById('currentVideoInfo');
  const saveCurrentVideoButton = document.getElementById('saveCurrentVideoButton');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const clearSearchButton = document.getElementById('clearSearchButton');
  const savedVideosListDiv = document.getElementById('savedVideosList');
  const statusMessageDiv = document.getElementById('statusMessage');

  let currentVideoData = null; 
  let allSavedVideos = []; 

  function displayStatus(message, isError = false) {
      statusMessageDiv.textContent = message;
      statusMessageDiv.style.color = isError ? 'red' : 'green';
      statusMessageDiv.classList.remove('hidden');
      setTimeout(() => statusMessageDiv.classList.add('hidden'), 5000);
  }

  async function loadCurrentVideoInfo() {
      try {
          const response = await chrome.runtime.sendMessage({ action: "getCurrentVideoInfo" });
          if (response && response.success && response.data) {
              currentVideoData = response.data;
              currentVideoInfoDiv.innerHTML = `
                  <h3>${currentVideoData.videoTitle}</h3>
                  <p><strong>Channel ID:</strong> ${currentVideoData.channelId || 'N/A'}</p>
                  <p><strong>Channel URL:</strong> <a href="${currentVideoData.channelUrl}" target="_blank">${currentVideoData.channelUrl}</a></p>
                  <p><strong>Video ID:</strong> ${currentVideoData.videoId}</p>
                  <p><a href="${currentVideoData.videoUrl}" target="_blank">Open Video</a></p>
              `;
              if (currentVideoData.channelId && currentVideoData.channelId !== "N/A_ChannelID_Unavailable") {
                  saveCurrentVideoButton.classList.remove('hidden');
              } else {
                  currentVideoInfoDiv.innerHTML += `<p style="color:red;">Cannot save: Channel ID is unavailable.</p>`;
                  saveCurrentVideoButton.classList.add('hidden');
              }
          } else {
              currentVideoInfoDiv.textContent = response.error || "No active YouTube video found, or couldn't extract info. Navigate to a YouTube video page and try again.";
              saveCurrentVideoButton.classList.add('hidden');
          }
      } catch (error) {
          console.error("Error fetching current video info:", error);
          currentVideoInfoDiv.textContent = "Error fetching current video details.";
          saveCurrentVideoButton.classList.add('hidden');
      }
  }

  saveCurrentVideoButton.addEventListener('click', async () => {
      if (currentVideoData) {
          try {
              saveCurrentVideoButton.disabled = true;
              saveCurrentVideoButton.textContent = "Saving...";
              const response = await chrome.runtime.sendMessage({ action: "saveVideo", data: currentVideoData });
              if (response && response.success) {
                  displayStatus(response.message || `Video "${currentVideoData.videoTitle}" info saved.`);
                  loadSavedVideos(); 
              } else {
                  displayStatus(response.error || "Failed to save video info.", true);
              }
          } catch (error) {
              console.error("Error saving video:", error);
              displayStatus("Error communicating with background script to save video.", true);
          } finally {
              saveCurrentVideoButton.disabled = false;
              saveCurrentVideoButton.textContent = "Save Current Video Info";
          }
      }
  });

  async function loadSavedVideos(searchTerm = '') {
      try {
          const videos = await chrome.runtime.sendMessage({ action: "getSavedVideos" });
          allSavedVideos = videos || [];
          renderSavedVideos(filterVideos(allSavedVideos, searchTerm));
      } catch (error) {
          console.error("Error loading saved videos:", error);
          savedVideosListDiv.innerHTML = "<p>Error loading saved videos.</p>";
      }
  }
  
  function filterVideos(videos, term) {
      if (!term) return videos;
      const lowerTerm = term.toLowerCase();
      return videos.filter(video => 
          (video.videoTitle && video.videoTitle.toLowerCase().includes(lowerTerm)) ||
          (video.channelId && video.channelId.toLowerCase().includes(lowerTerm)) ||
          (video.videoId && video.videoId.toLowerCase().includes(lowerTerm))
      );
  }

  function renderSavedVideos(videos) {
      if (!videos || videos.length === 0) {
          savedVideosListDiv.innerHTML = "<p>No videos found matching your criteria.</p>";
          return;
      }
      savedVideosListDiv.innerHTML = videos.map(video => `
          <div class="video-item" data-video-id="${video.videoId}">
              <h3>${video.videoTitle}</h3>
              <p><strong>Channel ID:</strong> ${video.channelId || 'N/A'}</p>
              <p><strong>Channel URL:</strong> <a href="${video.channelUrl}" target="_blank">${video.channelUrl}</a></p>
              <p><strong>Video ID:</strong> ${video.videoId}</p>
              <p class="meta">Saved: ${new Date(video.savedTimestamp).toLocaleString()}</p>
              <p class="meta">File Path (in Downloads): ${video.filename || 'N/A'}</p>
              <p><a href="${video.videoUrl}" target="_blank">Open Video</a></p>
              <div class="actions">
                  <button class="delete" data-video-id="${video.videoId}">Delete From List</button>
              </div>
          </div>
      `).join('');

      savedVideosListDiv.querySelectorAll('.delete').forEach(button => {
          button.addEventListener('click', handleDeleteVideo);
      });
  }

  searchButton.addEventListener('click', () => {
      loadSavedVideos(searchInput.value);
  });
  searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          loadSavedVideos(searchInput.value);
      }
  });
  clearSearchButton.addEventListener('click', () => {
      searchInput.value = '';
      loadSavedVideos();
  });

  async function handleDeleteVideo(event) {
      const videoId = event.target.dataset.videoId;
      if (confirm(`Are you sure you want to remove video ID ${videoId} from this list? This will not delete the JSON file from your computer.`)) {
          try {
              const response = await chrome.runtime.sendMessage({ action: "deleteVideo", videoId: videoId });
              if (response && response.success) {
                  displayStatus(response.message || "Video removed.");
                  loadSavedVideos(searchInput.value); 
              } else {
                  displayStatus(response.error || "Failed to remove video from list.", true);
              }
          } catch (error) {
              console.error("Error deleting video:", error);
              displayStatus("Error communicating with background script to delete video.", true);
          }
      }
  }

  loadCurrentVideoInfo();
  loadSavedVideos();
});
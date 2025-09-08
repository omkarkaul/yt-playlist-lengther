const FIFTY_HOURS = 50 * 3600;

// Convert time strings like "1:23:45" or "12:34" → seconds
function timeToSeconds(timeStr) {
  const parts = timeStr.split(":").map(Number).reverse();
  return parts.reduce((acc, val, i) => acc + val * Math.pow(60, i), 0);
}

// Format seconds to HH:MM:SS
function formatTime(seconds) {
  if (seconds >= FIFTY_HOURS) return "50+ hours";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s]
    .map((v, i) => (i === 0 ? v : String(v).padStart(2, "0")))
    .filter((v, i) => v !== "0" || i > 0) // drop leading 0h
    .join(":");
}

// Scrolls playlist until everything is loaded or 50h cap is hit
async function computeFullPlaylistLength() {
  await new Promise(resolve => setTimeout(resolve, 2000)); // arbitrary wait to ensure content is loaded

  const container = document.querySelector("ytd-playlist-video-list-renderer #contents");
  if (!container) return;

  let prevHeight = 0;
  let totalSeconds = 0;
  const processedElements = new Set();

  while (true) {
    const videoElements = container.querySelectorAll("ytd-playlist-video-renderer");

    videoElements.forEach(videoElement => {
      if (!processedElements.has(videoElement)) {
        const timeElement = videoElement.querySelector("ytd-thumbnail-overlay-time-status-renderer span");
        if (timeElement) {
          const timeStr = timeElement.textContent.trim();
          if (timeStr.includes(":")) {
            totalSeconds += timeToSeconds(timeStr);
          }
        }
        processedElements.add(videoElement);
      }
    });

    // Stop if we hit the 50h cap
    if (totalSeconds >= FIFTY_HOURS) break;

    // Scroll down to trigger lazy load
    container.scrollTo(0, container.scrollHeight);
    await new Promise(r => setTimeout(r, 1000));

    // If no new height gained, stop
    if (container.scrollHeight === prevHeight) break;
    prevHeight = container.scrollHeight;
  }

  return formatTime(totalSeconds);
}

async function displayPlaylistLength() {
    const lengthStr = await computeFullPlaylistLength();
    console.log(lengthStr)
}

// Only trigger off yt-navigate-finish
document.addEventListener("yt-navigate-finish", () => {
  if (location.href.includes("youtube.com/playlist")) {
    displayPlaylistLength();
  }
});

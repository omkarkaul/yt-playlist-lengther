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
  await new Promise(resolve => setTimeout(resolve, 500)); // arbitrary wait to ensure content is loaded

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
    document.querySelectorAll("#playlist-length-display").forEach(el => el.remove());
    await new Promise(resolve => setTimeout(resolve, 500)); // arbitrary wait to ensure content is loaded
    const headers = document.querySelectorAll(".yt-page-header-view-model__page-header-content-metadata.yt-page-header-view-model__page-header-content-metadata--page-header-content-metadata-overlay.yt-content-metadata-view-model")
    if (headers.length === 0) {
        console.log("No headers found");
        return;
    }

    headers.forEach(header => {
        let lengthElement = header.querySelector("#playlist-length-display");
        if (!lengthElement) {
            lengthElement = document.createElement("div");
            lengthElement.id = "playlist-length-display";
            lengthElement.style.fontSize = "1.6rem";
            lengthElement.style.color = "var(--yt-spec-text-secondary)";
            lengthElement.textContent = "Calculating playlist length...";
            header.appendChild(lengthElement);
        } else {
            lengthElement.textContent = "Calculating playlist length...";
        }
    });

    const lengthStr = await computeFullPlaylistLength();

    headers.forEach(header => {
        const lengthElement = header.querySelector("#playlist-length-display");
        if (lengthElement) {
            if (lengthStr) {
                lengthElement.textContent = `Total playlist length: ${lengthStr}`;
            } else {
                lengthElement.remove();
            }
        }
    });
}

// Only trigger off yt-navigate-finish
document.addEventListener("yt-navigate-finish", () => {
  if (location.href.includes("youtube.com/playlist")) {
    displayPlaylistLength();
  }
});

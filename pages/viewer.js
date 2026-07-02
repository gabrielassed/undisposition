const params = new URLSearchParams(window.location.search);
const targetUrl = decodeURI(params.get('url') || '');
console.log({ targetUrl });
const MAX_LINES = 1000;

document.getElementById('originalLink').href = targetUrl;

async function fetchPartial() {
  const contentDiv = document.getElementById('content');
  const statusSpan = document.getElementById('status');

  if (!targetUrl) {
    contentDiv.textContent = 'Error: URL not provided.';
    return;
  }

  try {
    const response = await fetch(targetUrl);
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let text = '';
    let lineCount = 0;
    let truncated = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      text += chunk;

      const lines = text.split(/\r\n|\n/);

      if (lines.length > MAX_LINES) {
        text = lines.slice(0, MAX_LINES).join('\n');
        truncated = true;

        await reader.cancel();
        break;
      }
    }

    contentDiv.textContent = text;

    if (truncated) {
      statusSpan.innerHTML = `<span class="warning">TRUNCATED FILE (Viewing first ${MAX_LINES} lines)</span>`;
      contentDiv.textContent += `\n\n--- END OF PREVIEW ---\n--- The file continues but the download has been interrupted to save data ---`;
    } else {
      statusSpan.textContent = 'Full File';
    }
  } catch (err) {
    contentDiv.textContent = 'Error loading preview: ' + err.message;
    statusSpan.textContent = 'Error';
  }
}

fetchPartial();

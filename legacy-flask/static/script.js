const form = document.getElementById("search-form");
const urlInput = document.getElementById("url-input");
const fetchBtn = document.getElementById("fetch-btn");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");

const thumb = document.getElementById("thumb");
const durationBadge = document.getElementById("duration");
const titleEl = document.getElementById("title");
const uploaderEl = document.getElementById("uploader");
const extractorEl = document.getElementById("extractor");
const qualitySelect = document.getElementById("quality");
const downloadBtn = document.getElementById("download-btn");
const dlNote = document.getElementById("dl-note");

let currentUrl = "";

function setLoading(btn, loading) {
  const text = btn.querySelector(".btn-text");
  const spin = btn.querySelector(".spinner");
  btn.disabled = loading;
  if (text) text.style.opacity = loading ? "0.6" : "1";
  if (spin) spin.hidden = !loading;
}

function showMessage(text, isError = true) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
  messageEl.hidden = false;
}

function clearMessage() {
  messageEl.hidden = true;
  messageEl.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  clearMessage();
  resultEl.hidden = true;
  setLoading(fetchBtn, true);

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "Something went wrong.");
      return;
    }

    renderResult(data, url);
  } catch (err) {
    showMessage("Network error. Is the server running?");
  } finally {
    setLoading(fetchBtn, false);
  }
});

function renderResult(data, url) {
  currentUrl = url;

  thumb.src = data.thumbnail || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>";
  thumb.style.display = data.thumbnail ? "block" : "none";

  if (data.duration) {
    durationBadge.textContent = data.duration;
    durationBadge.hidden = false;
  } else {
    durationBadge.hidden = true;
  }

  titleEl.textContent = data.title;
  uploaderEl.textContent = data.uploader ? `by ${data.uploader}` : "";
  extractorEl.textContent = data.extractor || "media";

  qualitySelect.innerHTML = "";
  (data.options || []).forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.id;
    o.textContent = opt.note ? `${opt.label} — ${opt.note}` : opt.label;
    qualitySelect.appendChild(o);
  });

  dlNote.textContent = "";
  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

downloadBtn.addEventListener("click", async () => {
  if (!currentUrl) return;
  const choice = qualitySelect.value || "best";
  setLoading(downloadBtn, true);
  dlNote.textContent = "Preparing your download… this can take a moment for large files.";

  const params = new URLSearchParams({ url: currentUrl, choice });
  const downloadUrl = `/api/download?${params.toString()}`;

  try {
    // Use fetch so we can surface server-side errors instead of a blank tab.
    const res = await fetch(downloadUrl);
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      dlNote.textContent = "";
      showMessage(data.error || "Download failed.");
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    let filename = "download";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?\"?([^\";]+)/i);
    if (match) filename = decodeURIComponent(match[1]);

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    dlNote.textContent = "Done! Check your downloads folder.";
    clearMessage();
  } catch (err) {
    dlNote.textContent = "";
    showMessage("Download failed. Please try again.");
  } finally {
    setLoading(downloadBtn, false);
  }
});

export interface CmsSection {
  heading?: string;
  body: string;
}

/** Styled HTML block for platform/guide pages — paste into a section body. */
export const DOWNLOAD_FEATURES_HTML = `<div class="download-features">
  <div class="download-feature">
    <h3>Paste &amp; download</h3>
    <p>Copy any public video link, paste it above, and save to your device in seconds.</p>
  </div>
  <div class="download-feature">
    <h3>HD quality</h3>
    <p>Choose the resolution you need — from compact mobile sizes up to full HD.</p>
  </div>
  <div class="download-feature">
    <h3>Audio only</h3>
    <p>Extract MP3 audio when you only need the soundtrack or podcast.</p>
  </div>
  <div class="download-feature">
    <h3>No install</h3>
    <p>Works in your browser on phone, tablet, and desktop — nothing to install.</p>
  </div>
</div>`;

export const DOWNLOAD_HOWTO_HTML = `<div class="download-steps">
  <ol>
    <li><strong>Copy</strong> the video URL from your browser or app.</li>
    <li><strong>Paste</strong> it into the download box at the top of this page.</li>
    <li><strong>Pick</strong> video quality or audio-only, then click <span class="download-pill">Download</span>.</li>
    <li><strong>Save</strong> the file — it goes straight to your device; nothing is stored on our server.</li>
  </ol>
</div>`;

export function defaultGuideSections(): CmsSection[] {
  return [
    { heading: "How it works", body: DOWNLOAD_HOWTO_HTML },
    { heading: "Why use DownloadHub Pro", body: DOWNLOAD_FEATURES_HTML },
  ];
}

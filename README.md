# IPTV Streaming (small web app)

This is a minimal browser-based IPTV player that fetches an M3U playlist and plays HLS streams using Hls.js.

How to use

- Open `index.html` in a modern browser (Chrome/Edge/Firefox).
- The app fetches a public M3U (`https://iptv-org.github.io/iptv/index.m3u`) and lists channels.
- Click a channel to play it. Use the search box to filter channels.

Notes & limitations

- Many streams require CORS headers on the stream endpoints. If playback is blank or fails, the stream may not allow cross-origin playback.
- The app uses Hls.js for HLS playback. Some browsers (Safari) support HLS natively and will play via video element directly.
- Stream availability is out of this project's control. If a channel is offline or geo-restricted, playback will fail.

Improvements added

- More robust M3U parsing (reads `tvg-name` / `title` when present and fallback to display name).
- Debounced search to reduce re-rendering while typing.
- Refresh button to re-fetch playlist.
- Better Hls.js error handling: retry then fallback to setting `video.src`.
- Keyboard navigation and ARIA roles for accessibility.

Next suggested improvements

- Add virtualization for very large playlists.
- Add tests for the parser.
- Provide an option to load a custom M3U URL.


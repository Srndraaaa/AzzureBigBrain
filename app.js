const m3uUrl = 'https://iptv-org.github.io/iptv/index.m3u';
const channelsDiv = document.getElementById('channels');
const player = document.getElementById('player');
const searchInput = document.getElementById('search');
const refreshBtn = document.getElementById('refreshBtn');
const statusEl = document.getElementById('status');
let allChannels = [];
let playingIndex = -1;

async function fetchM3U(url) {
    const res = await fetch(url);
    const text = await res.text();
    return text;
}

function parseM3U(m3u) {
    // Robust M3U parser: look for EXTINF lines and the following non-comment as URL.
    // Also try to extract tvg-name or title from attributes if present.
    const lines = m3u.split(/\r?\n/);
    const channels = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith('#EXTINF')) {
            // Extract attributes inside EXTINF: e.g. #EXTINF:-1 tvg-id="..." tvg-name="Name" ,Display Name
            const attrPartMatch = line.match(/^#EXTINF:[^,]*\s+(.*),/);
            const afterCommaMatch = line.match(/,(.*)$/);
            let name = 'Unknown';
            if (afterCommaMatch && afterCommaMatch[1]) {
                name = afterCommaMatch[1].trim();
            }
            if (attrPartMatch && attrPartMatch[1]) {
                const attrs = attrPartMatch[1];
                const tvgNameMatch = attrs.match(/tvg-name\s*=\s*"([^"]+)"/i) || attrs.match(/tvg-name\s*=\s*([^\s\"]+)/i);
                const titleMatch = attrs.match(/title\s*=\s*"([^"]+)"/i);
                if (tvgNameMatch && tvgNameMatch[1]) name = tvgNameMatch[1];
                else if (titleMatch && titleMatch[1]) name = titleMatch[1];
            }

            // Next non-empty, non-comment line is the URL
            let url = '';
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j].trim();
                if (!next) continue;
                if (next.startsWith('#')) continue;
                url = next;
                break;
            }
            channels.push({ name, url });
        }
    }
    return channels.filter(c => c.url);
}

function renderChannels(channels) {
    channelsDiv.innerHTML = '';
    if (channels.length === 0) {
        channelsDiv.innerHTML = '<div class="text-center py-4">Tidak ada channel ditemukan.</div>';
        return;
    }
    channels.forEach((ch, idx) => {
        const div = document.createElement('div');
        div.className = 'channel';
        div.setAttribute('role', 'option');
        div.setAttribute('tabindex', '-1');
        div.dataset.index = idx;
        div.textContent = ch.name;
        div.onclick = () => selectChannel(idx, ch.url);
        div.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                selectChannel(idx, ch.url);
            }
        });
        channelsDiv.appendChild(div);
    });
    // If nothing is playing, start the first
    if (playingIndex === -1 && channels.length > 0) {
        selectChannel(0, channels[0].url);
    } else {
        // restore active class if index within range
        const active = channelsDiv.querySelector(`[data-index=\"${playingIndex}\"]`);
        if (active) active.classList.add('active');
    }
}

function selectChannel(idx, url) {
    // update active UI
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    const el = channelsDiv.querySelector(`[data-index=\"${idx}\"]`);
    if (el) {
        el.classList.add('active');
        el.focus();
    }
    playingIndex = idx;
    playChannel(url);
}

function playChannel(url) {
    statusEl.textContent = 'Memutar...';
    // clean up previous instance
    if (window.hls) {
        try { window.hls.destroy(); } catch (e) { /* ignore */ }
        window.hls = null;
    }
    // Helper to set src fallback
    const setSrcFallback = () => {
        try {
            player.src = url;
            player.play().catch(() => {});
            statusEl.textContent = 'Memutar (fallback). Jika blank, stream mungkin tidak support CORS atau bukan HLS.';
        } catch (e) {
            statusEl.textContent = 'Gagal memutar channel.';
        }
    };

    if (Hls && Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30 });
        window.hls = hls;
        let retryCount = 0;
        const maxRetries = 2;
        const tryLoad = () => {
            hls.loadSource(url);
            hls.attachMedia(player);
        };
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            statusEl.textContent = '';
            player.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.warn('HLS error', data);
            if (data.fatal) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    statusEl.textContent = `Terjadi kesalahan pemutaran, mencoba ulang (${retryCount}/${maxRetries})...`;
                    tryLoad();
                } else {
                    statusEl.textContent = 'Gagal memutar via HLS, mencoba fallback...';
                    try { hls.destroy(); } catch (e) {}
                    window.hls = null;
                    setSrcFallback();
                }
            }
        });
        tryLoad();
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.play().catch(() => {});
    } else {
        statusEl.textContent = '';
        alert('Browser Anda tidak mendukung pemutaran HLS.');
    }
}

// debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

const onSearch = debounce(function() {
    const q = this.value.trim().toLowerCase();
    const filtered = allChannels.filter(ch => ch.name.toLowerCase().includes(q));
    // reset playing index when filtering to avoid mismatch
    playingIndex = -1;
    renderChannels(filtered);
}, 200);

searchInput.addEventListener('input', onSearch);

// keyboard navigation for channels listbox
channelsDiv.addEventListener('keydown', (ev) => {
    const items = Array.from(channelsDiv.querySelectorAll('.channel'));
    if (!items.length) return;
    const activeIdx = items.findIndex(i => i.classList.contains('active'));
    if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = Math.min(items.length - 1, (activeIdx === -1 ? 0 : activeIdx + 1));
        const el = items[next];
        el.focus();
        el.click();
    } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const prev = Math.max(0, (activeIdx === -1 ? 0 : activeIdx - 1));
        const el = items[prev];
        el.focus();
        el.click();
    }
});

refreshBtn.addEventListener('click', () => {
    main(true);
});

async function main() {
    // if called with forceRefresh true, clear caches/state
    channelsDiv.innerHTML = '<div class="text-center py-4">Memuat channel...</div>';
    statusEl.textContent = 'Memuat daftar channel...';
    try {
        const m3u = await fetchM3U(m3uUrl + (Math.random() < 0.5 ? '' : ''));
        allChannels = parseM3U(m3u);
        if (allChannels.length === 0) {
            channelsDiv.innerHTML = '<div class="text-center py-4">Tidak ada channel ditemukan.</div>';
            statusEl.textContent = '';
            return;
        }
        // store original list for search reset
        renderChannels(allChannels);
        statusEl.textContent = '';
    } catch (e) {
        channelsDiv.innerHTML = '<div class="text-center py-4">Gagal memuat channel.</div>';
        statusEl.textContent = '';
        console.error('Gagal fetch M3U', e);
    }
}
main();

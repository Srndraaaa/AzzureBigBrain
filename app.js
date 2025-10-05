const m3uUrl = 'https://iptv-org.github.io/iptv/index.m3u';
const channelsDiv = document.getElementById('channels');
const player = document.getElementById('player');
const searchInput = document.getElementById('search');
let allChannels = [];

async function fetchM3U(url) {
    const res = await fetch(url);
    const text = await res.text();
    return text;
}

function parseM3U(m3u) {
    const lines = m3u.split(/\r?\n/);
    const channels = [];
    let current = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXTINF')) {
            const nameMatch = line.match(/,(.*)$/);
            current = { name: nameMatch ? nameMatch[1] : 'Unknown', url: '' };
        } else if (line && !line.startsWith('#')) {
            current.url = line;
            channels.push({ ...current });
        }
    }
    return channels;
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
        div.textContent = ch.name;
        div.onclick = () => {
            document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            playChannel(ch.url);
        };
        if (idx === 0) {
            div.classList.add('active');
            playChannel(ch.url);
        }
        channelsDiv.appendChild(div);
    });
}

function playChannel(url) {
    if (Hls.isSupported()) {
        if (window.hls) {
            window.hls.destroy();
        }
        window.hls = new Hls();
        window.hls.loadSource(url);
        window.hls.attachMedia(player);
        window.hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                window.hls.destroy();
            }
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
    } else {
        player.src = '';
        alert('Browser Anda tidak mendukung pemutaran HLS.');
    }
}

searchInput.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    const filtered = allChannels.filter(ch => ch.name.toLowerCase().includes(q));
    renderChannels(filtered);
});

async function main() {
    channelsDiv.innerHTML = '<div class="text-center py-4">Memuat channel...</div>';
    try {
        const m3u = await fetchM3U(m3uUrl);
        allChannels = parseM3U(m3u);
        if (allChannels.length === 0) {
            channelsDiv.innerHTML = '<div class="text-center py-4">Tidak ada channel ditemukan.</div>';
            return;
        }
        renderChannels(allChannels);
    } catch (e) {
        channelsDiv.innerHTML = '<div class="text-center py-4">Gagal memuat channel.</div>';
    }
}
main();

/**
 * SpacePlayer.js - Optimized Version
 */

class SpacePlayer {
    static ICONS = {
        arrow: '<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>',
        back: '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z"/></svg>',
        play: 'M8 5v14l11-7z',
        pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'
    };

    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.options = { src: '', poster: '', ...options };
        this.isDragging = false;
        this.panelH = 0;

        this.init();
    }

    init() {
        this.render();
        this.cacheDOM();
        this.bindEvents();
        this.initVideo();
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            .space-player-container { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; overflow: hidden; border-radius: 8px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8); cursor: pointer; user-select: none; font-family: "Pretendard Variable", sans-serif; color: #fff; }
            .night-mode-filter { position: absolute; inset: 0; background: rgba(255, 150, 0, 0.15); mix-blend-mode: multiply; pointer-events: none; z-index: 2; display: none; }
            .night-mode-active .night-mode-filter { display: block; }
            .space-video { width: 100%; height: 100%; object-fit: contain; display: block; }
            .space-controls-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 40%, transparent); padding: 0 20px 15px; opacity: 0; transform: translateY(10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; pointer-events: none; }
            .space-player-container:hover .space-controls-overlay, .space-player-container.paused .space-controls-overlay { opacity: 1; transform: translateY(0); pointer-events: auto; }
            .space-progress-area { position: relative; height: 4px; width: 100%; background: rgba(255,255,255,0.2); margin-bottom: 12px; cursor: pointer; transition: height 0.2s; display: flex; align-items: center; }
            .space-progress-area:hover { height: 10px; }
            .space-progress-bar { position: absolute; height: 100%; background: #ff0000; width: 0%; pointer-events: none; }
            .space-progress-bar::after { content: ''; position: absolute; right: -7px; top: 50%; transform: translateY(-50%) scale(0); width: 14px; height: 14px; background: #ff0000; border-radius: 50%; transition: transform 0.15s; }
            .space-progress-area:hover .space-progress-bar::after { transform: translateY(-50%) scale(1); }
            .progress-preview { position: absolute; bottom: 25px; left: 0; transform: translateX(-50%); width: 160px; aspect-ratio: 16 / 9; background: #000; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; display: none; pointer-events: none; overflow: hidden; z-index: 20; }
            .progress-preview canvas { width: 100%; height: 100%; object-fit: cover; }
            .progress-preview-time { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; font-size: 10px; color: #fff; }
            .space-controls-main, .space-left-controls, .space-right-controls { display: flex; align-items: center; }
            .space-controls-main { justify-content: space-between; }
            .space-left-controls, .space-right-controls { gap: 12px; }
            .control-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 50%; transition: 0.2s; }
            .control-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.1); }
            .control-btn svg { width: 26px; height: 26px; fill: #fff; }
            .space-time { font-size: 13px; margin-left: 8px; font-variant-numeric: tabular-nums; color: #ccc; }
            .volume-container { display: flex; align-items: center; width: 42px; overflow: hidden; transition: 0.3s; }
            .volume-container:hover { width: 130px; }
            .volume-slider { width: 70px; margin-left: 10px; height: 3px; -webkit-appearance: none; background: rgba(255,255,255,0.2); border-radius: 4px; outline: none; opacity: 0; transition: 0.2s; cursor: pointer; }
            .volume-container:hover .volume-slider { opacity: 1; }
            .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: #fff; border-radius: 50%; }
            .space-state-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; justify-content: center; align-items: center; opacity: 0; pointer-events: none; z-index: 5; backdrop-filter: blur(5px); }
            .space-state-indicator.animate { animation: feedback-pop 0.5s ease-out; }
            @keyframes feedback-pop { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); } }
            .settings-panel, .context-menu { position: absolute; background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); z-index: 100; overflow: hidden; }
            .settings-panel { bottom: 75px; right: 20px; width: 280px; display: none; transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
            .context-menu { width: 180px; display: none; padding: 4px; transform-origin: top left; }
            .setting-item, .context-item { padding: 10px 14px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.1s; border-radius: 4px; color: #ddd; margin-bottom: 2px; }
            .setting-item:hover, .context-item:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
            .context-item.active { color: #ff0000; font-weight: 600; }
            .context-item.sep { border-top: 1px solid rgba(255,255,255,0.08); margin-top: 4px; padding-top: 10px; pointer-events: none; color: #555; font-size: 10px; justify-content: center; letter-spacing: 2px; font-weight: 700; }
            .settings-wrapper { display: flex; width: 200%; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .settings-wrapper.slide-active { transform: translateX(-50%); }
            .settings-column { width: 50%; display: flex; flex-direction: column; padding: 6px; }
            .settings-header { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #fff; }
            .settings-header:hover { background: rgba(255,255,255,0.05); }
            .settings-header svg { width: 18px; height: 18px; fill: #fff; }
            .val { color: #888; font-size: 12px; display: flex; align-items: center; gap: 6px; }
            .val svg { width: 12px; height: 12px; fill: #666; }
            .submenu-container { display: none; width: 100%; }
            .submenu-container.active { display: block; }
            .hide { display: none !important; }
        `;
        document.head.appendChild(style);

        this.container.classList.add('space-player-container', 'paused');
        this.container.innerHTML = `
            <div class="night-mode-filter"></div>
            <video class="space-video" src="${this.options.src}" poster="${this.options.poster}" playsinline crossorigin="anonymous"></video>
            <div class="space-state-indicator"><svg viewBox="0 0 24 24" class="indicator-icon" fill="white" width="40" height="40"></svg></div>
            <div class="space-controls-overlay">
                <div class="space-progress-area">
                    <div class="space-progress-bar"></div>
                    <div class="progress-preview">
                        <canvas></canvas>
                        <div class="progress-preview-time">0:00</div>
                    </div>
                </div>
                <div class="space-controls-main">
                    <div class="space-left-controls">
                        <button class="control-btn play-pause-btn">
                            <svg viewBox="0 0 24 24" class="play-icon"><path d="${SpacePlayer.ICONS.play}"/></svg>
                            <svg viewBox="0 0 24 24" class="pause-icon hide"><path d="${SpacePlayer.ICONS.pause}"/></svg>
                        </button>
                        <div class="volume-container">
                            <button class="control-btn mute-btn">
                                <svg viewBox="0 0 24 24" class="vol-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                            </button>
                            <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1">
                        </div>
                        <div class="space-time"><span class="current-time">0:00</span> / <span class="duration-time">0:00</span></div>
                    </div>
                    <div class="space-right-controls">
                        <button class="control-btn setting-btn"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
                        <button class="control-btn full-screen-btn"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                    </div>
                </div>
            </div>
            <div class="context-menu">
                <div class="context-item ctx-screenshot">화면 캡처</div>
                <div class="context-item ctx-night">야간 모드 필터</div>
                <div class="context-item ctx-loop">루프 무한 재생</div>
                <div class="context-item sep">SPACEPLAYER.JS</div>
            </div>
            <div class="settings-panel">
                <div class="settings-wrapper">
                    <div class="settings-column main-menu-column">
                        <div class="setting-item" data-sub="speedSub"><span>재생 속도</span><span class="val cur-speed">보통 ${SpacePlayer.ICONS.arrow}</span></div>
                        <div class="setting-item" data-sub="qualSub"><span>화질</span><span class="val cur-qual">1080p ${SpacePlayer.ICONS.arrow}</span></div>
                        <div class="setting-item loop-toggle"><span>루프 재생</span><span class="val loop-label">끔 ${SpacePlayer.ICONS.arrow}</span></div>
                    </div>
                    <div class="settings-column">
                        <div class="submenu-container speed-sub" id="speedSub">
                            <div class="settings-header back-btn">${SpacePlayer.ICONS.back} 재생 속도</div>
                            ${[0.5, 0.75, 1, 1.5, 2].map(v => `<div class="setting-item opt-s" data-v="${v}">${v === 1 ? '보통 (1x)' : v + 'x'}</div>`).join('')}
                        </div>
                        <div class="submenu-container qual-sub" id="qualSub">
                            <div class="settings-header back-btn">${SpacePlayer.ICONS.back} 화질</div>
                            ${['1080p (HD)', '720p', '480p', '자동'].map(v => `<div class="setting-item opt-q" data-v="${v.split(' ')[0]}">${v}</div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <video class="hidden-video" style="display:none;" crossorigin="anonymous"></video>
        `;
    }

    cacheDOM() {
        const c = this.container;
        const qs = s => c.querySelector(s);
        
        this.dom = {
            video: qs('.space-video'),
            hiddenVideo: qs('.hidden-video'),
            progressBar: qs('.space-progress-bar'),
            progressArea: qs('.space-progress-area'),
            preview: qs('.progress-preview'),
            previewCanvas: qs('.progress-preview canvas'),
            previewTime: qs('.progress-preview-time'),
            indicator: qs('.space-state-indicator'),
            indicatorIcon: qs('.indicator-icon'),
            settingsPanel: qs('.settings-panel'),
            settingsWrapper: qs('.settings-wrapper'),
            contextMenu: qs('.context-menu'),
            currentTime: qs('.current-time'),
            durationTime: qs('.duration-time'),
            playIcon: qs('.play-icon'),
            pauseIcon: qs('.pause-icon')
        };
    }

    bindEvents() {
        const { dom } = this;
        
        // 재생 관련
        this.container.onclick = e => {
            if (!e.target.closest('.space-controls-overlay, .settings-panel, .context-menu')) this.togglePlay();
        };
        this.container.querySelector('.play-pause-btn').onclick = e => { e.stopPropagation(); this.togglePlay(); };

        // 볼륨
        const vSlider = this.container.querySelector('.volume-slider');
        vSlider.oninput = e => {
            dom.video.volume = e.target.value;
            dom.video.muted = (dom.video.volume === 0);
        };

        // 전체화면
        this.container.querySelector('.full-screen-btn').onclick = () => {
            if (!document.fullscreenElement) this.container.requestFullscreen();
            else document.exitFullscreen();
        };

        // 탐색 바 (이벤트 리스너 통합)
        const handleSeek = e => { if (this.isDragging) this.seek(e); };
        dom.progressArea.onmousedown = e => { this.isDragging = true; this.seek(e); this.updatePreview(e); };
        window.addEventListener('mousemove', handleSeek);
        window.addEventListener('mouseup', () => this.isDragging = false);
        dom.progressArea.onmousemove = e => this.updatePreview(e);
        dom.progressArea.onmouseleave = () => { if (!this.isDragging) dom.preview.style.display = 'none'; };

        // 설정 패널 및 서브메뉴
        this.container.querySelector('.setting-btn').onclick = e => {
            e.stopPropagation();
            const isHidden = getComputedStyle(dom.settingsPanel).display === 'none';
            dom.settingsPanel.style.display = isHidden ? 'block' : 'none';
            dom.contextMenu.style.display = 'none';
            if (isHidden) {
                if (!this.panelH) this.panelH = this.container.querySelector('.main-menu-column').offsetHeight;
                dom.settingsPanel.style.height = `${this.panelH}px`;
                dom.settingsWrapper.classList.remove('slide-active');
            }
        };

        this.container.querySelectorAll('.setting-item[data-sub]').forEach(item => {
            item.onclick = e => {
                e.stopPropagation();
                const sub = this.container.querySelector(`#${item.dataset.sub}`);
                this.container.querySelectorAll('.submenu-container').forEach(el => el.classList.remove('active'));
                sub.classList.add('active');
                dom.settingsWrapper.classList.add('slide-active');
                dom.settingsPanel.style.height = `${sub.scrollHeight + 12}px`;
            };
        });

        this.container.querySelectorAll('.back-btn').forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                dom.settingsWrapper.classList.remove('slide-active');
                dom.settingsPanel.style.height = `${this.panelH}px`;
            };
        });

        // 기능별 핸들러
        this.container.querySelectorAll('.opt-s').forEach(opt => {
            opt.onclick = () => {
                const v = parseFloat(opt.dataset.v);
                dom.video.playbackRate = v;
                this.container.querySelector('.cur-speed').innerHTML = (v === 1 ? '보통' : v + 'x') + SpacePlayer.ICONS.arrow;
                this.container.querySelector('.back-btn').click();
            };
        });

        const toggleLoop = () => {
            dom.video.loop = !dom.video.loop;
            this.container.querySelector('.loop-label').innerHTML = (dom.video.loop ? '켬' : '끔') + SpacePlayer.ICONS.arrow;
            this.container.querySelector('.ctx-loop').classList.toggle('active', dom.video.loop);
        };

        this.container.querySelector('.loop-toggle').onclick = e => { e.stopPropagation(); toggleLoop(); };
        this.container.querySelector('.ctx-loop').onclick = e => { e.stopPropagation(); toggleLoop(); dom.contextMenu.style.display = 'none'; };

        // 우클릭 메뉴
        this.container.oncontextmenu = e => {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            let x = Math.min(e.clientX - rect.left, rect.width - 180);
            let y = Math.min(e.clientY - rect.top, rect.height - 160);
            Object.assign(dom.contextMenu.style, { left: `${x}px`, top: `${y}px`, display: 'block' });
            dom.settingsPanel.style.display = 'none';
        };

        this.container.querySelector('.ctx-screenshot').onclick = e => {
            e.stopPropagation();
            const canvas = document.createElement('canvas');
            [canvas.width, canvas.height] = [dom.video.videoWidth, dom.video.videoHeight];
            canvas.getContext('2d').drawImage(dom.video, 0, 0);
            const link = document.createElement('a');
            link.download = `Shot_${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            dom.contextMenu.style.display = 'none';
        };

        this.container.querySelector('.ctx-night').onclick = e => {
            e.stopPropagation();
            const active = this.container.classList.toggle('night-mode-active');
            e.target.classList.toggle('active', active);
            dom.contextMenu.style.display = 'none';
        };

        document.addEventListener('click', () => {
            dom.settingsPanel.style.display = dom.contextMenu.style.display = 'none';
        });

        document.addEventListener('keydown', e => {
            if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                this.togglePlay();
            }
        });
    }

    initVideo() {
        const { dom } = this;
        dom.video.ontimeupdate = () => {
            if (!dom.video.duration || this.isDragging) return;
            const ratio = (dom.video.currentTime / dom.video.duration) * 100;
            dom.progressBar.style.width = `${ratio}%`;
            dom.currentTime.textContent = this.formatTime(dom.video.currentTime);
        };

        dom.video.onloadedmetadata = () => {
            dom.durationTime.textContent = this.formatTime(dom.video.duration);
            dom.hiddenVideo.src = dom.video.src;
        };

        dom.hiddenVideo.onseeked = () => {
            const ctx = dom.previewCanvas.getContext('2d');
            dom.previewCanvas.width = 160; dom.previewCanvas.height = 90;
            ctx.drawImage(dom.hiddenVideo, 0, 0, 160, 90);
        };
    }

    togglePlay() {
        const { dom } = this;
        const isPaused = dom.video.paused;
        isPaused ? dom.video.play() : dom.video.pause();
        
        this.container.classList.toggle('paused', !isPaused);
        dom.playIcon.classList.toggle('hide', isPaused);
        dom.pauseIcon.classList.toggle('hide', !isPaused);
        this.showIndicator(isPaused ? SpacePlayer.ICONS.pause : SpacePlayer.ICONS.play);
    }

    showIndicator(path) {
        this.dom.indicatorIcon.innerHTML = `<path d="${path}"/>`;
        this.dom.indicator.classList.remove('animate');
        void this.dom.indicator.offsetWidth;
        this.dom.indicator.classList.add('animate');
    }

    seek(e) {
        const rect = this.dom.progressArea.getBoundingClientRect();
        const x = Math.max(0, Math.min((e.clientX || e.touches?.[0].clientX) - rect.left, rect.width));
        const ratio = x / rect.width;
        this.dom.video.currentTime = ratio * this.dom.video.duration;
        this.dom.progressBar.style.width = `${ratio * 100}%`;
    }

    updatePreview(e) {
        const { dom } = this;
        const rect = dom.progressArea.getBoundingClientRect();
        const x = Math.max(0, Math.min((e.clientX || e.touches?.[0].clientX) - rect.left, rect.width));
        const targetTime = dom.video.duration * (x / rect.width);
        
        dom.preview.style.left = `${x}px`;
        dom.preview.style.display = 'block';
        dom.previewTime.textContent = this.formatTime(targetTime);
        dom.hiddenVideo.currentTime = targetTime;
    }

    formatTime(t) {
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

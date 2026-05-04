/**
 * SpacePlayer.js - Enhanced Video UX Library with Ads Support
 * 기능: 야간 모드, 스냅샷 미리보기, 설정 패널, 우클릭 메뉴, 프리롤/미드롤 광고
 */

class SpacePlayer {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.options = {
            src: options.src || '',
            poster: options.poster || '',
            ads: options.ads || [], // [{time: 0, src: '', link: '', skipTime: 5}]
            ...options
        };

        this.isAdPlaying = false;
        this.currentAd = null;
        this.adsQueue = [...this.options.ads].sort((a, b) => a.time - b.time);
        
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
            
            /* 광고 레이어 */
            .ad-layer { position: absolute; inset: 0; z-index: 50; display: none; background: #000; }
            .ad-layer.active { display: block; }
            .ad-video { width: 100%; height: 100%; object-fit: contain; }
            .ad-info { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.6); padding: 5px 12px; border-radius: 4px; font-size: 12px; border: 1px solid rgba(255,255,255,0.2); }
            .ad-skip-btn { position: absolute; bottom: 80px; right: 0; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 12px 24px; cursor: not-allowed; opacity: 0.6; transition: 0.3s; pointer-events: none; }
            .ad-skip-btn.available { cursor: pointer; opacity: 1; pointer-events: auto; background: #fff; color: #000; }
            .ad-link-overlay { position: absolute; inset: 0; z-index: 51; cursor: pointer; }

            .space-controls-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 40%, transparent); padding: 0 20px 15px; opacity: 0; transform: translateY(10px); transition: all 0.3s ease; z-index: 10; pointer-events: none; }
            .space-player-container:hover .space-controls-overlay, .space-player-container.paused .space-controls-overlay { opacity: 1; transform: translateY(0); pointer-events: auto; }
            .is-ad-playing .space-controls-overlay { display: none !important; }

            .space-progress-area { position: relative; height: 4px; width: 100%; background: rgba(255,255,255,0.2); margin-bottom: 12px; cursor: pointer; transition: height 0.2s; display: flex; align-items: center; }
            .space-progress-area:hover { height: 10px; }
            .space-progress-bar { position: absolute; height: 100%; background: #ff0000; width: 0%; pointer-events: none; }
            .progress-preview { position: absolute; bottom: 25px; left: 0; transform: translateX(-50%); width: 160px; aspect-ratio: 16 / 9; background: #000; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; display: none; pointer-events: none; overflow: hidden; z-index: 20; }
            .progress-preview canvas { width: 100%; height: 100%; object-fit: cover; }
            .progress-preview-time { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; font-size: 10px; color: #fff; }
            
            .space-controls-main { display: flex; justify-content: space-between; align-items: center; }
            .space-left-controls, .space-right-controls { display: flex; align-items: center; gap: 12px; }
            .control-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 50%; transition: 0.2s; }
            .control-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.1); }
            .control-btn svg { width: 26px; height: 26px; fill: #fff; }
            .space-time { font-size: 13px; margin-left: 8px; color: #ccc; }
            
            .volume-container { display: flex; align-items: center; width: 42px; overflow: hidden; transition: 0.3s; }
            .volume-container:hover { width: 130px; }
            .volume-slider { width: 70px; margin-left: 10px; height: 3px; -webkit-appearance: none; background: rgba(255,255,255,0.2); outline: none; opacity: 0; transition: 0.2s; }
            .volume-container:hover .volume-slider { opacity: 1; }

            .space-state-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(0,0,0,0.6); border-radius: 50%; display: flex; justify-content: center; align-items: center; opacity: 0; pointer-events: none; z-index: 5; }
            .space-state-indicator.animate { animation: feedback-pop 0.5s ease-out; }
            @keyframes feedback-pop { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } 50% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); } }

            .settings-panel, .context-menu { position: absolute; background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; z-index: 100; display: none; }
            .settings-panel { bottom: 75px; right: 20px; width: 280px; overflow: hidden; }
            .context-menu { width: 180px; padding: 4px; }
            .setting-item, .context-item { padding: 10px 14px; font-size: 13px; cursor: pointer; color: #ddd; display: flex; justify-content: space-between; align-items: center; }
            .setting-item:hover, .context-item:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
            .context-item.active { color: #ff0000; }
            .sep { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 5px; padding-top: 5px; font-size: 10px; text-align: center; color: #555; }
            
            .settings-wrapper { display: flex; width: 200%; transition: transform 0.3s; }
            .settings-wrapper.slide-active { transform: translateX(-50%); }
            .settings-column { width: 50%; padding: 6px; }
            .hide { display: none !important; }
        `;
        document.head.appendChild(style);

        const arrowSvg = `<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>`;
        const backSvg = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z"/></svg>`;

        this.container.classList.add('space-player-container', 'paused');
        this.container.innerHTML = `
            <div class="night-mode-filter"></div>
            
            <!-- 메인 비디오 -->
            <video class="space-video" src="${this.options.src}" poster="${this.options.poster}" playsinline crossorigin="anonymous"></video>
            
            <!-- 광고 레이어 -->
            <div class="ad-layer">
                <div class="ad-link-overlay"></div>
                <video class="ad-video" crossorigin="anonymous"></video>
                <div class="ad-info">광고 상영 중</div>
                <button class="ad-skip-btn">광고 건너뛰기</button>
            </div>

            <div class="space-state-indicator"><svg viewBox="0 0 24 24" class="indicator-icon" fill="white" width="40" height="40"></svg></div>
            
            <div class="space-controls-overlay">
                <div class="space-progress-area">
                    <div class="space-progress-bar"></div>
                    <div class="progress-preview"><canvas></canvas><div class="progress-preview-time">0:00</div></div>
                </div>
                <div class="space-controls-main">
                    <div class="space-left-controls">
                        <button class="control-btn play-pause-btn">
                            <svg viewBox="0 0 24 24" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
                            <svg viewBox="0 0 24 24" class="pause-icon hide"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </button>
                        <div class="volume-container">
                            <button class="control-btn mute-btn"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></button>
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
                        <div class="setting-item" data-sub="speedSub"><span>재생 속도</span><span class="val cur-speed">보통 ${arrowSvg}</span></div>
                        <div class="setting-item loop-toggle"><span>루프 재생</span><span class="val loop-label">끔 ${arrowSvg}</span></div>
                    </div>
                    <div class="settings-column">
                        <div class="submenu-container speed-sub">
                            <div class="settings-header back-btn" style="padding:10px; cursor:pointer;">${backSvg} 재생 속도</div>
                            <div class="setting-item opt-s" data-v="0.5">0.5x</div>
                            <div class="setting-item opt-s" data-v="1">보통 (1x)</div>
                            <div class="setting-item opt-s" data-v="1.5">1.5x</div>
                            <div class="setting-item opt-s" data-v="2">2x</div>
                        </div>
                    </div>
                </div>
            </div>
            <video class="hidden-video" style="display:none;" crossorigin="anonymous"></video>
        `;
    }

    cacheDOM() {
        const c = this.container;
        this.video = c.querySelector('.space-video');
        this.hiddenVideo = c.querySelector('.hidden-video');
        this.progressBar = c.querySelector('.space-progress-bar');
        this.progressArea = c.querySelector('.space-progress-area');
        this.preview = c.querySelector('.progress-preview');
        this.previewCanvas = c.querySelector('.progress-preview canvas');
        this.previewTime = c.querySelector('.progress-preview-time');
        this.indicator = c.querySelector('.space-state-indicator');
        this.indicatorIcon = c.querySelector('.indicator-icon');
        this.settingsPanel = c.querySelector('.settings-panel');
        this.settingsWrapper = c.querySelector('.settings-wrapper');
        this.contextMenu = c.querySelector('.context-menu');
        
        // 광고 관련
        this.adLayer = c.querySelector('.ad-layer');
        this.adVideo = c.querySelector('.ad-video');
        this.adSkipBtn = c.querySelector('.ad-skip-btn');
        this.adLinkOverlay = c.querySelector('.ad-link-overlay');
        this.adInfo = c.querySelector('.ad-info');
    }

    bindEvents() {
        const c = this.container;

        // 재생 토글
        c.querySelector('.play-pause-btn').onclick = e => { e.stopPropagation(); this.togglePlay(); };
        this.video.onclick = () => this.togglePlay();

        // 볼륨
        const vSlider = c.querySelector('.volume-slider');
        vSlider.oninput = e => { this.video.volume = e.target.value; };

        // 전체화면
        c.querySelector('.full-screen-btn').onclick = () => {
            if (!document.fullscreenElement) this.container.requestFullscreen();
            else document.exitFullscreen();
        };

        // 탐색
        this.progressArea.onmousedown = e => { this.isDragging = true; this.seek(e); };
        window.addEventListener('mousemove', e => { if (this.isDragging) this.seek(e); });
        window.addEventListener('mouseup', () => { this.isDragging = false; });
        this.progressArea.onmousemove = e => this.updatePreview(e);
        this.progressArea.onmouseleave = () => { this.preview.style.display = 'none'; };

        // 설정 창
        c.querySelector('.setting-btn').onclick = e => {
            e.stopPropagation();
            this.settingsPanel.style.display = this.settingsPanel.style.display === 'block' ? 'none' : 'block';
        };

        // 재생 속도
        c.querySelectorAll('.opt-s').forEach(opt => opt.onclick = () => {
            const v = parseFloat(opt.dataset.v);
            this.video.playbackRate = v;
            c.querySelector('.cur-speed').textContent = v === 1 ? '보통' : v + 'x';
            this.settingsPanel.style.display = 'none';
        });

        // 우클릭 메뉴
        c.oncontextmenu = e => {
            e.preventDefault();
            this.contextMenu.style.left = `${e.offsetX}px`;
            this.contextMenu.style.top = `${e.offsetY}px`;
            this.contextMenu.style.display = 'block';
        };

        c.querySelector('.ctx-screenshot').onclick = () => this.takeScreenshot();

        // 광고 관련 이벤트
        this.adSkipBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.adSkipBtn.classList.contains('available')) this.finishAd();
        };

        this.adLinkOverlay.onclick = () => {
            if (this.currentAd?.link) window.open(this.currentAd.link, '_blank');
        };

        this.adVideo.onended = () => this.finishAd();

        document.addEventListener('click', () => {
            this.contextMenu.style.display = 'none';
        });
    }

    initVideo() {
        this.video.ontimeupdate = () => {
            this.checkAds();
            if (this.video.duration) {
                const ratio = (this.video.currentTime / this.video.duration) * 100;
                this.progressBar.style.width = `${ratio}%`;
                this.container.querySelector('.current-time').textContent = this.formatTime(this.video.currentTime);
            }
        };

        this.video.onloadedmetadata = () => {
            this.container.querySelector('.duration-time').textContent = this.formatTime(this.video.duration);
            this.hiddenVideo.src = this.video.src;
        };

        this.hiddenVideo.onseeked = () => {
            const ctx = this.previewCanvas.getContext('2d');
            this.previewCanvas.width = 160; this.previewCanvas.height = 90;
            ctx.drawImage(this.hiddenVideo, 0, 0, 160, 90);
        };
    }

    /**
     * 광고 로직
     */
    checkAds() {
        if (this.isAdPlaying) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        const adIndex = this.adsQueue.findIndex(ad => ad.time <= currentTime);

        if (adIndex !== -1) {
            this.currentAd = this.adsQueue.splice(adIndex, 1)[0];
            this.playAd(this.currentAd);
        }
    }

    playAd(ad) {
        this.isAdPlaying = true;
        this.video.pause();
        this.container.classList.add('is-ad-playing');
        this.adLayer.classList.add('active');
        
        this.adVideo.src = ad.src;
        this.adVideo.play();

        // 스킵 버튼 카운트다운
        let timeLeft = ad.skipTime || 5;
        this.adSkipBtn.classList.remove('available');
        this.adSkipBtn.textContent = `광고 건너뛰기 (${timeLeft})`;

        const timer = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.adSkipBtn.classList.add('available');
                this.adSkipBtn.textContent = `광고 건너뛰기 ➔`;
            } else {
                this.adSkipBtn.textContent = `광고 건너뛰기 (${timeLeft})`;
            }
        }, 1000);
        
        this.adTimer = timer;
    }

    finishAd() {
        clearInterval(this.adTimer);
        this.isAdPlaying = false;
        this.adVideo.pause();
        this.adLayer.classList.remove('active');
        this.container.classList.remove('is-ad-playing');
        this.video.play();
        this.container.classList.remove('paused');
    }

    /**
     * 유틸리티
     */
    togglePlay() {
        if (this.isAdPlaying) return;
        const isPaused = this.video.paused;
        isPaused ? this.video.play() : this.video.pause();
        this.container.classList.toggle('paused', !isPaused);
        this.container.querySelector('.play-icon').classList.toggle('hide', isPaused);
        this.container.querySelector('.pause-icon').classList.toggle('hide', !isPaused);
        this.showIndicator(isPaused ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z');
    }

    showIndicator(d) {
        this.indicatorIcon.innerHTML = `<path d="${d}"/>`;
        this.indicator.classList.remove('animate');
        void this.indicator.offsetWidth;
        this.indicator.classList.add('animate');
    }

    seek(e) {
        if (this.isAdPlaying) return;
        const rect = this.progressArea.getBoundingClientRect();
        const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
        this.video.currentTime = ratio * this.video.duration;
    }

    updatePreview(e) {
        const rect = this.progressArea.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        this.preview.style.left = `${e.clientX - rect.left}px`;
        this.preview.style.display = 'block';
        this.previewTime.textContent = this.formatTime(this.video.duration * ratio);
        this.hiddenVideo.currentTime = this.video.duration * ratio;
    }

    takeScreenshot() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth; canvas.height = this.video.videoHeight;
        canvas.getContext('2d').drawImage(this.video, 0, 0);
        const link = document.createElement('a');
        link.download = `SpaceShot_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    formatTime(t) {
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return `${m}:${s < 10 ? '0' + s : s}`;
    }
}

/**
 * SpacePlayer.js - Enhanced Video UX Library with Ads System
 * 기능: 야간 모드, 스냅샷 미리보기, 설정 패널, 우클릭 메뉴, 프리롤 광고 시스템
 */

class SpacePlayer {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.options = {
            src: options.src || '',
            poster: options.poster || '',
            ad: {
                enabled: options.ad?.enabled || false,
                src: options.ad?.src || '',
                link: options.ad?.link || 'https://google.com',
                skipTime: options.ad?.skipTime || 5
            },
            ...options
        };

        this.isAdPlaying = false;
        this.adTimer = null;
        this.init();
    }

    init() {
        this.render();
        this.cacheDOM();
        this.bindEvents();
        this.initVideo();
        
        if (this.options.ad.enabled && this.options.ad.src) {
            this.startAd();
        }
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            .space-player-container { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; overflow: hidden; border-radius: 8px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8); cursor: pointer; user-select: none; font-family: "Pretendard Variable", sans-serif; color: #fff; }
            .night-mode-filter { position: absolute; inset: 0; background: rgba(255, 150, 0, 0.15); mix-blend-mode: multiply; pointer-events: none; z-index: 2; display: none; }
            .night-mode-active .night-mode-filter { display: block; }
            .space-video { width: 100%; height: 100%; object-fit: contain; display: block; }
            
            /* 광고 UI */
            .ad-layer { position: absolute; inset: 0; z-index: 50; display: none; }
            .ad-playing .ad-layer { display: block; }
            .ad-badge { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.6); padding: 4px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); font-size: 12px; display: flex; align-items: center; gap: 8px; pointer-events: none; }
            .ad-badge::before { content: ''; width: 8px; height: 8px; background: #fbc02d; border-radius: 50%; }
            .ad-skip-container { position: absolute; bottom: 80px; right: 0; pointer-events: auto; }
            .ad-skip-btn { background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.2); border-right: none; color: #fff; padding: 12px 24px; font-size: 16px; cursor: not-allowed; opacity: 0.8; transition: 0.2s; display: flex; align-items: center; gap: 10px; border-radius: 4px 0 0 4px; }
            .ad-skip-btn.active { cursor: pointer; opacity: 1; background: #000; }
            .ad-skip-btn.active:hover { background: #222; }
            .ad-link-overlay { position: absolute; inset: 0; cursor: pointer; z-index: 49; }

            /* 컨트롤러 및 기타 */
            .space-controls-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 40%, transparent); padding: 0 20px 15px; opacity: 0; transform: translateY(10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; pointer-events: none; }
            .space-player-container:hover .space-controls-overlay, .space-player-container.paused .space-controls-overlay { opacity: 1; transform: translateY(0); pointer-events: auto; }
            .ad-playing .space-progress-area { pointer-events: none; opacity: 0.5; }
            .space-progress-area { position: relative; height: 4px; width: 100%; background: rgba(255,255,255,0.2); margin-bottom: 12px; cursor: pointer; transition: height 0.2s; display: flex; align-items: center; }
            .space-progress-area:hover { height: 10px; }
            .space-progress-bar { position: absolute; height: 100%; background: #ff0000; width: 0%; pointer-events: none; }
            .ad-playing .space-progress-bar { background: #fbc02d; }
            .progress-preview { position: absolute; bottom: 25px; left: 0; transform: translateX(-50%); width: 160px; aspect-ratio: 16 / 9; background: #000; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; display: none; pointer-events: none; overflow: hidden; z-index: 20; }
            .progress-preview canvas { width: 100%; height: 100%; object-fit: cover; }
            .space-controls-main, .space-left-controls, .space-right-controls { display: flex; align-items: center; }
            .space-controls-main { justify-content: space-between; }
            .space-left-controls, .space-right-controls { gap: 12px; }
            .control-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 50%; transition: 0.2s; }
            .control-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.1); }
            .control-btn svg { width: 26px; height: 26px; fill: #fff; }
            .volume-container { display: flex; align-items: center; width: 42px; overflow: hidden; transition: 0.3s; }
            .volume-container:hover { width: 130px; }
            .volume-slider { width: 70px; margin-left: 10px; height: 3px; -webkit-appearance: none; background: rgba(255,255,255,0.2); outline: none; cursor: pointer; }
            .settings-panel, .context-menu { position: absolute; background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; z-index: 100; display: none; }
            .setting-item, .context-item { padding: 10px 14px; font-size: 13px; cursor: pointer; color: #ddd; }
            .setting-item:hover, .context-item:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
            .hide { display: none !important; }
        `;
        document.head.appendChild(style);

        const arrowSvg = `<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>`;
        const backSvg = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z"/></svg>`;

        this.container.classList.add('space-player-container', 'paused');
        this.container.innerHTML = `
            <div class="night-mode-filter"></div>
            <video class="space-video" src="${this.options.src}" poster="${this.options.poster}" playsinline crossorigin="anonymous"></video>
            
            <!-- 광고 레이어 -->
            <div class="ad-layer">
                <div class="ad-link-overlay"></div>
                <div class="ad-badge">광고 • <span class="ad-timer">0:00</span></div>
                <div class="ad-skip-container">
                    <button class="ad-skip-btn">
                        <span class="skip-text">${this.options.ad.skipTime}초 후 건너뛰기</span>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M5 13h11.17l-4.88 4.88c-.39.39-.39 1.03 0 1.42s1.02.39 1.41 0l6.59-6.59c.39-.39.39-1.02 0-1.41l-6.58-6.6c-.39-.39-1.03-.39-1.42 0s-.39 1.02 0 1.41L16.17 11H5c-.55 0-1 .45-1 1s.45 1 1 1z"/></svg>
                    </button>
                </div>
            </div>

            <div class="space-state-indicator" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;"><svg class="indicator-icon" width="40" height="40" fill="white"></svg></div>
            
            <div class="space-controls-overlay">
                <div class="space-progress-area">
                    <div class="space-progress-bar"></div>
                    <div class="progress-preview"><canvas></canvas><div class="progress-preview-time" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);font-size:10px;">0:00</div></div>
                </div>
                <div class="space-controls-main">
                    <div class="space-left-controls">
                        <button class="control-btn play-pause-btn">
                            <svg viewBox="0 0 24 24" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
                            <svg viewBox="0 0 24 24" class="pause-icon hide"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </button>
                        <div class="volume-container">
                            <button class="control-btn mute-btn"><svg viewBox="0 0 24 24" class="vol-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></button>
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

            <div class="context-menu" style="width:180px; padding:4px;">
                <div class="context-item ctx-screenshot">화면 캡처</div>
                <div class="context-item ctx-night">야간 모드 필터</div>
                <div class="context-item ctx-loop">루프 무한 재생</div>
            </div>

            <div class="settings-panel" style="bottom: 75px; right: 20px; width: 260px;">
                <div class="setting-item loop-toggle"><span>루프 재생</span> <span class="loop-label">끔</span></div>
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
        this.adLayer = c.querySelector('.ad-layer');
        this.adTimerText = c.querySelector('.ad-timer');
        this.adSkipBtn = c.querySelector('.ad-skip-btn');
        this.adSkipText = c.querySelector('.skip-text');
        this.settingsPanel = c.querySelector('.settings-panel');
        this.contextMenu = c.querySelector('.context-menu');
    }

    startAd() {
        this.isAdPlaying = true;
        this.container.classList.add('ad-playing');
        this.originalSrc = this.options.src;
        this.video.src = this.options.ad.src;
        this.video.load();
        this.video.play();

        let timeLeft = this.options.ad.skipTime;
        this.adSkipText.textContent = `${timeLeft}초 후 건너뛰기`;
        
        this.adTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                this.adSkipText.textContent = `${timeLeft}초 후 건너뛰기`;
            } else {
                this.adSkipBtn.classList.add('active');
                this.adSkipText.textContent = `광고 건너뛰기`;
                clearInterval(this.adTimer);
            }
        }, 1000);
    }

    endAd() {
        clearInterval(this.adTimer);
        this.isAdPlaying = false;
        this.container.classList.remove('ad-playing');
        this.video.src = this.originalSrc;
        this.video.load();
        this.video.play();
        this.container.classList.remove('paused');
    }

    bindEvents() {
        const c = this.container;

        // 재생/일시정지
        c.querySelector('.play-pause-btn').onclick = e => { e.stopPropagation(); this.togglePlay(); };
        
        // 광고 클릭 (랜딩 페이지)
        c.querySelector('.ad-link-overlay').onclick = () => {
            window.open(this.options.ad.link, '_blank');
        };

        // 광고 건너뛰기
        this.adSkipBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.adSkipBtn.classList.contains('active')) {
                this.endAd();
            }
        };

        // 볼륨
        const vSlider = c.querySelector('.volume-slider');
        vSlider.oninput = e => {
            this.video.volume = e.target.value;
        };

        // 프로그레스 바 탐색 (광고 중에는 비활성화)
        this.progressArea.onclick = e => {
            if (this.isAdPlaying) return;
            const rect = this.progressArea.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            this.video.currentTime = ratio * this.video.duration;
        };

        // 설정 & 컨텍스트 메뉴 생략 (기존 로직 유지 가능)
        c.querySelector('.setting-btn').onclick = e => {
            e.stopPropagation();
            this.settingsPanel.style.display = this.settingsPanel.style.display === 'block' ? 'none' : 'block';
        };

        // 비디오 종료 시 처리
        this.video.onended = () => {
            if (this.isAdPlaying) {
                this.endAd();
            }
        };
    }

    initVideo() {
        this.video.ontimeupdate = () => {
            if (this.isAdPlaying) {
                const remains = Math.ceil(this.video.duration - this.video.currentTime);
                this.adTimerText.textContent = this.formatTime(this.video.currentTime);
            }
            const ratio = (this.video.currentTime / this.video.duration) * 100;
            this.progressBar.style.width = `${ratio}%`;
            this.container.querySelector('.current-time').textContent = this.formatTime(this.video.currentTime);
        };

        this.video.onloadedmetadata = () => {
            this.container.querySelector('.duration-time').textContent = this.formatTime(this.video.duration);
        };
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play();
            this.container.classList.remove('paused');
        } else {
            this.video.pause();
            this.container.classList.add('paused');
        }
        this.container.querySelector('.play-icon').classList.toggle('hide', !this.video.paused);
        this.container.querySelector('.pause-icon').classList.toggle('hide', this.video.paused);
    }

    formatTime(t) {
        if (isNaN(t)) return "0:00";
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return `${m}:${s < 10 ? '0' + s : s}`;
    }
}

/**
 * SpacePlayer.js - Subtitle Enhanced Version
 */

class SpacePlayer {
    static ICONS = {
        arrow: '<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>',
        back: '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z"/></svg>',
        play: 'M8 5v14l11-7z',
        pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
        subtitle: '<svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>'
    };

    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.options = { 
            src: '', 
            poster: '', 
            subtitles: [], // [{ label: 'Korean', src: '...', lang: 'ko' }]
            ...options 
        };

        this.isDragging = false;
        this.panelH = 0;
        this.parsedSubtitles = [];
        this.currentSubIndex = -1;

        this.init();
    }

    init() {
        this.render();
        this.cacheDOM();
        this.bindEvents();
        this.initVideo();
        if (this.options.subtitles.length > 0) {
            this.loadSubtitle(0);
        }
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            .space-player-container { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; overflow: hidden; border-radius: 8px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8); cursor: pointer; user-select: none; font-family: "Pretendard Variable", sans-serif; color: #fff; }
            .night-mode-filter { position: absolute; inset: 0; background: rgba(255, 150, 0, 0.15); mix-blend-mode: multiply; pointer-events: none; z-index: 2; display: none; }
            .night-mode-active .night-mode-filter { display: block; }
            .space-video { width: 100%; height: 100%; object-fit: contain; display: block; }
            
            /* 자막 스타일 */
            .subtitle-overlay { position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); width: 90%; text-align: center; pointer-events: none; z-index: 8; transition: bottom 0.3s; }
            .subtitle-text { display: inline-block; padding: 4px 12px; background: rgba(0,0,0,0.7); border-radius: 4px; font-size: 20px; line-height: 1.4; white-space: pre-wrap; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
            
            .space-controls-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 40%, transparent); padding: 0 20px 15px; opacity: 0; transform: translateY(10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; pointer-events: none; }
            .space-player-container:hover .space-controls-overlay, .space-player-container.paused .space-controls-overlay { opacity: 1; transform: translateY(0); pointer-events: auto; }
            .space-player-container:hover .subtitle-overlay { bottom: 85px; }

            .space-progress-area { position: relative; height: 4px; width: 100%; background: rgba(255,255,255,0.2); margin-bottom: 12px; cursor: pointer; transition: height 0.2s; display: flex; align-items: center; }
            .space-progress-area:hover { height: 10px; }
            .space-progress-bar { position: absolute; height: 100%; background: #ff0000; width: 0%; pointer-events: none; }
            
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

            .settings-panel, .context-menu { position: absolute; background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); z-index: 100; overflow: hidden; }
            .settings-panel { bottom: 75px; right: 20px; width: 280px; display: none; transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
            .setting-item { padding: 10px 14px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.1s; border-radius: 4px; color: #ddd; margin-bottom: 2px; }
            .setting-item:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
            .setting-item.active { color: #ff0000; font-weight: 600; }
            
            .settings-wrapper { display: flex; width: 200%; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .settings-wrapper.slide-active { transform: translateX(-50%); }
            .settings-column { width: 50%; display: flex; flex-direction: column; padding: 6px; }
            .settings-header { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #fff; }
            .val { color: #888; font-size: 12px; display: flex; align-items: center; gap: 6px; }
            .val svg { width: 12px; height: 12px; fill: #666; }
            
            .submenu-container { display: none; width: 100%; }
            .submenu-container.active { display: block; }
            .hide { display: none !important; }

            /* 상태 표시기 */
            .space-state-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; justify-content: center; align-items: center; opacity: 0; pointer-events: none; z-index: 5; backdrop-filter: blur(5px); }
            .space-state-indicator.animate { animation: feedback-pop 0.5s ease-out; }
            @keyframes feedback-pop { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); } }
        `;
        document.head.appendChild(style);

        this.container.classList.add('space-player-container', 'paused');
        this.container.innerHTML = `
            <div class="night-mode-filter"></div>
            <video class="space-video" src="${this.options.src}" poster="${this.options.poster}" playsinline crossorigin="anonymous"></video>
            
            <div class="subtitle-overlay">
                <div class="subtitle-text"></div>
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
                            <svg viewBox="0 0 24 24" class="play-icon"><path d="${SpacePlayer.ICONS.play}"/></svg>
                            <svg viewBox="0 0 24 24" class="pause-icon hide"><path d="${SpacePlayer.ICONS.pause}"/></svg>
                        </button>
                        <div class="volume-container">
                            <button class="control-btn mute-btn"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></button>
                            <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1">
                        </div>
                        <div class="space-time"><span class="current-time">0:00</span> / <span class="duration-time">0:00</span></div>
                    </div>
                    <div class="space-right-controls">
                        <button class="control-btn sub-toggle-btn">${SpacePlayer.ICONS.subtitle}</button>
                        <button class="control-btn setting-btn"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
                        <button class="control-btn full-screen-btn"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                    </div>
                </div>
            </div>

            <div class="settings-panel">
                <div class="settings-wrapper">
                    <div class="settings-column main-menu-column">
                        <div class="setting-item" data-sub="subChooseSub"><span>자막 선택</span><span class="val cur-sub-label">끄기 ${SpacePlayer.ICONS.arrow}</span></div>
                        <div class="setting-item" data-sub="subSizeSub"><span>자막 크기</span><span class="val cur-sub-size">보통 ${SpacePlayer.ICONS.arrow}</span></div>
                        <div class="setting-item" data-sub="speedSub"><span>재생 속도</span><span class="val cur-speed">보통 ${SpacePlayer.ICONS.arrow}</span></div>
                    </div>
                    <div class="settings-column">
                        <div class="submenu-container" id="subChooseSub">
                            <div class="settings-header back-btn">${SpacePlayer.ICONS.back} 자막 선택</div>
                            <div class="setting-item opt-sub-off active" data-idx="-1">끄기</div>
                            ${this.options.subtitles.map((s, i) => `<div class="setting-item opt-sub" data-idx="${i}">${s.label}</div>`).join('')}
                        </div>
                        <div class="submenu-container" id="subSizeSub">
                            <div class="settings-header back-btn">${SpacePlayer.ICONS.back} 자막 크기</div>
                            <div class="setting-item opt-sub-size" data-size="14px">작게</div>
                            <div class="setting-item opt-sub-size active" data-size="20px">보통</div>
                            <div class="setting-item opt-sub-size" data-size="28px">크게</div>
                            <div class="setting-item opt-sub-size" data-size="36px">매우 크게</div>
                        </div>
                        <div class="submenu-container" id="speedSub">
                            <div class="settings-header back-btn">${SpacePlayer.ICONS.back} 재생 속도</div>
                            ${[0.5, 0.75, 1, 1.5, 2].map(v => `<div class="setting-item opt-s" data-v="${v}">${v === 1 ? '보통' : v + 'x'}</div>`).join('')}
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
            currentTime: qs('.current-time'),
            durationTime: qs('.duration-time'),
            playIcon: qs('.play-icon'),
            pauseIcon: qs('.pause-icon'),
            subOverlay: qs('.subtitle-overlay'),
            subText: qs('.subtitle-text')
        };
    }

    bindEvents() {
        const { dom } = this;

        this.container.onclick = e => {
            if (!e.target.closest('.space-controls-overlay, .settings-panel')) this.togglePlay();
        };

        // 자막 빠른 토글 (아이콘 클릭)
        this.container.querySelector('.sub-toggle-btn').onclick = e => {
            e.stopPropagation();
            if (this.currentSubIndex === -1 && this.options.subtitles.length > 0) {
                this.loadSubtitle(0);
            } else {
                this.disableSubtitle();
            }
        };

        // 설정 패널 로직
        this.container.querySelector('.setting-btn').onclick = e => {
            e.stopPropagation();
            const isHidden = getComputedStyle(dom.settingsPanel).display === 'none';
            dom.settingsPanel.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                this.panelH = this.container.querySelector('.main-menu-column').offsetHeight + 12;
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

        // 자막 선택 이벤트
        this.container.querySelectorAll('.opt-sub').forEach(opt => {
            opt.onclick = () => {
                const idx = parseInt(opt.dataset.idx);
                this.loadSubtitle(idx);
                this.updateActiveItem('.opt-sub', opt);
                this.container.querySelector('.back-btn').click();
            };
        });

        this.container.querySelector('.opt-sub-off').onclick = (e) => {
            this.disableSubtitle();
            this.updateActiveItem('.opt-sub', e.target);
            this.container.querySelector('.back-btn').click();
        };

        // 자막 크기 조절
        this.container.querySelectorAll('.opt-sub-size').forEach(opt => {
            opt.onclick = () => {
                const size = opt.dataset.size;
                dom.subText.style.fontSize = size;
                this.container.querySelector('.cur-sub-size').innerHTML = opt.innerText + SpacePlayer.ICONS.arrow;
                this.updateActiveItem('.opt-sub-size', opt);
            };
        });

        // 재생 속도
        this.container.querySelectorAll('.opt-s').forEach(opt => {
            opt.onclick = () => {
                const v = parseFloat(opt.dataset.v);
                dom.video.playbackRate = v;
                this.container.querySelector('.cur-speed').innerHTML = (v === 1 ? '보통' : v + 'x') + SpacePlayer.ICONS.arrow;
                this.container.querySelector('.back-btn').click();
            };
        });

        // 탐색 및 프로그레스
        const handleSeek = e => { if (this.isDragging) this.seek(e); };
        dom.progressArea.onmousedown = e => { this.isDragging = true; this.seek(e); };
        window.addEventListener('mousemove', handleSeek);
        window.addEventListener('mouseup', () => this.isDragging = false);
        dom.progressArea.onmousemove = e => this.updatePreview(e);
        dom.progressArea.onmouseleave = () => dom.preview.style.display = 'none';

        // 볼륨
        const vSlider = this.container.querySelector('.volume-slider');
        vSlider.oninput = e => { dom.video.volume = e.target.value; dom.video.muted = (e.target.value == 0); };

        // 전체화면
        this.container.querySelector('.full-screen-btn').onclick = () => {
            if (!document.fullscreenElement) this.container.requestFullscreen();
            else document.exitFullscreen();
        };

        document.addEventListener('click', () => dom.settingsPanel.style.display = 'none');
    }

    initVideo() {
        const { dom } = this;
        dom.video.ontimeupdate = () => {
            if (!dom.video.duration) return;
            const ratio = (dom.video.currentTime / dom.video.duration) * 100;
            dom.progressBar.style.width = `${ratio}%`;
            dom.currentTime.textContent = this.formatTime(dom.video.currentTime);
            this.updateSubtitle();
        };
        dom.video.onloadedmetadata = () => {
            dom.durationTime.textContent = this.formatTime(dom.video.duration);
            dom.hiddenVideo.src = dom.video.src;
        };
    }

    async loadSubtitle(index) {
        const subInfo = this.options.subtitles[index];
        if (!subInfo) return;

        try {
            const response = await fetch(subInfo.src);
            const text = await response.text();
            this.parsedSubtitles = this.parseSubtitle(text);
            this.currentSubIndex = index;
            this.container.querySelector('.cur-sub-label').innerHTML = subInfo.label + SpacePlayer.ICONS.arrow;
            this.dom.subOverlay.style.display = 'block';
        } catch (err) {
            console.error("Subtitle load error:", err);
        }
    }

    disableSubtitle() {
        this.currentSubIndex = -1;
        this.parsedSubtitles = [];
        this.dom.subText.textContent = '';
        this.dom.subOverlay.style.display = 'none';
        this.container.querySelector('.cur-sub-label').innerHTML = '끄기 ' + SpacePlayer.ICONS.arrow;
    }

    parseSubtitle(data) {
        // SRT & VTT 통합 파서
        const sections = data.replace(/\r/g, '').split(/\n\s*\n/);
        return sections.map(section => {
            const lines = section.split('\n').filter(l => l.trim() !== '');
            if (lines.length < 2) return null;
            
            const timeLine = lines.find(l => l.includes('-->'));
            if (!timeLine) return null;

            const [start, end] = timeLine.split('-->').map(t => this.parseTimestamp(t.trim()));
            const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n').replace(/<[^>]*>/g, '');

            return { start, end, text };
        }).filter(s => s !== null);
    }

    parseTimestamp(s) {
        const parts = s.split(':');
        let sec = 0;
        if (parts.length === 3) {
            sec = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2].replace(',', '.'));
        } else {
            sec = parseFloat(parts[0]) * 60 + parseFloat(parts[1].replace(',', '.'));
        }
        return sec;
    }

    updateSubtitle() {
        if (this.currentSubIndex === -1) return;
        const now = this.dom.video.currentTime;
        const active = this.parsedSubtitles.find(s => now >= s.start && now <= s.end);
        this.dom.subText.textContent = active ? active.text : '';
        this.dom.subText.style.display = active ? 'inline-block' : 'none';
    }

    togglePlay() {
        const { dom } = this;
        const isPaused = dom.video.paused;
        isPaused ? dom.video.play() : dom.video.pause();
        this.container.classList.toggle('paused', !isPaused);
        dom.playIcon.classList.toggle('hide', isPaused);
        dom.pauseIcon.classList.toggle('hide', !isPaused);
        this.showIndicator(isPaused ? SpacePlayer.ICONS.play.match(/d="([^"]*)"/)[1] : SpacePlayer.ICONS.pause.match(/d="([^"]*)"/)[1]);
    }

    showIndicator(path) {
        this.dom.indicatorIcon.innerHTML = `<path d="${path}"/>`;
        this.dom.indicator.classList.remove('animate');
        void this.dom.indicator.offsetWidth;
        this.dom.indicator.classList.add('animate');
    }

    updateActiveItem(selector, target) {
        this.container.querySelectorAll(selector).forEach(el => el.classList.remove('active'));
        target.classList.add('active');
    }

    seek(e) {
        const rect = this.dom.progressArea.getBoundingClientRect();
        const x = Math.max(0, Math.min((e.clientX || e.touches?.[0].clientX) - rect.left, rect.width));
        const ratio = x / rect.width;
        this.dom.video.currentTime = ratio * this.dom.video.duration;
    }

    updatePreview(e) {
        const { dom } = this;
        const rect = dom.progressArea.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        dom.preview.style.left = `${x}px`;
        dom.preview.style.display = 'block';
        dom.previewTime.textContent = this.formatTime(dom.video.duration * (x / rect.width));
    }

    formatTime(t) {
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

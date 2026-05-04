/**
 * SpacePlayer.js v1.0.0
 * Lightweight, Customizable Video Player Library
 */
(function (global) {
    'use strict';

    const DEFAULT_OPTIONS = {
        container: null,
        src: '',
        themeColor: '#ff0000',
        poster: '',
        autoplay: false,
        loop: false,
        volume: 1.0,
        playbackRates: [0.5, 0.75, 1, 1.5, 2]
    };

    class SpacePlayer {
        constructor(userOptions) {
            this.options = { ...DEFAULT_OPTIONS, ...userOptions };
            this.container = typeof this.options.container === 'string' 
                ? document.querySelector(this.options.container) 
                : this.options.container;

            if (!this.container) {
                console.error('SpacePlayer: Container not found.');
                return;
            }

            this.init();
        }

        init() {
            this._injectStyles();
            this._render();
            this._cacheElements();
            this._setupEvents();
            this._initVideo();
        }

        // CSS 주입 (라이브러리 사용자가 따로 CSS를 불러올 필요 없게 함)
        _injectStyles() {
            if (document.getElementById('space-player-core-style')) return;
            const style = document.createElement('style');
            style.id = 'space-player-core-style';
            style.textContent = `
                .space-player-root { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden; border-radius: 8px; font-family: sans-serif; color: #fff; user-select: none; }
                .space-v-el { width: 100%; height: 100%; display: block; object-fit: contain; }
                .space-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(transparent, rgba(0,0,0,0.7)); opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 10; }
                .space-player-root:hover .space-overlay, .space-player-root.paused .space-overlay { opacity: 1; pointer-events: auto; }
                .space-progress-wrap { padding: 0 15px; cursor: pointer; }
                .space-progress-bg { position: relative; width: 100%; height: 4px; background: rgba(255,255,255,0.3); transition: height 0.2s; }
                .space-progress-wrap:hover .space-progress-bg { height: 8px; }
                .space-progress-fill { position: absolute; height: 100%; background: ${this.options.themeColor}; width: 0%; }
                .space-controls { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; }
                .space-btn { background: none; border: none; cursor: pointer; padding: 5px; display: flex; align-items: center; justify-content: center; transition: transform 0.1s; }
                .space-btn:active { transform: scale(0.9); }
                .space-btn svg { width: 28px; height: 28px; fill: #fff; }
                .space-side { display: flex; align-items: center; gap: 15px; }
                .space-time { font-size: 13px; font-variant-numeric: tabular-nums; }
                .space-hidden { display: none !important; }
                .space-night-filter { position: absolute; inset: 0; background: rgba(255, 150, 0, 0.15); mix-blend-mode: multiply; pointer-events: none; z-index: 5; display: none; }
                .night-active .space-night-filter { display: block; }
                .space-context { position: absolute; background: rgba(15,15,15,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 5px; z-index: 100; display: none; min-width: 140px; }
                .space-context-item { padding: 8px 12px; font-size: 12px; cursor: pointer; border-radius: 3px; }
                .space-context-item:hover { background: rgba(255,255,255,0.1); }
            `;
            document.head.appendChild(style);
        }

        _render() {
            this.container.classList.add('space-player-root', 'paused');
            this.container.innerHTML = `
                <div class="space-night-filter"></div>
                <video class="space-v-el" src="${this.options.src}" poster="${this.options.poster}" playsinline></video>
                <div class="space-overlay">
                    <div class="space-progress-wrap">
                        <div class="space-progress-bg"><div class="space-progress-fill"></div></div>
                    </div>
                    <div class="space-controls">
                        <div class="space-side">
                            <button class="space-btn btn-toggle">
                                <svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                <svg class="icon-pause space-hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            </button>
                            <div class="space-time"><span class="curr-t">0:00</span> / <span class="dur-t">0:00</span></div>
                        </div>
                        <div class="space-side">
                            <button class="space-btn btn-full"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                        </div>
                    </div>
                </div>
                <div class="space-context">
                    <div class="space-context-item item-shot">📸 화면 캡처</div>
                    <div class="space-context-item item-night">🌙 야간 모드</div>
                </div>
            `;
        }

        _cacheElements() {
            this.video = this.container.querySelector('.space-v-el');
            this.progressFill = this.container.querySelector('.space-progress-fill');
            this.btnToggle = this.container.querySelector('.btn-toggle');
            this.contextMenu = this.container.querySelector('.space-context');
        }

        _setupEvents() {
            // 재생/일시정지
            const toggle = () => this.video.paused ? this.play() : this.pause();
            this.btnToggle.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
            this.video.addEventListener('click', toggle);

            // 시간 업데이트
            this.video.addEventListener('timeupdate', () => {
                const percent = (this.video.currentTime / this.video.duration) * 100;
                this.progressFill.style.width = `${percent}%`;
                this.container.querySelector('.curr-t').innerText = this._formatTime(this.video.currentTime);
            });

            this.video.addEventListener('loadedmetadata', () => {
                this.container.querySelector('.dur-t').innerText = this._formatTime(this.video.duration);
            });

            // 전체화면
            this.container.querySelector('.btn-full').onclick = () => {
                if (!document.fullscreenElement) this.container.requestFullscreen();
                else document.exitFullscreen();
            };

            // 우클릭 메뉴
            this.container.oncontextmenu = (e) => {
                e.preventDefault();
                this.contextMenu.style.left = `${e.offsetX}px`;
                this.contextMenu.style.top = `${e.offsetY}px`;
                this.contextMenu.style.display = 'block';
            };

            document.addEventListener('click', () => this.contextMenu.style.display = 'none');
            
            this.container.querySelector('.item-shot').onclick = () => this.screenshot();
            this.container.querySelector('.item-night').onclick = () => {
                this.container.classList.toggle('night-active');
            };
        }

        _initVideo() {
            this.video.volume = this.options.volume;
            this.video.loop = this.options.loop;
            if (this.options.autoplay) this.play();
        }

        _formatTime(sec) {
            const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
            return `${m}:${s < 10 ? '0' + s : s}`;
        }

        // Public API (외부에서 호출 가능)
        play() {
            this.video.play();
            this.container.classList.remove('paused');
            this.btnToggle.querySelector('.icon-play').classList.add('space-hidden');
            this.btnToggle.querySelector('.icon-pause').classList.remove('space-hidden');
        }

        pause() {
            this.video.pause();
            this.container.classList.add('paused');
            this.btnToggle.querySelector('.icon-play').classList.remove('space-hidden');
            this.btnToggle.querySelector('.icon-pause').classList.add('space-hidden');
        }

        screenshot() {
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            canvas.getContext('2d').drawImage(this.video, 0, 0);
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = 'space-snapshot.png';
            a.click();
        }
    }

    // 전역에 노출
    global.SpacePlayer = SpacePlayer;

})(typeof window !== 'undefined' ? window : this);

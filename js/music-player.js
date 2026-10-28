
"use strict";

// 기존에 알려준 YouTube 링크
const VIDEO_ID = "Aa9YmR8SdeA";
const PLAYLIST_ID = "RDAa9YmR8SdeA";

// HTML 요소
const overlay = document.getElementById("musicPlayerOverlay");
const openButton = document.getElementById("openMusicPlayer");
const closeButton = document.getElementById("closeMusicPlayer");
const playButton = document.getElementById("toggleMusic");
const backwardButton = document.getElementById("backwardMusic");
const forwardButton = document.getElementById("forwardMusic");
const statusText = document.getElementById("musicPlayerStatus");
const topButton = document.getElementById("topButton");
const playerPanel = document.querySelector(".music-player-panel");

let player = null;
let playerReady = false;
let apiRequested = false;
let usingFallbackVideo = false;
let previousFocus = null;
let isPlayerOpen = false;

// 상태 메시지 표시
function setStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
}

// 재생 관련 버튼 활성화
function setControlsEnabled(enabled) {
    [playButton, backwardButton, forwardButton].forEach((button) => {
        if (button) {
            button.disabled = !enabled;
        }
    });
}

// YouTube IFrame API 불러오기
function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
        createPlayer();
        return;
    }

    if (apiRequested) {
        return;
    }

    apiRequested = true;

    // API가 아직 로드되지 않았을 때만 스크립트 추가
    const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
            setStatus("YouTube API를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
        };

        document.head.appendChild(script);
    }

    // YouTube API 로드 완료 콜백
    window.onYouTubeIframeAPIReady = createPlayer;
}

// YouTube 플레이어 생성
function createPlayer() {
    if (player || !window.YT || !window.YT.Player) {
        return;
    }

    player = new YT.Player("youtubePlayer", {
        width: "100%",
        height: "100%",

        // 재생목록을 우선 사용
        playerVars: {
            listType: "playlist",
            list: PLAYLIST_ID,
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0
        },

        events: {
            onReady: handlePlayerReady,
            onStateChange: handlePlayerStateChange,
            onError: handlePlayerError
        }
    });
}

// 플레이어 준비 완료
function handlePlayerReady() {
    playerReady = true;
    setControlsEnabled(true);
    setStatus("준비 완료! 재생 버튼을 눌러 음악을 들어 보세요.");
}

// 재생 상태 변경
function handlePlayerStateChange(event) {
    if (!window.YT || !window.YT.PlayerState) {
        return;
    }

    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
        playButton.textContent = "Ⅱ";
        playButton.setAttribute("aria-label", "일시정지");
        setStatus("음악을 재생하고 있습니다.");
    } else if (state === YT.PlayerState.PAUSED) {
        playButton.textContent = "▶";
        playButton.setAttribute("aria-label", "재생");
        setStatus("음악이 일시정지되었습니다.");
    } else if (state === YT.PlayerState.ENDED) {
        playButton.textContent = "▶";
        playButton.setAttribute("aria-label", "재생");
        setStatus("재생이 끝났습니다.");
    } else if (state === YT.PlayerState.BUFFERING) {
        setStatus("음악을 불러오는 중입니다...");
    } else if (state === YT.PlayerState.CUED) {
        setStatus("준비 완료! 재생 버튼을 눌러 음악을 들어 보세요.");
    }
}

// 재생목록 또는 영상 오류 처리
function handlePlayerError(event) {
    const errorCode = event.data;

    // 재생목록 오류가 발생하면 개별 영상으로 한 번 대체
    if (!usingFallbackVideo && playerReady &&
        [2, 5, 100, 101, 150, 152].includes(errorCode)) {

        usingFallbackVideo = true;
        setStatus("재생목록을 사용할 수 없어 개별 영상으로 전환합니다.");

        player.cueVideoById({
            videoId: VIDEO_ID,
            startSeconds: 0
        });

        return;
    }

    const messages = {
        2: "영상 ID가 올바르지 않습니다.",
        5: "브라우저에서 영상을 재생할 수 없습니다.",
        100: "영상을 찾을 수 없거나 삭제되었습니다.",
        101: "이 영상은 외부 사이트 재생을 허용하지 않습니다.",
        150: "이 영상은 외부 사이트 재생을 허용하지 않습니다.",
        152: "이 영상은 외부 사이트 재생을 허용하지 않습니다."
    };

    setStatus(
        messages[errorCode] ||
        "음악을 재생하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
}

// 플레이어 열기
function openMusicPlayer() {
    if (!overlay) {
        return;
    }

    previousFocus = document.activeElement;
    isPlayerOpen = true;

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("music-player-open");

    if (playerPanel) {
        playerPanel.focus();
    }

    if (!playerReady) {
        setStatus("음악 플레이어를 준비하고 있습니다...");
        loadYouTubeAPI();
    }
}

// 플레이어 닫기
function closeMusicPlayer() {
    if (!overlay) {
        return;
    }

    isPlayerOpen = false;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("music-player-open");

    // 팝업을 닫으면 음악도 정지
    if (playerReady && player) {
        player.pauseVideo();
    }

    if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
    }
}

// 재생 / 일시정지
function togglePlayback() {
    if (!playerReady || !player) {
        setStatus("플레이어가 아직 준비되지 않았습니다.");
        return;
    }

    const state = player.getPlayerState();

    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

// 현재 위치에서 10초 이동
function seekBy(seconds) {
    if (!playerReady || !player) {
        return;
    }

    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    const targetTime = Math.max(0, currentTime + seconds);

    if (duration > 0) {
        player.seekTo(Math.min(targetTime, duration), true);
    } else {
        player.seekTo(targetTime, true);
    }
}

// 이벤트 등록
if (openButton) {
    openButton.addEventListener("click", openMusicPlayer);
}

if (closeButton) {
    closeButton.addEventListener("click", closeMusicPlayer);
}

if (playButton) {
    playButton.addEventListener("click", togglePlayback);
}

if (backwardButton) {
    backwardButton.addEventListener("click", () => seekBy(-10));
}

if (forwardButton) {
    forwardButton.addEventListener("click", () => seekBy(10));
}

// 팝업 바깥 영역 클릭 시 닫기
if (overlay) {
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeMusicPlayer();
        }
    });
}

// ESC 키로 팝업 닫기
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isPlayerOpen) {
        closeMusicPlayer();
    }
});

// TOP 버튼
if (topButton) {
    topButton.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            topButton.classList.add("is-visible");
        } else {
            topButton.classList.remove("is-visible");
        }
    }, { passive: true });
}

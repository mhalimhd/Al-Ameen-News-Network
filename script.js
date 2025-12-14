// Application State
let activeFeed = [];
let archiveFeed = [];
let navigationStack = [];
let notificationEnabled = false;
let textLargeEnabled = false;
let hlsInstance = null;
let currentPosts = [];
let lastNewsNotifiedId = null;
let currentLanguage = localStorage.getItem('language') || 'ar';
let translationCache = {};
let currentVideoQuality = localStorage.getItem('videoQuality') || 'auto';
let autoPlayEnabled = localStorage.getItem('autoPlay') !== 'false';
let prayerReminderEnabled = localStorage.getItem('prayerReminderEnabled') === 'true' || false;
let prayerTimeouts = [];
let currentPrayerTimes = null;

// Live TV Channels Configuration
const channels = {
    'manar': {
        name: 'قناة المنار',
        url: 'https://edge.fastpublish.me/live/index.m3u8',
        type: 'hls',
        info: ''
    },
    'alsirat': {
        name: 'قناة الصراط',
        url: 'https://softverse.b-cdn.net/Assirat/assiratobs/playlist.m3u8',
        type: 'hls',
        info: ''
    }
};

// WhatsApp Groups
const whatsappGroups = [
    { id: 'group1', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة 1', link: 'https://chat.whatsapp.com/BA0OwUVau0X6Ca6ry6nH4n?mode=wwt' },
    { id: 'group2', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة 2', link: 'https://chat.whatsapp.com/Gk2KAtVDBYd6kpVHhQGfCu?mode=wwt' },
    { id: 'group3', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة 3', link: 'https://chat.whatsapp.com/E34HwvabBsq6lUvvLQbF9d?mode=wwt' },
    { id: 'group4', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة 4', link: 'https://chat.whatsapp.com/EuxeuDEKlt5DXqtFjWZLDM?mode=wwt' },
    { id: 'group5', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة 5', link: 'https://chat.whatsapp.com/GKkWCOhCQLtLySayVptWcL?mode=wwt' },
    { id: 'group6', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة 6', link: 'https://chat.whatsapp.com/HpfK44hNFi4AcZ3n047ISQ' },
    { id: 'group7', name: 'شَبَكَةْ الأَمِيْن الإِخْبَاْرِيْة     7', link: 'https://chat.whatsapp.com/Kzeme0fMPJO3AqVVhHqy5V?mode=wwt' }
];

document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    loadUserPreferences();
    await initializeApp();

    // Check if URL has ?article=ID
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get("article");

    if (articleId) {
        openArticle(parseInt(articleId));
    } else {
        renderHome();
    }
});

window.onpopstate = function(event) {
    if (event.state && event.state.articleId) {
        openArticle(event.state.articleId);
    } else {
        switchTab('home');
    }
};

// Setup Event Listeners    
function setupEventListeners() {
    // Settings toggles
    const notifToggle = document.getElementById('notif-toggle');
    const textToggle = document.getElementById('text-toggle');
    const langToggle = document.getElementById('lang-toggle');
    const autoplayToggle = document.getElementById('autoplay-toggle');
    const videoQuality = document.getElementById('video-quality');
    const prayerToggle = document.getElementById('prayer-reminder-toggle');
    
    if (notifToggle) notifToggle.addEventListener('change', handleNotificationToggle);
    if (textToggle) textToggle.addEventListener('change', handleTextSizeToggle);
    if (langToggle) langToggle.addEventListener('change', handleLanguageToggle);
    if (autoplayToggle) autoplayToggle.addEventListener('change', handleAutoPlayToggle);
    if (videoQuality) videoQuality.addEventListener('change', handleVideoQualityChange);
    if (prayerToggle) prayerToggle.addEventListener('change', handlePrayerReminderToggle);
    
    // Video controls
    const btnPlay = document.getElementById('btn-play');
    const btnMute = document.getElementById('btn-mute');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const volSlider = document.getElementById('vol-slider');
    
    if (btnPlay) btnPlay.addEventListener('click', togglePlayPause);
    if (btnMute) btnMute.addEventListener('click', toggleMute);
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
    if (volSlider) volSlider.addEventListener('input', handleVolumeChange);
}

// Load User Preferences
function loadUserPreferences() {
    prayerReminderEnabled = localStorage.getItem('prayerReminderEnabled') === 'true' || false;
    textLargeEnabled = localStorage.getItem('textLargeEnabled') === 'true';
    notificationEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    currentLanguage = localStorage.getItem('language') || 'ar';
    currentVideoQuality = localStorage.getItem('videoQuality') || 'auto';
    autoPlayEnabled = localStorage.getItem('autoPlay') !== 'false';

    if (notificationEnabled && !checkNotificationPermission()) {
        notificationEnabled = false;
        localStorage.setItem('notificationsEnabled', false);
    }
    
    if (prayerReminderEnabled && !checkNotificationPermission()) {
        prayerReminderEnabled = false;
        localStorage.setItem('prayerReminderEnabled', false);
    }

    const prayerToggle = document.getElementById('prayer-reminder-toggle');
    const textToggle = document.getElementById('text-toggle');
    const notifToggle = document.getElementById('notif-toggle');
    const langToggle = document.getElementById('lang-toggle');
    const autoplayToggle = document.getElementById('autoplay-toggle');
    const videoQuality = document.getElementById('video-quality');
    
    if (prayerToggle) prayerToggle.checked = prayerReminderEnabled;
    if (textToggle) textToggle.checked = textLargeEnabled;
    if (notifToggle) notifToggle.checked = notificationEnabled;
    if (langToggle) langToggle.checked = currentLanguage === 'en';
    if (autoplayToggle) autoplayToggle.checked = autoPlayEnabled;
    if (videoQuality) videoQuality.value = currentVideoQuality;

    toggleTextSize(textLargeEnabled);
    updateLanguageLabel();
}

// Initialize Application
async function initializeApp() {
    await loadPostsFromBackend();
    renderHome();
    
    setupMarquee();
    loadPrayerTimes(); // Loads Beirut times
    updateClock();
    setInterval(updateClock, 1000);
    
    setTimeout(() => {
        showToast("السلام عليكم", "في شبكة الأمين الإخبارية");
    }, 1000);
}

// Load Posts from Backend
async function loadPostsFromBackend() {
    try {
        const response = await fetch('api/get_posts.php?limit=50');
        const data = await response.json();
        
        if (data.success) {
            currentPosts = data.posts;
            filterArticlesByDate();
            setupMarquee();
            checkForBreakingNews();
        } else {
            // No success flag, handle empty
            currentPosts = [];
            filterArticlesByDate();
            setupMarquee();
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        // Fallback to empty, NO SAMPLES
        currentPosts = [];
        filterArticlesByDate();
        setupMarquee();
    }
}

// Helper: Convert digits to Arabic-Indic
function toArabicNumerals(str) {
    if (!str) return '';
    return str.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// Filter Articles by Date
function filterArticlesByDate() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    activeFeed = currentPosts.filter(post => 
        new Date(post.created_at) >= sevenDaysAgo && 
        post.status === 'published'
    );
    
    archiveFeed = currentPosts.filter(post => 
        new Date(post.created_at) < sevenDaysAgo || 
        post.status === 'archived'
    );
}

// Render Home Page
function renderHome() {
    const heroContainer = document.getElementById('hero-container');
    const feedContainer = document.getElementById('feed-container');
    
    if (!heroContainer || !feedContainer) return;
    
    if (!activeFeed.length) {
        heroContainer.innerHTML = `
            <div class="hero-article">
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <span class="hero-badge">شبكة الأمين</span>
                    <h2 class="hero-title">السلام عليكم في شبكة الأمين الإخبارية</h2>
                    <p class="hero-description">نقدم لك آخر الأخبار والتطورات</p>
                </div>
            </div>
        `;
        feedContainer.innerHTML = '<p class="text-center py-8 text-gray-500">لا توجد أخبار حالياً</p>';
        return;
    }
    
    // Hero article (most recent breaking news or first article)
    const hero = activeFeed.find(post => post.is_breaking) || activeFeed[0];
    heroContainer.innerHTML = `
        <div class="hero-article" onclick="openArticle(${hero.id})">
            <img src="${hero.image_url || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=1974&auto=format&fit=crop'}" 
                 alt="${hero.title}">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <span class="hero-badge">${hero.category}</span>
                <h2 class="hero-title">${hero.title}</h2>
                <p class="hero-description">${hero.description}</p>
            </div>
        </div>
    `;
    
    // Other articles
    const otherArticles = activeFeed.filter((_, index) => index > 0);
    feedContainer.innerHTML = otherArticles.map(post => `
        <div onclick="openArticle(${post.id})" class="feed-item">
            <div class="feed-header">
                <span class="feed-source">${post.source}</span>
                <span class="feed-time">${formatDate(post.created_at)}</span>
            </div>
            <p class="feed-title">${post.title}</p>
            ${post.is_breaking ? '<span class="breaking-badge">عاجل</span>' : ''}
        </div>
    `).join('');
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    return date.toLocaleDateString('ar-LB');
}

// Setup Breaking News Marquee
function setupMarquee() {
    const breakingNews = currentPosts.filter(post => post.is_breaking);
    const track = document.getElementById('marqueeTrack');

    if (!track) return;

    if (!breakingNews.length) {
        // Arabic text indicating no new news yet
        track.innerHTML = '<div class="marquee__item">لا يوجد أخبار جديدة حتى الآن</div>';
        return;
    }

    // Create items
    const itemsHTML = breakingNews.map(news => `
        <div class="marquee__item" onclick="openArticle(${news.id})">
            ${news.title}
            <span class="marquee__seperator">●</span>
        </div>
    `).join('');

    // Duplicate for infinite loop
    track.innerHTML = itemsHTML + itemsHTML; 
}

// Check for Breaking News
function checkForBreakingNews() {
    const breakingNews = currentPosts.filter(post => 
        post.is_breaking && 
        post.id !== lastNewsNotifiedId
    );
    
    if (breakingNews.length > 0 && notificationEnabled) {
        breakingNews.forEach(news => {
            showToast("خبر عاجل", news.title, "sounds/ntfn.mp3");
            sendNotification("خبر عاجل", news.title);
            lastNewsNotifiedId = news.id;
        });
    }
}

async function openArticle(articleId) {
    const article = currentPosts.find(post => post.id == articleId);
    if (!article) return;

    history.pushState({ articleId }, "", `?article=${articleId}`);

    const currentView = document.querySelector('.view-section.active');
    if (currentView && currentView.id !== 'article-view') {
        navigationStack.push(currentView.id);
    }

    updateView('article-view');
    updateNavIcons('article-view');

    const articleContent = document.getElementById('article-content');
    if (!articleContent) return;
    
    articleContent.innerHTML = `
        <div class="article-hero">
            <img src="${article.image_url || 'https://images.unsplash.com/photo-default'}" alt="${article.title}">
            <div class="article-hero-overlay"></div>
            <div class="article-hero-content">
                <span class="article-category">${article.category}</span>
                <h1 class="article-title">${article.title}</h1>
                <div class="article-meta">
                    <span>${article.source}</span>
                    <span>${formatDate(article.created_at)}</span>
                </div>
            </div>
        </div>

        <div class="article-body">
            <div class="article-content">
                <p>${article.description}</p>
                ${article.full_content ? `<p>${article.full_content}</p>` : ""}
            </div>

            <div class="article-actions">
                <button onclick="shareArticle(${article.id})" class="share-btn">
                    <i class="fa-solid fa-share-nodes"></i> مشاركة
                </button>
            </div>
        </div>
    `;
}

// Share Article
function shareArticle(articleId) {
    const article = currentPosts.find(post => post.id === articleId);
    if (!article) return;
    
    if (navigator.share) {
        navigator.share({
            title: article.title,
            text: article.description,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(`${article.title}\n${article.description}`);
        showToast("تم النسخ", "تم نسخ المقال إلى الحافظة");
    }
}

// Open Category
function openCategory(category) {
    const categoryPosts = currentPosts.filter(post => 
        post.category === category && 
        post.status === 'published'
    );
    
    if (categoryPosts.length === 0) {
        showToast("لا توجد مقالات", "لا توجد مقالات في هذا القسم حالياً");
        return;
    }
    
    navigationStack.push('categories');
    updateView('category-detail');
    updateNavIcons('category-detail');
    
    const catHeaderTitle = document.getElementById('cat-header-title');
    const container = document.getElementById('cat-feed-container');
    
    if (!catHeaderTitle || !container) return;
    
    catHeaderTitle.textContent = category;
    
    container.innerHTML = categoryPosts.map(post => `
        <div onclick="openArticle(${post.id})" class="category-item">
            <div class="category-item-image">
                <img src="${post.image_url || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=1974&auto=format&fit=crop'}" 
                     alt="${post.title}">
            </div>
            <div class="category-item-content">
                <span class="category-item-meta">${formatDate(post.created_at)}</span>
                <h4 class="category-item-title">${post.title}</h4>
                <p class="category-item-body">${post.description}</p>
            </div>
        </div>
    `).join('');
}

// Render Archive
function renderArchive() {
    const container = document.getElementById('archive-container');
    
    if (!container) return;
    
    if (!archiveFeed.length) {
        container.innerHTML = '<p class="text-center py-12 text-gray-500">لا توجد مقالات في الأرشيف</p>';
        return;
    }
    
    container.innerHTML = archiveFeed.map(post => `
        <div onclick="openArticle(${post.id})" class="archive-item">
            <div class="archive-image">
                <img src="${post.image_url || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=1974&auto=format&fit=crop'}" 
                     alt="${post.title}">
            </div>
            <div class="archive-content">
                <div class="archive-meta">
                    <span class="archive-category">${post.category}</span>
                    <span class="archive-date">${formatDate(post.created_at)}</span>
                </div>
                <h4 class="archive-title">${post.title}</h4>
            </div>
            <i class="fa-solid fa-chevron-left"></i>
        </div>
    `).join('');
}

// Live TV Functions
function openChannel(channelKey) {
    const channel = channels[channelKey];
    if (!channel) return;
    
    const channelList = document.getElementById('channel-list-container');
    const playerContainer = document.getElementById('player-container');
    const playerTitle = document.getElementById('player-title');
    const channelInfo = document.getElementById('channel-info');
    
    if (!channelList || !playerContainer || !playerTitle || !channelInfo) return;
    
    channelList.classList.add('hidden');
    playerContainer.classList.remove('hidden');
    playerTitle.textContent = channel.name;
    channelInfo.textContent = channel.info;
    
    const loader = document.getElementById('video-loader');
    const videoPlayer = document.getElementById('main-video-player');
    const iframePlayer = document.getElementById('main-iframe-player');
    
    if (!loader || !videoPlayer || !iframePlayer) return;
    
    loader.classList.remove('hidden');
    videoPlayer.classList.add('hidden');
    iframePlayer.classList.add('hidden');
    
    if (channel.type === 'hls') {
        initializeHLSPlayer(channel.url, videoPlayer, loader);
    } else if (channel.type === 'youtube') {
        initializeYouTubePlayer(channel.url, iframePlayer, loader);
    }
}

function initializeHLSPlayer(url, videoElement, loader) {
    if (typeof Hls === 'undefined') {
        showToast("خطأ", "مكتبة تشغيل الفيديو غير محملة");
        if (loader) loader.classList.add("hidden");
        return;
    }
    
    if (Hls.isSupported()) {
        if (hlsInstance) {
            hlsInstance.destroy();
        }
        
        hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(videoElement);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (loader) loader.classList.add('hidden');
            if (videoElement) videoElement.classList.remove('hidden');

            videoElement.muted = false;
            videoElement.volume = 1.0;

            videoElement.play().catch(err => {
                console.log("Autoplay blocked:", err);
                videoElement.muted = true;
                videoElement.play();
                showToast("يرجى الضغط على الفيديو", "لتفعيل الصوت تلقائياً");
            });

            if (hlsInstance.levels && hlsInstance.levels.length > 1) {
                setupQualitySelector(hlsInstance.levels);
            }
        });
        
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hlsInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        showToast("خطأ في البث", "تعذر تحميل القناة");
                        closeChannel();
                        break;
                }
            }
        });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = url;
        videoElement.addEventListener('loadedmetadata', () => {
            if (loader) loader.classList.add('hidden');
            videoElement.classList.remove('hidden');
            videoElement.play().catch(console.error);
        });
    } else {
        showToast("خطأ", "المتصفح لا يدعم تشغيل هذا النوع من البث");
        if (loader) loader.classList.add('hidden');
    }
}

function initializeYouTubePlayer(url, iframeElement, loader) {
    iframeElement.src = url;
    iframeElement.onload = () => {
        if (loader) loader.classList.add('hidden');
        iframeElement.classList.remove('hidden');
    };
}

function setupQualitySelector(levels) {
    const qualitySelect = document.getElementById('video-quality');
    if (!qualitySelect || !levels.length) return;
    
    while (qualitySelect.options.length > 1) {
        qualitySelect.remove(1);
    }
    
    levels.forEach((level, index) => {
        if (level.height) {
            const option = document.createElement('option');
            option.value = level.height;
            option.textContent = `${level.height}p`;
            qualitySelect.appendChild(option);
        }
    });
}

function closeChannel() {
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    const videoPlayer = document.getElementById('main-video-player');
    const iframePlayer = document.getElementById('main-iframe-player');
    
    if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
    }
    
    if (iframePlayer) {
        iframePlayer.src = '';
    }
    
    const playerContainer = document.getElementById('player-container');
    const channelList = document.getElementById('channel-list-container');
    
    if (playerContainer) playerContainer.classList.add('hidden');
    if (channelList) channelList.classList.remove('hidden');
}

function togglePlayPause() {
    const video = document.getElementById('main-video-player');
    const btn = document.getElementById('btn-play');
    
    if (!video || !btn) return;
    
    if (video.paused) {
        video.play();
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
        video.pause();
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
}

function toggleMute() {
    const video = document.getElementById('main-video-player');
    const btn = document.getElementById('btn-mute');
    const slider = document.getElementById('vol-slider');
    
    if (!video || !btn) return;
    
    video.muted = !video.muted;
    if (video.muted) {
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        if (slider) slider.value = 0;
    } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        if (slider) slider.value = video.volume;
    }
}

function handleVolumeChange(e) {
    const video = document.getElementById('main-video-player');
    const btn = document.getElementById('btn-mute');
    
    if (!video || !btn) return;
    
    const volume = parseFloat(e.target.value);
    
    video.volume = volume;
    video.muted = volume === 0;
    
    if (volume === 0) {
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else if (volume < 0.5) {
        btn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
}

function toggleFullscreen() {
    const wrapper = document.getElementById('custom-video-wrapper');
    if (!wrapper) return;
    
    if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) {
            wrapper.requestFullscreen();
        } else if (wrapper.webkitRequestFullscreen) {
            wrapper.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function showPrayerToast(title, message) {
    const toast = document.getElementById('prayer-toast');
    const toastTitle = document.getElementById('prayer-toast-title');
    const toastBody = document.getElementById('prayer-toast-body');

    if (!toast || !toastTitle || !toastBody) return;

    toastTitle.textContent = title;
    toastBody.textContent = message;

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('show'), 20);

    const audio = new Audio("sounds/pray.mp3");
    audio.volume = 1.0;
    audio.play().catch(err => console.log("Audio blocked:", err));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 5000);
}

// Helper functions for prayer times calculations
function calculateImsakTime(fajrTime) {
    if (!fajrTime) return null;
    const [hours, minutes] = fajrTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes - 10, 0, 0); // Imsak is 10 minutes before Fajr
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}

function calculateMidnightTime(maghribTime, fajrTime) {
    if (!maghribTime || !fajrTime) return null;
    const [maghribHours, maghribMinutes] = maghribTime.split(':').map(Number);
    const [fajrHours, fajrMinutes] = fajrTime.split(':').map(Number);
    
    let maghribTotal = maghribHours * 60 + maghribMinutes;
    let fajrTotal = fajrHours * 60 + fajrMinutes;
    
    if (fajrTotal < maghribTotal) {
        fajrTotal += 24 * 60;
    }
    
    const midnightTotal = (maghribTotal + fajrTotal) / 2;
    const midnightHours = Math.floor(midnightTotal / 60) % 24;
    const midnightMinutes = Math.floor(midnightTotal % 60);
    
    return midnightHours.toString().padStart(2, '0') + ':' + midnightMinutes.toString().padStart(2, '0');
}

// Update Prayer Times UI
function updatePrayerTimesUI(timings) {
    if (!timings) return;
    
    const elements = {
        'imsak-time': timings.Imsak || calculateImsakTime(timings.Fajr) || "05:00",
        'fajr-time': timings.Fajr || "05:10",
        'dhuhr-time': timings.Dhuhr || "12:00",
        'asr-time': timings.Asr || "15:30",
        'maghrib-time': timings.Maghrib || "18:00",
        'isha-time': timings.Isha || "19:30"
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    const midnightElement = document.getElementById('midnight-time');
    if (midnightElement) {
        if (timings.Maghrib && timings.Fajr) {
            const midnightTime = calculateMidnightTime(timings.Maghrib, timings.Fajr);
            midnightElement.textContent = midnightTime;
        } else {
            midnightElement.textContent = "00:00";
        }
    }
}

// Load Prayer Times - STRICTLY BEIRUT (Aladhan API)
async function loadPrayerTimes() {
    const loading = document.getElementById("prayer-loading");
    const content = document.getElementById("prayer-content");
    const errorBox = document.getElementById("prayer-error");
    // Removed nextPrayerContainer references as requested

    if (!loading || !content || !errorBox) return;

    loading.classList.remove("hidden");
    content.classList.add("hidden");
    errorBox.classList.add("hidden");

    try {
        // Beirut, Lebanon coordinates (Fixed)
        const lat = 33.88894;
        const lon = 35.49442;
        
        // Aladhan API
        const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2&school=1&timezone=Asia/Beirut`;
        
        const response = await fetch(url, {
            headers: { "User-Agent": "AlAmeenNewsNetwork/1.0" }
        });

        if (!response.ok) throw new Error("Network error");

        const data = await response.json();
        if (!data || !data.data || !data.data.timings) throw new Error("Invalid data");

        const timings = data.data.timings;
        currentPrayerTimes = timings;

        // Display prayer times
        updatePrayerTimesUI(timings);
        
        // Update Hijri date in global scope for updateClock to use
        if (data.data.date && data.data.date.hijri) {
            window.hijriDateData = data.data.date.hijri;
            updateClock(); // Force update with new data
        }

        // Removed visual countdown logic here

        loading.classList.add("hidden");
        content.classList.remove("hidden");
        
        // Schedule notifications if enabled
        if (prayerReminderEnabled) {
            schedulePrayerReminders();
        }

    } catch (err) {
        console.error("Prayer API Error:", err);
        loading.classList.add("hidden");
        errorBox.classList.remove("hidden");
        
        // Use fallback times for display only
        const fallbackTimes = {
            Imsak: "04:50",
            Fajr: "05:00",
            Dhuhr: "12:00",
            Asr: "15:30",
            Maghrib: "18:00",
            Isha: "19:30"
        };
        currentPrayerTimes = fallbackTimes;
        updatePrayerTimesUI(fallbackTimes);
    }
}

// Check notification permission
function checkNotificationPermission() {
    if (!("Notification" in window)) {
        return false;
    }
    return Notification.permission === "granted";
}

// Send push notification
function sendNotification(title, body) {
    if (!checkNotificationPermission() || !notificationEnabled) return;
    
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: "showNotification",
            title: title,
            body: body,
            sound: "sounds/ntfn.mp3"
        });
    } else {
        const notification = new Notification(title, {
            body: body,
            icon: "Logo.png",
            badge: "Logo.png"
        });
        
        const audio = new Audio("sounds/ntfn.mp3");
        audio.volume = 1.0;
        audio.play().catch(err => console.log("Audio blocked:", err));
        
        setTimeout(() => notification.close(), 5000);
    }
}

// Settings Handlers
function handleNotificationToggle(e) {
    const toggle = e.target;
    const desiredState = toggle.checked;
    
    if (desiredState) {
        if (!("Notification" in window)) {
            showToast("خطأ", "المتصفح لا يدعم الإشعارات");
            toggle.checked = false;
            return;
        }
        
        if (Notification.permission === "denied") {
            showToast("تم الرفض", "تم رفض الإشعارات مسبقاً. يرجى تفعيلها من إعدادات المتصفح.");
            toggle.checked = false;
            notificationEnabled = false;
            localStorage.setItem('notificationsEnabled', false);
            return;
        }
        
        if (Notification.permission === "granted") {
            notificationEnabled = true;
            localStorage.setItem('notificationsEnabled', true);
            sendTestNotification("test", "هذا إشعار تجريبي لتأكيد تفعيل الإشعارات");
        } else {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    notificationEnabled = true;
                    localStorage.setItem('notificationsEnabled', true);
                    sendTestNotification("test", "هذا إشعار تجريبي لتأكيد تفعيل الإشعارات");
                } else {
                    toggle.checked = false;
                    notificationEnabled = false;
                    localStorage.setItem('notificationsEnabled', false);
                    showToast("تم الرفض", "تم رفض الإشعارات");
                }
            });
        }
    } else {
        notificationEnabled = false;
        localStorage.setItem('notificationsEnabled', false);
        showToast("تم الإيقاف", "تم تعطيل الإشعارات");
    }
}

function handleTextSizeToggle(e) {
    textLargeEnabled = e.target.checked;
    localStorage.setItem('textLargeEnabled', textLargeEnabled);
    toggleTextSize(textLargeEnabled);
}

function handleLanguageToggle(e) {
    currentLanguage = e.target.checked ? 'en' : 'ar';
    localStorage.setItem('language', currentLanguage);
    updateLanguageLabel();
    renderHome();
}

function handleAutoPlayToggle(e) {
    autoPlayEnabled = e.target.checked;
    localStorage.setItem('autoPlay', autoPlayEnabled);
}

function handleVideoQualityChange(e) {
    currentVideoQuality = e.target.value;
    localStorage.setItem('videoQuality', currentVideoQuality);
    
    if (hlsInstance && hlsInstance.levels) {
        const levels = hlsInstance.levels;
        let targetLevel = -1; // Auto
        
        if (currentVideoQuality !== 'auto') {
            const quality = parseInt(currentVideoQuality);
            targetLevel = levels.findIndex(level => level.height === quality);
        }
        
        hlsInstance.currentLevel = targetLevel;
    }
}

function toggleTextSize(enabled) {
    document.body.classList.toggle('text-large', enabled);
}

function updateLanguageLabel() {
    const label = document.getElementById('language-label');
    if (label) {
        label.textContent = currentLanguage === 'en' ? 'Language: English' : 'اللغة: العربية';
    }
}

function sendTestNotification(type, message) {
    if (!checkNotificationPermission()) return;
    
    const title = type === "test" ? "إشعار تجريبي" : "خبر عاجل";
    
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: "showNotification",
            title: title,
            body: message,
            sound: "sounds/ntfn.mp3"
        });
    } else {
        const notification = new Notification(title, {
            body: message,
            icon: "Logo.png",
            badge: "Logo.png"
        });
        
        const audio = new Audio("sounds/ntfn.mp3");
        audio.volume = 1.0;
        audio.play().catch(err => console.log("Audio blocked:", err));
        
        setTimeout(() => notification.close(), 5000);
    }
}

function handlePrayerReminderToggle(e) {
    const toggle = e.target;
    const desiredState = toggle.checked;
    
    if (desiredState) {
        if (!("Notification" in window)) {
            showToast("خطأ", "المتصفح لا يدعم الإشعارات");
            toggle.checked = false;
            return;
        }
        
        if (Notification.permission === "denied") {
            showToast("تم الرفض", "تم رفض الإشعارات مسبقاً. يرجى تفعيلها من إعدادات المتصفح.");
            toggle.checked = false;
            prayerReminderEnabled = false;
            localStorage.setItem('prayerReminderEnabled', false);
            return;
        }
        
        if (Notification.permission === "granted") {
            prayerReminderEnabled = true;
            localStorage.setItem('prayerReminderEnabled', true);
            sendPrayerTestNotification();
            schedulePrayerReminders();
            showToast("تم التفعيل", "سيتم تذكيرك بصلاة الفجر والظهر والمغرب");
        } else {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    prayerReminderEnabled = true;
                    localStorage.setItem('prayerReminderEnabled', true);
                    sendPrayerTestNotification();
                    schedulePrayerReminders();
                    showToast("تم التفعيل", "سيتم تذكيرك بصلاة الفجر والظهر والمغرب");
                } else {
                    toggle.checked = false;
                    prayerReminderEnabled = false;
                    localStorage.setItem('prayerReminderEnabled', false);
                    showToast("تم الرفض", "تم رفض الإشعارات");
                }
            });
        }
    } else {
        prayerReminderEnabled = false;
        localStorage.setItem('prayerReminderEnabled', false);
        cancelPrayerReminders();
        showToast("تم الإيقاف", "تم تعطيل تذكير الصلاة");
    }
}

function sendPrayerTestNotification() {
    if (!checkNotificationPermission()) return;
    
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: "showNotification",
            title: "تذكير الصلاة (تجريبي)",
            body: "تم تفعيل تذكير أوقات الصلاة بنجاح! سيتم تذكيرك قبل كل صلاة.",
            sound: "sounds/pray.mp3"
        });
    } else {
        const notification = new Notification("تذكير الصلاة (تجريبي)", {
            body: "تم تفعيل تذكير أوقات الصلاة بنجاح! سيتم تذكيرك قبل كل صلاة.",
            icon: "Logo.png",
            badge: "Logo.png"
        });
        
        const audio = new Audio("sounds/pray.mp3");
        audio.volume = 1.0;
        audio.play().catch(err => console.log("Audio blocked:", err));
        
        setTimeout(() => notification.close(), 5000);
    }
}

function cancelPrayerReminders() {
    if (prayerTimeouts && prayerTimeouts.length > 0) {
        prayerTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        prayerTimeouts = [];
    }
}

function scheduleSinglePrayer(name, timeString) {
    if (!prayerReminderEnabled || !checkNotificationPermission() || !timeString) return;
    
    const now = new Date();
    const [hour, minute] = timeString.split(":").map(Number);

    const prayerTime = new Date();
    prayerTime.setHours(hour, minute - 5, 0, 0); // 5 minutes before prayer

    if (prayerTime <= now) return;

    const delay = prayerTime - now;

    const timeoutId = setTimeout(() => {
        if (prayerReminderEnabled && checkNotificationPermission()) {
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: "prayerReminder",
                    title: `تنبيه لصلاة ${name}`,
                    body: `تبقى 5 دقائق على موعد صلاة ${name}.`,
                    sound: "sounds/pray.mp3"
                });
            } else {
                showPrayerToast(`تنبيه لصلاة ${name}`, `تبقى 5 دقائق على موعد صلاة ${name}.`);
            }
        }
    }, delay);

    prayerTimeouts.push(timeoutId);
}

// Schedule all prayer reminders using currentPrayerTimes (Aladhan Data)
function schedulePrayerReminders() {
    if (!prayerReminderEnabled || !checkNotificationPermission()) return;
    
    // Use the data already fetched from Aladhan
    if (!currentPrayerTimes) {
        // Retry shortly if data not yet loaded
        setTimeout(schedulePrayerReminders, 2000);
        return;
    }

    cancelPrayerReminders();

    scheduleSinglePrayer("الفجر", currentPrayerTimes.Fajr);
    scheduleSinglePrayer("الظهر", currentPrayerTimes.Dhuhr);
    scheduleSinglePrayer("المغرب", currentPrayerTimes.Maghrib);
}

// Update Clock
function updateClock() {
    const now = new Date();
    
    // Update time
    const timeElement = document.getElementById('time-display');
    if (timeElement) {
        const time = now.toLocaleTimeString('ar-LB', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        timeElement.textContent = toArabicNumerals(time); // Convert to Arabic numerals
    }
    
    // Update date
    const dateElement = document.getElementById('date-display');
    if (dateElement) {
        const date = now.toLocaleDateString('ar-LB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        dateElement.textContent = toArabicNumerals(date); // Convert to Arabic numerals
    }
    
    // Update Hijri date
    const hijriElement = document.getElementById('hijri-date');
    if (hijriElement) {
        let hijriDateStr = "";
        
        if (window.hijriDateData) {
            // Use API data if available
            const h = window.hijriDateData;
            hijriDateStr = `${h.day} ${h.month.ar} ${h.year}`;
        } else {
            // Fallback
            const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
            // Simple rough estimation for fallback
            hijriDateStr = `${now.getDate()} ${hijriMonths[now.getMonth()]} 1446`;
        }
        
        hijriElement.textContent = toArabicNumerals(hijriDateStr);
    }
}

// Switch Tab
function switchTab(tabId) {
    if (tabId !== 'livetv' && hlsInstance) {
        closeChannel();
    }
    
    updateView(tabId);
    updateNavIcons(tabId);
    
    switch(tabId) {
        case 'home':
            renderHome();
            break;
        case 'archive':
            renderArchive();
            break;
        case 'prayer-times':
            loadPrayerTimes();
            break;
        case 'livetv':
            if (autoPlayEnabled) {
                setTimeout(() => openChannel('manar'), 500);
            }
            break;
    }
}

// Update View
function updateView(viewId) {
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    const backBtn = document.getElementById('back-btn');
    const logo = document.getElementById('header-logo');
    const clock = document.getElementById('header-clock');
    
    if (viewId === 'article-view' || viewId === 'category-detail') {
        if (backBtn) backBtn.classList.remove('hidden');
        if (logo) logo.classList.add('hidden');
        if (clock) clock.classList.add('hidden');
    } else {
        if (backBtn) backBtn.classList.add('hidden');
        if (logo) logo.classList.remove('hidden');
        if (clock) clock.classList.remove('hidden');
    }
    
    const mainScroll = document.getElementById('main-scroll');
    if (mainScroll) mainScroll.scrollTop = 0;
}

// Update Navigation Icons
function updateNavIcons(viewId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.getElementById(`nav-${viewId}`);
    if (navItem) {
        navItem.classList.add('active');
    }
}

function goBack() {
    if (navigationStack.length > 0) {
        const previousView = navigationStack.pop();
        switchTab(previousView);
    } else {
        switchTab('home');
    }
}

function openWhatsAppModal() {
    const modal = document.getElementById('whatsapp-modal');
    const groupsList = modal?.querySelector('.whatsapp-groups-list');
    
    if (!modal || !groupsList) return;
    
    groupsList.innerHTML = whatsappGroups.map(group => `
        <div class="whatsapp-group-item" onclick="joinWhatsAppGroup('${group.id}')">
            <div class="group-icon">
                <i class="fa-brands fa-whatsapp"></i>
            </div>
            <div class="group-info">
                <h4>${group.name}</h4>
                <p>انضم للمناقشات اليومية</p>
            </div>
            <i class="fa-solid fa-chevron-left"></i>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
}

function closeWhatsAppModal() {
    const modal = document.getElementById('whatsapp-modal');
    if (modal) modal.classList.add('hidden');
}

function joinWhatsAppGroup(groupId) {
    const group = whatsappGroups.find(g => g.id === groupId);
    if (group) {
        window.open(group.link, '_blank');
        closeWhatsAppModal();
        showToast("تم الفتح", "جاري فتح مجموعة الواتساب");
    }
}

function clearCache() {
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset notification permissions in our app settings
    notificationEnabled = false;
    prayerReminderEnabled = false;
    localStorage.setItem('notificationsEnabled', false);
    localStorage.setItem('prayerReminderEnabled', false);
    
    // Cancel any scheduled reminders
    cancelPrayerReminders();
    
    // Update UI
    const notifToggle = document.getElementById('notif-toggle');
    const prayerToggle = document.getElementById('prayer-reminder-toggle');
    if (notifToggle) notifToggle.checked = false;
    if (prayerToggle) prayerToggle.checked = false;
    
    // Show toast with specific message
    showToast("مسح الكاش", "تم مسح جميع البيانات المحلية وإعادة تعيين الإعدادات");
    
    // Reload after a short delay
    setTimeout(() => {
        location.reload();
    }, 2000);
}

// Auto-refresh news every 5 minutes
setInterval(async () => {
    await loadPostsFromBackend();
    const currentView = document.querySelector('.view-section.active');
    
    if (currentView) {
        if (currentView.id === 'home') {
            renderHome();
        } else if (currentView.id === 'archive') {
            renderArchive();
        }
    }
}, 300000); // 5 minutes

// Service Worker message listener
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
        if (event.data && event.data.type === "playSound") {
            const audio = new Audio(event.data.url);
            audio.volume = 1.0;
            audio.play().catch(err => console.log("Autoplay blocked:", err));
        }
    });
}

function showToast(title, message, sound = null) {
    const toast = document.getElementById('toast-container');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    
    if (!toast || !toastTitle || !toastBody) {
        console.log(`Toast: ${title} - ${message}`);
        return;
    }
    
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    toast.classList.add('show');
    
    if (sound) {
        const audio = new Audio(sound);
        audio.volume = 1.0;
        audio.play().catch(err => console.log("Autoplay blocked:", err));
    }
    
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// REGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(reg => {
            console.log("Service Worker Registered:", reg);
        })
        .catch(err => {
            console.error("SW Registration Failed:", err);
        });
}

// في نهاية الملف أو في مكان مناسب بعد تعريف الدوال
document.addEventListener('DOMContentLoaded', function() {
    const prayerNotificationBtn = document.getElementById('prayer-notification-btn');
    const prayerReminderToggle = document.getElementById('prayer-reminder-toggle');
    
    if (prayerNotificationBtn) {
        prayerNotificationBtn.addEventListener('click', function() {
            // التبديل إلى صفحة الإعدادات
            switchTab('settings');
            
            // تأخير بسيط لضمان تحميل صفحة الإعدادات
            setTimeout(() => {
                // تمرير التركيز إلى عنصر تذكير الصلاة
                if (prayerReminderToggle) {
                    // إضافة تأثير التمييز
                    highlightPrayerSetting();
                    
                    // تمرير التركيز إلى التبديل
                    prayerReminderToggle.focus();
                    
                    // التمرير إلى العنصر
                    prayerReminderToggle.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }
            }, 300);
        });
        
        // جعل المؤشر يبدو كزر قابل للنقر
        prayerNotificationBtn.style.cursor = 'pointer';
        prayerNotificationBtn.style.textDecoration = 'underline';
    }
    
    // دالة لإضافة تأثير التمييز
    window.highlightPrayerSetting = function() {
        if (prayerReminderToggle) {
            const label = prayerReminderToggle.closest('.settings-item');
            
            // إضافة كلاس للتمييز
            label.classList.add('highlight-prayer');
            
            // إزالة التمييز بعد 3 ثواني
            setTimeout(() => {
                label.classList.remove('highlight-prayer');
            }, 3000);
        }
    };
});
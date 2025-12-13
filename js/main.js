document.addEventListener('DOMContentLoaded', () => {
    const CONSTANTS = {
        MAX_POPULAR_TAGS: 50,
        VIDEOS_TO_SHOW_INITIALLY: 30,
        VIDEOS_TO_LOAD_MORE: 15,
        MIN_SEARCH_TERM_LENGTH: 2,
        MAX_SUGGESTIONS: 7,
        FUSE_OPTIONS: {
            keys: [
                { name: 'title', weight: 0.6 },
                { name: 'tags', weight: 0.3 },
                { name: 'channel', weight: 0.1 },
                { name: 'content', weight: 0.1 }
            ],
            includeScore: true,
            includeMatches: true,
            threshold: 0.4,
            minMatchCharLength: 2,
            ignoreLocation: true
        },
        CATEGORY_FILES: [
            'data/videos/review.json',
            'data/videos/maintenance.json',
            'data/videos/troubleshooting.json',
            'data/videos/diy.json',
            'data/videos/safety.json',
            'data/videos/collectors.json',
            'data/videos/industry.json'
        ],
        YOUTUBE_IMG_BASE: 'https://i.ytimg.com/vi/',
        YOUTUBE_THUMBNAIL_SUFFIX: '/hqdefault.jpg',
        DEFAULT_CHANNEL_IMAGE: 'data/assets/images/default-channel.png',
        DARK_MODE_STORAGE_KEY: 'kosherCarVideosDarkMode',
        FAVORITES_STORAGE_KEY: 'kosherCarVideosFavorites',
        LAST_VISITED_CATEGORY_KEY: 'kosherCarVideosLastCategory',
        LAST_VIEWED_VIDEO_KEY: 'kosherCarVideosLastVideo',
        VISITED_VIDEOS_KEY: 'kosherCarVideosVisitedVideos',
        FAVORITE_CHANNELS_STORAGE_KEY: 'kosherCarVideosFavoriteChannels',
        SCROLL_THRESHOLD: 200,
        SCROLL_TOP_BUTTON_THRESHOLD: 400,
        POPULAR_TAGS_CATEGORY: 'review'
    };
    const state = {
        allVideos: [],
        filteredVideos: [],
        currentFilters: {
            searchTerm: '',
            category: 'all',
            tags: [],
            hebrewOnly: false,
            durationMin: 0,
            durationMax: Infinity,
            sortBy: 'dateDesc'
        },
        ui: {
            currentlyDisplayedVideosCount: 0,
            lastFocusedElement: null,
            throttleTimer: false
        },
        search: {
            activeSuggestionIndex: -1,
            currentInput: null,
            currentSuggestionsContainer: null,
            isSuggestionClicked: false
        },
        favorites: {
            videos: new Set(),
            channels: new Set()
        },
        visitedVideos: new Set(),
        stats: {
            totalVideos: 0,
            totalDurationSeconds: 0,
            videosByCategory: {},
            tagsCount: {}
        },
        fuse: null
    };
    let videoObserver;
    const throttle = (callback, time) => {
        if (state.ui.throttleTimer) return;
        state.ui.throttleTimer = true;
        setTimeout(() => {
            callback();
            state.ui.throttleTimer = false;
        }, time);
    };
    const dom = {
        body: document.body,
        preloader: document.getElementById('site-preloader'),
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        openMenuBtn: document.getElementById('open-menu-btn'),
        closeMenuBtn: document.getElementById('close-menu-btn'),
        mobileMenu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        videoCountHero: document.getElementById('video-count-hero'),
        currentYearFooter: document.getElementById('current-year-footer'),
        videoCardsContainer: document.getElementById('video-cards-container'),
        noVideosFoundMessage: document.getElementById('no-videos-found'),
        videoCardTemplate: document.getElementById('video-card-template'),
        homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
        categoryTitle: document.getElementById('category-title'),
        categoryDescription: document.getElementById('category-description'),
        categoryIcon: document.getElementById('category-icon'),
        categoryHeader: document.getElementById('category-header'),
        backToAllCategoriesLink: document.getElementById('back-to-all-categories'),
        filterTagsSelect: document.getElementById('filter-tags'),
        filterHebrewOnlyCheckbox: document.getElementById('filter-hebrew-only'),
        filterDurationMin: document.getElementById('filter-duration-min'),
        filterDurationMax: document.getElementById('filter-duration-max'),
        filterSortBy: document.getElementById('filter-sort-by'),
        clearFiltersButton: document.getElementById('clear-filters-btn'),
        loadMoreButton: document.getElementById('load-more-btn'),
        scrollTopButton: document.getElementById('scroll-top-btn'),
        statsSection: document.getElementById('stats-section'),
        totalVideosElement: document.getElementById('total-videos'),
        totalDurationElement: document.getElementById('total-duration'),
        categoryStatsContainer: document.getElementById('category-stats'),
        popularTagsContainer: document.getElementById('popular-tags'),
        favoriteVideosContainer: document.getElementById('favorite-videos'),
        noFavoritesMessage: document.getElementById('no-favorites-message'),
        visitedVideosContainer: document.getElementById('visited-videos'),
        noVisitedMessage: document.getElementById('no-visited-message'),
        pageCategoryButtons: document.querySelectorAll('[data-category-button]'),
        searchForms: {
            mainHeader: document.querySelector('#main-header-search-form'),
            mobileMenu: document.querySelector('#mobile-menu-search-form'),
            hero: document.querySelector('#hero-search-form'),
            categoryPage: document.querySelector('#category-search-form')
        },
        singleVideoView: {
            container: document.getElementById('single-video-view'),
            backButton: document.getElementById('back-to-list-btn'),
            title: document.getElementById('single-video-title'),
            channel: document.getElementById('single-video-channel'),
            thumbnail: document.getElementById('single-video-thumbnail'),
            openOnYoutubeBtn: document.getElementById('open-on-youtube-btn'),
            addToFavoritesBtn: document.getElementById('add-to-favorites-btn'),
            removeFromFavoritesBtn: document.getElementById('remove-from-favorites-btn'),
            description: document.getElementById('single-video-description'),
            tagsContainer: document.getElementById('single-video-tags')
        },
        featuredChannelsSection: document.getElementById('featured-channels-section'),
        featuredChannelsContainer: document.getElementById('featured-channels-container'),
        favoritesPageContainer: document.getElementById('favorites-page-container'),
        categoryChipsContainer: document.getElementById('category-chips-container')
    };
    const safeParseJSON = (jsonString, fallback) => {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('JSON parse error:', error);
            return fallback;
        }
    };
    const getStoredFavorites = () => {
        try {
            return new Set(JSON.parse(localStorage.getItem(CONSTANTS.FAVORITES_STORAGE_KEY)) || []);
        } catch {
            return new Set();
        }
    };
    const saveFavorites = () => {
        try {
            localStorage.setItem(CONSTANTS.FAVORITES_STORAGE_KEY, JSON.stringify([...state.favorites.videos]));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    };
    const getStoredFavoriteChannels = () => {
        try {
            return new Set(JSON.parse(localStorage.getItem(CONSTANTS.FAVORITE_CHANNELS_STORAGE_KEY)) || []);
        } catch {
            return new Set();
        }
    };
    const saveFavoriteChannels = () => {
        try {
            localStorage.setItem(CONSTANTS.FAVORITE_CHANNELS_STORAGE_KEY, JSON.stringify([...state.favorites.channels]));
        } catch (error) {
            console.error('Error saving favorite channels:', error);
        }
    };
    const getStoredVisitedVideos = () => {
        try {
            return new Set(JSON.parse(localStorage.getItem(CONSTANTS.VISITED_VIDEOS_KEY)) || []);
        } catch {
            return new Set();
        }
    };
    const saveVisitedVideos = () => {
        try {
            localStorage.setItem(CONSTANTS.VISITED_VIDEOS_KEY, JSON.stringify([...state.visitedVideos]));
        } catch (error) {
            console.error('Error saving visited videos:', error);
        }
    };
    const getStoredDarkModePreference = () => {
        try {
            return JSON.parse(localStorage.getItem(CONSTANTS.DARK_MODE_STORAGE_KEY));
        } catch {
            return null;
        }
    };
    const saveDarkModePreference = isDark => {
        try {
            localStorage.setItem(CONSTANTS.DARK_MODE_STORAGE_KEY, JSON.stringify(isDark));
        } catch (error) {
            console.error('Error saving dark mode preference:', error);
        }
    };
    const formatDuration = totalSeconds => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };
    const parseDurationToSeconds = durationString => {
        if (!durationString) return 0;
        const parts = durationString.split(':').map(part => parseInt(part.trim(), 10));
        if (parts.length === 2) {
            const [minutes, seconds] = parts;
            return minutes * 60 + seconds;
        }
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            return hours * 3600 + minutes * 60 + seconds;
        }
        return 0;
    };
    const getPageName = () => {
        const path = window.location.pathname;
        const segments = path.split('/');
        const filename = segments.pop() || segments.pop();
        return filename || 'index.html';
    };
    const getCategoryEmoji = category => {
        const emojis = {
            review: '🚗',
            maintenance: '🛠️',
            troubleshooting: '❗',
            diy: '🔧',
            safety: '⚠️',
            collectors: '🏎️',
            industry: '🏭',
            all: '📺'
        };
        return emojis[category] || '📺';
    };
    const normalizeHebrew = text => text.replace(/[״”]/g, '"').replace(/[׳’]/g, '\'');
    const generateHighlightedText = (text, matchIndices) => {
        if (!matchIndices || !Array.isArray(matchIndices) || matchIndices.length === 0) return text;
        let result = '';
        let lastIndex = 0;
        matchIndices.forEach(([start, end]) => {
            result += text.slice(lastIndex, start);
            result += `<mark class="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5">${text.slice(start, end + 1)}</mark>`;
            lastIndex = end + 1;
        });
        result += text.slice(lastIndex);
        return result;
    };
    const getYouTubeThumbnailUrl = videoId => `${CONSTANTS.YOUTUBE_IMG_BASE}${videoId}${CONSTANTS.YOUTUBE_THUMBNAIL_SUFFIX}`;
    const mapVideoData = (video, index, category) => {
        const id = video.id || video.videoId || video.youtubeId || '';
        const title = normalizeHebrew(video.title || '');
        const content = normalizeHebrew(video.content || '');
        const channel = normalizeHebrew(video.channel || video.channelName || '');
        const tags = Array.isArray(video.tags) ? video.tags.map(t => normalizeHebrew(t.toString())) : [];
        const durationString = video.duration || '0:00';
        const durationSeconds = parseDurationToSeconds(durationString);
        const dateAdded = video.dateAdded ? new Date(video.dateAdded) : new Date(Date.now() - index * 60000);
        const hebrewContent = Boolean(video.hebrewContent);
        const youtubeUrl = video.url || (id ? `https://www.youtube.com/watch?v=${id}` : '');
        const channelImage = video.channelImage || CONSTANTS.DEFAULT_CHANNEL_IMAGE;
        const thumbnailUrl = video.thumbnail || getYouTubeThumbnailUrl(id);
        return {
            ...video,
            id,
            title,
            content,
            channel,
            tags,
            duration: durationString,
            durationSeconds,
            dateAdded,
            hebrewContent,
            url: youtubeUrl,
            channelImage,
            thumbnailUrl,
            category
        };
    };
    const updateStatsWithVideo = video => {
        state.stats.totalVideos += 1;
        state.stats.totalDurationSeconds += video.durationSeconds;
        if (!state.stats.videosByCategory[video.category]) {
            state.stats.videosByCategory[video.category] = 0;
        }
        state.stats.videosByCategory[video.category] += 1;
        video.tags.forEach(tag => {
            if (!state.stats.tagsCount[tag]) {
                state.stats.tagsCount[tag] = 0;
            }
            state.stats.tagsCount[tag] += 1;
        });
    };
    const markVideoAsVisited = videoId => {
        if (!videoId) return;
        state.visitedVideos.add(videoId);
        saveVisitedVideos();
        const visitedBadge = document.querySelector(`[data-video-id="${videoId}"] .visited-badge`);
        if (visitedBadge) {
            visitedBadge.classList.remove('hidden');
        }
    };
    const isVideoVisited = videoId => state.visitedVideos.has(videoId);
    const isVideoFavorite = videoId => state.favorites.videos.has(videoId);
    const toggleFavoriteVideo = videoId => {
        if (!videoId) return;
        if (state.favorites.videos.has(videoId)) {
            state.favorites.videos.delete(videoId);
        } else {
            state.favorites.videos.add(videoId);
        }
        saveFavorites();
        updateFavoriteButtons(videoId);
    };
    const toggleFavoriteChannel = channelName => {
        if (!channelName) return;
        if (state.favorites.channels.has(channelName)) {
            state.favorites.channels.delete(channelName);
        } else {
            state.favorites.channels.add(channelName);
        }
        saveFavoriteChannels();
        renderFeaturedChannels();
    };
    const updateFavoriteButtons = currentVideoId => {
        document.querySelectorAll('[data-favorite-button]').forEach(button => {
            const videoId = button.dataset.videoId || currentVideoId;
            if (!videoId) return;
            const isFavorite = isVideoFavorite(videoId);
            button.setAttribute('aria-pressed', isFavorite);
            const icon = button.querySelector('svg');
            const label = button.querySelector('[data-favorite-label]');
            if (icon) {
                icon.classList.toggle('text-red-500', isFavorite);
                icon.classList.toggle('fill-red-500', isFavorite);
            }
            if (label) {
                label.textContent = isFavorite ? 'הסר מהמועדפים' : 'הוסף למועדפים';
            }
        });
    };
    const renderStatistics = () => {
        if (!dom.statsSection) return;
        dom.totalVideosElement.textContent = state.stats.totalVideos.toLocaleString('he-IL');
        dom.totalDurationElement.textContent = formatDuration(state.stats.totalDurationSeconds);
        dom.categoryStatsContainer.innerHTML = '';
        Object.entries(state.stats.videosByCategory).forEach(([category, count]) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between text-sm';
            const label = document.createElement('span');
            label.textContent = `${getCategoryEmoji(category)} ${getCategoryLabel(category)}`;
            const value = document.createElement('span');
            value.textContent = count.toLocaleString('he-IL');
            item.appendChild(label);
            item.appendChild(value);
            dom.categoryStatsContainer.appendChild(item);
        });
    };
    const calculatePopularTags = () => {
        const tagsCountMap = {};
        state.allVideos.forEach(video => {
            if (video.category === CONSTANTS.POPULAR_TAGS_CATEGORY) {
                video.tags.forEach(tag => {
                    if (!tagsCountMap[tag]) {
                        tagsCountMap[tag] = 0;
                    }
                    tagsCountMap[tag] += 1;
                });
            }
        });
        return Object.entries(tagsCountMap).sort(([, countA], [, countB]) => countB - countA).slice(0, CONSTANTS.MAX_POPULAR_TAGS);
    };
    const renderPopularTags = () => {
        if (!dom.popularTagsContainer) return;
        const popularTags = calculatePopularTags();
        dom.popularTagsContainer.innerHTML = '';
        if (popularTags.length === 0) {
            dom.popularTagsContainer.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">עדיין אין מספיק תגיות פופולריות להצגה.</p>';
            return;
        }
        popularTags.forEach(([tag, count]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition-colors';
            button.innerHTML = `<span class="ml-1.5">#${tag}</span><span class="text-[0.7rem] text-slate-500 dark:text-slate-400">(${count})</span>`;
            button.addEventListener('click', () => {
                state.currentFilters.tags = [tag];
                applyFiltersAndRender(true);
                const filterTagsSelect = dom.filterTagsSelect;
                if (filterTagsSelect) {
                    [...filterTagsSelect.options].forEach(option => {
                        option.selected = option.value === tag;
                    });
                }
            });
            dom.popularTagsContainer.appendChild(button);
        });
    };
    const getCategoryLabel = category => {
        const labels = {
            review: 'סקירות וביקורות רכבים',
            maintenance: 'טיפולים ותחזוקה',
            troubleshooting: 'תקלות ופתרונות',
            diy: 'עשה זאת בעצמך',
            safety: 'בטיחות בדרכים',
            collectors: 'רכבי אספנות וחובבים',
            industry: 'חדשות ותעשיית הרכב',
            all: 'כל הסרטונים'
        };
        return labels[category] || category;
    };
    const updateCategoryPageUI = category => {
        if (!dom.categoryHeader) return;
        const emoji = getCategoryEmoji(category);
        const label = getCategoryLabel(category);
        if (dom.categoryTitle) dom.categoryTitle.textContent = `${emoji} ${label}`;
        if (dom.categoryDescription) {
            dom.categoryDescription.textContent = `כל הסרטונים בקטגוריה: ${label}`;
        }
        if (dom.categoryIcon) {
            dom.categoryIcon.textContent = emoji;
        }
        if (dom.categoryHeader) {
            dom.categoryHeader.classList.remove('hidden');
        }
    };
    const applyFiltersFromURL = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('q') || '';
        const tagsParam = urlParams.get('tags') || '';
        const hebrewOnly = urlParams.get('hebrew') === '1';
        const durationMin = parseInt(urlParams.get('dmin') || '0', 10);
        const durationMaxParam = urlParams.get('dmax');
        const durationMax = durationMaxParam ? parseInt(durationMaxParam, 10) : Infinity;
        const sortBy = urlParams.get('sort') || 'dateDesc';
        if (searchTerm) state.currentFilters.searchTerm = searchTerm;
        if (tagsParam) state.currentFilters.tags = tagsParam.split(',').filter(Boolean);
        state.currentFilters.hebrewOnly = hebrewOnly;
        state.currentFilters.durationMin = durationMin;
        state.currentFilters.durationMax = durationMax;
        state.currentFilters.sortBy = sortBy;
    };
    const updateURLWithFilters = pushHistory => {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        if (state.currentFilters.searchTerm) {
            params.set('q', state.currentFilters.searchTerm);
        } else {
            params.delete('q');
        }
        if (state.currentFilters.tags.length > 0) {
            params.set('tags', state.currentFilters.tags.join(','));
        } else {
            params.delete('tags');
        }
        if (state.currentFilters.hebrewOnly) {
            params.set('hebrew', '1');
        } else {
            params.delete('hebrew');
        }
        if (state.currentFilters.durationMin > 0) {
            params.set('dmin', String(state.currentFilters.durationMin));
        } else {
            params.delete('dmin');
        }
        if (state.currentFilters.durationMax < Infinity) {
            params.set('dmax', String(state.currentFilters.durationMax));
        } else {
            params.delete('dmax');
        }
        if (state.currentFilters.sortBy && state.currentFilters.sortBy !== 'dateDesc') {
            params.set('sort', state.currentFilters.sortBy);
        } else {
            params.delete('sort');
        }
        const newUrl = `${url.pathname}?${params.toString()}${url.hash}`;
        if (pushHistory) {
            window.history.pushState({}, '', newUrl);
        } else {
            window.history.replaceState({}, '', newUrl);
        }
    };
    const applyFiltersAndRender = resetDisplayedCount => {
        let filtered = [...state.allVideos];
        if (state.currentFilters.category && state.currentFilters.category !== 'all') {
            filtered = filtered.filter(video => video.category === state.currentFilters.category);
        }
        if (state.currentFilters.hebrewOnly) {
            filtered = filtered.filter(video => video.hebrewContent);
        }
        if (state.currentFilters.tags.length > 0) {
            filtered = filtered.filter(video => state.currentFilters.tags.every(tag => video.tags.includes(tag)));
        }
        if (state.currentFilters.searchTerm && state.fuse) {
            const fuseResults = state.fuse.search(state.currentFilters.searchTerm);
            const filteredIds = new Set(filtered.map(v => v.id));
            filtered = fuseResults.map(result => result.item).filter(video => filteredIds.has(video.id));
        }
        filtered = filtered.filter(video => {
            const duration = video.durationSeconds;
            return duration >= state.currentFilters.durationMin && duration <= state.currentFilters.durationMax;
        });
        filtered.sort((a, b) => {
            switch (state.currentFilters.sortBy) {
                case 'dateAsc':
                    return a.dateAdded - b.dateAdded;
                case 'titleAsc':
                    return a.title.localeCompare(b.title, 'he');
                case 'titleDesc':
                    return b.title.localeCompare(a.title, 'he');
                case 'durationAsc':
                    return a.durationSeconds - b.durationSeconds;
                case 'durationDesc':
                    return b.durationSeconds - a.durationSeconds;
                case 'dateDesc':
                default:
                    return b.dateAdded - a.dateAdded;
            }
        });
        state.filteredVideos = filtered;
        if (resetDisplayedCount) {
            state.ui.currentlyDisplayedVideosCount = 0;
        }
        renderVideoCards();
        updateNoVideosMessage();
        if (dom.videoCountHero) {
            dom.videoCountHero.textContent = filtered.length.toLocaleString('he-IL');
        }
        if (dom.totalVideosElement) {
            dom.totalVideosElement.textContent = state.stats.totalVideos.toLocaleString('he-IL');
        }
        if (dom.totalDurationElement) {
            dom.totalDurationElement.textContent = formatDuration(state.stats.totalDurationSeconds);
        }
        if (dom.categoryStatsContainer) {
            dom.categoryStatsContainer.innerHTML = '';
            Object.entries(state.stats.videosByCategory).forEach(([category, count]) => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between text-sm';
                const label = document.createElement('span');
                label.textContent = `${getCategoryEmoji(category)} ${getCategoryLabel(category)}`;
                const value = document.createElement('span');
                value.textContent = count.toLocaleString('he-IL');
                item.appendChild(label);
                item.appendChild(value);
                dom.categoryStatsContainer.appendChild(item);
            });
        }
    };
    const updateNoVideosMessage = () => {
        if (!dom.noVideosFoundMessage) return;
        dom.noVideosFoundMessage.classList.toggle('hidden', state.filteredVideos.length > 0);
    };
    const createVideoCard = video => {
        if (!dom.videoCardTemplate) return null;
        const template = dom.videoCardTemplate.content.cloneNode(true);
        const card = template.querySelector('[data-video-card]');
        const thumbnailLink = template.querySelector('[data-video-thumbnail-link]');
        const thumbnailImg = template.querySelector('[data-video-thumbnail-img]');
        const titleLink = template.querySelector('[data-video-title-link]');
        const channelElement = template.querySelector('[data-video-channel]');
        const durationElement = template.querySelector('[data-video-duration]');
        const tagsContainer = template.querySelector('[data-video-tags]');
        const favoriteButton = template.querySelector('[data-favorite-button]');
        const visitedBadge = template.querySelector('[data-visited-badge]');
        if (card) card.dataset.videoId = video.id;
        if (thumbnailLink) {
            thumbnailLink.href = `?v=${encodeURIComponent(video.id)}`;
            thumbnailLink.addEventListener('click', event => {
                event.preventDefault();
                showSingleVideoView(video.id);
            });
        }
        if (thumbnailImg) {
            thumbnailImg.dataset.src = video.thumbnailUrl;
            thumbnailImg.alt = video.title;
            thumbnailImg.classList.add('lazy-image');
        }
        if (titleLink) {
            titleLink.textContent = video.title;
            titleLink.href = `?v=${encodeURIComponent(video.id)}`;
            titleLink.addEventListener('click', event => {
                event.preventDefault();
                showSingleVideoView(video.id);
            });
        }
        if (channelElement) {
            channelElement.textContent = video.channel;
        }
        if (durationElement) {
            durationElement.textContent = video.duration;
        }
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            video.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 mr-1 mb-1';
                tagElement.textContent = `#${tag}`;
                tagsContainer.appendChild(tagElement);
            });
        }
        if (favoriteButton) {
            favoriteButton.dataset.videoId = video.id;
            favoriteButton.setAttribute('aria-pressed', isVideoFavorite(video.id));
            favoriteButton.addEventListener('click', event => {
                event.stopPropagation();
                toggleFavoriteVideo(video.id);
            });
        }
        if (visitedBadge) {
            visitedBadge.classList.toggle('hidden', !isVideoVisited(video.id));
        }
        return template;
    };
    const renderVideoCards = () => {
        if (!dom.videoCardsContainer) return;
        const start = state.ui.currentlyDisplayedVideosCount;
        const end = Math.min(start + CONSTANTS.VIDEOS_TO_SHOW_INITIALLY, state.filteredVideos.length);
        if (start === 0) {
            dom.videoCardsContainer.innerHTML = '';
        }
        const fragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            const video = state.filteredVideos[i];
            const card = createVideoCard(video);
            if (card) {
                fragment.appendChild(card);
            }
        }
        dom.videoCardsContainer.appendChild(fragment);
        state.ui.currentlyDisplayedVideosCount = end;
        if (dom.loadMoreButton) {
            dom.loadMoreButton.classList.toggle('hidden', state.ui.currentlyDisplayedVideosCount >= state.filteredVideos.length);
        }
        observeLazyImages();
    };
    const observeLazyImages = () => {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('img.lazy-image').forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.classList.remove('lazy-image');
                }
            });
            return;
        }
        if (videoObserver) {
            videoObserver.disconnect();
        }
        videoObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-image');
                        videoObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '100px 0px',
            threshold: 0.1
        });
        document.querySelectorAll('img.lazy-image').forEach(img => videoObserver.observe(img));
    };
    const handleLoadMoreClick = () => {
        state.ui.currentlyDisplayedVideosCount += CONSTANTS.VIDEOS_TO_LOAD_MORE;
        renderVideoCards();
    };
    const handleScroll = () => {
        if (!dom.scrollTopButton) return;
        dom.scrollTopButton.classList.toggle('opacity-0', window.scrollY < CONSTANTS.SCROLL_TOP_BUTTON_THRESHOLD);
        dom.scrollTopButton.classList.toggle('pointer-events-none', window.scrollY < CONSTANTS.SCROLL_TOP_BUTTON_THRESHOLD);
    };
    const handleDarkModeToggle = () => {
        const isDark = dom.body.classList.toggle('dark');
        dom.body.classList.toggle('bg-slate-950', isDark);
        dom.body.classList.toggle('bg-slate-50', !isDark);
        saveDarkModePreference(isDark);
        dom.darkModeToggles.forEach(toggle => {
            toggle.classList.toggle('bg-slate-800', isDark);
            toggle.classList.toggle('bg-slate-200', !isDark);
            toggle.setAttribute('aria-checked', String(isDark));
        });
    };
    const initDarkMode = () => {
        const storedPreference = getStoredDarkModePreference();
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = storedPreference !== null ? storedPreference : systemPrefersDark;
        dom.body.classList.toggle('dark', isDark);
        dom.body.classList.toggle('bg-slate-950', isDark);
        dom.body.classList.toggle('bg-slate-50', !isDark);
        dom.darkModeToggles.forEach(toggle => {
            toggle.classList.toggle('bg-slate-800', isDark);
            toggle.classList.toggle('bg-slate-200', !isDark);
            toggle.setAttribute('aria-checked', String(isDark));
        });
    };
    const openMobileMenu = () => {
        if (dom.mobileMenu) dom.mobileMenu.classList.remove('translate-x-full');
        if (dom.backdrop) dom.backdrop.classList.remove('hidden');
        dom.body.classList.add('overflow-hidden');
        state.ui.lastFocusedElement = document.activeElement;
        setTimeout(() => {
            if (dom.mobileMenu) dom.mobileMenu.querySelector('input, button, a')?.focus();
        }, 100);
    };
    const closeMobileMenu = () => {
        if (dom.mobileMenu) dom.mobileMenu.classList.add('translate-x-full');
        if (dom.backdrop) dom.backdrop.classList.add('hidden');
        dom.body.classList.remove('overflow-hidden');
        if (state.ui.lastFocusedElement) {
            state.ui.lastFocusedElement.focus();
        }
    };
    const handleSearchSubmit = form => {
        const input = form.querySelector('input[type="search"]');
        if (!input) return;
        const searchTerm = input.value.trim();
        state.currentFilters.searchTerm = searchTerm;
        updateFiltersAndURL(true);
        applyFiltersAndRender(true);
        clearSearchSuggestions();
    };

    // *** כאן התיקון החשוב: לא יוצרים Fuse חדש בכל הקלדה, אלא משתמשים באינדקס אחד ***

    function handleSearchInput(inputElement) {
        const suggestionsContainer = document.getElementById(`${inputElement.id.replace('-input', '')}-suggestions`);
        state.search.currentInput = inputElement;
        state.search.currentSuggestionsContainer = suggestionsContainer;
        const searchTerm = inputElement.value.trim();
        if (searchTerm.length < CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            clearSearchSuggestions();
            if (searchTerm === '' && state.currentFilters.searchTerm !== '') {
                state.currentFilters.searchTerm = '';
                updateFiltersAndURL(false);
            }
            return;
        }
        // השתמש באינדקס Fuse שכבר נבנה פעם אחת, בלי ליצור מופע חדש בכל הקלדה
        displaySearchSuggestions(searchTerm);
    }

    function displaySearchSuggestions(searchTerm) {
        if (!state.fuse || !state.search.currentSuggestionsContainer) return;
        const suggestionsList = state.search.currentSuggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;
        let results = state.fuse.search(searchTerm);

        // אם אנחנו בעמוד קטגוריה עם קטגוריה פעילה, נסנן את ההצעות לפי הקטגוריה הזו
        const pageName = getPageName();
        if (pageName === 'category.html' && state.currentFilters.category !== 'all') {
            results = results.filter(r => r.item.category === state.currentFilters.category);
        }

        results = results.slice(0, CONSTANTS.MAX_SUGGESTIONS);
        suggestionsList.innerHTML = '';
        if (results.length === 0) {
            clearSearchSuggestions();
            return;
        }
        results.forEach((result, index) => {
            const li = document.createElement('li');
            li.className = 'px-4 py-2.5 text-sm text-slate-700 d...le-50 dark:hover:bg-slate-700 cursor-pointer transition-colors';
            li.dataset.index = index;
            const titleMatch = result.matches && result.matches.find(m => m.key === 'title');
            li.innerHTML = titleMatch ? generateHighlightedText(result.item.title, titleMatch.indices) : result.item.title;
            li.addEventListener('mousedown', () => {
                state.search.isSuggestionClicked = true;
                const inputElement = state.search.currentInput;
                inputElement.value = result.item.title;
                handleSearchSubmit(inputElement.form);
            });
            li.addEventListener('mouseup', () => setTimeout(() => { state.search.isSuggestionClicked = false; }, 50));
            suggestionsList.appendChild(li);
        });
        if (state.search.currentSuggestionsContainer) {
            state.search.currentSuggestionsContainer.classList.remove('hidden');
        }
        state.search.activeSuggestionIndex = -1;
    }

    function handleSearchKeyDown(event) {
        if (!state.search.currentSuggestionsContainer || state.search.currentSuggestionsContainer.classList.contains('hidden')) return;
        const items = state.search.currentSuggestionsContainer.querySelectorAll('li');
        if (items.length === 0) return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                state.search.activeSuggestionIndex = (state.search.activeSuggestionIndex + 1) % items.length;
                break;
            case 'ArrowUp':
                event.preventDefault();
                state.search.activeSuggestionIndex = (state.search.activeSuggestionIndex - 1 + items.length) % items.length;
                break;
            case 'Enter':
                event.preventDefault();
                if (state.search.activeSuggestionIndex >= 0 && state.search.activeSuggestionIndex < items.length) {
                    items[state.search.activeSuggestionIndex].dispatchEvent(new Event('mousedown'));
                }
                break;
            case 'Escape':
                clearSearchSuggestions();
                break;
            default:
                return;
        }
        items.forEach((item, index) => {
            item.classList.toggle('bg-slate-100', index === state.search.activeSuggestionIndex);
            item.classList.toggle('dark:bg-slate-700', index === state.search.activeSuggestionIndex);
        });
    }
    const clearSearchSuggestions = () => {
        if (state.search.currentSuggestionsContainer) {
            state.search.currentSuggestionsContainer.classList.add('hidden');
            const suggestionsList = state.search.currentSuggestionsContainer.querySelector('ul');
            if (suggestionsList) {
                suggestionsList.innerHTML = '';
            }
        }
        state.search.activeSuggestionIndex = -1;
    };
    const syncUIToState = () => {
        Object.values(dom.searchForms).forEach(form => {
            if (!form) return;
            const input = form.querySelector('input[type="search"]');
            if (input) {
                input.value = state.currentFilters.searchTerm;
            }
        });
        if (dom.filterHebrewOnlyCheckbox) {
            dom.filterHebrewOnlyCheckbox.checked = state.currentFilters.hebrewOnly;
        }
        if (dom.filterDurationMin) {
            dom.filterDurationMin.value = state.currentFilters.durationMin || '';
        }
        if (dom.filterDurationMax) {
            dom.filterDurationMax.value = state.currentFilters.durationMax === Infinity ? '' : state.currentFilters.durationMax;
        }
        if (dom.filterSortBy) {
            dom.filterSortBy.value = state.currentFilters.sortBy;
        }
        if (dom.filterTagsSelect) {
            [...dom.filterTagsSelect.options].forEach(option => {
                option.selected = state.currentFilters.tags.includes(option.value);
            });
        }
        if (dom.pageCategoryButtons) {
            dom.pageCategoryButtons.forEach(button => {
                const category = button.dataset.categoryButton;
                button.classList.toggle('bg-slate-900', category === state.currentFilters.category);
                button.classList.toggle('text-white', category === state.currentFilters.category);
                button.classList.toggle('bg-slate-100', category !== state.currentFilters.category);
                button.classList.toggle('text-slate-700', category !== state.currentFilters.category);
            });
        }
    };
    const updateFiltersAndURL = pushHistory => {
        updateURLWithFilters(pushHistory);
        applyFiltersAndRender(true);
        syncUIToState();
    };
    const initCategoryFilters = () => {
        if (dom.filterHebrewOnlyCheckbox) {
            dom.filterHebrewOnlyCheckbox.addEventListener('change', () => {
                state.currentFilters.hebrewOnly = dom.filterHebrewOnlyCheckbox.checked;
                updateFiltersAndURL(true);
            });
        }
        if (dom.filterDurationMin) {
            dom.filterDurationMin.addEventListener('change', () => {
                const value = parseInt(dom.filterDurationMin.value || '0', 10);
                state.currentFilters.durationMin = isNaN(value) ? 0 : value;
                updateFiltersAndURL(true);
            });
        }
        if (dom.filterDurationMax) {
            dom.filterDurationMax.addEventListener('change', () => {
                const value = parseInt(dom.filterDurationMax.value || '0', 10);
                state.currentFilters.durationMax = isNaN(value) ? Infinity : value;
                updateFiltersAndURL(true);
            });
        }
        if (dom.filterSortBy) {
            dom.filterSortBy.addEventListener('change', () => {
                state.currentFilters.sortBy = dom.filterSortBy.value;
                updateFiltersAndURL(true);
            });
        }
        if (dom.filterTagsSelect) {
            dom.filterTagsSelect.addEventListener('change', () => {
                state.currentFilters.tags = [...dom.filterTagsSelect.selectedOptions].map(option => option.value);
                updateFiltersAndURL(true);
            });
        }
        if (dom.clearFiltersButton) {
            dom.clearFiltersButton.addEventListener('click', () => {
                state.currentFilters.tags = [];
                state.currentFilters.hebrewOnly = false;
                state.currentFilters.durationMin = 0;
                state.currentFilters.durationMax = Infinity;
                state.currentFilters.sortBy = 'dateDesc';
                updateFiltersAndURL(true);
            });
        }
        if (dom.pageCategoryButtons) {
            dom.pageCategoryButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const category = button.dataset.categoryButton;
                    state.currentFilters.category = category;
                    localStorage.setItem(CONSTANTS.LAST_VISITED_CATEGORY_KEY, category);
                    applyFiltersAndRender(true);
                    syncUIToState();
                    if (getPageName() === 'category.html') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('category', category);
                        window.history.pushState({}, '', url.toString());
                    } else {
                        window.location.href = `category.html?category=${encodeURIComponent(category)}`;
                    }
                });
            });
        }
        if (dom.categoryChipsContainer) {
            dom.categoryChipsContainer.innerHTML = '';
            const categories = ['all', 'review', 'maintenance', 'troubleshooting', 'diy', 'safety', 'collectors', 'industry'];
            categories.forEach(category => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.categoryButton = category;
                button.className = 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition-colors mr-2 mb-2';
                button.innerHTML = `<span class="mr-1">${getCategoryEmoji(category)}</span>${getCategoryLabel(category)}`;
                button.addEventListener('click', () => {
                    state.currentFilters.category = category;
                    localStorage.setItem(CONSTANTS.LAST_VISITED_CATEGORY_KEY, category);
                    applyFiltersAndRender(true);
                    syncUIToState();
                    if (getPageName() === 'category.html') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('category', category);
                        window.history.pushState({}, '', url.toString());
                    } else {
                        window.location.href = `category.html?category=${encodeURIComponent(category)}`;
                    }
                });
                dom.categoryChipsContainer.appendChild(button);
            });
        }
    };
    const showSingleVideoView = videoId => {
        const video = state.allVideos.find(v => v.id === videoId);
        if (!video || !dom.singleVideoView.container) return;
        markVideoAsVisited(videoId);
        if (dom.singleVideoView.title) dom.singleVideoView.title.textContent = video.title;
        if (dom.singleVideoView.channel) dom.singleVideoView.channel.textContent = video.channel;
        if (dom.singleVideoView.thumbnail) {
            dom.singleVideoView.thumbnail.src = video.thumbnailUrl;
            dom.singleVideoView.thumbnail.alt = video.title;
        }
        if (dom.singleVideoView.openOnYoutubeBtn) {
            dom.singleVideoView.openOnYoutubeBtn.href = video.url;
        }
        if (dom.singleVideoView.description) {
            dom.singleVideoView.description.textContent = video.content;
        }
        if (dom.singleVideoView.tagsContainer) {
            dom.singleVideoView.tagsContainer.innerHTML = '';
            video.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 mr-1 mb-1';
                tagElement.textContent = `#${tag}`;
                dom.singleVideoView.tagsContainer.appendChild(tagElement);
            });
        }
        updateFavoriteButtons(videoId);
        if (dom.videoCardsContainer) dom.videoCardsContainer.classList.add('hidden');
        if (dom.noVideosFoundMessage) dom.noVideosFoundMessage.classList.add('hidden');
        if (dom.loadMoreButton) dom.loadMoreButton.classList.add('hidden');
        if (dom.singleVideoView.container) dom.singleVideoView.container.classList.remove('hidden');
        const url = new URL(window.location.href);
        url.searchParams.set('v', videoId);
        window.history.pushState({}, '', url.toString());
        state.ui.lastFocusedElement = document.activeElement;
        dom.singleVideoView.container.focus();
    };
    const hideSingleVideoView = () => {
        if (!dom.singleVideoView.container) return;
        dom.singleVideoView.container.classList.add('hidden');
        if (dom.videoCardsContainer) dom.videoCardsContainer.classList.remove('hidden');
        if (dom.loadMoreButton && state.filteredVideos.length > state.ui.currentlyDisplayedVideosCount) {
            dom.loadMoreButton.classList.remove('hidden');
        }
        const url = new URL(window.location.href);
        url.searchParams.delete('v');
        window.history.pushState({}, '', url.toString());
        if (state.ui.lastFocusedElement) {
            state.ui.lastFocusedElement.focus();
        } else if (dom.videoCardsContainer) {
            const firstCardLink = dom.videoCardsContainer.querySelector('a');
            if (firstCardLink) firstCardLink.focus();
        }
    };
    const renderFavorites = () => {
        if (!dom.favoriteVideosContainer || !dom.noFavoritesMessage) return;
        dom.favoriteVideosContainer.innerHTML = '';
        const favoriteVideos = state.allVideos.filter(video => isVideoFavorite(video.id));
        if (favoriteVideos.length === 0) {
            dom.noFavoritesMessage.classList.remove('hidden');
            dom.favoriteVideosContainer.classList.add('hidden');
            return;
        }
        dom.noFavoritesMessage.classList.add('hidden');
        dom.favoriteVideosContainer.classList.remove('hidden');
        favoriteVideos.forEach(video => {
            const card = createVideoCard(video);
            if (card) dom.favoriteVideosContainer.appendChild(card);
        });
        observeLazyImages();
    };
    const renderVisitedVideos = () => {
        if (!dom.visitedVideosContainer || !dom.noVisitedMessage) return;
        dom.visitedVideosContainer.innerHTML = '';
        const visitedVideos = state.allVideos.filter(video => isVideoVisited(video.id));
        if (visitedVideos.length === 0) {
            dom.noVisitedMessage.classList.remove('hidden');
            dom.visitedVideosContainer.classList.add('hidden');
            return;
        }
        dom.noVisitedMessage.classList.add('hidden');
        dom.visitedVideosContainer.classList.remove('hidden');
        visitedVideos.slice(-50).reverse().forEach(video => {
            const card = createVideoCard(video);
            if (card) dom.visitedVideosContainer.appendChild(card);
        });
        observeLazyImages();
    };
    const loadFeaturedChannels = async () => {
        if (!dom.featuredChannelsSection || !dom.featuredChannelsContainer) return;
        try {
            const response = await fetch('data/featured_channels.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to load featured channels');
            const data = await response.json();
            dom.featuredChannelsContainer.innerHTML = '';
            (data.channels || []).forEach(channel => {
                const card = document.createElement('article');
                card.className = 'flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm';
                const img = document.createElement('img');
                img.src = channel.image || CONSTANTS.DEFAULT_CHANNEL_IMAGE;
                img.alt = channel.channel_name;
                img.className = 'w-10 h-10 rounded-full object-cover';
                const content = document.createElement('div');
                content.className = 'flex-1 min-w-0';
                const nameEl = document.createElement('p');
                nameEl.className = 'text-sm font-semibold text-slate-900 dark:text-slate-100 truncate';
                nameEl.textContent = channel.channel_name;
                const urlEl = document.createElement('a');
                urlEl.href = channel.channel_url;
                urlEl.target = '_blank';
                urlEl.rel = 'noopener noreferrer';
                urlEl.className = 'text-xs text-blue-600 dark:text-blue-400 hover:underline';
                urlEl.textContent = 'פתח ערוץ ביוטיוב';
                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-2 mt-1';
                const favoriteButton = document.createElement('button');
                favoriteButton.type = 'button';
                favoriteButton.className = 'inline-flex items-center px-2 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';
                const isFavorite = state.favorites.channels.has(channel.channel_name);
                favoriteButton.innerHTML = `<span class="mr-1">${isFavorite ? '★' : '☆'}</span><span>${isFavorite ? 'מועדף' : 'הוסף למועדפים'}</span>`;
                favoriteButton.addEventListener('click', () => {
                    toggleFavoriteChannel(channel.channel_name);
                });
                actions.appendChild(favoriteButton);
                content.appendChild(nameEl);
                content.appendChild(urlEl);
                content.appendChild(actions);
                card.appendChild(img);
                card.appendChild(content);
                dom.featuredChannelsContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading featured channels:', error);
            dom.featuredChannelsSection.classList.add('hidden');
        }
    };
    const initPageCategoryButtons = () => {
        if (!dom.pageCategoryButtons) return;
        dom.pageCategoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.categoryButton;
                state.currentFilters.category = category;
                localStorage.setItem(CONSTANTS.LAST_VISITED_CATEGORY_KEY, category);
                applyFiltersAndRender(true);
                syncUIToState();
                if (getPageName() === 'category.html') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('category', category);
                    window.history.pushState({}, '', url.toString());
                } else {
                    window.location.href = `category.html?category=${encodeURIComponent(category)}`;
                }
            });
        });
    };
    const getCategoryFromURL = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('category') || null;
    };
    const initSingleVideoView = () => {
        if (dom.singleVideoView.backButton) {
            dom.singleVideoView.backButton.addEventListener('click', () => {
                hideSingleVideoView();
            });
        }
    };
    const initScrollTopButton = () => {
        if (dom.scrollTopButton) {
            dom.scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        }
        window.addEventListener('scroll', () => throttle(handleScroll, 100));
    };
    const initSearchForms = () => {
        Object.values(dom.searchForms).forEach(form => {
            if (!form) return;
            form.addEventListener('submit', e => {
                e.preventDefault();
                handleSearchSubmit(form);
            });
            const input = form.querySelector('input[type="search"]');
            if (input) {
                input.addEventListener('input', () => throttle(() => handleSearchInput(input), 300));
                input.addEventListener('keydown', handleSearchKeyDown);
                input.addEventListener('blur', () => setTimeout(() => { if (!state.search.isSuggestionClicked) clearSearchSuggestions(); }, 150));
            }
        });
    };
    const initFavoritesAndVisited = () => {
        if (dom.favoritesPageContainer) {
            renderFavorites();
            renderVisitedVideos();
        }
    };
    const loadVideos = async () => {
        const allVideos = [];
        for (const filePath of CONSTANTS.CATEGORY_FILES) {
            try {
                const response = await fetch(filePath, { cache: 'no-store' });
                if (!response.ok) {
                    console.error(`Failed to load ${filePath}:`, response.statusText);
                    continue;
                }
                const data = await response.json();
                const categoryKey = filePath.split('/').pop().replace('.json', '');
                const videosArray = Array.isArray(data) ? data : data.videos || [];
                const mappedVideos = videosArray.map((video, index) => {
                    const mapped = mapVideoData(video, index, categoryKey);
                    updateStatsWithVideo(mapped);
                    return mapped;
                });
                allVideos.push(...mappedVideos);
            } catch (error) {
                console.error(`Error loading or processing ${filePath}:`, error);
            }
        }
        state.allVideos = allVideos.sort((a, b) => b.dateAdded - a.dateAdded);
    };
    const initCurrentYearFooter = () => {
        if (dom.currentYearFooter) {
            dom.currentYearFooter.textContent = new Date().getFullYear();
        }
    };
    const initVideoObserver = () => {
        observeLazyImages();
    };
    const initApp = async () => {
        if (dom.preloader) {
            dom.preloader.classList.remove('hidden');
        }
        initDarkMode();
        initCurrentYearFooter();
        dom.favorites = {
            videos: getStoredFavorites(),
            channels: getStoredFavoriteChannels()
        };
        state.visitedVideos = getStoredVisitedVideos();
        dom.darkModeToggles.forEach(toggle => {
            toggle.addEventListener('click', handleDarkModeToggle);
        });
        if (dom.openMenuBtn) dom.openMenuBtn.addEventListener('click', openMobileMenu);
        if (dom.closeMenuBtn) dom.closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (dom.backdrop) dom.backdrop.addEventListener('click', closeMobileMenu);
        try {
            await loadVideos();
        } catch (e) {
            console.error('Failed to load videos', e);
        }
        initVideoObserver();
        const currentPage = getPageName();
        state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);
        const urlParams = new URLSearchParams(window.location.search);
        const videoIdFromUrl = urlParams.get('v');
        if (videoIdFromUrl && dom.singleVideoView.container) {
            showSingleVideoView(videoIdFromUrl);
        } else {
            if (currentPage === 'favorites.html') {
                renderFavorites();
                renderVisitedVideos();
            } else {
                if (currentPage === 'index.html' || currentPage === '') {
                    const lastCategory = localStorage.getItem(CONSTANTS.LAST_VISITED_CATEGORY_KEY) || 'all';
                    state.currentFilters.category = lastCategory;
                    if (dom.homepageCategoriesGrid) {
                        dom.homepageCategoriesGrid.querySelectorAll('[data-category-card]').forEach(card => {
                            const category = card.dataset.categoryCard;
                            card.classList.toggle('ring-2', category === lastCategory);
                            card.classList.toggle('ring-blue-500', category === lastCategory);
                        });
                    }
                    if (dom.featuredChannelsSection) {
                        loadFeaturedChannels();
                    }
                } else if (currentPage === 'category.html') {
                    const categoryFromURL = getCategoryFromURL();
                    if (categoryFromURL) {
                        state.currentFilters.category = categoryFromURL.toLowerCase();
                        state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);
                        updateCategoryPageUI(state.currentFilters.category);
                    }
                }
                applyFiltersFromURL();
                syncUIToState();
                if (dom.popularTagsContainer) renderPopularTags();
                applyFiltersAndRender(true);
            }
        }
        initCategoryFilters();
        initPageCategoryButtons();
        initSingleVideoView();
        initScrollTopButton();
        initSearchForms();
        initFavoritesAndVisited();
        if (dom.preloader) {
            dom.preloader.classList.add('hidden');
        }
    };
    initApp().catch(error => {
        console.error('Error initializing app:', error);
        if (dom.preloader) {
            dom.preloader.classList.add('hidden');
        }
    });
});

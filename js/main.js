document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION & CONSTANTS ---
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
                { name: 'channel', weight: 0.1 }
            ],
            includeScore: true,
            includeMatches: true,
            threshold: 0.4,
            minMatchCharLength: 2,
            ignoreLocation: true
        },
        PREDEFINED_CATEGORIES: [
            { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "film" },
            { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600", darkGradient: "dark:from-purple-600 dark:to-indigo-700" },
            { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "oil-can", gradient: "from-blue-500 to-cyan-600", darkGradient: "dark:from-blue-600 dark:to-cyan-700" },
            { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "tools", gradient: "from-green-500 to-teal-600", darkGradient: "dark:from-green-600 dark:to-teal-700" },
            { id: "troubleshooting", name: "איתור ותיקון תקלות", description: "אבחון ופתרון בעיות", icon: "microscope", gradient: "from-lime-400 to-yellow-500", darkGradient: "dark:from-lime-500 dark:to-yellow-600" },
            { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "rocket", gradient: "from-orange-500 to-red-600", darkGradient: "dark:from-orange-600 dark:to-red-700" },
            { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "cogs", gradient: "from-yellow-500 to-amber-600", darkGradient: "dark:from-yellow-600 dark:to-amber-700" },
            { id: "collectors", name: "רכבי אספנות", description: "רכבים נוסטלגיים שחזרו לכביש", icon: "car-side", gradient: "from-red-500 to-pink-600", darkGradient: "dark:from-red-600 dark:to-pink-700" }
        ]
    };

    // --- DOM ELEMENT REFERENCES ---
    const dom = {
        body: document.body,
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        openMenuBtn: document.getElementById('open-menu-btn'),
        closeMenuBtn: document.getElementById('close-menu-btn'),
        mobileMenu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        videoCountHero: document.getElementById('video-count-hero'),
        currentYearFooter: document.getElementById('current-year-footer'),
        videoCardsContainer: document.getElementById('video-cards-container'),
        loadingPlaceholder: document.getElementById('loading-videos-placeholder'),
        noVideosFoundMessage: document.getElementById('no-videos-found'),
        videoCardTemplate: document.getElementById('video-card-template'),
        homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
        hebrewFilterToggle: document.getElementById('hebrew-filter-toggle'),
        popularTagsContainer: document.getElementById('popular-tags-container'),
        tagSearchInput: document.getElementById('tag-search-input'),
        customTagForm: document.getElementById('custom-tag-form'),
        selectedTagsContainer: document.getElementById('selected-tags-container'),
        backToTopButton: document.getElementById('back-to-top-btn'),
        filterSummaryContainer: document.getElementById('filter-summary-container'),
        filterSummaryText: document.getElementById('filter-summary-text'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        shareFiltersBtn: document.getElementById('share-filters-btn'),
        sortSelect: document.getElementById('sort-by-select'),
        searchForms: {
            desktop: document.getElementById('desktop-search-form'),
            mobile: document.getElementById('mobile-search-form'),
            main: document.getElementById('main-content-search-form')
        },
        searchSuggestions: {
            desktop: document.getElementById('desktop-search-suggestions'),
            mobile: document.getElementById('mobile-search-suggestions'),
            main: document.getElementById('main-content-search-suggestions')
        },
        mainPageContent: document.getElementById('main-page-content'),
        siteFooter: document.getElementById('site-footer'),
        // Single Video View elements
        singleVideoView: {
            container: document.getElementById('single-video-view'),
            player: document.getElementById('single-video-player-container'),
            title: document.getElementById('single-video-title'),
            tags: document.getElementById('single-video-tags'),
            channel: document.getElementById('single-video-channel'),
            duration: document.getElementById('single-video-duration'),
            date: document.getElementById('single-video-date'),
            shareBtn: document.getElementById('single-video-share-btn')
        }
    };

    // --- APPLICATION STATE ---
    let state = {
        allVideos: [],
        fuse: null,
        currentFilters: {
            category: 'all',
            tags: [],
            searchTerm: '',
            hebrewOnly: false,
            sortBy: 'date-desc'
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
        }
    };

    // --- UTILITY FUNCTIONS ---
    const throttle = (callback, time) => {
        if (state.ui.throttleTimer) return;
        state.ui.throttleTimer = true;
        setTimeout(() => {
            callback();
            state.ui.throttleTimer = false;
        }, time);
    };

    const escapeHTML = (str) => {
        if (str === null || typeof str === 'undefined') return '';
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(String(str)));
        return p.innerHTML;
    };
    
    const capitalizeFirstLetter = (string) => !string ? '' : string.charAt(0).toUpperCase() + string.slice(1);
    
    const isHomePage = () => {
        const path = window.location.pathname;
        return path === '/' || path.endsWith('/index.html');
    };

    const getCategoryFromURL = () => new URLSearchParams(window.location.search).get('name');
    
    const parseDurationToSeconds = (durationStr) => {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        const parts = durationStr.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 1) return parts[0];
        return 0;
    };

    // --- DATA FETCHING & PROCESSING ---
    async function loadVideos() {
        if (dom.loadingPlaceholder && !dom.loadingPlaceholder.closest('#single-video-view')) {
            dom.loadingPlaceholder.classList.remove('hidden');
            dom.loadingPlaceholder.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin fa-3x mb-3 text-purple-600 dark:text-purple-400"></i><p class="text-lg text-slate-600 dark:text-slate-300">טוען סרטונים...</p></div>`;
        }
        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`HTTP ${response.status} - failed to fetch videos.json`);
            
            const rawVideos = await response.json();
            if (!Array.isArray(rawVideos)) throw new Error("Video data is not a valid array.");
            
            state.allVideos = rawVideos.map(video => ({
                ...video,
                category: (video.category || '').toLowerCase(),
                tags: (video.tags || []).map(tag => String(tag).toLowerCase()),
                durationInSeconds: parseDurationToSeconds(video.duration),
                dateAdded: video.dateAdded ? new Date(video.dateAdded) : null
            }));

            if (dom.videoCountHero) {
                const countSpan = dom.videoCountHero.querySelector('span');
                if (countSpan) countSpan.textContent = state.allVideos.length;
            }
        } catch (error) {
            console.error("Error loading videos:", error);
            state.allVideos = [];
            if (dom.videoCountHero?.querySelector('span')) dom.videoCountHero.querySelector('span').textContent = "שגיאה";
            displayError('שגיאה בטעינת המידע. נסה לרענן את הדף.');
        } finally {
             if (dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        }
    }
    
    function getFilteredAndSortedVideos() {
        if (!state.allVideos) return [];

        let filtered = state.allVideos;

        // 1. Filter by Category
        if (state.currentFilters.category !== 'all') {
            filtered = filtered.filter(v => v.category === state.currentFilters.category);
        }
        
        // 2. Filter by Search Term (Fuse.js)
        if (state.currentFilters.searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            const fuseResults = state.fuse.search(state.currentFilters.searchTerm);
            const resultIds = new Set(fuseResults.map(r => r.item.id));
            filtered = filtered.filter(v => resultIds.has(v.id));
        }

        // 3. Filter by Tags and Language
        let videos = filtered.filter(video => {
            const tagsMatch = state.currentFilters.tags.length === 0 || state.currentFilters.tags.every(filterTag => video.tags.includes(filterTag));
            const hebrewMatch = !state.currentFilters.hebrewOnly || video.hebrewContent;
            return tagsMatch && hebrewMatch;
        });
        
        // 4. Sort
        videos.sort((a, b) => {
            switch (state.currentFilters.sortBy) {
                case 'date-desc': return (b.dateAdded || 0) - (a.dateAdded || 0);
                case 'date-asc': return (a.dateAdded || 0) - (b.dateAdded || 0);
                case 'title-asc': return a.title.localeCompare(b.title, 'he');
                case 'title-desc': return b.title.localeCompare(a.title, 'he');
                case 'duration-asc': return a.durationInSeconds - b.durationInSeconds;
                case 'duration-desc': return b.durationInSeconds - a.durationInSeconds;
                default: return 0;
            }
        });
        
        return videos;
    }
    
    // --- RENDERING & UI UPDATES ---
    function applyFilters(isLoadMore = false, andScroll = true) {
        if (!isLoadMore) {
            state.ui.currentlyDisplayedVideosCount = 0;
        }
        const allMatchingVideos = getFilteredAndSortedVideos();
        renderVideoCards(allMatchingVideos, isLoadMore);
        
        if (andScroll && !isLoadMore) {
            scrollToVideoGridIfNeeded();
        }
        clearSearchSuggestions();
        updateFilterSummary();
        updateURLWithFilters();
    }
    
    function renderVideoCards(allMatchingVideos, isLoadMore) {
        if (!dom.videoCardsContainer) return;
        if (!isLoadMore) dom.videoCardsContainer.innerHTML = '';
        
        const videosToRender = allMatchingVideos.slice(
            state.ui.currentlyDisplayedVideosCount,
            state.ui.currentlyDisplayedVideosCount + (isLoadMore ? CONSTANTS.VIDEOS_TO_LOAD_MORE : CONSTANTS.VIDEOS_TO_SHOW_INITIALLY)
        );

        const fragment = document.createDocumentFragment();
        videosToRender.forEach(video => {
            const cardElement = createVideoCardElement(video);
            if (cardElement) fragment.appendChild(cardElement);
        });
        dom.videoCardsContainer.appendChild(fragment);
        state.ui.currentlyDisplayedVideosCount += videosToRender.length;

        const hasVideos = allMatchingVideos.length > 0;
        if(dom.noVideosFoundMessage) {
            dom.noVideosFoundMessage.classList.toggle('hidden', hasVideos);
            if (!hasVideos && !isLoadMore) {
                dom.noVideosFoundMessage.innerHTML = `<div class="col-span-full text-center text-slate-500 dark:text-slate-400 py-16">
                    <i class="fas fa-video-slash fa-4x mb-6 text-purple-400 dark:text-purple-500"></i>
                    <p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p>
                    <p class="text-lg mb-6">נסה לשנות את הסינון או לחפש משהו אחר.</p>
                    <button id="no-results-clear-btn" class="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-slate-800">נקה את כל הסינונים</button>
                </div>`;
            }
        }
        
        updateLoadMoreButton(allMatchingVideos.length);
    }

    function createVideoCardElement(video) {
        if (!dom.videoCardTemplate?.content) return null;

        const cardClone = dom.videoCardTemplate.content.cloneNode(true);
        const card = {
            article: cardClone.querySelector('article'),
            thumbnailImg: cardClone.querySelector('.video-thumbnail-img'),
            duration: cardClone.querySelector('.video-duration'),
            playLink: cardClone.querySelector('.video-play-link'),
            iframe: cardClone.querySelector('.video-iframe'),
            titleLink: cardClone.querySelector('.video-link'),
            channelName: cardClone.querySelector('.channel-name'),
            channelLogo: cardClone.querySelector('.channel-logo'),
            tagsContainer: cardClone.querySelector('.video-tags'),
            categoryDisplay: cardClone.querySelector('.video-category-display'),
            dateDisplay: cardClone.querySelector('.video-date-display'),
            shareBtn: cardClone.querySelector('.share-btn'),
            newTabBtn: cardClone.querySelector('.new-tab-btn'),
            fullscreenBtn: cardClone.querySelector('.fullscreen-btn'),
        };
        
        const sanitizedTitle = escapeHTML(video.title);
        const videoPageUrl = `./?v=${video.id}`;
        
        card.article.dataset.videoId = video.id;
        card.thumbnailImg.src = video.thumbnail;
        card.thumbnailImg.alt = `תמונה ממוזערת: ${sanitizedTitle}`;
        card.duration.textContent = video.duration || '';
        card.playLink.href = videoPageUrl;
        card.iframe.title = `נגן וידאו: ${sanitizedTitle}`;
        card.titleLink.href = videoPageUrl;
        card.titleLink.textContent = sanitizedTitle;
        card.channelName.textContent = video.channel || '';

        if (card.shareBtn) card.shareBtn.dataset.videoId = video.id;
        if (card.newTabBtn) card.newTabBtn.href = videoPageUrl;
        if (card.fullscreenBtn) card.fullscreenBtn.dataset.videoId = video.id;
        
        card.channelLogo.src = video.channelImage || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Prevents broken image icon
        card.channelLogo.alt = `לוגו ערוץ ${escapeHTML(video.channel)}`;
        card.channelLogo.classList.toggle('hidden', !video.channelImage);

        if (video.tags?.length > 0) {
            card.tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${escapeHTML(tag)}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${escapeHTML(capitalizeFirstLetter(tag))}</button>`
            ).join('');
        }

        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === video.category);
        const categoryName = categoryData ? categoryData.name : capitalizeFirstLetter(video.category);
        const categoryIconEl = cardClone.querySelector('.video-category-icon');
        if (categoryIconEl) {
            categoryIconEl.className = `video-category-icon fas fa-${categoryData?.icon || 'folder-open'} opacity-70 text-purple-500 dark:text-purple-400 ml-2`;
        }
        card.categoryDisplay.append(escapeHTML(categoryName));
        
        if (video.dateAdded && !isNaN(video.dateAdded.getTime())) {
            card.dateDisplay.append(video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }));
        } else {
            card.dateDisplay.style.display = 'none';
        }

        return card.article;
    }

    function renderHomepageCategoryButtons() {
        const skeleton = document.getElementById('loading-homepage-categories-skeleton');
        if (!dom.homepageCategoriesGrid) return;

        if (skeleton) skeleton.style.display = 'none';
        dom.homepageCategoriesGrid.innerHTML = CONSTANTS.PREDEFINED_CATEGORIES
            .filter(cat => cat.id !== 'all')
            .map(cat => {
                const gradientClasses = `${cat.gradient} ${cat.darkGradient || ''}`;
                return `
                    <a href="category.html?name=${cat.id}" class="category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${gradientClasses} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white dark:focus:ring-purple-500/50">
                        <div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]">
                            <i class="fas fa-${cat.icon || 'folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                            <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 dark:group-hover:text-yellow-200 transition-colors">${escapeHTML(cat.name)}</h3>
                            <p class="text-sm opacity-80 mt-1 px-2">${escapeHTML(cat.description)}</p>
                        </div>
                    </a>`;
            }).join('');
    }
    
    function getIconForTag(tag) {
        const tagIcons = { "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "גיר": "fa-cog", "שמן מנוע": "fa-oil-can", "מצבר": "fa-car-battery", "תחזוקה": "fa-tools", "טיפול": "fa-wrench", "בדיקה לפני קנייה": "fa-search-dollar", "שיפורים": "fa-rocket", "רכב חשמלי": "fa-charging-station", "הכנופיה": "fa-users-cog", "ניקוי מצערת": "fa-spray-can-sparkles", "אספנות": "fa-gem", "נוזל בלמים": "fa-tint", "עשה זאת בעצמך": "fa-hand-sparkles" };
        return tagIcons[tag.toLowerCase()] || "fa-tag";
    }

    function renderPopularTags() {
        if (!dom.popularTagsContainer) return;
        const { category } = state.currentFilters;
        const videosToConsider = category !== 'all' ? state.allVideos.filter(v => v.category === category) : state.allVideos;

        if (videosToConsider.length === 0) {
            dom.popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות${category !== 'all' ? ' בקטגוריה זו' : ''}.</p>`;
            return;
        }

        const tagCounts = videosToConsider.flatMap(v => v.tags).reduce((acc, tag) => ({ ...acc, [tag]: (acc[tag] || 0) + 1 }), {});
        const sortedTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, CONSTANTS.MAX_POPULAR_TAGS).map(([tag]) => tag);

        dom.popularTagsContainer.innerHTML = sortedTags.map(tag => {
            const iconClass = getIconForTag(tag);
            return `<button class="tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5" data-tag-value="${escapeHTML(tag)}"><i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(capitalizeFirstLetter(tag))}</button>`;
        }).join('');
        updateActiveTagVisuals();
    }
    
    function updateActiveTagVisuals() {
        document.querySelectorAll('.tag[data-tag-value]').forEach(tagElement => {
            const tagName = tagElement.dataset.tagValue;
            const isActive = state.currentFilters.tags.includes(tagName);
            tagElement.classList.toggle('active-search-tag', isActive);
            tagElement.classList.toggle('bg-purple-100', !isActive);
        });
    }

    function renderSelectedTagChips() {
        if (!dom.selectedTagsContainer) return;
        dom.selectedTagsContainer.innerHTML = state.currentFilters.tags.map(tagName => `
            <span class="flex items-center gap-1.5 bg-purple-600 text-white dark:bg-purple-500 text-sm font-medium ps-3 pe-2 py-1.5 rounded-full animate-fade-in">
                ${escapeHTML(capitalizeFirstLetter(tagName))}
                <button type="button" class="remove-tag-btn text-xs opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none" data-tag-to-remove="${escapeHTML(tagName)}" aria-label="הסר תגית ${escapeHTML(tagName)}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    }

    function updateFilterSummary() {
        if (!dom.filterSummaryContainer) return;
        const { tags, hebrewOnly, searchTerm } = state.currentFilters;
        let count = tags.length + (hebrewOnly ? 1 : 0) + (searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH ? 1 : 0);

        if (count > 0) {
            dom.filterSummaryText.textContent = `${count} סינונים פעילים`;
            dom.filterSummaryContainer.classList.remove('hidden');
        } else {
            dom.filterSummaryContainer.classList.add('hidden');
        }
    }

    function updateLoadMoreButton(totalMatchingVideos) {
        let loadMoreBtn = document.getElementById('load-more-videos-btn');
        if (state.ui.currentlyDisplayedVideosCount < totalMatchingVideos) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-videos-btn';
                loadMoreBtn.className = 'mt-8 mb-4 mx-auto block px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:focus:ring-offset-slate-900 transition-transform hover:scale-105';
                loadMoreBtn.addEventListener('click', () => applyFilters(true));
                dom.videoCardsContainer?.parentNode.insertBefore(loadMoreBtn, dom.videoCardsContainer.nextSibling);
            }
            loadMoreBtn.textContent = `טען עוד (${totalMatchingVideos - state.ui.currentlyDisplayedVideosCount} נותרו)`;
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn?.remove();
        }
    }
    
    function updateCategoryPageUI(categoryId) {
        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const name = categoryData ? categoryData.name : capitalizeFirstLetter(categoryId || 'קטגוריה');
        const icon = categoryData ? categoryData.icon : 'folder-open';

        document.title = `${name} - CAR-טיב`;
        
        const pageTitle = document.getElementById('category-page-title');
        if (pageTitle) pageTitle.innerHTML = `<i class="fas fa-${icon} text-purple-600 dark:text-purple-400 mr-4"></i>${escapeHTML(name)}`;
        
        const breadcrumb = document.getElementById('breadcrumb-category-name');
        if (breadcrumb) breadcrumb.textContent = escapeHTML(name);
        
        const videosHeading = document.getElementById('videos-in-category-heading')?.querySelector('span');
        if (videosHeading) videosHeading.innerHTML = `סרטונים ב: <span class="font-bold text-purple-600 dark:text-purple-400">${escapeHTML(name)}</span>`;
    }
    
    function displayError(message, container = dom.noVideosFoundMessage) {
        if(dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        if (container) {
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center text-red-500 dark:text-red-400 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${escapeHTML(message)}</p></div>`;
        }
    }

    function syncUIToState() {
        const { searchTerm, hebrewOnly, sortBy, tags } = state.currentFilters;
        Object.values(dom.searchForms).forEach(form => form?.querySelector('input')?.value = searchTerm);
        if(dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = hebrewOnly;
        if(dom.sortSelect) dom.sortSelect.value = sortBy;
        renderSelectedTagChips();
        updateActiveTagVisuals();
    }

    // --- PAGE VIEW MANAGEMENT ---
    function setupHomePageView() {
        dom.mainPageContent.style.display = 'block';
        dom.singleVideoView.container.classList.add('hidden');
        if(dom.siteFooter) dom.siteFooter.classList.remove('hidden');
        renderHomepageCategoryButtons();
        applyFiltersFromURL();
        syncUIToState();
        renderPopularTags();
        applyFilters(false, false);
        handleScrollSpy();
    }
    
    function setupCategoryPageView() {
        dom.mainPageContent.style.display = 'block';
        dom.singleVideoView.container.classList.add('hidden');
        if(dom.siteFooter) dom.siteFooter.classList.remove('hidden');
        
        const categoryFromURL = getCategoryFromURL();
        if (categoryFromURL) {
            const currentCategory = categoryFromURL.toLowerCase();
            state.currentFilters.category = currentCategory;
            updateCategoryPageUI(currentCategory);
        }
        applyFiltersFromURL();
        syncUIToState();
        renderPopularTags();
        applyFilters(false, false);
    }

    function renderSingleVideoPage(videoId) {
        dom.mainPageContent.style.display = 'none';
        dom.singleVideoView.container.classList.remove('hidden');
        if(dom.siteFooter) dom.siteFooter.classList.remove('hidden');
        window.scrollTo(0, 0);

        const video = state.allVideos.find(v => v.id === videoId);

        if (video) {
            document.title = `${video.title} - CAR-טיב`;
            dom.singleVideoView.title.textContent = video.title;
            dom.singleVideoView.player.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3" title="${escapeHTML(video.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
            dom.singleVideoView.channel.innerHTML = `<img src="${video.channelImage || ''}" alt="" class="h-6 w-6 rounded-full"><span class="font-medium">${escapeHTML(video.channel)}</span>`;
            dom.singleVideoView.duration.innerHTML = `<i class="fas fa-clock fa-fw"></i> ${escapeHTML(video.duration)}`;
            
            if (video.dateAdded && !isNaN(video.dateAdded.getTime())) {
                dom.singleVideoView.date.style.display = 'flex';
                dom.singleVideoView.date.innerHTML = `<i class="fas fa-calendar-alt fa-fw"></i> ${video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            } else {
                dom.singleVideoView.date.style.display = 'none';
            }

            dom.singleVideoView.tags.innerHTML = (video.tags || []).map(tag =>
                `<a href="./?tags=${encodeURIComponent(tag)}#video-grid-section" class="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${escapeHTML(capitalizeFirstLetter(tag))}</a>`
            ).join('');
            
        } else {
            document.title = 'סרטון לא נמצא - CAR-טיב';
            dom.singleVideoView.container.innerHTML = `<div class="text-center py-16">
                <i class="fas fa-exclamation-triangle fa-4x mb-6 text-red-500"></i>
                <h1 class="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">הסרטון לא נמצא</h1>
                <p class="text-lg text-slate-600 dark:text-slate-400 mb-8">לא מצאנו את הסרטון שחיפשת. ייתכן שהוסר או שהקישור אינו תקין.</p>
                <a href="./" class="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                    <i class="fas fa-arrow-left ml-2"></i> חזור לדף הבית
                </a>
             </div>`;
        }
    }
    
    // --- EVENT HANDLERS & LISTENERS ---
    
    // Theme & Menu
    const handleThemeToggle = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        dom.darkModeToggles.forEach(toggle => {
            toggle.querySelector('.fa-moon')?.classList.toggle('hidden', isDark);
            toggle.querySelector('.fa-sun')?.classList.toggle('hidden', !isDark);
            toggle.setAttribute('aria-checked', String(isDark));
        });
    };
    const openMobileMenu = () => {
        state.ui.lastFocusedElement = document.activeElement;
        dom.mobileMenu?.classList.remove('translate-x-full');
        dom.backdrop?.classList.remove('invisible', 'opacity-0');
        dom.body.classList.add('overflow-hidden', 'md:overflow-auto');
        dom.openMenuBtn?.setAttribute('aria-expanded', 'true');
        setTimeout(() => dom.closeMenuBtn?.focus(), 100);
    };
    const closeMobileMenu = () => {
        dom.mobileMenu?.classList.add('translate-x-full');
        dom.backdrop?.classList.add('invisible', 'opacity-0');
        dom.body.classList.remove('overflow-hidden', 'md:overflow-auto');
        dom.openMenuBtn?.setAttribute('aria-expanded', 'false');
        state.ui.lastFocusedElement?.focus();
    };

    // Filters & Sorting
    const toggleTagSelection = (tagName) => {
        const { tags } = state.currentFilters;
        const index = tags.indexOf(tagName);
        if (index > -1) tags.splice(index, 1);
        else tags.push(tagName);
        
        updateActiveTagVisuals();
        renderSelectedTagChips();
        applyFilters(false);
    };

    const addCustomTag = (tagName) => {
        if (tagName && !state.currentFilters.tags.includes(tagName)) {
            toggleTagSelection(tagName);
        }
    };

    const clearAllFilters = () => {
        state.currentFilters = { ...state.currentFilters, tags: [], searchTerm: '', hebrewOnly: false, sortBy: 'date-desc' };
        localStorage.removeItem('hebrewOnlyPreference');
        syncUIToState();
        applyFilters(false, false);
    };

    // Search
    const handleSearchSubmit = (form) => {
        const input = form.querySelector('input[type="search"]');
        if (!input) return;
        const searchTerm = input.value.trim();
        const onSingleVideoPage = new URLSearchParams(window.location.search).has('v');

        if (onSingleVideoPage || !isHomePage()) {
            const targetUrl = new URL(window.location.origin);
            if (searchTerm) targetUrl.searchParams.set('search', searchTerm);
            window.location.href = targetUrl.toString();
        } else {
            state.currentFilters.searchTerm = searchTerm;
            applyFilters(false);
        }
    };
    
    const handleSearchInput = (inputElement) => {
        const suggestionsContainer = document.getElementById(`${inputElement.id.replace('-input', '')}-suggestions`);
        state.search.currentInput = inputElement;
        state.search.currentSuggestionsContainer = suggestionsContainer;
        const searchTerm = inputElement.value.trim();

        if (searchTerm.length < CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            clearSearchSuggestions();
            if (searchTerm === '' && !new URLSearchParams(window.location.search).has('v')) {
                state.currentFilters.searchTerm = '';
                applyFilters(false, false);
            }
            return;
        }
        
        const fuseSource = state.currentFilters.category !== 'all' 
            ? state.allVideos.filter(v => v.category === state.currentFilters.category)
            : state.allVideos;
        
        const localFuse = new Fuse(fuseSource, CONSTANTS.FUSE_OPTIONS);
        displaySearchSuggestions(searchTerm, localFuse);
    };
    
    function displaySearchSuggestions(searchTerm, fuseInstance) {
        if (!fuseInstance || !state.search.currentSuggestionsContainer) return;
        const suggestionsList = state.search.currentSuggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;

        const results = fuseInstance.search(searchTerm).slice(0, CONSTANTS.MAX_SUGGESTIONS);

        suggestionsList.innerHTML = '';
        if (results.length === 0) {
            clearSearchSuggestions();
            return;
        }
        
        results.forEach((result, index) => {
            const li = document.createElement('li');
            li.className = 'px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer transition-colors';
            li.dataset.index = index;
            
            const titleMatch = result.matches?.find(m => m.key === 'title');
            li.innerHTML = titleMatch ? generateHighlightedText(result.item.title, titleMatch.indices) : escapeHTML(result.item.title);
            
            li.addEventListener('mousedown', () => {
                state.search.isSuggestionClicked = true;
                const inputElement = state.search.currentInput;
                inputElement.value = result.item.title;
                handleSearchSubmit(inputElement.form);
            });
            li.addEventListener('mouseup', () => setTimeout(() => { state.search.isSuggestionClicked = false; }, 50));
            suggestionsList.appendChild(li);
        });
        
        state.search.currentSuggestionsContainer.classList.remove('hidden');
        state.search.activeSuggestionIndex = -1;
    }
    
    const handleSearchKeyDown = (event) => {
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
                if (state.search.activeSuggestionIndex > -1) {
                    items[state.search.activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                } else {
                    handleSearchSubmit(event.target.form);
                }
                clearSearchSuggestions();
                return;
            case 'Escape':
                clearSearchSuggestions();
                return;
            default: return;
        }
        updateActiveSuggestionVisuals(items);
    };
    
    const updateActiveSuggestionVisuals = (items) => {
        items.forEach((item, index) => {
            item.classList.toggle('active-suggestion', index === state.search.activeSuggestionIndex);
            if (index === state.search.activeSuggestionIndex) item.scrollIntoView({ block: 'nearest' });
        });
    };

    const clearSearchSuggestions = () => {
        Object.values(dom.searchSuggestions).forEach(container => {
            if (container) {
                container.classList.add('hidden');
                const ul = container.querySelector('ul');
                if (ul) ul.innerHTML = '';
            }
        });
        state.search.activeSuggestionIndex = -1;
    };

    const generateHighlightedText = (text, indices) => {
        let result = '';
        let lastIndex = 0;
        indices.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
            if (start > lastIndex) result += escapeHTML(text.substring(lastIndex, start));
            result += `<strong class="font-semibold text-purple-600 dark:text-purple-300">${escapeHTML(text.substring(start, end + 1))}</strong>`;
            lastIndex = end + 1;
        });
        if (lastIndex < text.length) result += escapeHTML(text.substring(lastIndex));
        return result;
    };
    
    // URL Management
    const updateURLWithFilters = () => {
        const url = new URL(window.location);
        const { searchTerm, tags, hebrewOnly, sortBy } = state.currentFilters;
        
        const pageCategory = getCategoryFromURL();
        if(pageCategory) url.searchParams.set('name', pageCategory);
        else url.searchParams.delete('name');

        if (searchTerm) url.searchParams.set('search', searchTerm); else url.searchParams.delete('search');
        if (tags.length > 0) url.searchParams.set('tags', tags.join(',')); else url.searchParams.delete('tags');
        if (hebrewOnly) url.searchParams.set('hebrew', 'true'); else url.searchParams.delete('hebrew');
        if (sortBy !== 'date-desc') url.searchParams.set('sort', sortBy); else url.searchParams.delete('sort');
        
        url.searchParams.delete('v'); // Not a filter param
        
        history.replaceState(state.currentFilters, '', url);
    };

    const applyFiltersFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        state.currentFilters.searchTerm = params.get('search') || '';
        state.currentFilters.tags = params.get('tags')?.split(',').filter(Boolean) || [];
        state.currentFilters.sortBy = params.get('sort') || 'date-desc';
        
        if (params.has('hebrew')) {
            state.currentFilters.hebrewOnly = params.get('hebrew') === 'true';
        } else {
            state.currentFilters.hebrewOnly = localStorage.getItem('hebrewOnlyPreference') === 'true';
        }
    };
    
    // General UI
    const handleScroll = () => {
        const scrollPosition = window.pageYOffset;
        
        // Back to top button
        dom.backToTopButton?.classList.toggle('invisible', scrollPosition <= 300);
        dom.backToTopButton?.classList.toggle('opacity-0', scrollPosition <= 300);
        
        // Scroll spy
        handleScrollSpy();
    };

    const handleScrollSpy = () => {
        if (new URLSearchParams(window.location.search).has('v') || !isHomePage()) {
            document.querySelectorAll('header nav .nav-link.active-nav-link').forEach(link => link.classList.remove('active-nav-link'));
            return;
        }

        const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 24 || 104;
        const scrollPosition = window.scrollY;

        let activeSectionId = '';
        document.querySelectorAll('main section[id], section#home').forEach(section => {
            if(section.id && section.offsetTop <= scrollPosition + headerOffset) {
                activeSectionId = section.id;
            }
        });
        
        document.querySelectorAll('header nav .nav-link[href*="#"]').forEach(link => {
            const linkSectionId = link.getAttribute('href').substring(link.getAttribute('href').lastIndexOf('#') + 1);
            link.classList.toggle('active-nav-link', linkSectionId === activeSectionId);
        });
    };

    const scrollToVideoGridIfNeeded = () => {
        const gridSection = document.getElementById('video-grid-section');
        if (gridSection) {
            const rect = gridSection.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                 const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 20 || 80;
                 const elementPosition = rect.top + window.pageYOffset - headerOffset;
                 window.scrollTo({ top: elementPosition, behavior: "smooth" });
            }
        }
    };

    const shareContent = async (url, buttonElement, successMessage) => {
        try {
            await navigator.clipboard.writeText(url);
            const icon = buttonElement.querySelector('i');
            const originalIconClass = icon.className;
            const textSpan = buttonElement.querySelector('span');
            const originalText = textSpan ? textSpan.textContent : '';

            icon.className = 'fas fa-check text-green-500';
            if (textSpan) textSpan.textContent = successMessage;
            buttonElement.disabled = true;

            setTimeout(() => {
                icon.className = originalIconClass;
                if (textSpan) textSpan.textContent = originalText;
                buttonElement.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('לא ניתן היה להעתיק את הקישור.');
        }
    };
    
    // --- MAIN EVENT LISTENER SETUP ---
    function setupEventListeners() {
        // Theme & Menu
        dom.darkModeToggles.forEach(toggle => toggle.addEventListener('click', handleThemeToggle));
        dom.openMenuBtn?.addEventListener('click', openMobileMenu);
        dom.closeMenuBtn?.addEventListener('click', closeMobileMenu);
        dom.backdrop?.addEventListener('click', closeMobileMenu);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.mobileMenu && !dom.mobileMenu.classList.contains('translate-x-full')) {
                closeMobileMenu();
            }
        });

        // Scroll related
        dom.backToTopButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => throttle(handleScroll, 100));

        // Forms & Filters
        Object.values(dom.searchForms).forEach(form => {
            if(!form) return;
            form.addEventListener('submit', (e) => { e.preventDefault(); handleSearchSubmit(form); });
            const input = form.querySelector('input[type="search"]');
            if (input) {
                input.addEventListener('input', () => handleSearchInput(input));
                input.addEventListener('keydown', handleSearchKeyDown);
                input.addEventListener('blur', () => setTimeout(() => { if (!state.search.isSuggestionClicked) clearSearchSuggestions(); }, 150));
            }
        });

        dom.hebrewFilterToggle?.addEventListener('change', (e) => {
            state.currentFilters.hebrewOnly = e.target.checked;
            localStorage.setItem('hebrewOnlyPreference', String(e.target.checked));
            applyFilters(false);
        });
        
        dom.sortSelect?.addEventListener('change', (e) => {
            state.currentFilters.sortBy = e.target.value;
            applyFilters(false, false);
        });
        
        dom.clearFiltersBtn?.addEventListener('click', clearAllFilters);
        dom.shareFiltersBtn?.addEventListener('click', (e) => shareContent(window.location.href, e.currentTarget, 'הועתק!'));

        dom.customTagForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTagName = dom.tagSearchInput?.value.trim().toLowerCase();
            addCustomTag(newTagName);
            if (dom.tagSearchInput) dom.tagSearchInput.value = '';
        });

        // Event delegation for dynamically created elements
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Nav links for smooth scroll
            const navLink = target.closest('.nav-link[href*="#"]');
            if (navLink) {
                e.preventDefault();
                if (navLink.closest('#mobile-menu')) setTimeout(closeMobileMenu, 150);
                const href = navLink.getAttribute('href');
                if (new URLSearchParams(window.location.search).has('v')) {
                    window.location.href = href;
                } else {
                    const targetId = href.substring(href.indexOf('#') + 1);
                    const targetElement = document.getElementById(targetId);
                    if(targetElement) {
                        const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 20 || 80;
                        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                        window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                    }
                }
            }

            // Tags
            const tagButton = target.closest('button.tag[data-tag-value]');
            if (tagButton) toggleTagSelection(tagButton.dataset.tagValue);

            const removeTagButton = target.closest('.remove-tag-btn');
            if (removeTagButton) toggleTagSelection(removeTagButton.dataset.tagToRemove);
            
            const videoTagButton = target.closest('.video-tag-button[data-tag]');
            if(videoTagButton) {
                e.preventDefault(); 
                const tagName = videoTagButton.dataset.tag;
                if (isHomePage()) {
                    if (!state.currentFilters.tags.includes(tagName)) toggleTagSelection(tagName);
                    scrollToVideoGridIfNeeded();
                } else {
                    window.location.href = `./?tags=${encodeURIComponent(tagName)}#video-grid-section`;
                }
            }

            // Video card actions
            const card = target.closest('article[data-video-id]');
            if(card) {
                const videoId = card.dataset.videoId;

                if (target.closest('.share-btn')) {
                    e.preventDefault();
                    const url = `${window.location.origin}/?v=${videoId}`;
                    shareContent(url, target.closest('.share-btn'), '');
                } else if (target.closest('.fullscreen-btn')) {
                     e.preventDefault();
                     const iframe = card.querySelector('.video-iframe');
                     if (iframe && videoId) {
                         if (iframe.classList.contains('hidden')) {
                             card.querySelector('.video-play-link').style.display = 'none';
                             iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
                             iframe.classList.remove('hidden');
                         }
                         setTimeout(() => iframe.requestFullscreen?.(), 150);
                     }
                }
            }
            
            // Single video page share button
            if (target.closest('#single-video-share-btn')) {
                shareContent(window.location.href, target.closest('#single-video-share-btn'), 'הועתק!');
            }
            
            // No results clear button
            if (target.id === 'no-results-clear-btn') {
                clearAllFilters();
            }
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', () => { window.location.reload(); });
    }
    
    // --- INITIALIZATION ---
    async function initializeApp() {
        // Initial UI setup
        if (dom.currentYearFooter) dom.currentYearFooter.textContent = new Date().getFullYear();
        const isDark = document.documentElement.classList.contains('dark');
        dom.darkModeToggles.forEach(toggle => {
            toggle.querySelector('.fa-moon')?.classList.toggle('hidden', isDark);
            toggle.querySelector('.fa-sun')?.classList.toggle('hidden', !isDark);
            toggle.setAttribute('aria-checked', String(isDark));
        });

        await loadVideos();
        state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);

        const urlParams = new URLSearchParams(window.location.search);
        const videoIdFromUrl = urlParams.get('v');
        
        if (videoIdFromUrl && isHomePage()) {
            renderSingleVideoPage(videoIdFromUrl);
        } else if (isHomePage()) {
            setupHomePageView();
        } else { // Assumes any other page is a category page
            setupCategoryPageView();
        }
        
        setupEventListeners();
    }

    initializeApp();
});

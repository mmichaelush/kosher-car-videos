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
    
    const isHomePage = () => {
        const path = window.location.pathname;
        return path === '/' || path.endsWith('/index.html') || path.endsWith('/');
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
        if (dom.loadingPlaceholder) {
            dom.loadingPlaceholder.classList.remove('hidden');
            dom.loadingPlaceholder.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin fa-3x mb-3 text-purple-600 dark:text-purple-400"></i><p class="text-lg text-slate-600 dark:text-slate-300">טוען סרטונים...</p></div>`;
        }
        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`HTTP ${response.status} - failed to fetch videos.json`);
            
            const jsonData = await response.json();
            
            // This now correctly expects the { "videos": [...] } structure
            if (!jsonData || !Array.isArray(jsonData.videos)) {
                throw new Error("Video data is not a valid object with a 'videos' array.");
            }
            
            const rawVideos = jsonData.videos;
            
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
            if (dom.videoCountHero && dom.videoCountHero.querySelector('span')) {
                dom.videoCountHero.querySelector('span').textContent = "0";
            }
            displayError('שגיאה בטעינת המידע. ייתכן והקובץ videos.json אינו במבנה תקין.');
        } finally {
             if (dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        }
    }
    
    function getFilteredAndSortedVideos() {
        if (!state.allVideos) return [];
        let filtered = state.allVideos;

        if (state.currentFilters.category !== 'all') {
            filtered = filtered.filter(v => v.category === state.currentFilters.category);
        }
        
        if (state.currentFilters.searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH && state.fuse) {
            const fuseResults = state.fuse.search(state.currentFilters.searchTerm);
            const resultIds = new Set(fuseResults.map(r => r.item.id));
            filtered = filtered.filter(v => resultIds.has(v.id));
        }

        let videos = filtered.filter(video => {
            const tagsMatch = state.currentFilters.tags.length === 0 || state.currentFilters.tags.every(filterTag => (video.tags || []).includes(filterTag));
            const hebrewMatch = !state.currentFilters.hebrewOnly || video.hebrewContent;
            return tagsMatch && hebrewMatch;
        });
        
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
        if (!isLoadMore) state.ui.currentlyDisplayedVideosCount = 0;
        
        const allMatchingVideos = getFilteredAndSortedVideos();
        renderVideoCards(allMatchingVideos, isLoadMore);
        
        if (andScroll && !isLoadMore) scrollToVideoGridIfNeeded();
        
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
        if (!dom.videoCardTemplate || !dom.videoCardTemplate.content) return null;
    
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
        
        const videoPageUrl = `./?v=${video.id}`;
        
        card.article.dataset.videoId = video.id;
        card.thumbnailImg.src = video.thumbnail;
        card.thumbnailImg.alt = video.title;
        card.duration.textContent = video.duration || '';
        card.playLink.href = videoPageUrl;
        card.iframe.title = `נגן וידאו: ${video.title}`;
        card.titleLink.href = videoPageUrl;
        card.titleLink.innerHTML = video.title;
        card.channelName.textContent = video.channel || '';
    
        if (card.shareBtn) card.shareBtn.dataset.videoId = video.id;
        if (card.newTabBtn) card.newTabBtn.href = videoPageUrl;
        if (card.fullscreenBtn) card.fullscreenBtn.dataset.videoId = video.id;
        
        card.channelLogo.src = video.channelImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        card.channelLogo.alt = `לוגו ערוץ ${video.channel}`;
        card.channelLogo.classList.toggle('hidden', !video.channelImage);
    
        if (video.tags && video.tags.length > 0) {
            card.tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${tag}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${tag.charAt(0).toUpperCase() + tag.slice(1)}</button>`
            ).join('');
        }
    
        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === video.category);
        const categoryName = categoryData ? categoryData.name : (video.category || '').charAt(0).toUpperCase() + (video.category || '').slice(1);
        const categoryIconEl = cardClone.querySelector('.video-category-icon');
        if (categoryIconEl) {
            const icon = categoryData ? categoryData.icon : 'folder-open';
            categoryIconEl.className = `video-category-icon fas fa-${icon} opacity-70 text-purple-500 dark:text-purple-400 ml-2`;
        }
        card.categoryDisplay.appendChild(document.createTextNode(categoryName));
        
        if (video.dateAdded && !isNaN(video.dateAdded.getTime())) {
            card.dateDisplay.appendChild(document.createTextNode(video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })));
        } else if (card.dateDisplay) {
            card.dateDisplay.style.display = 'none';
        }
    
        return card.article;
    }
    
    function renderHomepageCategoryButtons() {
        if (!dom.homepageCategoriesGrid) return;
        const skeleton = document.getElementById('loading-homepage-categories-skeleton');
        if (skeleton) skeleton.style.display = 'none';
        
        dom.homepageCategoriesGrid.innerHTML = CONSTANTS.PREDEFINED_CATEGORIES
            .filter(cat => cat.id !== 'all')
            .map(cat => {
                const count = state.allVideos.filter(v => v.category === cat.id).length;
                const gradientClasses = `${cat.gradient} ${cat.darkGradient || ''}`;
                return `
                    <a href="category.html?name=${cat.id}" class="relative category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${gradientClasses} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white dark:focus:ring-purple-500/50">
                        <div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]">
                            <i class="fas fa-${cat.icon || 'folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                            <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 dark:group-hover:text-yellow-200 transition-colors">${cat.name}</h3>
                            <p class="text-sm opacity-80 mt-1 px-2">${cat.description}</p>
                        </div>
                        <span class="absolute top-4 right-4 bg-black/30 text-white text-xs font-bold py-1 px-2.5 rounded-full">${count}</span>
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
            return `<button class="tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5" data-tag-value="${tag}"><i class="fas ${iconClass} opacity-80 text-xs"></i> ${tag.charAt(0).toUpperCase() + tag.slice(1)}</button>`;
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
            <span class="flex items-center gap-1.5 bg-purple-600 text-white dark:bg-purple-500 text-sm font-medium ps-3 pe-2 py-1.5 rounded-full">
                ${tagName.charAt(0).toUpperCase() + tagName.slice(1)}
                <button type="button" class="remove-tag-btn text-xs opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none" data-tag-to-remove="${tagName}" aria-label="הסר תגית ${tagName}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    }

    function updateFilterSummary() {
        if (!dom.filterSummaryContainer) return;
        const { tags, hebrewOnly, searchTerm } = state.currentFilters;
        const count = tags.length + (hebrewOnly ? 1 : 0) + (searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH ? 1 : 0);

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
                if (dom.videoCardsContainer && dom.videoCardsContainer.parentNode) {
                    dom.videoCardsContainer.parentNode.insertBefore(loadMoreBtn, dom.videoCardsContainer.nextSibling);
                }
            }
            loadMoreBtn.textContent = `טען עוד (${totalMatchingVideos - state.ui.currentlyDisplayedVideosCount} נותרו)`;
            loadMoreBtn.classList.remove('hidden');
        } else if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
    }
    
    function updateCategoryPageUI(categoryId) {
        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const name = categoryData ? categoryData.name : (categoryId || 'קטגוריה').charAt(0).toUpperCase() + (categoryId || 'קטגוריה').slice(1);
        const icon = categoryData ? categoryData.icon : 'folder-open';

        document.title = `${name} - CAR-טיב`;
        
        const pageTitle = document.getElementById('category-page-title');
        if (pageTitle) pageTitle.innerHTML = `<i class="fas fa-${icon} text-purple-600 dark:text-purple-400 mr-4"></i>${name}`;
        
        const breadcrumb = document.getElementById('breadcrumb-category-name');
        if (breadcrumb) breadcrumb.textContent = name;
        
        const videosHeading = document.getElementById('videos-in-category-heading');
        if(videosHeading) {
            const span = videosHeading.querySelector('span');
            if(span) span.innerHTML = `סרטונים בקטגוריה: <span class="font-bold text-purple-600 dark:text-purple-400">${name}</span>`;
        }

        const countSummaryEl = document.getElementById('category-video-count-summary');
        if(countSummaryEl) {
            const categoryVideos = state.allVideos.filter(v => v.category === categoryId);
            const count = categoryVideos.length;
            if (count === 1) {
                countSummaryEl.innerHTML = `נמצא <strong class="text-purple-600 dark:text-purple-400">סרטון אחד</strong> בקטגוריה זו.`
            } else {
                countSummaryEl.innerHTML = `בקטגוריה זו קיימים <strong class="text-purple-600 dark:text-purple-400">${count}</strong> סרטונים.`
            }
        }
    }
    
    function displayError(message, container = dom.noVideosFoundMessage) {
        if(dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        if (container) {
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center text-red-500 dark:text-red-400 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${message}</p></div>`;
        }
    }

    function syncUIToState() {
        const { searchTerm, hebrewOnly, sortBy } = state.currentFilters;
        Object.values(dom.searchForms).forEach(form => {
            if(form) {
                const input = form.querySelector('input[type="search"]');
                if (input) input.value = searchTerm;
            }
        });
        if(dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = hebrewOnly;
        if(dom.sortSelect) dom.sortSelect.value = sortBy;
        renderSelectedTagChips();
        updateActiveTagVisuals();
    }

    // --- PAGE VIEW MANAGEMENT ---
    function setupHomePageView() {
        if(dom.homepageCategoriesGrid) renderHomepageCategoryButtons();
        state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);
        applyFiltersFromURL();
        syncUIToState();
        renderPopularTags();
        applyFilters(false, false);
        handleScrollSpy();
    }
    
    function setupCategoryPageView() {
        const categoryFromURL = getCategoryFromURL();
        if (categoryFromURL) {
            const currentCategory = categoryFromURL.toLowerCase();
            state.currentFilters.category = currentCategory;
            const categoryVideos = state.allVideos.filter(v => v.category === currentCategory);
            state.fuse = new Fuse(categoryVideos, CONSTANTS.FUSE_OPTIONS);
            updateCategoryPageUI(currentCategory);
        }
        applyFiltersFromURL();
        syncUIToState();
        renderPopularTags();
        applyFilters(false, false);
    }

    function renderSingleVideoPage(videoId) {
        if (dom.mainPageContent) dom.mainPageContent.style.display = 'none';
        if (dom.siteFooter) dom.siteFooter.style.display = 'none';
        if (dom.singleVideoView.container) dom.singleVideoView.container.classList.remove('hidden');
        
        window.scrollTo(0, 0);

        const video = state.allVideos.find(v => v.id === videoId);

        if (video && dom.singleVideoView.container) {
            document.title = `${video.title} - CAR-טיב`;
            if (dom.singleVideoView.title) dom.singleVideoView.title.innerHTML = video.title;
            if (dom.singleVideoView.player) dom.singleVideoView.player.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"></iframe>`;
            if (dom.singleVideoView.channel) dom.singleVideoView.channel.innerHTML = `<img src="${video.channelImage || ''}" alt="" class="h-6 w-6 rounded-full"><span class="font-medium">${video.channel}</span>`;
            if (dom.singleVideoView.duration) dom.singleVideoView.duration.innerHTML = `<i class="fas fa-clock fa-fw"></i> ${video.duration}`;
            
            if (dom.singleVideoView.date && video.dateAdded && !isNaN(video.dateAdded.getTime())) {
                dom.singleVideoView.date.style.display = 'flex';
                dom.singleVideoView.date.innerHTML = `<i class="fas fa-calendar-alt fa-fw"></i> ${video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            } else if (dom.singleVideoView.date) {
                dom.singleVideoView.date.style.display = 'none';
            }

            if (dom.singleVideoView.tags) dom.singleVideoView.tags.innerHTML = (video.tags || []).map(tag =>
                `<a href="./?tags=${encodeURIComponent(tag)}#video-grid-section" class="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${tag.charAt(0).toUpperCase() + tag.slice(1)}</a>`
            ).join('');
            
        } else if (dom.singleVideoView.container) {
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
    
    function playVideoInline(cardElement) {
        if (!cardElement) return;
        const videoId = cardElement.dataset.videoId;
        const iframe = cardElement.querySelector('.video-iframe');
        const playLink = cardElement.querySelector('.video-play-link');
    
        if (videoId && iframe && playLink && iframe.classList.contains('hidden')) {
            playLink.style.display = 'none';
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
            iframe.classList.remove('hidden');
        }
    }
    
    async function handleCheckYtId(e) {
        if (e) e.preventDefault();
        
        function extractYouTubeVideoId(url) {
            if (!url) return null;
            const patterns = [
                /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/|attribution_link\?a=.*&u=%2Fwatch%3Fv%3D)([\w-]{11})/,
                /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/,
                /^([\w-]{11})$/
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) return match[1];
            }
            return null;
        }

        async function checkVideoId(videoIdToCheck) {
            if (!videoIdToCheck) return { message: "לא סופק ID לבדיקה." };
            if(state.allVideos.length === 0) await loadVideos();
            const foundVideo = state.allVideos.find(video => video.id === videoIdToCheck);
            return foundVideo
                ? { message: `הסרטון "${foundVideo.title}" כבר קיים במאגר.` }
                : { message: `הסרטון עם ID: ${videoIdToCheck} עדיין לא קיים במאגר. אפשר להוסיף!` };
        }

        const userInput = prompt("הכנס קישור לסרטון יוטיוב או מזהה (ID) לבדיקה:");
        if (!userInput) return;
        
        const videoId = extractYouTubeVideoId(userInput);
        const result = videoId ? await checkVideoId(videoId) : { message: "לא זוהה ID תקין של סרטון יוטיוב מהקישור שהוכנס." };
        alert(result.message);
    }

    function handleThemeToggle() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        dom.darkModeToggles.forEach(toggle => {
            const moonIcon = toggle.querySelector('.fa-moon');
            const sunIcon = toggle.querySelector('.fa-sun');
            if(moonIcon) moonIcon.classList.toggle('hidden', isDark);
            if(sunIcon) sunIcon.classList.toggle('hidden', !isDark);
            toggle.setAttribute('aria-checked', String(isDark));
        });
    }

    function openMobileMenu() {
        state.ui.lastFocusedElement = document.activeElement;
        if(dom.mobileMenu) dom.mobileMenu.classList.remove('translate-x-full');
        if(dom.backdrop) dom.backdrop.classList.remove('invisible', 'opacity-0');
        dom.body.classList.add('overflow-hidden', 'md:overflow-auto');
        if(dom.openMenuBtn) dom.openMenuBtn.setAttribute('aria-expanded', 'true');
        if(dom.closeMenuBtn) setTimeout(() => dom.closeMenuBtn.focus(), 100);
    }

    function closeMobileMenu() {
        if(dom.mobileMenu) dom.mobileMenu.classList.add('translate-x-full');
        if(dom.backdrop) dom.backdrop.classList.add('invisible', 'opacity-0');
        dom.body.classList.remove('overflow-hidden', 'md:overflow-auto');
        if(dom.openMenuBtn) dom.openMenuBtn.setAttribute('aria-expanded', 'false');
        if (state.ui.lastFocusedElement) state.ui.lastFocusedElement.focus();
    }

    function toggleTagSelection(tagName) {
        if (!state.currentFilters.tags) return;
        const { tags } = state.currentFilters;
        const index = tags.indexOf(tagName);
        if (index > -1) tags.splice(index, 1);
        else tags.push(tagName);
        
        updateActiveTagVisuals();
        renderSelectedTagChips();
        applyFilters(false);
    }

    function clearAllFilters() {
        state.currentFilters = { ...state.currentFilters, tags: [], searchTerm: '', hebrewOnly: false, sortBy: 'date-desc' };
        localStorage.removeItem('hebrewOnlyPreference');
        syncUIToState();
        applyFilters(false, false);
    }

    function handleSearchSubmit(form) {
        const input = form.querySelector('input[type="search"]');
        if (!input) return;
        const searchTerm = input.value.trim();
        
        if (!isHomePage()) {
            window.location.href = `./?search=${encodeURIComponent(searchTerm)}#video-grid-section`;
        } else {
            state.currentFilters.searchTerm = searchTerm;
            applyFilters(false);
        }
    }
    
    function handleSearchInput(inputElement) {
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
        
        displaySearchSuggestions(searchTerm, new Fuse(fuseSource, CONSTANTS.FUSE_OPTIONS));
    }
    
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
    }
    
    function updateActiveSuggestionVisuals(items) {
        items.forEach((item, index) => {
            item.classList.toggle('active-suggestion', index === state.search.activeSuggestionIndex);
            if (index === state.search.activeSuggestionIndex) item.scrollIntoView({ block: 'nearest' });
        });
    }

    function clearSearchSuggestions() {
        Object.values(dom.searchSuggestions).forEach(container => {
            if (container) {
                container.classList.add('hidden');
                const ul = container.querySelector('ul');
                if (ul) ul.innerHTML = '';
            }
        });
        state.search.activeSuggestionIndex = -1;
    }

    function generateHighlightedText(text, indices) {
        let result = '';
        let lastIndex = 0;
        indices.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
            if (start > lastIndex) result += text.substring(lastIndex, start);
            result += `<strong class="font-semibold text-purple-600 dark:text-purple-300">${text.substring(start, end + 1)}</strong>`;
            lastIndex = end + 1;
        });
        if (lastIndex < text.length) result += text.substring(lastIndex);
        return result;
    }
    
    function updateURLWithFilters() {
        if (!history.replaceState || new URLSearchParams(window.location.search).has('v')) return;

        const url = new URL(window.location);
        const { searchTerm, tags, hebrewOnly, sortBy } = state.currentFilters;
        
        const pageCategory = getCategoryFromURL();
        if(pageCategory) {
            url.searchParams.set('name', pageCategory);
        } else {
            url.searchParams.delete('name');
        }

        if (searchTerm) url.searchParams.set('search', searchTerm); else url.searchParams.delete('search');
        if (tags.length > 0) url.searchParams.set('tags', tags.join(',')); else url.searchParams.delete('tags');
        if (hebrewOnly) url.searchParams.set('hebrew', 'true'); else url.searchParams.delete('hebrew');
        if (sortBy !== 'date-desc') url.searchParams.set('sort', sortBy); else url.searchParams.delete('sort');
        
        url.searchParams.delete('v');
        url.hash = ''; // Always clear hash unless it's a direct navigation
        
        history.replaceState(state.currentFilters, '', url.toString());
    }

    function applyFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        state.currentFilters.searchTerm = params.get('search') || '';
        state.currentFilters.tags = params.get('tags') ? params.get('tags').split(',').map(tag => tag.trim()).filter(Boolean) : [];
        state.currentFilters.sortBy = params.get('sort') || 'date-desc';
        
        if (params.has('hebrew')) {
            state.currentFilters.hebrewOnly = params.get('hebrew') === 'true';
        } else {
            state.currentFilters.hebrewOnly = localStorage.getItem('hebrewOnlyPreference') === 'true';
        }
    }
    
    function handleScroll() {
        const scrollPosition = window.pageYOffset;
        if(dom.backToTopButton) {
            dom.backToTopButton.classList.toggle('invisible', scrollPosition <= 300);
            dom.backToTopButton.classList.toggle('opacity-0', scrollPosition <= 300);
        }
        handleScrollSpy();
    }

    function handleScrollSpy() {
        if (new URLSearchParams(window.location.search).has('v') || !isHomePage()) {
            if (document.querySelectorAll) {
                document.querySelectorAll('header nav .nav-link.active-nav-link').forEach(link => link.classList.remove('active-nav-link'));
            }
            return;
        }
        const header = document.querySelector('header.sticky');
        const headerOffset = header ? header.offsetHeight + 24 : 104;
        const scrollPosition = window.scrollY;
        let activeSectionId = '';
        document.querySelectorAll('main section[id], section#home').forEach(section => {
            if(section.id && section.offsetTop <= scrollPosition + headerOffset) {
                activeSectionId = section.id;
            }
        });
        document.querySelectorAll('header nav .nav-link[href*="#"]').forEach(link => {
            const linkHref = link.getAttribute('href');
            const linkSectionId = linkHref.substring(linkHref.lastIndexOf('#') + 1);
            link.classList.toggle('active-nav-link', linkSectionId === activeSectionId);
        });
    }

    function scrollToVideoGridIfNeeded() {
        const gridSection = document.getElementById('video-grid-section');
        if (gridSection) {
            const rect = gridSection.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                 const header = document.querySelector('header.sticky');
                 const headerOffset = header ? header.offsetHeight + 20 : 80;
                 const elementPosition = rect.top + window.pageYOffset - headerOffset;
                 window.scrollTo({ top: elementPosition, behavior: "smooth" });
            }
        }
    }

    async function shareContent(url, buttonElement, successMessage) {
        if (!buttonElement) return;
        try {
            await navigator.clipboard.writeText(url);
            const icon = buttonElement.querySelector('i');
            const originalIconClass = icon ? icon.className : '';
            const textSpan = buttonElement.querySelector('span');
            const originalText = textSpan ? textSpan.textContent : '';

            if (icon) icon.className = 'fas fa-check text-green-500';
            if (textSpan && successMessage) textSpan.textContent = successMessage;
            buttonElement.disabled = true;

            setTimeout(() => {
                if (icon) icon.className = originalIconClass;
                if (textSpan) textSpan.textContent = originalText;
                buttonElement.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('לא ניתן היה להעתיק את הקישור.');
        }
    }
    
    function handleNavLinkClick(e) {
        const navLink = e.target.closest('.nav-link[href*="#"]');
        if (!navLink) return;

        const href = navLink.getAttribute('href');
        const url = new URL(href, window.location.origin + window.location.pathname);
        const targetId = url.hash.substring(1);
        const isCurrentPageLink = url.pathname === window.location.pathname || (url.pathname.endsWith('/') && isHomePage());
        
        if (isCurrentPageLink && targetId) {
            e.preventDefault();
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const performScroll = () => {
                    const header = document.querySelector('header.sticky');
                    const headerOffset = header ? header.offsetHeight + 20 : 80;
                    const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                    // Clean the URL hash after scrolling
                    if (history.replaceState) {
                       const cleanUrl = window.location.href.split('#')[0];
                       history.replaceState(null, '', cleanUrl);
                    }
                };

                if (navLink.closest('#mobile-menu')) {
                    closeMobileMenu();
                    setTimeout(performScroll, 300);
                } else {
                    performScroll();
                }
            }
        }
    }
    
    // --- MAIN EVENT LISTENER SETUP ---
    function setupEventListeners() {
        dom.darkModeToggles.forEach(toggle => toggle.addEventListener('click', handleThemeToggle));
        if(dom.openMenuBtn) dom.openMenuBtn.addEventListener('click', openMobileMenu);
        if(dom.closeMenuBtn) dom.closeMenuBtn.addEventListener('click', closeMobileMenu);
        if(dom.backdrop) dom.backdrop.addEventListener('click', closeMobileMenu);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.mobileMenu && !dom.mobileMenu.classList.contains('translate-x-full')) closeMobileMenu();
        });

        if(dom.backToTopButton) dom.backToTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => throttle(handleScroll, 100));

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

        if(dom.hebrewFilterToggle) dom.hebrewFilterToggle.addEventListener('change', (e) => {
            state.currentFilters.hebrewOnly = e.target.checked;
            localStorage.setItem('hebrewOnlyPreference', String(e.target.checked));
            applyFilters(false);
        });
        
        if(dom.sortSelect) dom.sortSelect.addEventListener('change', (e) => {
            state.currentFilters.sortBy = e.target.value;
            applyFilters(false, false);
        });
        
        if(dom.clearFiltersBtn) dom.clearFiltersBtn.addEventListener('click', clearAllFilters);
        if(dom.shareFiltersBtn) dom.shareFiltersBtn.addEventListener('click', (e) => shareContent(window.location.href, e.currentTarget, 'הועתק!'));

        if(dom.customTagForm) dom.customTagForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if(dom.tagSearchInput) {
                const newTagName = dom.tagSearchInput.value.trim().toLowerCase();
                if (newTagName && !state.currentFilters.tags.includes(newTagName)) {
                    toggleTagSelection(newTagName);
                    dom.tagSearchInput.value = '';
                }
            }
        });

        document.addEventListener('click', (e) => {
            const { target } = e;

            handleNavLinkClick(e);

            const checkIdLink = target.closest('#check-yt-id-link');
            if (checkIdLink) handleCheckYtId(e);
            
            const checkIdButton = target.closest('#check-yt-id-button');
            if(checkIdButton) handleCheckYtId(e);

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
            
            const card = target.closest('article[data-video-id]');
            if(card) {
                if (target.closest('.video-play-link') && !target.closest('.video-link')) {
                    e.preventDefault();
                    playVideoInline(card);
                } else if (target.closest('.fullscreen-btn')) {
                    e.preventDefault();
                    playVideoInline(card); 
                    const iframe = card.querySelector('.video-iframe');
                    if(iframe && typeof iframe.requestFullscreen === 'function') {
                        setTimeout(() => { iframe.requestFullscreen(); }, 150);
                    }
                } else if (target.closest('.share-btn')) {
                    e.preventDefault();
                    const videoId = card.dataset.videoId;
                    shareContent(`${window.location.origin}/?v=${videoId}`, target.closest('.share-btn'), '');
                } else if(target.closest('.video-link') || target.closest('.video-play-link')) {
                    e.preventDefault();
                    window.location.href = target.closest('a').href;
                }
            }
            
            const singleVideoShareBtn = target.closest('#single-video-share-btn');
            if (singleVideoShareBtn) shareContent(window.location.href, singleVideoShareBtn, 'הועתק!');
            
            if (target.id === 'no-results-clear-btn') clearAllFilters();
        });

        window.addEventListener('popstate', () => { window.location.reload(); });
    }
    
    function handleInitialHash() {
        const hash = window.location.hash;
        if (hash) {
            const targetId = hash.substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                setTimeout(() => {
                    const header = document.querySelector('header.sticky');
                    const headerOffset = header ? header.offsetHeight + 20 : 80;
                    const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                    
                    if (history.replaceState) {
                        const url = new URL(window.location);
                        url.hash = '';
                        history.replaceState(null, '', url.toString());
                    }
                }, 150);
            }
        }
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        if (dom.currentYearFooter) dom.currentYearFooter.textContent = new Date().getFullYear();
        const isDark = document.documentElement.classList.contains('dark');
        dom.darkModeToggles.forEach(toggle => {
            const moonIcon = toggle.querySelector('.fa-moon');
            const sunIcon = toggle.querySelector('.fa-sun');
            if(moonIcon) moonIcon.classList.toggle('hidden', isDark);
            if(sunIcon) sunIcon.classList.toggle('hidden', !isDark);
            toggle.setAttribute('aria-checked', String(isDark));
        });

        if (dom.mainPageContent) dom.mainPageContent.style.display = 'block';

        const currentPagePath = window.location.pathname.split('/').pop();
        
        await loadVideos();
        state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);

        if (currentPagePath.includes('add-video')) {
            // No specific logic needed other than initializing Fuse for search
        } else if (currentPagePath.includes('category')) {
            setupCategoryPageView();
        } else { // Homepage
            const urlParams = new URLSearchParams(window.location.search);
            const videoIdFromUrl = urlParams.get('v');
            if (videoIdFromUrl) {
                renderSingleVideoPage(videoIdFromUrl);
            } else {
                setupHomePageView();
                handleInitialHash();
            }
        }
        
        setupEventListeners();
    }

    initializeApp();
});

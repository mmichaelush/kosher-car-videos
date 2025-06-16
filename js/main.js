document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const dom = {
        body: document.body,
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        openMenuBtn: document.getElementById('open-menu'),
        closeMenuBtn: document.getElementById('close-menu'),
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
        checkYtIdLink: document.getElementById('check-yt-id-link'),
        searchForms: {
            desktop: document.getElementById('desktop-search-form'),
            mobile: document.getElementById('mobile-search-form'),
            main: document.getElementById('main-content-search-form')
        },
        searchInputs: {
            desktop: document.getElementById('desktop-search-input'),
            mobile: document.getElementById('mobile-search-input'),
            main: document.getElementById('main-content-search-input')
        },
        searchSuggestions: {
            desktop: document.getElementById('desktop-search-suggestions'),
            mobile: document.getElementById('mobile-search-suggestions'),
            main: document.getElementById('main-content-search-suggestions')
        }
    };

    // --- Constants ---
    const MAX_POPULAR_TAGS = 50;
    const VIDEOS_TO_SHOW_INITIALLY = 30;
    const VIDEOS_TO_LOAD_MORE = 15;
    const MIN_SEARCH_TERM_LENGTH = 2;
    const MAX_SUGGESTIONS = 7;
    const FUSE_OPTIONS = {
        keys: [
            { name: 'title', weight: 0.6 },
            { name: 'tags', weight: 0.3 },
            { name: 'channel', weight: 0.1 }
        ],
        includeScore: true,
        includeMatches: true,
        threshold: 0.4,
        minMatchCharLength: MIN_SEARCH_TERM_LENGTH,
        ignoreLocation: true
    };
    const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600", darkGradient: "dark:from-purple-600 dark:to-indigo-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600", darkGradient: "dark:from-blue-600 dark:to-cyan-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600", darkGradient: "dark:from-green-600 dark:to-teal-700" },
        { id: "troubleshooting", name: "איתור ותיקון תקלות", description: "אבחון ופתרון בעיות", icon: "fa-microscope", gradient: "from-lime-400 to-yellow-500", darkGradient: "dark:from-lime-500 dark:to-yellow-600" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600", darkGradient: "dark:from-orange-600 dark:to-red-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600", darkGradient: "dark:from-yellow-600 dark:to-amber-700" },
        { id: "collectors", name: "רכבי אספנות", description: "רכבים נוסטלגיים שחזרו לכביש", icon: "fa-car-side", gradient: "from-red-500 to-pink-600", darkGradient: "dark:from-red-600 dark:to-pink-700" }
    ];

    // --- State ---
    let allVideos = [];
    let fuse = null;
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    let currentlyDisplayedVideosCount = 0;
    let searchState = {
        activeSuggestionIndex: -1,
        currentInput: null,
        currentSuggestionsContainer: null,
        isSuggestionClicked: false
    };

    // --- Helper Functions ---
    const escapeHTML = (str) => {
        if (str === null || typeof str === 'undefined') return '';
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(String(str)));
        return p.innerHTML;
    };
    const capitalizeFirstLetter = (string) => !string ? '' : string.charAt(0).toUpperCase() + string.slice(1);
    const isHomePage = () => {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename === '' || filename === 'index.html';
    };
    const getCategoryFromURL = () => new URLSearchParams(window.location.search).get('name');
    const getIconForTag = (tag) => {
        const tagIcons = { "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "גיר": "fa-cog", "שמן מנוע": "fa-oil-can", "מצבר": "fa-car-battery", "תחזוקה": "fa-tools", "טיפול": "fa-wrench", "בדיקה לפני קנייה": "fa-search-dollar", "שיפורים": "fa-rocket", "רכב חשמלי": "fa-charging-station", "הכנופיה": "fa-users-cog", "ניקוי מצערת": "fa-spray-can-sparkles", "אספנות": "fa-gem", "נוזל בלמים": "fa-tint", "עשה זאת בעצמך": "fa-hand-sparkles" };
        return tagIcons[tag.toLowerCase()] || "fa-tag";
    };

    // --- Initialization ---
    async function initializePage() {
        initializeDarkModeVisuals();
        setupEventListeners();
        updateFooterYear();
        handleCheckIdFromHash(); // Check for tool activation from URL hash

        const categoryFromURL = getCategoryFromURL();
        try {
            await loadVideos();
            fuse = new Fuse(allVideos, FUSE_OPTIONS);

            if (isHomePage()) {
                if (dom.homepageCategoriesGrid) renderHomepageCategoryButtons();
                currentFilters.category = 'all';
            } else if (categoryFromURL) {
                currentFilters.category = categoryFromURL.toLowerCase();
                updateCategoryPageUI(currentFilters.category);
            }

            renderPopularTags(currentFilters.category);
            renderFilteredVideos(false);

        } catch (error) {
            console.error("Critical error initializing page:", error);
            displayErrorState(`שגיאה קריטית בטעינת האתר: ${error.message}`);
        }
    }

    // --- Dark Mode ---
    function initializeDarkModeVisuals() {
        const isDark = document.documentElement.classList.contains('dark');
        dom.darkModeToggles.forEach(toggle => updateDarkModeToggleVisuals(toggle, isDark));
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        dom.darkModeToggles.forEach(toggle => updateDarkModeToggleVisuals(toggle, isDark));
    }

    function updateDarkModeToggleVisuals(toggle, isDark) {
        toggle.querySelector('.fa-moon')?.classList.toggle('hidden', isDark);
        toggle.querySelector('.fa-sun')?.classList.toggle('hidden', !isDark);
        toggle.setAttribute('aria-checked', isDark);
    }

    // --- Data Loading & Processing ---
    async function loadVideos() {
        if (dom.loadingPlaceholder) {
            dom.loadingPlaceholder.classList.remove('hidden');
            dom.loadingPlaceholder.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin fa-3x mb-3 text-purple-600 dark:text-purple-400"></i><p class="text-lg text-slate-600 dark:text-slate-300">טוען סרטונים...</p></div>`;
        }

        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`HTTP ${response.status} while fetching videos.json`);
            
            const rawVideos = await response.json();
            if (!Array.isArray(rawVideos)) throw new Error("Video data is not a valid array.");
            
            allVideos = rawVideos.map(video => ({
                ...video,
                category: (video.category || '').toLowerCase(),
                tags: (video.tags || []).map(tag => String(tag).toLowerCase())
            }));

            if (dom.videoCountHero) {
                const countSpan = dom.videoCountHero.querySelector('span');
                if (countSpan) countSpan.textContent = allVideos.length;
            }
        } catch (error) {
            allVideos = [];
            if (dom.videoCountHero) {
                const countSpan = dom.videoCountHero.querySelector('span');
                if (countSpan) countSpan.textContent = "שגיאה";
            }
            throw error; // Re-throw for initializePage to catch
        } finally {
             if (dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        }
    }

    function getFilteredVideos() {
        if (!allVideos) return [];

        let filtered = allVideos;

        // 1. Filter by Category
        if (currentFilters.category !== 'all') {
            filtered = filtered.filter(v => v.category === currentFilters.category);
        }
        
        // 2. Filter by Search Term using Fuse.js
        if (currentFilters.searchTerm.length >= MIN_SEARCH_TERM_LENGTH) {
            // Use a single Fuse instance on the full dataset, then filter results.
            // This is more efficient than creating new Fuse instances repeatedly.
            const fuseResults = fuse.search(currentFilters.searchTerm);
            const resultIds = new Set(fuseResults.map(r => r.item.id));
            filtered = filtered.filter(v => resultIds.has(v.id));
        }

        // 3. Filter by Tags and Language
        return filtered.filter(video => {
            const tagsMatch = currentFilters.tags.length === 0 || currentFilters.tags.every(filterTag => video.tags.includes(filterTag));
            const hebrewMatch = !currentFilters.hebrewOnly || video.hebrewContent;
            return tagsMatch && hebrewMatch;
        });
    }


    // --- UI Rendering ---
    function renderFilteredVideos(isLoadMore = false) {
        if (!dom.videoCardsContainer) return;

        if (!isLoadMore) {
            dom.videoCardsContainer.innerHTML = '';
            currentlyDisplayedVideosCount = 0;
        }

        const allMatchingVideos = getFilteredVideos();
        const videosToRender = allMatchingVideos.slice(
            currentlyDisplayedVideosCount,
            currentlyDisplayedVideosCount + (isLoadMore ? VIDEOS_TO_LOAD_MORE : VIDEOS_TO_SHOW_INITIALLY)
        );

        const fragment = document.createDocumentFragment();
        videosToRender.forEach(video => {
            const cardElement = createVideoCardElement(video);
            if (cardElement) fragment.appendChild(cardElement);
        });
        dom.videoCardsContainer.appendChild(fragment);

        currentlyDisplayedVideosCount += videosToRender.length;

        // Update UI states
        const hasVideos = allMatchingVideos.length > 0;
        dom.noVideosFoundMessage?.classList.toggle('hidden', hasVideos);
        if (!hasVideos && !isLoadMore) {
             dom.noVideosFoundMessage.innerHTML = `<div class="col-span-full text-center text-slate-500 dark:text-slate-400 py-16"><i class="fas fa-video-slash fa-4x mb-6 text-purple-400 dark:text-purple-500"></i><p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p><p class="text-lg">נסה לשנות את הסינון או מונח החיפוש.</p></div>`;
        }
        
        updateLoadMoreButton(allMatchingVideos.length);
    }

    function createVideoCardElement(video) {
        if (!dom.videoCardTemplate) return null;

        const cardClone = dom.videoCardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('article');
        if (!cardElement) return null;

        const sanitizedTitle = escapeHTML(video.title);
        const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

        cardElement.querySelector('.video-thumbnail-img').src = video.thumbnail;
        cardElement.querySelector('.video-thumbnail-img').alt = `תמונה ממוזערת: ${sanitizedTitle}`;
        cardElement.querySelector('.video-duration').textContent = video.duration || '';
        cardElement.querySelector('.play-video-button').dataset.videoId = video.id;
        cardElement.querySelector('.video-iframe').title = `נגן וידאו: ${sanitizedTitle}`;
        cardElement.querySelector('.video-link').href = videoLink;
        cardElement.querySelector('.video-link').textContent = sanitizedTitle;
        cardElement.querySelector('.channel-name').textContent = video.channel || '';
        
        const channelLogo = cardElement.querySelector('.channel-logo');
        if (video.channelImage) {
            channelLogo.src = video.channelImage;
            channelLogo.alt = `לוגו ערוץ ${escapeHTML(video.channel)}`;
            channelLogo.classList.remove('hidden');
        }

        const tagsContainer = cardElement.querySelector('.video-tags');
        if (video.tags && video.tags.length > 0) {
            tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${escapeHTML(tag)}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${escapeHTML(capitalizeFirstLetter(tag))}</button>`
            ).join('');
        }

        const categoryDisplay = cardElement.querySelector('.video-category-display');
        const categoryData = PREDEFINED_CATEGORIES.find(c => c.id === video.category);
        const categoryName = categoryData ? categoryData.name : capitalizeFirstLetter(video.category);
        categoryDisplay.querySelector('i').className = `fas ${categoryData?.icon || 'fa-folder-open'} ml-1.5 opacity-70 text-purple-500 dark:text-purple-400`;
        categoryDisplay.append(` ${escapeHTML(categoryName)}`);

        return cardElement;
    }

    function renderHomepageCategoryButtons() {
        const skeleton = document.getElementById('loading-homepage-categories-skeleton');
        if (!dom.homepageCategoriesGrid) return;

        if (skeleton) skeleton.style.display = 'none';
        dom.homepageCategoriesGrid.innerHTML = '';

        PREDEFINED_CATEGORIES.filter(cat => cat.id !== 'all').forEach(cat => {
            const link = document.createElement('a');
            link.href = `category?name=${cat.id}`;
            const gradientClasses = `${cat.gradient} ${cat.darkGradient || ''}`;
            link.className = `category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${gradientClasses} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white dark:focus:ring-purple-500/50`;
            link.innerHTML = `<div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]"><i class="fas ${cat.icon || 'fa-folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i><h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 dark:group-hover:text-yellow-200 transition-colors">${escapeHTML(cat.name)}</h3><p class="text-sm opacity-80 mt-1 px-2">${escapeHTML(cat.description)}</p></div>`;
            dom.homepageCategoriesGrid.appendChild(link);
        });
    }

    function renderPopularTags(categoryId = null) {
        if (!dom.popularTagsContainer) return;
        
        const videosToConsider = categoryId && categoryId !== 'all'
            ? allVideos.filter(v => v.category === categoryId)
            : allVideos;

        if (videosToConsider.length === 0) {
            dom.popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות${categoryId && categoryId !== 'all' ? ' בקטגוריה זו' : ''}.</p>`;
            return;
        }

        const tagCounts = videosToConsider.flatMap(v => v.tags).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});

        const sortedTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, MAX_POPULAR_TAGS)
            .map(([tag]) => tag);

        dom.popularTagsContainer.innerHTML = sortedTags.map(tag => {
            const iconClass = getIconForTag(tag);
            return `<button class="tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5" data-tag-value="${escapeHTML(tag)}"><i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(capitalizeFirstLetter(tag))}</button>`;
        }).join('');
    }

    function renderSelectedTagsChips() {
        if (!dom.selectedTagsContainer) return;
        dom.selectedTagsContainer.innerHTML = currentFilters.tags.map(tagName => `
            <span class="flex items-center gap-1.5 bg-purple-600 text-white dark:bg-purple-500 dark:text-white text-sm font-medium ps-3 pe-2 py-1.5 rounded-full">
                ${escapeHTML(capitalizeFirstLetter(tagName))}
                <button type="button" class="remove-tag-btn text-xs opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none" data-tag-to-remove="${escapeHTML(tagName)}" aria-label="הסר תגית ${escapeHTML(tagName)}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    }

    function updateLoadMoreButton(totalMatchingVideos) {
        let loadMoreBtn = document.getElementById('load-more-videos-btn');
        if (currentlyDisplayedVideosCount < totalMatchingVideos) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-videos-btn';
                loadMoreBtn.textContent = 'טען עוד סרטונים';
                loadMoreBtn.className = 'mt-8 mb-4 mx-auto block px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:focus:ring-offset-slate-900 transition-transform hover:scale-105';
                loadMoreBtn.addEventListener('click', () => renderFilteredVideos(true));
                dom.videoCardsContainer?.parentNode.insertBefore(loadMoreBtn, dom.videoCardsContainer.nextSibling);
            }
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn?.classList.add('hidden');
        }
    }
    
    function updateCategoryPageUI(categoryId) {
        const categoryData = PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const name = categoryData ? categoryData.name : capitalizeFirstLetter(categoryId);
        const icon = categoryData ? categoryData.icon : 'fa-folder-open';

        document.title = `${name} - CAR-טיב`;
        const pageTitle = document.getElementById('category-page-title');
        if (pageTitle) pageTitle.innerHTML = `<i class="fas ${icon} text-purple-600 dark:text-purple-400 mr-3"></i>${escapeHTML(name)}`;
        
        const breadcrumb = document.getElementById('breadcrumb-category-name');
        if (breadcrumb) breadcrumb.textContent = escapeHTML(name);
    }
    
    function displayErrorState(message) {
        if(dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        if (dom.noVideosFoundMessage) {
            dom.noVideosFoundMessage.classList.remove('hidden');
            dom.noVideosFoundMessage.innerHTML = `<div class="text-center text-red-500 dark:text-red-400 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${escapeHTML(message)}</p></div>`;
        }
    }

    // --- Event Handlers ---
    function handleNavLinkClick(event) {
        const link = event.currentTarget;
        if (link.closest('#mobile-menu')) setTimeout(closeMobileMenu, 150);
        
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            event.preventDefault();
            const targetElement = document.getElementById(href.substring(1));
            if (targetElement) {
                const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 20 || 80;
                const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top: elementPosition, behavior: "smooth" });
            }
        }
    }

    function handleFilterChange(andRender = true, andScroll = true) {
        if (andRender) renderFilteredVideos(false);
        if (andScroll) scrollToVideoGridIfNeeded();
        clearSearchSuggestions();
    }
    
    function toggleTagSelection(tagName, tagElement = null) {
        const index = currentFilters.tags.indexOf(tagName);
        const isActive = index > -1;

        if (isActive) {
            currentFilters.tags.splice(index, 1);
        } else {
            currentFilters.tags.push(tagName);
        }
        
        if (tagElement) {
            tagElement.classList.toggle('active-search-tag', !isActive);
            tagElement.classList.toggle('bg-purple-600', !isActive);
            tagElement.classList.toggle('text-white', !isActive);
            tagElement.classList.toggle('dark:bg-purple-500', !isActive);
            tagElement.classList.toggle('dark:text-white', !isActive);
            tagElement.classList.toggle('hover:bg-purple-700', !isActive);
            tagElement.classList.toggle('dark:hover:bg-purple-600', !isActive);
            tagElement.classList.toggle('bg-purple-100', isActive);
            tagElement.classList.toggle('text-purple-700', isActive);
            tagElement.classList.toggle('dark:bg-purple-800', isActive);
            tagElement.classList.toggle('dark:text-purple-200', isActive);
            tagElement.classList.toggle('hover:bg-purple-200', isActive);
            tagElement.classList.toggle('dark:hover:bg-purple-700', isActive);
        }

        renderSelectedTagsChips();
        handleFilterChange();
    }
    
    function handlePlayVideo(button) {
        const videoId = button.dataset.videoId;
        const videoCard = button.closest('article');
        if (!videoCard || !videoId) return;

        const iframe = videoCard.querySelector('.video-iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
        iframe.classList.remove('hidden');
        button.style.display = 'none';
    }

    // --- Search Logic Handlers ---
    function setupSearch(inputId, suggestionsId) {
        const input = document.getElementById(inputId);
        const suggestionsContainer = document.getElementById(suggestionsId);
        const form = input?.closest('form');
        if (!input || !suggestionsContainer || !form) return;
        
        const suggestionsList = suggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;

        input.addEventListener('input', (e) => handleSearchInput(e.target, suggestionsContainer));
        input.addEventListener('keydown', (e) => handleSearchKeyDown(e, suggestionsContainer));
        input.addEventListener('focus', (e) => handleSearchInput(e.target, suggestionsContainer));
        input.addEventListener('blur', () => {
            setTimeout(() => { if (!searchState.isSuggestionClicked) clearSearchSuggestions(); }, 150);
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFilterChange();
        });
    }

    function handleSearchInput(inputElement, suggestionsContainer) {
        searchState.currentInput = inputElement;
        searchState.currentSuggestionsContainer = suggestionsContainer;
        const searchTerm = inputElement.value.trim();
        currentFilters.searchTerm = searchTerm;

        if (searchTerm.length < MIN_SEARCH_TERM_LENGTH) {
            clearSearchSuggestions();
            // If user cleared search, re-render everything
            if (currentFilters.searchTerm === '') {
                renderFilteredVideos(false);
            }
            return;
        }
        displaySearchSuggestions(searchTerm);
    }
    
    function displaySearchSuggestions(searchTerm) {
        if (!fuse || !searchState.currentSuggestionsContainer) return;
        const suggestionsList = searchState.currentSuggestionsContainer.querySelector('ul');
        if(!suggestionsList) return;

        let videosToSearch = (currentFilters.category !== 'all' && !isHomePage()) 
            ? allVideos.filter(v => v.category === currentFilters.category) 
            : allVideos;
        
        const tempFuse = videosToSearch.length === allVideos.length ? fuse : new Fuse(videosToSearch, FUSE_OPTIONS);
        const results = tempFuse.search(searchTerm).slice(0, MAX_SUGGESTIONS);

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
                searchState.isSuggestionClicked = true;
                searchState.currentInput.value = result.item.title;
                currentFilters.searchTerm = result.item.title.trim();
                handleFilterChange();
            });
             li.addEventListener('mouseup', () => {
                 setTimeout(() => { searchState.isSuggestionClicked = false; }, 0); 
            });
            suggestionsList.appendChild(li);
        });
        
        searchState.currentSuggestionsContainer.classList.remove('hidden');
        searchState.activeSuggestionIndex = -1;
    }
    
    function handleSearchKeyDown(event, suggestionsContainer) {
        const items = suggestionsContainer.querySelectorAll('li');
        if (items.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                searchState.activeSuggestionIndex = (searchState.activeSuggestionIndex + 1) % items.length;
                updateActiveSuggestionVisuals(items);
                break;
            case 'ArrowUp':
                event.preventDefault();
                searchState.activeSuggestionIndex = (searchState.activeSuggestionIndex - 1 + items.length) % items.length;
                updateActiveSuggestionVisuals(items);
                break;
            case 'Enter':
                event.preventDefault();
                if (searchState.activeSuggestionIndex > -1) {
                    items[searchState.activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                } else {
                    handleFilterChange();
                }
                break;
            case 'Escape':
                clearSearchSuggestions();
                break;
        }
    }
    
    function updateActiveSuggestionVisuals(items) {
        items.forEach((item, index) => {
            item.classList.toggle('active-suggestion', index === searchState.activeSuggestionIndex);
            if (index === searchState.activeSuggestionIndex) item.scrollIntoView({ block: 'nearest' });
        });
    }

    function clearSearchSuggestions() {
        if (searchState.currentSuggestionsContainer) {
            searchState.currentSuggestionsContainer.classList.add('hidden');
            const ul = searchState.currentSuggestionsContainer.querySelector('ul');
            if (ul) ul.innerHTML = '';
        }
        searchState.activeSuggestionIndex = -1;
    }

    function generateHighlightedText(text, indices) {
        let result = '';
        let lastIndex = 0;
        indices.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
            if (start > lastIndex) result += escapeHTML(text.substring(lastIndex, start));
            result += `<strong class="font-semibold text-purple-600 dark:text-purple-300">${escapeHTML(text.substring(start, end + 1))}</strong>`;
            lastIndex = end + 1;
        });
        if (lastIndex < text.length) result += escapeHTML(text.substring(lastIndex));
        return result;
    }


    // --- Menu & Navigation ---
    const openMobileMenu = () => {
        dom.mobileMenu?.classList.remove('translate-x-full');
        dom.backdrop?.classList.remove('invisible', 'opacity-0');
        dom.body.classList.add('overflow-hidden', 'md:overflow-auto');
        dom.openMenuBtn?.setAttribute('aria-expanded', 'true');
    };
    const closeMobileMenu = () => {
        dom.mobileMenu?.classList.add('translate-x-full');
        dom.backdrop?.classList.add('invisible', 'opacity-0');
        dom.body.classList.remove('overflow-hidden', 'md:overflow-auto');
        dom.openMenuBtn?.setAttribute('aria-expanded', 'false');
    };
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const toggleBackToTopButton = () => {
        dom.backToTopButton?.classList.toggle('opacity-0', window.pageYOffset <= 300);
        dom.backToTopButton?.classList.toggle('invisible', window.pageYOffset <= 300);
    };
    const scrollToVideoGridIfNeeded = () => {
        const videoGridSection = document.getElementById('video-grid-section');
        if (videoGridSection) {
            const rect = videoGridSection.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                 const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 20 || 80;
                 const elementPosition = rect.top + window.pageYOffset - headerOffset;
                 window.scrollTo({ top: elementPosition, behavior: "smooth" });
            }
        }
    };
    const updateFooterYear = () => {
        if (dom.currentYearFooter) dom.currentYearFooter.textContent = new Date().getFullYear();
    };

    // --- YT ID Checker Tool ---
    function extractYouTubeVideoId(url) {
        if (!url) return null;
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/|attribution_link\?a=.*&u=\%2Fwatch\%3Fv\%3D)([\w-]{11})/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    async function checkVideoId(videoIdToCheck) {
        if (!videoIdToCheck) return { exists: false, message: "לא סופק ID לבדיקה." };
        const foundVideo = allVideos.find(video => video.id === videoIdToCheck);
        if (foundVideo) {
            return { exists: true, message: `הסרטון "${foundVideo.title}" כבר קיים במאגר.` };
        } else {
            return { exists: false, message: `הסרטון עם ID: ${videoIdToCheck} עדיין לא קיים במאגר. אפשר להוסיף!` };
        }
    }

    async function promptAndCheckVideo() {
        const userInput = prompt("הכנס קישור לסרטון יוטיוב לבדיקה:");
        if (!userInput) return;

        const videoId = extractYouTubeVideoId(userInput);
        if (videoId) {
            const result = await checkVideoId(videoId);
            alert(result.message);
        } else {
            alert("לא זוהה ID תקין של סרטון יוטיוב מהקישור שהוכנס.");
        }
    }

    function handleCheckIdFromHash() {
        if (window.location.hash === '#check-yt-id') {
            promptAndCheckVideo();
            // Optional: remove hash after tool runs to avoid re-triggering on refresh
            // history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }
    
    // --- Event Listener Setup ---
    function setupEventListeners() {
        dom.darkModeToggles.forEach(toggle => toggle.addEventListener('click', toggleDarkMode));
        dom.openMenuBtn?.addEventListener('click', openMobileMenu);
        dom.closeMenuBtn?.addEventListener('click', closeMobileMenu);
        dom.backdrop?.addEventListener('click', closeMobileMenu);
        dom.backToTopButton?.addEventListener('click', scrollToTop);
        window.addEventListener('scroll', toggleBackToTopButton);

        document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', handleNavLinkClick));
        
        dom.hebrewFilterToggle?.addEventListener('change', (e) => {
            currentFilters.hebrewOnly = e.target.checked;
            handleFilterChange();
        });

        dom.customTagForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTagName = dom.tagSearchInput?.value.trim().toLowerCase();
            if (newTagName && !currentFilters.tags.includes(newTagName)) {
                 const popularTagEl = dom.popularTagsContainer?.querySelector(`button.tag[data-tag-value="${newTagName}"]`);
                 toggleTagSelection(newTagName, popularTagEl);
            }
            if(dom.tagSearchInput) dom.tagSearchInput.value = '';
        });

        dom.popularTagsContainer?.addEventListener('click', (e) => {
            const tagButton = e.target.closest('button.tag');
            if (tagButton?.dataset.tagValue) {
                toggleTagSelection(tagButton.dataset.tagValue, tagButton);
            }
        });

        dom.selectedTagsContainer?.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-tag-btn');
            if (removeButton?.dataset.tagToRemove) {
                 const tagName = removeButton.dataset.tagToRemove;
                 const popularTagEl = dom.popularTagsContainer?.querySelector(`button.tag[data-tag-value="${tagName}"]`);
                 toggleTagSelection(tagName, popularTagEl);
            }
        });

        dom.videoCardsContainer?.addEventListener('click', (e) => {
            const playButton = e.target.closest('.play-video-button');
            if (playButton) handlePlayVideo(playButton);

            const tagButton = e.target.closest('.video-tag-button');
            if (tagButton?.dataset.tag) {
                const tagName = tagButton.dataset.tag;
                if (!currentFilters.tags.includes(tagName)) {
                    const popularTagEl = dom.popularTagsContainer?.querySelector(`button.tag[data-tag-value="${tagName}"]`);
                    toggleTagSelection(tagName, popularTagEl);
                } else {
                     scrollToVideoGridIfNeeded();
                }
            }
        });

        // Setup all search forms
        Object.keys(dom.searchInputs).forEach(key => {
            if (dom.searchInputs[key] && dom.searchSuggestions[key]) {
                 setupSearch(dom.searchInputs[key].id, dom.searchSuggestions[key].id);
            }
        });

        // YT ID checker tool listener
        dom.checkYtIdLink?.addEventListener('click', (e) => {
            e.preventDefault();
            promptAndCheckVideo();
        });
        window.addEventListener('hashchange', handleCheckIdFromHash);
    }

    // --- Start the application ---
    initializePage();
});

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
                { name: 'channel', weight: 0.1 }
            ],
            includeScore: true,
            includeMatches: true,
            threshold: 0.4,
            minMatchCharLength: 2,
            ignoreLocation: true
        },
        PREDEFINED_CATEGORIES: [
            { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
            { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600", darkGradient: "dark:from-purple-600 dark:to-indigo-700" },
            { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600", darkGradient: "dark:from-blue-600 dark:to-cyan-700" },
            { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600", darkGradient: "dark:from-green-600 dark:to-teal-700" },
            { id: "troubleshooting", name: "איתור ותיקון תקלות", description: "אבחון ופתרון בעיות", icon: "fa-microscope", gradient: "from-lime-400 to-yellow-500", darkGradient: "dark:from-lime-500 dark:to-yellow-600" },
            { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600", darkGradient: "dark:from-orange-600 dark:to-red-700" },
            { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600", darkGradient: "dark:from-yellow-600 dark:to-amber-700" },
            { id: "collectors", name: "רכבי אספנות", description: "רכבים נוסטלגיים שחזרו לכביש", icon: "fa-car-side", gradient: "from-red-500 to-pink-600", darkGradient: "dark:from-red-600 dark:to-pink-700" }
        ]
    };

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
        checkYtIdLink: document.getElementById('check-yt-id-link'),
        filterSummaryContainer: document.getElementById('filter-summary-container'),
        filterSummaryText: document.getElementById('filter-summary-text'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        sortSelect: document.getElementById('sort-by-select'),
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
        currentlyDisplayedVideosCount: 0,
        search: {
            activeSuggestionIndex: -1,
            currentInput: null,
            currentSuggestionsContainer: null,
            isSuggestionClicked: false
        }
    };

    function escapeHTML(str) {
        if (str === null || typeof str === 'undefined') return '';
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(String(str)));
        return p.innerHTML;
    }
    
    function capitalizeFirstLetter(string) {
        return !string ? '' : string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function isHomePage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename === '' || filename === 'index.html';
    }

    function getCategoryFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name') || params.get('category');
    }
    
    function getIconForTag(tag) {
        const tagIcons = { "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "גיר": "fa-cog", "שמן מנוע": "fa-oil-can", "מצבר": "fa-car-battery", "תחזוקה": "fa-tools", "טיפול": "fa-wrench", "בדיקה לפני קנייה": "fa-search-dollar", "שיפורים": "fa-rocket", "רכב חשמלי": "fa-charging-station", "הכנופיה": "fa-users-cog", "ניקוי מצערת": "fa-spray-can-sparkles", "אספנות": "fa-gem", "נוזל בלמים": "fa-tint", "עשה זאת בעצמך": "fa-hand-sparkles" };
        return tagIcons[tag.toLowerCase()] || "fa-tag";
    }
    
    function parseDurationToSeconds(durationStr) {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        const parts = durationStr.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            seconds = parts[0];
        }
        return seconds;
    }

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
            
            state.allVideos = rawVideos.map(video => ({
                ...video,
                category: (video.category || '').toLowerCase(),
                tags: (video.tags || []).map(tag => String(tag).toLowerCase()),
                durationInSeconds: parseDurationToSeconds(video.duration),
                dateAdded: new Date(video.dateAdded)
            }));
            if (dom.videoCountHero) {
                const countSpan = dom.videoCountHero.querySelector('span');
                if (countSpan) countSpan.textContent = state.allVideos.length;
            }
        } catch (error) {
            state.allVideos = [];
            if (dom.videoCountHero) dom.videoCountHero.querySelector('span').textContent = "שגיאה";
            throw error;
        } finally {
             if (dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        }
    }
    
    function getFilteredAndSortedVideos() {
        let videos = getFilteredVideos();
        
        videos.sort((a, b) => {
            switch (state.currentFilters.sortBy) {
                case 'date-desc':
                    return b.dateAdded - a.dateAdded;
                case 'date-asc':
                    return a.dateAdded - b.dateAdded;
                case 'title-asc':
                    return a.title.localeCompare(b.title, 'he');
                case 'title-desc':
                    return b.title.localeCompare(a.title, 'he');
                case 'duration-asc':
                    return a.durationInSeconds - b.durationInSeconds;
                case 'duration-desc':
                    return b.durationInSeconds - a.durationInSeconds;
                default:
                    return 0;
            }
        });
        
        return videos;
    }

    function getFilteredVideos() {
        if (!state.allVideos) return [];
        let filtered = state.allVideos;

        if (state.currentFilters.category !== 'all') {
            filtered = filtered.filter(v => v.category === state.currentFilters.category);
        }
        
        if (state.currentFilters.searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            const fuseResults = state.fuse.search(state.currentFilters.searchTerm);
            const resultIds = new Set(fuseResults.map(r => r.item.id));
            filtered = filtered.filter(v => resultIds.has(v.id));
        }

        return filtered.filter(video => {
            const tagsMatch = state.currentFilters.tags.length === 0 || state.currentFilters.tags.every(filterTag => video.tags.includes(filterTag));
            const hebrewMatch = !state.currentFilters.hebrewOnly || video.hebrewContent;
            return tagsMatch && hebrewMatch;
        });
    }

    function applyFilters(isLoadMore = false, andScroll = true) {
        if (!isLoadMore) {
            state.currentlyDisplayedVideosCount = 0;
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

    function toggleTagSelection(tagName) {
        const { tags } = state.currentFilters;
        const index = tags.indexOf(tagName);
        if (index > -1) {
            tags.splice(index, 1);
        } else {
            tags.push(tagName);
        }
        
        updateActiveTagVisuals();
        renderSelectedTagChips();
        applyFilters(false);
    }

    function addCustomTag(tagName) {
        if (tagName && !state.currentFilters.tags.includes(tagName)) {
            toggleTagSelection(tagName);
        }
    }

    function clearAllFilters() {
        // Clear runtime state
        state.currentFilters.tags = [];
        state.currentFilters.searchTerm = '';
        state.currentFilters.sortBy = 'date-desc';
        state.currentFilters.hebrewOnly = false;

        // Clear user preference from storage
        localStorage.removeItem('hebrewOnlyPreference');

        // Update UI elements to reflect cleared state
        Object.values(dom.searchInputs).forEach(input => {
            if (input) input.value = '';
        });
        if(dom.sortSelect) dom.sortSelect.value = 'date-desc';
        if(dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = false;

        updateActiveTagVisuals();
        renderSelectedTagChips();
        applyFilters(false, false);
    }

    function renderVideoCards(allMatchingVideos, isLoadMore) {
        if (!dom.videoCardsContainer) return;
        if (!isLoadMore) dom.videoCardsContainer.innerHTML = '';
        
        const videosToRender = allMatchingVideos.slice(
            state.currentlyDisplayedVideosCount,
            state.currentlyDisplayedVideosCount + (isLoadMore ? CONSTANTS.VIDEOS_TO_LOAD_MORE : CONSTANTS.VIDEOS_TO_SHOW_INITIALLY)
        );

        const fragment = document.createDocumentFragment();
        videosToRender.forEach(video => {
            const cardElement = createVideoCardElement(video);
            if (cardElement) fragment.appendChild(cardElement);
        });
        dom.videoCardsContainer.appendChild(fragment);
        state.currentlyDisplayedVideosCount += videosToRender.length;

        const hasVideos = allMatchingVideos.length > 0;
        dom.noVideosFoundMessage?.classList.toggle('hidden', hasVideos);
        if (!hasVideos && !isLoadMore) {
            dom.noVideosFoundMessage.innerHTML = `<div class="col-span-full text-center text-slate-500 dark:text-slate-400 py-16">
                <i class="fas fa-video-slash fa-4x mb-6 text-purple-400 dark:text-purple-500"></i>
                <p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p>
                <p class="text-lg mb-6">נסה לשנות את הסינון או חפש משהו אחר.</p>
                <button id="no-results-clear-btn" class="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-slate-800">נקה את כל הסינונים</button>
            </div>`;
        }
        
        updateLoadMoreButton(allMatchingVideos.length);
    }

    function createVideoCardElement(video) {
        if (!dom.videoCardTemplate) return null;

        const cardClone = dom.videoCardTemplate.content.cloneNode(true);
        const card = {
            article: cardClone.querySelector('article'),
            thumbnailImg: cardClone.querySelector('.video-thumbnail-img'),
            duration: cardClone.querySelector('.video-duration'),
            playBtn: cardClone.querySelector('.play-video-button'),
            iframe: cardClone.querySelector('.video-iframe'),
            link: cardClone.querySelector('.video-link'),
            channelName: cardClone.querySelector('.channel-name'),
            channelLogo: cardClone.querySelector('.channel-logo'),
            tagsContainer: cardClone.querySelector('.video-tags'),
            categoryDisplay: cardClone.querySelector('.video-category-display'),
            dateDisplay: cardClone.querySelector('.video-date-display')
        };

        const sanitizedTitle = escapeHTML(video.title);
        const videoLink = `https://www.youtube.com/watch?v=${video.id}`;
        
        card.thumbnailImg.src = video.thumbnail;
        card.thumbnailImg.alt = `תמונה ממוזערת: ${sanitizedTitle}`;
        card.duration.textContent = video.duration || '';
        card.playBtn.dataset.videoId = video.id;
        card.iframe.title = `נגן וידאו: ${sanitizedTitle}`;
        card.link.href = videoLink;
        card.link.textContent = sanitizedTitle;
        card.channelName.textContent = video.channel || '';
        
        if (video.channelImage) {
            card.channelLogo.src = video.channelImage;
            card.channelLogo.alt = `לוגו ערוץ ${escapeHTML(video.channel)}`;
            card.channelLogo.classList.remove('hidden');
        }

        if (video.tags?.length > 0) {
            card.tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${escapeHTML(tag)}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${escapeHTML(capitalizeFirstLetter(tag))}</button>`
            ).join('');
        }

        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === video.category);
        const categoryName = categoryData ? categoryData.name : capitalizeFirstLetter(video.category);
        card.categoryDisplay.querySelector('i').className = `fas ${categoryData?.icon || 'fa-folder-open'} ml-1.5 opacity-70 text-purple-500 dark:text-purple-400`;
        card.categoryDisplay.append(` ${escapeHTML(categoryName)}`);
        
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
        dom.homepageCategoriesGrid.innerHTML = '';

        CONSTANTS.PREDEFINED_CATEGORIES.filter(cat => cat.id !== 'all').forEach(cat => {
            const link = document.createElement('a');
            link.href = `category.html?name=${cat.id}`;
            const gradientClasses = `${cat.gradient} ${cat.darkGradient || ''}`;
            link.className = `category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${gradientClasses} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white dark:focus:ring-purple-500/50`;
            link.innerHTML = `<div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]"><i class="fas ${cat.icon || 'fa-folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i><h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 dark:group-hover:text-yellow-200 transition-colors">${escapeHTML(cat.name)}</h3><p class="text-sm opacity-80 mt-1 px-2">${escapeHTML(cat.description)}</p></div>`;
            dom.homepageCategoriesGrid.appendChild(link);
        });
    }

    function renderPopularTags() {
        if (!dom.popularTagsContainer) return;
        const { category } = state.currentFilters;
        const videosToConsider = category && category !== 'all' ? state.allVideos.filter(v => v.category === category) : state.allVideos;

        if (videosToConsider.length === 0) {
            dom.popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות${category && category !== 'all' ? ' בקטגוריה זו' : ''}.</p>`;
            return;
        }

        const tagCounts = videosToConsider.flatMap(v => v.tags).reduce((acc, tag) => ({ ...acc, [tag]: (acc[tag] || 0) + 1 }), {});
        const sortedTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, CONSTANTS.MAX_POPULAR_TAGS).map(([tag]) => tag);

        dom.popularTagsContainer.innerHTML = sortedTags.map(tag => {
            const iconClass = getIconForTag(tag);
            const isSelected = state.currentFilters.tags.includes(tag);
            return `<button class="tag ${isSelected ? 'active-search-tag' : 'bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700'} focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5" data-tag-value="${escapeHTML(tag)}"><i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(capitalizeFirstLetter(tag))}</button>`;
        }).join('');
    }
    
    function updateActiveTagVisuals() {
        document.querySelectorAll('.tag[data-tag-value]').forEach(tagElement => {
            const tagName = tagElement.dataset.tagValue;
            const isActive = state.currentFilters.tags.includes(tagName);
            tagElement.classList.toggle('active-search-tag', isActive);
        });
    }

    function renderSelectedTagChips() {
        if (!dom.selectedTagsContainer) return;
        dom.selectedTagsContainer.innerHTML = state.currentFilters.tags.map(tagName => `
            <span class="flex items-center gap-1.5 bg-purple-600 text-white dark:bg-purple-500 dark:text-white text-sm font-medium ps-3 pe-2 py-1.5 rounded-full">
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
        let count = tags.length;
        if (hebrewOnly) count++;
        if (searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH) count++;

        if (count > 0) {
            dom.filterSummaryText.textContent = `${count} סינונים פעילים`;
            dom.filterSummaryContainer.classList.remove('hidden');
        } else {
            dom.filterSummaryContainer.classList.add('hidden');
        }
    }

    function updateLoadMoreButton(totalMatchingVideos) {
        let loadMoreBtn = document.getElementById('load-more-videos-btn');
        if (state.currentlyDisplayedVideosCount < totalMatchingVideos) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-videos-btn';
                loadMoreBtn.className = 'mt-8 mb-4 mx-auto block px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:focus:ring-offset-slate-900 transition-transform hover:scale-105';
                loadMoreBtn.addEventListener('click', () => applyFilters(true));
                dom.videoCardsContainer?.parentNode.insertBefore(loadMoreBtn, dom.videoCardsContainer.nextSibling);
            }
            loadMoreBtn.textContent = `טען עוד (${totalMatchingVideos - state.currentlyDisplayedVideosCount} נותרו)`;
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn?.classList.add('hidden');
        }
    }
    
    function updateCategoryPageUI(categoryId) {
        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const name = categoryData ? categoryData.name : capitalizeFirstLetter(categoryId);
        const icon = categoryData ? categoryData.icon : 'fa-folder-open';

        document.title = `${name} - CAR-טיב`;
        const pageTitle = document.getElementById('category-page-title');
        if (pageTitle) pageTitle.innerHTML = `<i class="fas ${icon} text-purple-600 dark:text-purple-400 mr-3"></i>${escapeHTML(name)}`;
        
        const breadcrumb = document.getElementById('breadcrumb-category-name');
        if (breadcrumb) breadcrumb.textContent = escapeHTML(name);
    }
    
    function displayError(message) {
        if(dom.loadingPlaceholder) dom.loadingPlaceholder.classList.add('hidden');
        if (dom.noVideosFoundMessage) {
            dom.noVideosFoundMessage.classList.remove('hidden');
            dom.noVideosFoundMessage.innerHTML = `<div class="text-center text-red-500 dark:text-red-400 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${escapeHTML(message)}</p></div>`;
        }
    }

    function initThemeVisuals() {
        const isDark = document.documentElement.classList.contains('dark');
        dom.darkModeToggles.forEach(toggle => updateThemeToggleVisuals(toggle, isDark));
    }
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        dom.darkModeToggles.forEach(toggle => updateThemeToggleVisuals(toggle, isDark));
    }
    function updateThemeToggleVisuals(toggle, isDark) {
        toggle.querySelector('.fa-moon')?.classList.toggle('hidden', isDark);
        toggle.querySelector('.fa-sun')?.classList.toggle('hidden', !isDark);
        toggle.setAttribute('aria-checked', String(isDark));
    }
    function openMobileMenu() {
        dom.mobileMenu?.classList.remove('translate-x-full');
        dom.backdrop?.classList.remove('invisible', 'opacity-0');
        dom.body.classList.add('overflow-hidden', 'md:overflow-auto');
        dom.openMenuBtn?.setAttribute('aria-expanded', 'true');
    }
    function closeMobileMenu() {
        dom.mobileMenu?.classList.add('translate-x-full');
        dom.backdrop?.classList.add('invisible', 'opacity-0');
        dom.body.classList.remove('overflow-hidden', 'md:overflow-auto');
        dom.openMenuBtn?.setAttribute('aria-expanded', 'false');
    }
    function toggleBackToTopButton() {
        dom.backToTopButton?.classList.toggle('opacity-0', window.pageYOffset <= 300);
        dom.backToTopButton?.classList.toggle('invisible', window.pageYOffset <= 300);
    }
    function scrollToVideoGridIfNeeded() {
        const gridSection = document.getElementById('video-grid-section');
        if (gridSection) {
            const rect = gridSection.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                 const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 20 || 80;
                 const elementPosition = rect.top + window.pageYOffset - headerOffset;
                 window.scrollTo({ top: elementPosition, behavior: "smooth" });
            }
        }
    }
    function updateFooterYear() {
        if (dom.currentYearFooter) dom.currentYearFooter.textContent = new Date().getFullYear();
    }
    
    function setupSearchListeners(form, input, suggestionsContainer) {
        if (!form || !input || !suggestionsContainer) return;
        const suggestionsList = suggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;

        input.addEventListener('input', (e) => handleSearchInput(e.target, suggestionsContainer));
        input.addEventListener('keydown', (e) => handleSearchKeyDown(e, suggestionsContainer));
        input.addEventListener('blur', () => {
            setTimeout(() => { if (!state.search.isSuggestionClicked) clearSearchSuggestions(); }, 150);
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters(false);
        });
    }

    function handleSearchInput(inputElement, suggestionsContainer) {
        state.search.currentInput = inputElement;
        state.search.currentSuggestionsContainer = suggestionsContainer;
        const searchTerm = inputElement.value.trim();
        state.currentFilters.searchTerm = searchTerm;

        if (searchTerm.length < CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            clearSearchSuggestions();
            if (searchTerm === '') applyFilters(false, false);
            return;
        }
        displaySearchSuggestions(searchTerm);
    }
    
    function displaySearchSuggestions(searchTerm) {
        if (!state.fuse || !state.search.currentSuggestionsContainer) return;
        const suggestionsList = state.search.currentSuggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;

        const results = state.fuse.search(searchTerm).slice(0, CONSTANTS.MAX_SUGGESTIONS);

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
                state.search.currentInput.value = result.item.title;
                state.currentFilters.searchTerm = result.item.title.trim();
                applyFilters(false);
            });
            li.addEventListener('mouseup', () => {
                setTimeout(() => { state.search.isSuggestionClicked = false; }, 50); 
            });
            suggestionsList.appendChild(li);
        });
        
        state.search.currentSuggestionsContainer.classList.remove('hidden');
        state.search.activeSuggestionIndex = -1;
    }
    
    function handleSearchKeyDown(event, suggestionsContainer) {
        const items = suggestionsContainer.querySelectorAll('li');
        if (items.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                state.search.activeSuggestionIndex = (state.search.activeSuggestionIndex + 1) % items.length;
                updateActiveSuggestionVisuals(items);
                break;
            case 'ArrowUp':
                event.preventDefault();
                state.search.activeSuggestionIndex = (state.search.activeSuggestionIndex - 1 + items.length) % items.length;
                updateActiveSuggestionVisuals(items);
                break;
            case 'Enter':
                event.preventDefault();
                if (state.search.activeSuggestionIndex > -1) {
                    items[state.search.activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                } else {
                    applyFilters(false);
                }
                clearSearchSuggestions();
                break;
            case 'Escape':
                clearSearchSuggestions();
                break;
        }
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
            if (start > lastIndex) result += escapeHTML(text.substring(lastIndex, start));
            result += `<strong class="font-semibold text-purple-600 dark:text-purple-300">${escapeHTML(text.substring(start, end + 1))}</strong>`;
            lastIndex = end + 1;
        });
        if (lastIndex < text.length) result += escapeHTML(text.substring(lastIndex));
        return result;
    }

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
        const foundVideo = state.allVideos.find(video => video.id === videoIdToCheck);
        return foundVideo
            ? { exists: true, message: `הסרטון "${foundVideo.title}" כבר קיים במאגר.` }
            : { exists: false, message: `הסרטון עם ID: ${videoIdToCheck} עדיין לא קיים במאגר. אפשר להוסיף!` };
    }

    async function promptAndCheckVideo() {
        const userInput = prompt("הכנס קישור לסרטון יוטיוב לבדיקה:");
        if (!userInput) return;
        const videoId = extractYouTubeVideoId(userInput);
        const resultMessage = videoId ? (await checkVideoId(videoId)).message : "לא זוהה ID תקין של סרטון יוטיוב מהקישור שהוכנס.";
        alert(resultMessage);
    }
    
    function handleCheckIdFromHash() {
        if (window.location.hash === '#check-yt-id') {
            promptAndCheckVideo();
        }
    }
    
    function updateURLWithFilters() {
        const params = new URLSearchParams(window.location.search);
        const { searchTerm, tags, hebrewOnly, sortBy } = state.currentFilters;
        
        const pageCategory = getCategoryFromURL();
        if(pageCategory) {
            params.set('name', pageCategory);
        } else {
            params.delete('name');
        }

        if (searchTerm) params.set('search', searchTerm); else params.delete('search');
        if (tags.length > 0) params.set('tags', tags.join(',')); else params.delete('tags');
        if (hebrewOnly) params.set('hebrew', 'true'); else params.delete('hebrew');
        if (sortBy !== 'date-desc') params.set('sort', sortBy); else params.delete('sort');

        const queryString = params.toString();
        const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
        
        history.replaceState(state.currentFilters, '', newUrl);
    }

    function applyFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        state.currentFilters.searchTerm = params.get('search') || '';
        state.currentFilters.tags = params.get('tags')?.split(',').filter(Boolean) || [];
        state.currentFilters.hebrewOnly = params.get('hebrew') === 'true';
        state.currentFilters.sortBy = params.get('sort') || 'date-desc';
        
        if (!params.has('hebrew')) {
            state.currentFilters.hebrewOnly = localStorage.getItem('hebrewOnlyPreference') === 'true';
        }
    }

    function syncUIToState() {
        Object.values(dom.searchInputs).forEach(input => {
            if(input) input.value = state.currentFilters.searchTerm;
        });
        if(dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = state.currentFilters.hebrewOnly;
        if(dom.sortSelect) dom.sortSelect.value = state.currentFilters.sortBy;
        renderSelectedTagChips();
        updateActiveTagVisuals();
    }


    function setupEventListeners() {
        dom.darkModeToggles.forEach(toggle => toggle.addEventListener('click', toggleTheme));
        dom.openMenuBtn?.addEventListener('click', openMobileMenu);
        dom.closeMenuBtn?.addEventListener('click', closeMobileMenu);
        dom.backdrop?.addEventListener('click', closeMobileMenu);
        dom.backToTopButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', toggleBackToTopButton);
        
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                 const href = navLink.getAttribute('href');
                if (isHomePage() && href && href.startsWith('#')) {
                    e.preventDefault();
                    if (navLink.closest('#mobile-menu')) setTimeout(closeMobileMenu, 150);

                    if (href === '#home') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        const targetId = href.substring(1);
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                            const headerOffset = document.querySelector('header.sticky')?.offsetHeight + 20 || 80;
                            const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                            window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                        }
                    }
                } else if (navLink.closest('#mobile-menu')) {
                    setTimeout(closeMobileMenu, 150);
                }
            }
             if (e.target.id === 'no-results-clear-btn') {
                clearAllFilters();
            }
        });

        dom.hebrewFilterToggle?.addEventListener('change', (e) => {
            state.currentFilters.hebrewOnly = e.target.checked;
            localStorage.setItem('hebrewOnlyPreference', e.target.checked);
            applyFilters(false);
        });
        
        dom.sortSelect?.addEventListener('change', (e) => {
            state.currentFilters.sortBy = e.target.value;
            applyFilters(false, false);
        });
        
        dom.clearFiltersBtn?.addEventListener('click', () => clearAllFilters());

        dom.customTagForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTagName = dom.tagSearchInput?.value.trim().toLowerCase();
            addCustomTag(newTagName);
            if (dom.tagSearchInput) dom.tagSearchInput.value = '';
        });
        dom.popularTagsContainer?.addEventListener('click', (e) => {
            const tagButton = e.target.closest('button.tag');
            if (tagButton?.dataset.tagValue) {
                toggleTagSelection(tagButton.dataset.tagValue);
            }
        });
        dom.selectedTagsContainer?.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-tag-btn');
            if (removeButton?.dataset.tagToRemove) {
                toggleTagSelection(removeButton.dataset.tagToRemove);
            }
        });

        dom.videoCardsContainer?.addEventListener('click', (e) => {
            const playButton = e.target.closest('.play-video-button');
            if (playButton) {
                const videoId = playButton.dataset.videoId;
                const videoCard = playButton.closest('article');
                if (videoCard && videoId) {
                    const iframe = videoCard.querySelector('.video-iframe');
                    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
                    iframe.classList.remove('hidden');
                    playButton.style.display = 'none';
                }
            }
            const tagButton = e.target.closest('.video-tag-button');
            if (tagButton?.dataset.tag) {
                const tagName = tagButton.dataset.tag;
                if (!state.currentFilters.tags.includes(tagName)) {
                    toggleTagSelection(tagName);
                } else {
                    scrollToVideoGridIfNeeded();
                }
            }
        });

        setupSearchListeners(dom.searchInputs.desktop?.form, dom.searchInputs.desktop, dom.searchSuggestions.desktop);
        setupSearchListeners(dom.searchInputs.mobile?.form, dom.searchInputs.mobile, dom.searchSuggestions.mobile);
        setupSearchListeners(dom.searchInputs.main?.form, dom.searchInputs.main, dom.searchSuggestions.main);

        dom.checkYtIdLink?.addEventListener('click', (e) => {
            e.preventDefault();
            promptAndCheckVideo();
        });
        window.addEventListener('hashchange', handleCheckIdFromHash);
        
        window.addEventListener('popstate', (event) => {
            applyFiltersFromURL();
            syncUIToState();
            applyFilters(false, false);
        });
    }

    async function initializeApp() {
        initThemeVisuals();
        updateFooterYear();
        setupEventListeners();
        handleCheckIdFromHash();

        try {
            await loadVideos();
            
            applyFiltersFromURL();
            
            const categoryFromURL = getCategoryFromURL();
            let videosForFuse = state.allVideos;
            
            if (isHomePage()) {
                if (dom.homepageCategoriesGrid) renderHomepageCategoryButtons();
                state.currentFilters.category = 'all';
            } else if (categoryFromURL) {
                const currentCategory = categoryFromURL.toLowerCase();
                state.currentFilters.category = currentCategory;
                updateCategoryPageUI(state.currentFilters.category);
                videosForFuse = state.allVideos.filter(video => video.category === currentCategory);
            }
            
            state.fuse = new Fuse(videosForFuse, CONSTANTS.FUSE_OPTIONS);
            
            syncUIToState();
            renderPopularTags();
            applyFilters(false, false);

        } catch (error) {
            console.error("Critical error initializing page:", error);
            displayError(`שגיאה קריטית בטעינת האתר: ${error.message}`);
        }
    }

    initializeApp();
});

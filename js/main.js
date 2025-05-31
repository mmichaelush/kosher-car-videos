document.addEventListener('DOMContentLoaded', function () {

    const bodyElement = document.body;
    const darkModeToggles = document.querySelectorAll('.dark-mode-toggle-button');
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const videoCountHeroElement = document.getElementById('video-count-hero');
    const currentYearFooter = document.getElementById('current-year-footer');
    const desktopSearchForm = document.getElementById('desktop-search-form');
    const mobileSearchForm = document.getElementById('mobile-search-form');
    const mainContentSearchForm = document.getElementById('main-content-search-form');
    const desktopSearchInput = document.getElementById('desktop-search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mainContentSearchInput = document.getElementById('main-content-search-input');
    const desktopSearchSuggestions = document.getElementById('desktop-search-suggestions');
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    const mainContentSearchSuggestions = document.getElementById('main-content-search-suggestions');
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
    const videoCardTemplate = document.getElementById('video-card-template');
    const homepageCategoriesGrid = document.getElementById('homepage-categories-grid');
    const hebrewFilterToggle = document.getElementById('hebrew-filter-toggle');
    const popularTagsContainer = document.getElementById('popular-tags-container');
    const tagSearchInput = document.getElementById('tag-search-input');
    const customTagForm = document.getElementById('custom-tag-form');
    const selectedTagsContainer = document.getElementById('selected-tags-container');
    const backToTopButton = document.getElementById('back-to-top-btn');

    let allVideos = [];
    let currentFilters = {
        category: 'all', 
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    let fuse; 
    let activeSuggestionIndex = -1;
    let currentSearchInput = null;
    let currentSuggestionsContainer = null;
    let isSuggestionClicked = false; 

    let videosToShowInitially = 30; 
    let videosToLoadMore = 15;    
    let currentlyDisplayedVideosCount = 0; 

    const MAX_POPULAR_TAGS = 30;
    const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600", darkGradient: "dark:from-purple-600 dark:to-indigo-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600", darkGradient: "dark:from-blue-600 dark:to-cyan-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה עצמית", icon: "fa-tools", gradient: "from-green-500 to-teal-600", darkGradient: "dark:from-green-600 dark:to-teal-700" },
        { id: "troubleshooting", name: "תיקון ואיתור תקלות", description: "פתרון אבחון ותיקון בעיות ותקלות", icon: "fa-microscope", gradient: "from-lime-400 to-yellow-500", darkGradient: "dark:from-lime-500 dark:to-yellow-600" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג ושיפור הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600", darkGradient: "dark:from-orange-600 dark:to-red-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מערכות, מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600", darkGradient: "dark:from-yellow-600 dark:to-amber-700" },
        { id: "collectors", name: "רכבי אספנות", description: "רכבים נוסטלגים מימים שחלפו", icon: "fa-car-side", gradient: "from-red-500 to-pink-600", darkGradient: "dark:from-red-600 dark:to-pink-700" }
    ];
    const MIN_SEARCH_TERM_LENGTH = 2;
    const MAX_SUGGESTIONS = 7;

    async function initializePage() {
        initializeDarkModeVisuals();
        setupEventListeners();
        updateFooterYear();
        const categoryFromURL = getCategoryFromURL();
        try {
            await loadLocalVideos();
            if (allVideos && allVideos.length > 0) {
                const fuseOptions = { keys: [{ name: 'title', weight: 0.6 }, { name: 'tags', weight: 0.3 }, { name: 'channel', weight: 0.1 }], includeScore: true, includeMatches: true, threshold: 0.4, minMatchCharLength: MIN_SEARCH_TERM_LENGTH, ignoreLocation: true };
                fuse = new Fuse(allVideos, fuseOptions); 

                if (isHomePage()) {
                    if (homepageCategoriesGrid) renderHomepageCategoryButtons();
                    currentFilters.category = 'all'; 
                } else if (categoryFromURL) {
                    currentFilters.category = categoryFromURL.toLowerCase();
                    updateCategoryPageUI(currentFilters.category);
                } else {
                    currentFilters.category = 'all'; 
                    if (homepageCategoriesGrid && isHomePage()) renderHomepageCategoryButtons();
                }
                loadAndRenderPopularTags(currentFilters.category !== 'all' ? currentFilters.category : null);
                renderFilteredVideos(false);
            } else {
                displayErrorState("לא נטענו סרטונים. בדוק את קובץ הנתונים `data/videos.json`.");
                if (popularTagsContainer) popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
            }
        } catch (error) {
            displayErrorState(`שגיאה קריטית בטעינת נתוני הסרטונים: ${error.message}`);
            if (fuse) fuse = null;
        }
    }

    function generateHighlightedText(text, indices) {
        let result = '';
        let lastIndex = 0;
        const sortedIndices = indices.slice().sort((a, b) => a[0] - b[0]);
        sortedIndices.forEach(indexPair => {
            const start = indexPair[0];
            const end = indexPair[1];
            if (start > lastIndex) result += escapeHTML(text.substring(lastIndex, start));
            result += `<strong class="font-semibold text-purple-600 dark:text-purple-300">${escapeHTML(text.substring(start, end + 1))}</strong>`;
            lastIndex = end + 1;
        });
        if (lastIndex < text.length) result += escapeHTML(text.substring(lastIndex));
        return result;
    }

    function displaySearchSuggestions(searchTerm) {
        if (!fuse || !currentSearchInput || !currentSuggestionsContainer) {
            clearSearchSuggestions();
            return;
        }
        if (document.activeElement !== currentSearchInput) {
            return; 
        }
        const suggestionsList = currentSuggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;
        if (searchTerm.length < MIN_SEARCH_TERM_LENGTH) {
            clearSearchSuggestions();
            return;
        }

        let videosToSearchIn = allVideos; 
        if (currentFilters.category !== 'all' && !isHomePage()) {
            videosToSearchIn = allVideos.filter(video => video.category.toLowerCase() === currentFilters.category.toLowerCase());
        }
        
        const currentFuseInstance = (videosToSearchIn.length !== allVideos.length) ? new Fuse(videosToSearchIn, fuse.options) : fuse;
        const fuseResults = currentFuseInstance.search(searchTerm).slice(0, MAX_SUGGESTIONS);
        
        suggestionsList.innerHTML = '';
        if (fuseResults.length === 0) {
            clearSearchSuggestions();
            return;
        }
        fuseResults.forEach((result, index) => {
            const video = result.item; 
            const li = document.createElement('li');
            li.className = 'px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-600 cursor-pointer transition-colors duration-150 ease-in-out';
            li.dataset.index = index;
            const titleMatch = result.matches && result.matches.find(match => match.key === 'title'); 
            if (titleMatch && titleMatch.indices.length > 0) {
                li.innerHTML = generateHighlightedText(video.title, titleMatch.indices);
            } else {
                li.textContent = escapeHTML(video.title);
            }
            
            li.addEventListener('mousedown', (e) => {
                isSuggestionClicked = true; 
                currentSearchInput.value = video.title;
                currentFilters.searchTerm = video.title.trim().toLowerCase();
                renderFilteredVideos(false); 
                scrollToVideoGridIfNeeded();
            });
            li.addEventListener('mouseup', () => {
                 if(currentSearchInput) currentSearchInput.blur(); 
                 setTimeout(() => { isSuggestionClicked = false; }, 0); 
            });
            suggestionsList.appendChild(li);
        });
        currentSuggestionsContainer.classList.remove('hidden');
        activeSuggestionIndex = -1;
    }
    
    function displayErrorState(message) { 
        const errorHtml = `
            <div class="text-center text-red-500 dark:text-red-400 py-10">
                <i class="fas fa-exclamation-triangle fa-3x mb-4"></i>
                <p class="text-xl font-semibold">${escapeHTML(message)}</p>
            </div>`;
        if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
            loadingPlaceholder.innerHTML = errorHtml;
        }
        if (noVideosFoundMessage && noVideosFoundMessage.classList.contains("hidden")) {
            noVideosFoundMessage.classList.remove('hidden');
            noVideosFoundMessage.innerHTML = `
                <div class="text-center text-slate-500 dark:text-slate-400 py-16">
                    <i class="fas fa-exclamation-circle fa-4x mb-6 text-purple-400 dark:text-purple-500"></i>
                    <p class="text-2xl font-semibold mb-2">אופס!</p>
                    <p class="text-lg">${escapeHTML(message)}</p>
                </div>`;
        }
    }

    function isHomePage() { 
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename === '' || filename === 'index.html' || (filename.toLowerCase() === document.location.host.toLowerCase() && path.endsWith('/'));
    }

    function getCategoryFromURL() { 
        const params = new URLSearchParams(window.location.search);
        return params.get('name');
    }

    function updateCategoryPageUI(categoryId) { 
        const categoryData = PREDEFINED_CATEGORIES.find(cat => cat.id.toLowerCase() === categoryId.toLowerCase());
        const categoryName = categoryData ? categoryData.name : capitalizeFirstLetter(categoryId);
        const categoryIcon = categoryData ? categoryData.icon : 'fa-folder-open';

        const pageTitleElement = document.getElementById('category-page-title');
        if (pageTitleElement) {
            pageTitleElement.innerHTML = `<i class="fas ${categoryIcon} text-purple-600 dark:text-purple-400 mr-3"></i>${escapeHTML(categoryName)}`;
            document.title = `${categoryName} - CAR-טיב`;
        }

        const breadcrumbCategoryName = document.getElementById('breadcrumb-category-name');
        if (breadcrumbCategoryName) {
            breadcrumbCategoryName.textContent = escapeHTML(categoryName);
        }

        const homepageCategoriesSection = document.getElementById('homepage-categories-section');
        if (homepageCategoriesSection && !isHomePage()) homepageCategoriesSection.style.display = 'none';

        const heroSection = document.querySelector('.hero-gradient');
        if (heroSection && !isHomePage()) heroSection.style.display = 'none';
    }

    function updateDarkModeToggleVisuals(toggleButton, isDark) { 
        const moonIcon = toggleButton.querySelector('.fa-moon');
        const sunIcon = toggleButton.querySelector('.fa-sun');
        const toggleDot = toggleButton.querySelector('.dot');

        if (isDark) {
            if (moonIcon) moonIcon.classList.add('hidden');
            if (sunIcon) sunIcon.classList.remove('hidden');
            if (toggleDot && toggleButton.closest('#mobile-menu')) toggleDot.style.transform = 'translateX(-100%)';
            toggleButton.setAttribute('aria-checked', 'true');
        } else {
            if (moonIcon) moonIcon.classList.remove('hidden');
            if (sunIcon) sunIcon.classList.add('hidden');
            if (toggleDot && toggleButton.closest('#mobile-menu')) toggleDot.style.transform = 'translateX(0%)';
            toggleButton.setAttribute('aria-checked', 'false');
        }
    }

    function initializeDarkModeVisuals() { 
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        darkModeToggles.forEach(toggle => {
            updateDarkModeToggleVisuals(toggle, isCurrentlyDark);
        });
        if (isHomePage() && homepageCategoriesGrid) {
            renderHomepageCategoryButtons();
        }
    }

    function toggleDarkMode() { 
        const htmlEl = document.documentElement;
        htmlEl.classList.toggle('dark');
        const isNowDark = htmlEl.classList.contains('dark');
        localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
        darkModeToggles.forEach(toggle => {
            updateDarkModeToggleVisuals(toggle, isNowDark);
        });
        if (isHomePage() && homepageCategoriesGrid) {
            renderHomepageCategoryButtons();
        }
    }

    async function loadLocalVideos() { 
        if (loadingPlaceholder) {
            loadingPlaceholder.classList.remove('hidden');
            loadingPlaceholder.innerHTML = `
                <div class="text-center py-10">
                    <i class="fas fa-spinner fa-spin fa-3x mb-3 text-purple-600 dark:text-purple-400"></i>
                    <p class="text-lg text-slate-600 dark:text-slate-300">טוען סרטונים...</p>
                </div>`;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`שגיאת HTTP ${response.status} בטעינת videos.json.`);

            const responseText = await response.text();
            try {
                allVideos = JSON.parse(responseText);
                if (!Array.isArray(allVideos)) throw new Error("המידע בקובץ videos.json אינו מערך תקין.");

                allVideos = allVideos.map((video, index) => {
                    if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' ||
                        typeof video.category !== 'string' || !Array.isArray(video.tags) ||
                        typeof video.hebrewContent !== 'boolean') {
                        return null;
                    }
                    return {
                        ...video,
                        category: video.category.toLowerCase(),
                        tags: video.tags.map(tag => String(tag).toLowerCase())
                    };
                }).filter(video => video !== null);

            } catch (jsonError) {
                throw new Error(`שגיאה בפענוח קובץ videos.json: ${jsonError.message}`);
            }

            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');

            if (videoCountHeroElement) {
                const countSpan = videoCountHeroElement.querySelector('span.font-bold');
                if (countSpan) countSpan.textContent = allVideos.length;
                else videoCountHeroElement.innerHTML = `במאגר יש כרגע <span class="font-bold text-white dark:text-gray-50">${allVideos.length}</span> סרטונים.`;
            }
        } catch (error) {
            if (videoCountHeroElement) {
                const countSpan = videoCountHeroElement.querySelector('span.font-bold');
                if (countSpan) countSpan.textContent = "שגיאה";
                else videoCountHeroElement.innerHTML = `שגיאה בטעינת מספר הסרטונים.`;
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = [];
            throw error;
        }
    }

    function renderHomepageCategoryButtons() { 
        const loadingCategoriesSkeleton = document.getElementById('loading-homepage-categories-skeleton');
        if (!homepageCategoriesGrid) {
            if (loadingCategoriesSkeleton) loadingCategoriesSkeleton.innerHTML = "<p class='col-span-full text-red-500 dark:text-red-400'>שגיאה: מיכל הקטגוריות לא נמצא.</p>";
            return;
        }

        if (loadingCategoriesSkeleton) loadingCategoriesSkeleton.style.display = 'none';
        homepageCategoriesGrid.innerHTML = '';

        PREDEFINED_CATEGORIES.filter(cat => cat.id !== 'all').forEach(cat => {
            const link = document.createElement('a');
            link.href = `category.html?name=${cat.id}`;
            const gradientClasses = `${cat.gradient} ${cat.darkGradient || ''}`;
            link.className = `category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${gradientClasses} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white dark:focus:ring-purple-500/50`;
            link.setAttribute('aria-label', `עבור לקטגוריית ${cat.name}`);
            link.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]">
                    <i class="fas ${cat.icon || 'fa-folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                    <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 dark:group-hover:text-yellow-200 transition-colors">${escapeHTML(cat.name)}</h3>
                    <p class="text-sm opacity-80 mt-1 px-2">${escapeHTML(cat.description)}</p>
                </div>`;
            homepageCategoriesGrid.appendChild(link);
        });
    }

    function loadAndRenderPopularTags(forCategoryId = null) { 
        if (!popularTagsContainer) return;
        if (!allVideos || allVideos.length === 0) {
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">אין סרטונים לטעינת תגיות.</p>';
            return;
        }

        const tagCounts = {};
        const videosToConsider = (forCategoryId && forCategoryId !== 'all')
            ? allVideos.filter(v => v.category === forCategoryId)
            : allVideos;

        if (videosToConsider.length === 0 && forCategoryId && forCategoryId !== 'all') {
            popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">אין סרטונים בקטגוריה זו להצגת תגיות.</p>`;
            return;
        }

        videosToConsider.forEach(video => {
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => {
                    if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, MAX_POPULAR_TAGS)
            .map(([tag]) => tag);

        popularTagsContainer.innerHTML = '';
        if (sortedTags.length === 0) {
            popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות${(forCategoryId && forCategoryId !== 'all') ? ' רלוונטיות לקטגוריה זו' : ''}.</p>`;
            return;
        }

        sortedTags.forEach(tag => {
            const tagElement = document.createElement('button');
            tagElement.className = 'tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5';
            tagElement.dataset.tagValue = tag;
            const iconClass = getIconForTag(tag);
            tagElement.innerHTML = `<i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(capitalizeFirstLetter(tag))}`;
            popularTagsContainer.appendChild(tagElement);
        });
    }

    function getIconForTag(tag) { 
        const tagIcons = { "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "גיר": "fa-cog", "תיבת הילוכים": "fa-cog", "שמן מנוע": "fa-oil-can", "מצבר": "fa-car-battery", "מערכת בלימה": "fa-car-crash", "בדיקת רכב": "fa-stethoscope", "תחזוקה": "fa-tools", "טיפול": "fa-wrench", "בדיקה לפני קנייה": "fa-search-dollar", "שיפורים": "fa-rocket", "אביזרים": "fa-box-open", "רכב חשמלי": "fa-charging-station", "טעינה": "fa-plug", "חשמל": "fa-bolt", "חיישנים": "fa-rss", "מערכת בטיחות": "fa-shield-alt", "מצלמות רוורס": "fa-video", "תאורה": "fa-lightbulb", "מערכת מולטימדיה": "fa-music", "בקרת שיוט": "fa-road", "מערכות הרכב": "fa-sliders-h", "היברידי": "fa-battery-half", "בנזין": "fa-fire", "דיזל": "fa-gas-pump", "הנעה כפולה": "fa-compass", "רכב שטח": "fa-mountain", "שטח": "fa-mountain", "רכב משפחתי": "fa-car", "מיני רכב": "fa-car-side", "קלאסי": "fa-car-side", "רכבי אספנות": "fa-car-alt", "וואן": "fa-shuttle-van", "רכב עבודה": "fa-truck", "טנדר": "fa-truck-pickup", "משאית": "fa-truck-moving", "קרוואן": "fa-caravan", "טויוטה": "fa-horse-head", "טסלה": "fa-leaf", "יונדאי": "fa-hippo", "סובארו": "fa-paw", "פורד": "fa-flag-usa", "מרצדס": "fa-star", "ב.מ.וו": "fa-gem", "סקירה": "fa-search", "השוואה": "fa-balance-scale", "מבחן דרכים": "fa-road", "חוות דעת": "fa-comment-dots", "ביטוח": "fa-file-invoice-dollar", "נהיגה": "fa-person-biking", "נהיגה בטוחה": "fa-shield-heart", "אבחון": "fa-stethoscope", "כשל טכני": "fa-exclamation-triangle", "איתור תקלות": "fa-microscope", "עשה זאת בעצמך": "fa-hand-sparkles", "הכנופיה": "fa-users-cog", "יונדאי i10": "fa-car", "ניקוי מצערת": "fa-spray-can-sparkles", "וסת לחץ": "fa-gauge-high", "אספנות": "fa-gem", "נוזל בלמים": "fa-tint" };
        return tagIcons[tag.toLowerCase()] || "fa-tag";
    }

    function createVideoCardElement(video) { 
        if (!videoCardTemplate) return null;
        if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || typeof video.thumbnail !== 'string' || typeof video.category !== 'string' || !Array.isArray(video.tags)) return null;
        const cardClone = videoCardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('article');
        if (!cardElement) return null;
        if (cardElement.hasAttribute('class_exists')) { cardElement.setAttribute('class', cardElement.getAttribute('class_exists')); cardElement.removeAttribute('class_exists'); }
        const innerElementsWithClassExists = cardElement.querySelectorAll('[class_exists]');
        innerElementsWithClassExists.forEach(el => { if (el.hasAttribute('class_exists')) { el.setAttribute('class', el.getAttribute('class_exists')); el.removeAttribute('class_exists'); } });
        const sanitizedTitle = escapeHTML(video.title);
        const videoLink = `https://www.youtube.com/watch?v=${video.id}`;
        const thumbnailImgElement = cardElement.querySelector('.video-thumbnail-img');
        const playButtonElement = cardElement.querySelector('.play-video-button');
        const videoThumbnailContainer = cardElement.querySelector('.video-thumbnail-container');
        const durationElement = cardElement.querySelector('.video-duration');
        if (thumbnailImgElement && video.thumbnail) { thumbnailImgElement.src = video.thumbnail; thumbnailImgElement.alt = `תמונה ממוזערת של הסרטון: ${sanitizedTitle}`; thumbnailImgElement.classList.remove('hidden'); thumbnailImgElement.onerror = function () { this.classList.add('hidden'); if (videoThumbnailContainer) videoThumbnailContainer.classList.add('bg-slate-200', 'dark:bg-slate-700'); }; }
        else if (thumbnailImgElement) { thumbnailImgElement.classList.add('hidden'); if (videoThumbnailContainer) videoThumbnailContainer.classList.add('bg-slate-200', 'dark:bg-slate-700');}
        if (durationElement && video.duration) durationElement.textContent = escapeHTML(video.duration);
        else if (durationElement) durationElement.classList.add('hidden');
        if (playButtonElement) { playButtonElement.dataset.videoId = video.id; playButtonElement.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);}
        const iframeEl = cardElement.querySelector('.video-iframe');
        if (iframeEl) { iframeEl.title = `נגן וידאו: ${sanitizedTitle}`; iframeEl.setAttribute('loading', 'lazy');}
        const videoTitleLinkEl = cardElement.querySelector('.video-link');
        if (videoTitleLinkEl) { videoTitleLinkEl.href = videoLink; videoTitleLinkEl.textContent = sanitizedTitle;}
        const channelLogoElement = cardElement.querySelector('.channel-logo');
        const channelNameElement = cardElement.querySelector('.channel-name');
        if (channelNameElement && video.channel) channelNameElement.textContent = escapeHTML(video.channel);
        else if (channelNameElement) channelNameElement.textContent = '';
        if (channelLogoElement && video.channelImage) { channelLogoElement.src = video.channelImage; channelLogoElement.alt = `לוגו הערוץ ${escapeHTML(video.channel || 'לא ידוע')}`; channelLogoElement.classList.remove('hidden'); channelLogoElement.onerror = function() { this.classList.add('hidden'); }; }
        else if (channelLogoElement) channelLogoElement.classList.add('hidden');
        const tagsContainerEl = cardElement.querySelector('.video-tags');
        if (tagsContainerEl) { if (video.tags && video.tags.length > 0) tagsContainerEl.innerHTML = video.tags.map(tag => `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-xs font-medium px-2 py-0.5 rounded-md">${escapeHTML(capitalizeFirstLetter(tag))}</span>`).join(''); else tagsContainerEl.innerHTML = '';}
        const categoryDisplayEl = cardElement.querySelector('.video-category-display');
        if (categoryDisplayEl) { const categoryData = PREDEFINED_CATEGORIES.find(c => c.id === video.category); const categoryName = categoryData ? categoryData.name : capitalizeFirstLetter(video.category); const iconElement = categoryDisplayEl.querySelector('i'); categoryDisplayEl.innerHTML = ''; if (iconElement) categoryDisplayEl.appendChild(iconElement.cloneNode(true)); categoryDisplayEl.appendChild(document.createTextNode(` ${escapeHTML(categoryName)}`));}
        return cardElement;
    }

    function renderFilteredVideos(loadMore = false) {
        if (!videoCardsContainer) return;

        const allMatchingVideos = getFilteredVideos();
        let videosToRender;

        if (loadMore) {
            const nextVideosToShow = currentlyDisplayedVideosCount + videosToLoadMore;
            videosToRender = allMatchingVideos.slice(currentlyDisplayedVideosCount, nextVideosToShow);
            currentlyDisplayedVideosCount = Math.min(nextVideosToShow, allMatchingVideos.length);
        } else {
            videoCardsContainer.innerHTML = ''; 
            videosToRender = allMatchingVideos.slice(0, videosToShowInitially);
            currentlyDisplayedVideosCount = videosToRender.length;
        }

        let feedbackEl = document.getElementById('video-grid-loading-feedback');
        if (!feedbackEl) { feedbackEl = document.createElement('div'); feedbackEl.id = 'video-grid-loading-feedback'; feedbackEl.setAttribute('aria-live', 'polite'); feedbackEl.className = 'sr-only'; if (videoCardsContainer.parentNode) videoCardsContainer.parentNode.appendChild(feedbackEl); }

        if (allMatchingVideos.length === 0 && !loadMore) {
            if (noVideosFoundMessage) { noVideosFoundMessage.classList.remove('hidden'); noVideosFoundMessage.innerHTML = `<div class="col-span-full text-center text-slate-500 dark:text-slate-400 py-16"><i class="fas fa-video-slash fa-4x mb-6 text-purple-400 dark:text-purple-500"></i><p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p><p class="text-lg">נסה לשנות את הסינון או מונח החיפוש.</p></div>`; feedbackEl.textContent = "לא נמצאו סרטונים התואמים לסינון."; }
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) loadingPlaceholder.classList.add('hidden');
            removeLoadMoreButton();
            return;
        }

        if (!loadMore) { 
          if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
          if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) loadingPlaceholder.classList.add('hidden');
        }
        
        if (videosToRender.length === 0 && loadMore) {
            removeLoadMoreButton(); 
            return;
        }
        
        const fragment = document.createDocumentFragment();
        videosToRender.forEach((video) => { const cardElement = createVideoCardElement(video); if (cardElement) fragment.appendChild(cardElement); });
        videoCardsContainer.appendChild(fragment); 

        feedbackEl.textContent = `מוצגים ${currentlyDisplayedVideosCount} מתוך ${allMatchingVideos.length} סרטונים תואמים.`;
        updateLoadMoreButton(allMatchingVideos.length); 
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
                if (videoCardsContainer && videoCardsContainer.parentNode) {
                    videoCardsContainer.parentNode.insertBefore(loadMoreBtn, videoCardsContainer.nextSibling);
                }
            }
            loadMoreBtn.classList.remove('hidden');
        } else {
            if (loadMoreBtn) {
                loadMoreBtn.classList.add('hidden'); 
            }
        }
    }

    function removeLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-videos-btn');
        if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
    }

    function renderSelectedTagsChips() { 
        if (!selectedTagsContainer) return;
        selectedTagsContainer.innerHTML = '';
        currentFilters.tags.forEach(tagName => {
            const tagChip = document.createElement('span');
            tagChip.className = 'flex items-center gap-1.5 bg-purple-600 text-white dark:bg-purple-500 dark:text-white text-sm font-medium ps-3 pe-2 py-1.5 rounded-full cursor-default transition-all hover:bg-purple-700 dark:hover:bg-purple-600';
            const textNode = document.createTextNode(escapeHTML(capitalizeFirstLetter(tagName)));
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'text-xs opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none';
            removeButton.innerHTML = `<i class="fas fa-times"></i>`;
            removeButton.setAttribute('aria-label', `הסר תגית ${escapeHTML(capitalizeFirstLetter(tagName))}`);
            removeButton.onclick = () => { const popularTagEl = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(tagName)}"]`) : null; toggleTagSelection(tagName, popularTagEl); };
            tagChip.appendChild(textNode);
            tagChip.appendChild(removeButton);
            selectedTagsContainer.appendChild(tagChip);
        });
    }

    function getFilteredVideos() { 
        if (!allVideos || allVideos.length === 0) return [];
        let videosToFilter = allVideos;

        if (currentFilters.category !== 'all') {
            videosToFilter = videosToFilter.filter(video => video.category.toLowerCase() === currentFilters.category.toLowerCase());
        }

        if (currentFilters.searchTerm && fuse) { 
            const fuseInstanceForSearch = (currentFilters.category !== 'all') ? new Fuse(videosToFilter, fuse.options) : fuse;
            const fuseResults = fuseInstanceForSearch.search(currentFilters.searchTerm);
            videosToFilter = fuseResults.map(result => result.item);
        }
        
        return videosToFilter.filter(video => {
            const tagsMatch = currentFilters.tags.length === 0 || currentFilters.tags.every(filterTag => video.tags.map(t => t.toLowerCase()).includes(filterTag.toLowerCase()));
            const hebrewContentMatch = !currentFilters.hebrewOnly || video.hebrewContent;
            return tagsMatch && hebrewContentMatch; 
        });
    }

    function clearSearchSuggestions() { 
        if (currentSuggestionsContainer) {
            const suggestionsList = currentSuggestionsContainer.querySelector('ul');
            if (suggestionsList) suggestionsList.innerHTML = '';
            currentSuggestionsContainer.classList.add('hidden');
        }
        activeSuggestionIndex = -1;
    }

    function resetSearch(inputElement) {
        if (!inputElement) return;
        inputElement.value = '';
        currentFilters.searchTerm = ''; 
        
        if (inputElement.id.startsWith('desktop-search')) currentSuggestionsContainer = desktopSearchSuggestions;
        else if (inputElement.id.startsWith('mobile-search')) currentSuggestionsContainer = mobileSearchSuggestions;
        else if (inputElement.id.startsWith('main-content-search')) currentSuggestionsContainer = mainContentSearchSuggestions;
        else currentSuggestionsContainer = null;
        
        clearSearchSuggestions();
        renderFilteredVideos(false); 
    }

    function handleSearchInputEvent(event) {
        currentSearchInput = event.target;
        const searchTerm = currentSearchInput.value.trim();

        if (currentSearchInput.id.startsWith('desktop-search')) currentSuggestionsContainer = desktopSearchSuggestions;
        else if (currentSearchInput.id.startsWith('mobile-search')) currentSuggestionsContainer = mobileSearchSuggestions;
        else if (currentSearchInput.id.startsWith('main-content-search')) currentSuggestionsContainer = mainContentSearchSuggestions;
        else currentSuggestionsContainer = null;

        if (searchTerm === '') {
            if (currentFilters.searchTerm !== '') { 
                currentFilters.searchTerm = ''; 
                clearSearchSuggestions(); 
                renderFilteredVideos(false); 
            } else {
                 if(currentSuggestionsContainer && !currentSuggestionsContainer.classList.contains('hidden')){
                       clearSearchSuggestions();
                 }
            }
        } else {
            currentFilters.searchTerm = searchTerm;
            displaySearchSuggestions(searchTerm);
        }
    }
    
    function handleSearchKeyDown(event) { 
        if (!currentSuggestionsContainer || currentSuggestionsContainer.classList.contains('hidden')) {
            return;
        }
        const suggestionsList = currentSuggestionsContainer.querySelector('ul');
        const items = suggestionsList ? Array.from(suggestionsList.querySelectorAll('li')) : [];
        if (items.length === 0 && event.key !== 'Escape') return; 
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (items.length > 0) { activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length; updateActiveSuggestionVisuals(items); }
                break;
            case 'ArrowUp':
                event.preventDefault();
                 if (items.length > 0) { activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length; updateActiveSuggestionVisuals(items); }
                break;
            case 'Enter':
                event.preventDefault();
                if (activeSuggestionIndex > -1 && items[activeSuggestionIndex]) {
                    items[activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                } else { 
                    if (currentSearchInput) { 
                        renderFilteredVideos(false); 
                        clearSearchSuggestions(); 
                        currentSearchInput.blur(); 
                        if (currentFilters.searchTerm) scrollToVideoGridIfNeeded(); 
                    }
                }
                break;
            case 'Escape':
                event.preventDefault();
                clearSearchSuggestions();
                if (currentSearchInput) currentSearchInput.blur();
                break;
        }
    }

    function updateActiveSuggestionVisuals(items) { 
        items.forEach((item, index) => {
            if (index === activeSuggestionIndex) { item.classList.add('bg-purple-100', 'dark:bg-slate-600'); item.scrollIntoView({ block: 'nearest' }); }
            else { item.classList.remove('bg-purple-100', 'dark:bg-slate-600'); }
        });
    }

    function setupEventListeners() {
        darkModeToggles.forEach(toggle => toggle.addEventListener('click', toggleDarkMode));
        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link, #site-footer a, header nav a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.startsWith('#') || href === 'index.html' || href === './' || href === '/' || href.startsWith('index.html#'))) link.addEventListener('click', handleNavLinkClick);
        });
        if (hebrewFilterToggle) hebrewFilterToggle.addEventListener('change', function () {
            currentFilters.hebrewOnly = this.checked;
            renderFilteredVideos(false); 
            scrollToVideoGridIfNeeded();
            if(currentSearchInput) clearSearchSuggestions();
        });
        if (popularTagsContainer) popularTagsContainer.addEventListener('click', function (event) {
            const clickedTagElement = event.target.closest('button.tag');
            if (clickedTagElement && clickedTagElement.dataset.tagValue) {
                toggleTagSelection(clickedTagElement.dataset.tagValue, clickedTagElement);
                if(currentSearchInput) clearSearchSuggestions();
            }
        });
        if (customTagForm) customTagForm.addEventListener('submit', function (event) {
            event.preventDefault();
            if (!tagSearchInput) return;
            const newTagName = tagSearchInput.value.trim().toLowerCase();
            if (newTagName) { 
                 const existingPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(newTagName)}"]`) : null;
                 toggleTagSelection(newTagName, existingPopularTag); 
            }
            tagSearchInput.value = '';
            if(currentSearchInput) clearSearchSuggestions();
        });

        const allSearchInputs = [desktopSearchInput, mobileSearchInput, mainContentSearchInput].filter(Boolean);
        allSearchInputs.forEach(input => {
            input.addEventListener('input', handleSearchInputEvent);
            input.addEventListener('search', (event) => { 
                if (event.target.value === '') {
                    resetSearch(event.target); 
                }
            });
            input.addEventListener('keydown', handleSearchKeyDown);
            input.addEventListener('focus', (event) => {
                isSuggestionClicked = false;
                currentSearchInput = event.target;
                if (currentSearchInput.id.startsWith('desktop-search')) currentSuggestionsContainer = desktopSearchSuggestions;
                else if (currentSearchInput.id.startsWith('mobile-search')) currentSuggestionsContainer = mobileSearchSuggestions;
                else if (currentSearchInput.id.startsWith('main-content-search')) currentSuggestionsContainer = mainContentSearchSuggestions;
                if (event.target.value.trim().length >= MIN_SEARCH_TERM_LENGTH) displaySearchSuggestions(event.target.value.trim());
                else clearSearchSuggestions();
            });
            input.addEventListener('blur', () => {
                setTimeout(() => { if (!isSuggestionClicked) clearSearchSuggestions(); }, 150);
            });
        });

        const allSearchForms = [desktopSearchForm, mobileSearchForm, mainContentSearchForm].filter(Boolean);
        allSearchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const inputForForm = form.querySelector('input[type="search"]');
                if (inputForForm && inputForForm.value.trim() !== '') {
                    currentFilters.searchTerm = inputForForm.value.trim().toLowerCase();
                    renderFilteredVideos(false); 
                    clearSearchSuggestions();
                    inputForForm.blur();
                    if (currentFilters.searchTerm) scrollToVideoGridIfNeeded();
                } else if (inputForForm) {
                    resetSearch(inputForForm);
                }
            });
        });

        if (videoCardsContainer) videoCardsContainer.addEventListener('click', function (event) {
            const playButton = event.target.closest('.play-video-button');
            if (playButton) handlePlayVideo(playButton);
        });
        if (backToTopButton) {
            window.addEventListener('scroll', toggleBackToTopButtonVisibility);
            backToTopButton.addEventListener('click', scrollToTop);
        }
        document.addEventListener('click', function (event) {
            if (currentSearchInput && currentSuggestionsContainer) {
                const isClickInsideSearchInput = currentSearchInput.contains(event.target);
                const isClickInsideSuggestions = currentSuggestionsContainer.contains(event.target);
                if (!isClickInsideSearchInput && !isClickInsideSuggestions && !isSuggestionClicked) clearSearchSuggestions();
            }
        });
    }
    
    function openMobileMenu() { 
        if (mobileMenu) mobileMenu.classList.remove('translate-x-full');
        if (backdrop) {
            backdrop.classList.remove('invisible', 'opacity-0');
            backdrop.classList.add('visible', 'opacity-100');
        }
        bodyElement.classList.add('overflow-hidden', 'md:overflow-auto');
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'true');
    }
    function closeMobileMenu() { 
        if (mobileMenu) mobileMenu.classList.add('translate-x-full');
        if (backdrop) {
            backdrop.classList.remove('visible', 'opacity-100');
            backdrop.classList.add('invisible', 'opacity-0');
        }
        bodyElement.classList.remove('overflow-hidden', 'md:overflow-auto');
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'false');
    }
    function handleNavLinkClick(event) { 
        const link = event.currentTarget;
        let href = link.getAttribute('href');

        if (href.startsWith('index.html#') && isHomePage()) {
            href = href.substring(href.indexOf('#'));
        }

        if (link.closest('#mobile-menu')) {
            setTimeout(closeMobileMenu, 150);
        }

        if (link.closest('header nav')) {
            document.querySelectorAll('header nav .nav-link').forEach(lnk => {
                lnk.classList.remove('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold', 'bg-purple-100', 'dark:bg-purple-500/20');
            });
            link.classList.add('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold', 'bg-purple-100', 'dark:bg-purple-500/20');
        }

        if (href && href.startsWith('#')) {
            event.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerElement = document.querySelector('header.sticky');
                const headerOffset = headerElement ? headerElement.offsetHeight + 20 : 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        } else if (href === 'index.html' || href === './' || href === '/') {
            if (isHomePage()) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }
    function toggleTagSelection(tagName, tagElement) { 
        const index = currentFilters.tags.indexOf(tagName);
        const activeClasses = ['active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500', 'dark:text-white', 'hover:bg-purple-700', 'dark:hover:bg-purple-600'];
        const inactiveClasses = ['bg-purple-100', 'text-purple-700', 'dark:bg-purple-800', 'dark:text-purple-200', 'hover:bg-purple-200', 'dark:hover:bg-purple-700'];

        if (index > -1) {
            currentFilters.tags.splice(index, 1);
            if (tagElement) {
                tagElement.classList.remove(...activeClasses);
                tagElement.classList.add(...inactiveClasses);
            }
        } else {
            currentFilters.tags.push(tagName);
            if (tagElement) {
                tagElement.classList.remove(...inactiveClasses);
                tagElement.classList.add(...activeClasses);
            }
        }
        renderSelectedTagsChips();
        renderFilteredVideos(false); 
        scrollToVideoGridIfNeeded();
    }
    function handlePlayVideo(buttonElement) { 
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article');
        if (!videoCard) return;

        const iframe = videoCard.querySelector('.video-iframe');
        const playIconContainer = buttonElement;

        if (iframe && videoId) {
            const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&enablejsapi=1&origin=${window.location.origin}`;
            iframe.src = videoSrc;
            iframe.classList.remove('hidden');
            if (playIconContainer) playIconContainer.style.display = 'none';
        }
    }
    function scrollToVideoGridIfNeeded() { 
        const videoGridSection = document.getElementById('video-grid-section');
        if (videoGridSection) {
            const rect = videoGridSection.getBoundingClientRect();
            if (rect.top < 0 || rect.top > window.innerHeight * 0.66) {
                const headerElement = document.querySelector('header.sticky');
                const headerOffset = headerElement ? headerElement.offsetHeight + 20 : 80;
                const elementPosition = rect.top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        }
    }
    function toggleBackToTopButtonVisibility() { 
        if (backToTopButton) {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.remove('opacity-0', 'invisible');
                backToTopButton.classList.add('opacity-100', 'visible');
            } else {
                backToTopButton.classList.remove('opacity-100', 'visible');
                backToTopButton.classList.add('opacity-0', 'invisible');
            }
        }
    }
    function scrollToTop() { 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function updateFooterYear() { 
        if (currentYearFooter) currentYearFooter.textContent = new Date().getFullYear();
    }
    function escapeHTML(str) { 
        if (str === null || typeof str === 'undefined') return '';
        if (typeof str !== 'string') str = String(str);
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }
    function escapeAttributeValue(value) { 
        return String(value).replace(/"/g, '"');
    }
    function capitalizeFirstLetter(string) { 
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    initializePage();
});

function extractYouTubeVideoId(url) {
    if (!url) return null;
    let videoId = null;
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/|attribution_link\?a=.*&u=\%2Fwatch\%3Fv\%3D)([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/oembed\?url=.*watch%3Fv%3D([\w-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            videoId = match[1];
            break;
        }
    }
    return videoId;
}

async function checkVideoIdDirectlyFromFile(videoIdToCheck) {
    if (!videoIdToCheck) {
        return { exists: false, message: "לא סופק ID לבדיקה." };
    }
    try {
        const response = await fetch('data/videos.json'); 
        if (!response.ok) {
            throw new Error(`שגיאת HTTP ${response.status} בטעינת קובץ הנתונים ודא שהקובץ זמין בנתיב הנכון.`);
        }
        const videosFromFile = await response.json();
        if (!Array.isArray(videosFromFile)) {
            throw new Error("המידע בקובץ videos.json אינו מערך תקין.");
        }

        const foundVideo = videosFromFile.find(video => video.id === videoIdToCheck);
        if (foundVideo) {
            return { 
                exists: true, 
                message: `הסרטון עם ID: ${videoIdToCheck} (עם הכותרת: "${foundVideo.title}") כבר קיים במאגר.` 
            };
        } else {
            return { 
                exists: false, 
                message: `הסרטון עם ID: ${videoIdToCheck} עדיין אינו קיים במאגר .` 
            };
        }
    } catch (error) {
        console.error("שגיאה בבדיקת ID מול הקובץ:", error);
        return { 
            exists: false, 
            message: `שגיאה בבדיקת ID מול הקובץ: ${error.message}` 
        };
    }
}

async function promptAndCheckVideoIdFromFile() {
    console.log("promptAndCheckVideoIdFromFile called"); 
    const userInput = prompt("הכנס קישור לסרטון יוטיוב לבדיקה עם קיים כבר במאגר:");

    if (userInput === null || userInput.trim() === "") {
        return;
    }

    const videoId = extractYouTubeVideoId(userInput);

    if (videoId) {
        const result = await checkVideoIdDirectlyFromFile(videoId);        
        alert(result.message + (result.exists ? "" : " אפשר להוסיף!"));
    } else {
        alert("לא זוהה ID תקין של סרטון יוטיוב מהקישור שהוכנס.");
    }
}

function handleHashChangeForCheckerTool() {
    console.log("hashchange event fired. Current hash:", window.location.hash);
    if (window.location.hash === '#check-yt-id') { 
        console.log("Hash #check-yt-id detected by hashchange event. Launching tool...");
        promptAndCheckVideoIdFromFile(); 
    }
}

async function activateCheckerTool() {
    console.log("activateCheckerTool called by click"); 
    if (window.location.hash === '#check-yt-id') {
        await promptAndCheckVideoIdFromFile();
    } else {
        window.location.hash = '#check-yt-id';
    }
}

function setupEventListeners() {
    const checkIdLinkFooter = document.getElementById('check-yt-id-link');
    if (checkIdLinkFooter) {
        checkIdLinkFooter.addEventListener('click', function(event) {
            event.preventDefault(); 
            activateCheckerTool();
        });
    }
    window.addEventListener('hashchange', handleHashChangeForCheckerTool, false);
}

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();      
         handleHashChangeForCheckerTool();
});

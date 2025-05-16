// js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
    // const categoriesWrapper = document.getElementById('categories-wrapper'); // כבר לא בשימוש אם אין Swiper לקטגוריות
    const popularTagsContainer = document.getElementById('popular-tags-container');
    const tagSearchInput = document.getElementById('tag-search-input');
    const customTagForm = document.getElementById('custom-tag-form');
    const selectedTagsContainer = document.getElementById('selected-tags-container');
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const desktopSearchForm = document.getElementById('desktop-search-form');
    const mobileSearchForm = document.getElementById('mobile-search-form');
    const themeToggleButton = document.getElementById('theme-toggle');
    const videoCardTemplate = document.getElementById('video-card-template');
    const homepageCategoriesGrid = document.getElementById('homepage-categories-grid'); // ללחצני קטגוריות בדף הבית

    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: ''
    };
    const MAX_POPULAR_TAGS = 30;
    // let swiperInstance = null; // כבר לא בשימוש אם אין Swiper לקטגוריות

    // הגדרות קבועות לקטגוריות (לשימוש גם בדף הבית וגם בדף הקטגוריה)
    const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" }, // לא יוצג ככפתור בדף הבית
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600 dark:from-green-600 dark:to-teal-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700" },
        { id: "collectors", name: "רכבי אספנות", description: "קלאסיקות ופנינים מוטוריות", icon: "fa-car-side", gradient: "from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600 dark:from-yellow-600 dark:to-amber-700" },
        { id: "troubleshooting", name: "איתור תקלות", description: "פתרון בעיות נפוצות", icon: "fa-microscope", gradient: "from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-700" },
    ];


    // --- Theme Management ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-sun text-xl text-yellow-400 dark:text-yellow-300"></i>';
        } else {
            document.documentElement.classList.remove('dark');
            if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-moon text-xl text-purple-600 dark:text-purple-400"></i>';
        }
    }

    function toggleTheme() {
        const isDarkMode = document.documentElement.classList.contains('dark');
        const newTheme = isDarkMode ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    // --- Initialization ---
    async function initializePage() {
        console.log("CAR-טיב: Initializing page...");
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        setupEventListeners();
        
        const categoryFromURL = getCategoryFromURL();

        try {
            await loadLocalVideos(); 
            
            if (allVideos && allVideos.length > 0) {
                console.log("CAR-טיב: Videos loaded, proceeding with dependent renders.");
                if (isHomePage()) {
                    if (homepageCategoriesGrid) { // בדוק אם האלמנט קיים
                        renderHomepageCategoryButtons();
                    }
                    currentFilters.category = 'all'; 
                    loadAndRenderPopularTags(null);
                } else if (categoryFromURL) {
                    currentFilters.category = categoryFromURL;
                    console.log("CAR-טיב: Category set from URL parameter:", categoryFromURL);
                    updateCategoryPageTitleAndBreadcrumbs(categoryFromURL);
                    loadAndRenderPopularTags(categoryFromURL);
                } else {
                    currentFilters.category = 'all'; // ברירת מחדל אם לא דף בית ולא דף קטגוריה מזוהה
                }
                renderFilteredVideos();
            } else {
                 console.warn("CAR-טיב: No videos loaded from data source or data source is empty.");
                 if(loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                    loadingPlaceholder.innerHTML = 'לא נטענו סרטונים. בדוק את קובץ הנתונים `data/videos.json`.';
                 }
                 if(noVideosFoundMessage && (noVideosFoundMessage.classList.contains("hidden"))) {
                    noVideosFoundMessage.classList.remove('hidden');
                 }
                 if(popularTagsContainer) popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
            }
        } catch (error) {
            console.error("CAR-טיב: Critical error during page initialization:", error);
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                 loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה קריטית בטעינת נתוני הסרטונים.`;
            }
            if (noVideosFoundMessage && (noVideosFoundMessage.classList.contains("hidden"))) noVideosFoundMessage.classList.remove('hidden');
        }
        
        updateFooterYear();
        console.log("CAR-טיב: Page initialization complete.");
    }

    function isHomePage() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        return !params.has('name') && (path.endsWith('/') || path.endsWith('index.html') || path === '');
    }

    function getCategoryFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name');
    }

    function updateCategoryPageTitleAndBreadcrumbs(categoryId) {
        const categoryData = PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const categoryName = categoryData ? categoryData.name : categoryId;
        const categoryIcon = categoryData ? categoryData.icon : 'fa-folder-open'; // ברירת מחדל אם אין אייקון מוגדר

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
        if (homepageCategoriesSection) {
            homepageCategoriesSection.style.display = 'none'; // הסתר את קטע הקטגוריות של דף הבית
        }
    }


    // --- Data Loading (Simplified - directly from local JSON) ---
    async function loadLocalVideos() {
        console.log("CAR-טיב: Attempting to load videos from 'data/videos.json' (local only)...");
        if (loadingPlaceholder) {
            loadingPlaceholder.classList.remove('hidden');
            loadingPlaceholder.innerHTML = `<i class="fas fa-spinner fa-spin fa-2x mb-3"></i><br>טוען סרטונים...`;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        try {
            const response = await fetch('data/videos.json'); 
            console.log("CAR-טיב: Fetch response status for videos.json:", response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for videos.json. URL: ${response.url}`);
            }
            const responseText = await response.text();
            try {
                allVideos = JSON.parse(responseText);
                if (!Array.isArray(allVideos)) {
                    console.error("CAR-טיב: Parsed JSON from videos.json is not an array. Received:", allVideos);
                    allVideos = []; 
                    throw new Error("Parsed JSON is not an array.");
                }
                // ודא שלכל סרטון יש את השדות הבסיסיים הנדרשים (id ו-title מה-JSON הרזה)
                allVideos.forEach((video, index) => {
                    if (typeof video.id === 'undefined' || typeof video.title === 'undefined') {
                        console.warn(`CAR-טיב: Video at index ${index} in JSON is missing 'id' or 'title'. It will be skipped. Data:`, video);
                    }
                });

            } catch (jsonError) {
                console.error("CAR-טיב: Error parsing JSON from videos.json:", jsonError);
                console.error("CAR-טיב: Received text that failed to parse (first 500 chars):", responseText.substring(0, 500) + "...");
                allVideos = []; 
                throw new Error(`Invalid JSON format in videos.json. ${jsonError.message}`);
            }

            console.log(`CAR-טיב: Videos loaded successfully from local JSON: ${allVideos.length} videos. Example:`, allVideos.length > 0 ? allVideos[0] : "Empty array");
            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');
        } catch (error) {
            console.error("CAR-טיב: Could not load or parse videos.json:", error);
            if (loadingPlaceholder) {
                loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת קובץ הסרטונים. ודא שהקובץ 'data/videos.json' קיים, הנתיב נכון, והתוכן הוא JSON תקין.`;
                loadingPlaceholder.classList.remove('hidden');
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = [];
        }
    }
    
    // --- Homepage Categories Buttons ---
    function renderHomepageCategoryButtons() {
        console.log("CAR-טיב: Rendering homepage category buttons...");
        const loadingCategoriesPlaceholder = document.getElementById('loading-homepage-categories');

        if (!homepageCategoriesGrid) {
            console.warn("CAR-טיב: Homepage categories grid container ('#homepage-categories-grid') not found.");
            if(loadingCategoriesPlaceholder) loadingCategoriesPlaceholder.textContent = "שגיאה: מיכל הקטגוריות לא נמצא.";
            return;
        }

        if (loadingCategoriesPlaceholder) loadingCategoriesPlaceholder.style.display = 'none';
        homepageCategoriesGrid.innerHTML = ''; 

        PREDEFINED_CATEGORIES.filter(cat => cat.id !== 'all').forEach(cat => {
            const link = document.createElement('a');
            link.href = `category.html?name=${cat.id}`; 
            link.className = `category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${cat.gradient || 'from-slate-500 to-slate-600'} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white`;
            link.setAttribute('aria-label', `עבור לקטגוריית ${cat.name}`);
            
            link.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]">
                    <i class="fas ${cat.icon || 'fa-folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                    <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 transition-colors">${escapeHTML(cat.name)}</h3>
                    <p class="text-sm opacity-80 mt-1 px-2">${escapeHTML(cat.description)}</p>
                </div>
            `;
            homepageCategoriesGrid.appendChild(link);
        });
        console.log("CAR-טיב: Homepage category buttons rendered.");
    }


    // --- Popular Tags ---
    function loadAndRenderPopularTags(forCategoryId = null) {
        console.log(`CAR-טיב: Loading and rendering popular tags ${forCategoryId ? 'for category ' + forCategoryId : 'globally'}...`);
        if (!popularTagsContainer) { /* ... (בדיקה) ... */ return; }
        if (!allVideos || allVideos.length === 0) { /* ... (בדיקה) ... */ return; }

        const tagCounts = {};
        const videosToConsider = forCategoryId && forCategoryId !== 'all' 
            ? allVideos.filter(v => v.category === forCategoryId) 
            : allVideos;
        
        if (videosToConsider.length === 0 && forCategoryId && forCategoryId !== 'all') {
             popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">אין סרטונים בקטגוריה זו כדי להציג תגיות.</p>`;
             return;
        }

        videosToConsider.forEach(video => {
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => {
                    const normalizedTag = String(tag).trim();
                    if(normalizedTag) tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a],[,b]) => b - a)
            .slice(0, MAX_POPULAR_TAGS)
            .map(([tag]) => tag);

        popularTagsContainer.innerHTML = '';
        if (sortedTags.length === 0) {
            popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות${forCategoryId && forCategoryId !== 'all' ? ' לקטגוריה זו' : ''}.</p>`;
            return;
        }

        sortedTags.forEach(tag => {
            const tagElement = document.createElement('button');
            tagElement.className = 'tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-slate-700 dark:text-purple-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5';
            tagElement.dataset.tagValue = tag;
            const iconClass = getIconForTag(tag);
            tagElement.innerHTML = `<i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(tag)}`;
            popularTagsContainer.appendChild(tagElement);
        });
        console.log("CAR-טיב: Popular tags rendered:", sortedTags.length);
    }
    
    function getIconForTag(tag) {
        const tagIcons = {
            "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "חשמל": "fa-bolt",
            "טסלה": "fa-leaf", "סקירה": "fa-search", "טיפול": "fa-wrench",
            "שטח": "fa-mountain", "קלאסי": "fa-car-side", 
            "רכבי אספנות": "fa-car-alt", "מוסטנג": "fa-horse-head",
        };
        return tagIcons[String(tag).toLowerCase()] || "fa-tag";
    }

    // --- Rendering Videos (מותאם ל-JSON רזה) ---
    function renderFilteredVideos() {
        console.log("CAR-טיב: Rendering filtered videos (lean JSON mode) with current filters:", JSON.parse(JSON.stringify(currentFilters)));
        if (!videoCardsContainer) { /* ... */ return; }
        if (!videoCardTemplate) { /* ... */ return; }

        videoCardsContainer.innerHTML = '';
        const filteredVideos = getFilteredVideos();
        console.log(`CAR-טיב: Found ${filteredVideos.length} videos after applying filters. Example:`, filteredVideos.length > 0 ? filteredVideos[0] : "N/A");

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        
        console.log(`CAR-טיב: Starting to render ${filteredVideos.length} video cards (lean mode)...`);

        filteredVideos.forEach((video, index) => {
            try {
                if (!video || typeof video.id === 'undefined' || typeof video.title === 'undefined' || 
                    typeof video.category === 'undefined' || !Array.isArray(video.tags)
                    // שאר השדות כבר לא חובה אם הם לא ב-JSON הרזה
                    ) {
                    console.warn(`CAR-טיב: Skipping video at index ${index} due to missing essential data (id, title, category, tags) in lean JSON. Video data:`, video);
                    return;
                }

                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                
                if (!cardElement) { /* ... */ return; }

                cardElement.querySelectorAll('[class_exists]').forEach(el => {
                    el.setAttribute('class', el.getAttribute('class_exists'));
                    el.removeAttribute('class_exists');
                });
                
                cardElement.dataset.category = video.category;
                cardElement.dataset.tags = video.tags.join(',');

                const sanitizedTitle = escapeHTML(video.title);
                const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

                const thumbnailImg = cardElement.querySelector('.thumbnail-image');
                if (thumbnailImg) {
                    thumbnailImg.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                    thumbnailImg.alt = `תמונה ממוזערת: ${sanitizedTitle}`;
                }
                
                const playButton = cardElement.querySelector('.play-video-button');
                if (playButton) {
                    playButton.dataset.videoId = video.id;
                    playButton.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);
                }

                const iframeEl = cardElement.querySelector('.video-iframe');
                if (iframeEl) iframeEl.title = sanitizedTitle;
                
                const videoTitleLinkEl = cardElement.querySelector('.video-link');
                if (videoTitleLinkEl) {
                    videoTitleLinkEl.href = videoLink;
                    videoTitleLinkEl.textContent = sanitizedTitle;
                }
                
                const tagsContainerEl = cardElement.querySelector('.video-tags');
                if (tagsContainerEl) {
                    tagsContainerEl.innerHTML = video.tags.map(tag => 
                        `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-slate-600 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(String(tag))}</span>`
                    ).join('');
                }

                const categoryDisplayEl = cardElement.querySelector('.video-category-display');
                if (categoryDisplayEl) {
                    const categoryData = PREDEFINED_CATEGORIES.find(c => c.id === video.category);
                    const categoryName = categoryData ? categoryData.name : video.category;
                    const categoryIcon = categoryData ? categoryData.icon : 'fa-folder-open';
                    categoryDisplayEl.innerHTML = `<i class="fas ${categoryIcon} ml-1 opacity-70"></i> ${escapeHTML(categoryName)}`;
                }
                
                videoCardsContainer.appendChild(cardElement);

            } catch (e) {
                console.error(`CAR-טיב: Error rendering card for video ID: ${video.id}`, e, video);
            }
        });
        console.log(`CAR-טיב: Finished appending cards (lean mode). videoCardsContainer child count: ${videoCardsContainer.children.length}`);
    }
    
    // --- handlePlayVideo, renderSelectedTagsChips, escapeAttributeValue (כמו קודם) ---
    function handlePlayVideo(buttonElement) { /* ... (כמו בקוד הקודם) ... */ }
    function renderSelectedTagsChips() { /* ... (כמו בקוד הקודם) ... */ }
    function escapeAttributeValue(value) { /* ... (כמו בקוד הקודם) ... */ }

    // --- Filtering Logic (מותאם ל-JSON רזה) ---
    function getFilteredVideos() {
        if (!allVideos || allVideos.length === 0) return [];

        return allVideos.filter(video => {
            if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || 
                typeof video.category !== 'string' || !Array.isArray(video.tags)) {
                return false; 
            }

            const category = video.category.toLowerCase();
            const videoTitle = video.title.toLowerCase();
            const videoTags = video.tags.map(t => String(t).toLowerCase());

            const categoryMatch = currentFilters.category === 'all' || category === currentFilters.category.toLowerCase();
            
            const filterTags = currentFilters.tags.map(t => String(t).toLowerCase());
            const tagsMatch = filterTags.length === 0 || filterTags.every(filterTag => videoTags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm && currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = videoTitle.includes(term) || // חפש רק בכותרת
                    videoTags.some(tag => tag.includes(term)); // ובתגיות
            }
            return categoryMatch && tagsMatch && searchTermMatch;
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("CAR-טיב: Setting up event listeners...");
        if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);

        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link').forEach(link => {
            link.addEventListener('click', () => setTimeout(closeMobileMenu, 150));
        });

        // ה-Event listener לקטגוריות ה-Swiper כבר לא רלוונטי אם החלפנו אותו
        // אם יש לך עדיין Swiper במקום אחר, תשנה את הסלקטור בהתאם
        // const categoryButtonsContainer = document.querySelector('#categories-wrapper'); // לדוגמה, אם זה היה שם
        // if (categoryButtonsContainer) { /* ... לוגיקה ישנה ... */ }
        
        if (popularTagsContainer) { /* ... (כמו קודם) ... */ }
        if (customTagForm) { /* ... (כמו קודם) ... */ }
        if (videoCardsContainer) { /* ... (כמו קודם) ... */ }

        const desktopSearchInput = document.getElementById('desktop-search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        if (desktopSearchForm) desktopSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, desktopSearchInput));
        if (mobileSearchForm) mobileSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, mobileSearchInput));
        if(desktopSearchInput) desktopSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));
        if(mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));

        document.addEventListener('mousemove', handleSparkleEffect);

        const mainNavLinks = document.querySelectorAll('header nav .nav-link:not(#theme-toggle a)');
        mainNavLinks.forEach(link => { /* ... (כמו קודם) ... */ });
        console.log("CAR-טיב: Event listeners set up complete.");
    }
    
    // --- Event Handlers (כמו קודם) ---
    function openMobileMenu() { /* ... */ }
    function closeMobileMenu() { /* ... */ }
    function toggleTagSelection(tagName, tagElement) { /* ... */ }
    // let searchDebounceTimer; // כבר מוגדר למעלה
    function handleSearchInputDebounced(searchTerm) { /* ... */ }
    function handleSearchSubmit(event, searchInputElement) { /* ... */ }
    function handleSparkleEffect(e) { /* ... */ }
    
    // --- Utility Functions ---
    function initializeSwiper() {
        // אם הסרת את ה-Swiper של הקטגוריות, אין צורך לאתחל אותו כאן
        // אם יש לך Swiper אחר בדף, שנה את הסלקטור
        const categoriesSwiperElement = document.querySelector('.categories-swiper'); // אם יש לך אלמנט כזה
        if (categoriesSwiperElement) {
            if (swiperInstance) {
                swiperInstance.destroy(true, true);
            }
            swiperInstance = new Swiper(categoriesSwiperElement, {
                slidesPerView: 'auto',
                spaceBetween: 10,
                freeMode: { enabled: true, sticky: false, momentumBounce: false, },
                pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
                watchSlidesProgress: true, resistanceRatio: 0.85, observer: true, observeParents: true,
            });
            console.log("CAR-טיב: Swiper (if present) initialized/updated.");
        } else {
            console.log("CAR-טיב: No '.categories-swiper' element found for Swiper initialization.");
        }
    }

    function updateFooterYear() { /* ... */ }
    function escapeHTML(str) { /* ... */ }

    // --- Start the application ---
    initializePage();
});

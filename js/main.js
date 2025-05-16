// js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
    const categoriesWrapper = document.getElementById('categories-wrapper');
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

    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: ''
    };
    const MAX_POPULAR_TAGS = 30;
    let swiperInstance = null;


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

        setupEventListeners(); // הגדר מאזינים קודם
        initializeSwiper(); // אתחל את ה-Swiper מוקדם, הוא יתעדכן אם צריך אחרי טעינת קטגוריות
        
        try {
            await loadLocalVideos(); 
            
            if (allVideos && allVideos.length > 0) {
                console.log("CAR-טיב: Videos loaded, proceeding with dependent renders.");
                loadAndRenderCategories(); // זו יכולה לקרוא ל-swiperInstance.update()
                loadAndRenderPopularTags();
                renderFilteredVideos();
            } else {
                 console.warn("CAR-טיב: No videos loaded from data source or data source is empty. Dependent renders will be skipped or show empty state.");
                 if(loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                    loadingPlaceholder.innerHTML = 'לא נטענו סרטונים. בדוק את קובץ הנתונים `data/videos.json`.';
                 }
                 if(noVideosFoundMessage && !noVideosFoundMessage.classList.contains("hidden")) {
                    noVideosFoundMessage.classList.remove('hidden');
                 }
                 if(popularTagsContainer) popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
            }
        } catch (error) {
            console.error("CAR-טיב: Critical error during page initialization (likely video loading):", error);
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                 loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה קריטית בטעינת נתוני הסרטונים.`;
            }
            if (noVideosFoundMessage && !noVideosFoundMessage.classList.contains("hidden")) noVideosFoundMessage.classList.remove('hidden');
        }
        
        updateFooterYear();
        console.log("CAR-טיב: Page initialization complete.");
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
                allVideos.forEach((video, index) => {
                    if (typeof video.id === 'undefined' || typeof video.title === 'undefined') {
                        console.warn(`CAR-טיב: Video at index ${index} in JSON is missing 'id' or 'title'. It will be skipped by rendering logic. Data:`, video);
                    }
                });

            } catch (jsonError) {
                console.error("CAR-טיב: Error parsing JSON from videos.json:", jsonError);
                console.error("CAR-טיב: Received text that failed to parse:", responseText.substring(0, 500) + "...");
                allVideos = []; 
                throw new Error(`Invalid JSON format in videos.json. ${jsonError.message}`);
            }

            console.log(`CAR-טיב: Videos loaded successfully from local JSON: ${allVideos.length} videos. Example:`, allVideos.length > 0 ? allVideos[0] : "Empty array");
            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');
        } catch (error) {
            console.error("CAR-טיב: Could not load or parse videos.json:", error);
            if (loadingPlaceholder) {
                loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת קובץ הסרטונים. ודא שהקובץ 'data/videos.json' קיים, הנתיב נכון, והתוכן הוא JSON תקין ומכיל את כל השדות.`;
                loadingPlaceholder.classList.remove('hidden');
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = [];
        }
    }
    
    // --- Categories ---
    function renderHomepageCategoryButtons() {
    console.log("CAR-טיב: Rendering homepage category buttons...");
    const categoriesGrid = document.getElementById('homepage-categories-grid');
    const loadingCategoriesPlaceholder = document.getElementById('loading-homepage-categories');

    if (!categoriesGrid) {
        console.warn("CAR-טיב: Homepage categories grid container not found.");
        if(loadingCategoriesPlaceholder) loadingCategoriesPlaceholder.textContent = "שגיאה: מיכל הקטגוריות לא נמצא.";
        return;
    }

    // רשימת קטגוריות מוגדרת מראש (יכולה גם להגיע מ-JSON נפרד או להיווצר מ-allVideos)
    const predefinedHomepageCategories = [
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600 dark:from-green-600 dark:to-teal-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700" },
        { id: "collectors", name: "רכבי אספנות", description: "קלאסיקות ופנינים מוטוריות", icon: "fa-car-side", gradient: "from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600 dark:from-yellow-600 dark:to-amber-700" },
        { id: "troubleshooting", name: "איתור תקלות", description: "פתרון בעיות נפוצות", icon: "fa-microscope", gradient: "from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-700" },
        // הוסף עוד קטגוריות לפי הצורך
    ];

    if (loadingCategoriesPlaceholder) loadingCategoriesPlaceholder.style.display = 'none';
    categoriesGrid.innerHTML = ''; // נקה תוכן קיים (כמו "טוען קטגוריות")

    predefinedHomepageCategories.forEach(cat => {
        const link = document.createElement('a');
        // ה-URL צריך להפנות לדף הקטגוריה שלך, עם פרמטר שמציין את הקטגוריה
        link.href = `category.html?name=${cat.id}`; 
        
        link.className = `category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${cat.gradient} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white`;
        link.setAttribute('aria-label', `עבור לקטגוריית ${cat.name}`);
        
        link.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]">
                <i class="fas ${cat.icon} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 transition-colors">${escapeHTML(cat.name)}</h3>
                <p class="text-sm opacity-80 mt-1 px-2">${escapeHTML(cat.description)}</p>
            </div>
        `;
        categoriesGrid.appendChild(link);
    });
    console.log("CAR-טיב: Homepage category buttons rendered.");
}

// בתוך initializePage:
async function initializePage() {
    // ... (קוד אתחול קיים) ...
    try {
        await loadLocalVideos(); // טוען את ה-JSON הרזה
        
        if (isHomePage()) { // בדוק אם זה דף הבית
            if (document.getElementById('homepage-categories-grid')) {
                renderHomepageCategoryButtons();
            }
            // בדף הבית, אולי נרצה להציג את *כל* הסרטונים או מדגם (למשל, האחרונים)
            // או לא להציג סרטונים כלל עד שהמשתמש בוחר קטגוריה או מחפש
            currentFilters.category = 'all'; // הצג הכל כברירת מחדל בדף הבית
        } else {
            // אם זה דף קטגוריה
            const categoryFromURL = getCategoryFromURL();
            if (categoryFromURL) {
                currentFilters.category = categoryFromURL;
                console.log("CAR-טיב: Category set from URL parameter:", categoryFromURL);
                // הסתר את קטע הקטגוריות של דף הבית אם הוא קיים בדף הקטגוריה
                const homepageCategoriesSection = document.getElementById('homepage-categories-section');
                if (homepageCategoriesSection) homepageCategoriesSection.style.display = 'none';
                 // עדכן את הכותרת של קטע הסרטונים בדף הקטגוריה
                const videosHeading = document.getElementById('videos-heading');
                if(videosHeading) {
                    const categoryDisplayName = predefinedHomepageCategories.find(c => c.id === categoryFromURL)?.name || categoryFromURL;
                    const categoryIcon = predefinedHomepageCategories.find(c => c.id === categoryFromURL)?.icon || 'fa-film';
                    videosHeading.innerHTML = `<i class="fas ${categoryIcon} text-purple-600 dark:text-purple-400 ml-3"></i>סרטונים בקטגוריית: ${escapeHTML(categoryDisplayName)}`;
                }
            }
        }
        
        if (allVideos && allVideos.length > 0) {
            loadAndRenderPopularTags(); // תגיות יוצגו בכל מקרה
            renderFilteredVideos();     // יציג לפי currentFilters.category
        } else {
             // ... (טיפול במקרה שאין סרטונים)
        }
    } catch (error) {
        // ... (טיפול בשגיאות)
    }
    
    // initializeSwiper(); // הסרנו את ה-Swiper של הקטגוריות
    updateFooterYear();
    console.log("CAR-טיב: Page initialization complete.");
}

// פונקציות עזר חדשות
function isHomePage() {
    // דרך פשוטה לבדוק אם זה דף הבית (למשל, אם אין פרמטר 'name' ב-URL)
    // או אם שם הקובץ הוא index.html
    const params = new URLSearchParams(window.location.search);
    return !params.has('name') && (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html'));
}

function getCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('name');
}

    // --- Popular Tags ---
    function loadAndRenderPopularTags() {
        console.log("CAR-טיב: Loading and rendering popular tags...");
        if (!popularTagsContainer) {
             console.warn("CAR-טיב: Popular tags container ('#popular-tags-container') not found.");
             return;
        }
        if (!allVideos || allVideos.length === 0) {
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">יש לטעון סרטונים כדי להציג תגיות פופולריות.</p>';
            console.warn("CAR-טיב: Cannot render popular tags: no videos loaded.");
            return;
        }

        const tagCounts = {};
        allVideos.forEach(video => {
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
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות בנתוני הסרטונים.</p>';
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

    // --- Rendering Videos ---






  function renderFilteredVideos() {
        console.log("CAR-טיב: Rendering filtered videos (lean JSON mode) with current filters:", JSON.parse(JSON.stringify(currentFilters)));
        if (!videoCardsContainer) { /* ... (בדיקה) ... */ return; }
        if (!videoCardTemplate) { /* ... (בדיקה) ... */ return; }

        videoCardsContainer.innerHTML = '';
        const filteredVideos = getFilteredVideos(); // פונקציית הסינון תצטרך להתחשב בשדות הזמינים
        console.log(`CAR-טיב: Found ${filteredVideos.length} videos after applying filters. Example:`, filteredVideos.length > 0 ? filteredVideos[0] : "N/A");

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        
        console.log(`CAR-טיב: Starting to render ${filteredVideos.length} video cards (lean mode)...`);

        filteredVideos.forEach((video, index) => {
            try {
                // בדיקה לשדות החובה מה-JSON הרזה
                if (!video || typeof video.id === 'undefined' || typeof video.title === 'undefined' || 
                    typeof video.category === 'undefined' || !Array.isArray(video.tags)) {
                    console.warn(`CAR-טיב: Skipping video at index ${index} due to missing essential data (id, title, category, tags) in lean JSON. Video data:`, video);
                    return;
                }

                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                
                if (!cardElement) { /* ... (בדיקה) ... */ return; }

                cardElement.querySelectorAll('[class_exists]').forEach(el => { /* ... (החלפת class_exists) ... */ });
                
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

                // הצגת הקטגוריה בכרטיס
                const categoryDisplayEl = cardElement.querySelector('.video-category-display');
                if (categoryDisplayEl) {
                    categoryDisplayEl.innerHTML = `<i class="fas fa-folder-open ml-1 opacity-70"></i> ${escapeHTML(getCategoryDisplayName(video.category))}`;
                }
                
                videoCardsContainer.appendChild(cardElement);

            } catch (e) {
                console.error(`CAR-טיב: Error rendering card for video ID: ${video.id}`, e, video);
            }
        });
        console.log(`CAR-טיב: Finished appending cards (lean mode). videoCardsContainer child count: ${videoCardsContainer.children.length}`);
    }

    // פונקציית getFilteredVideos תצטרך גם היא להתעדכן כדי לחפש רק בשדות הזמינים
    function getFilteredVideos() {
        if (!allVideos || allVideos.length === 0) return [];

        return allVideos.filter(video => {
            if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || 
                typeof video.category !== 'string' || !Array.isArray(video.tags)) {
                return false; 
            }

            const category = video.category.toLowerCase();
            const videoTitle = video.title.toLowerCase();
            // אין לנו description או channelName לחיפוש כאן יותר
            const videoTags = video.tags.map(t => String(t).toLowerCase());

            const categoryMatch = currentFilters.category === 'all' || category === currentFilters.category.toLowerCase();
            
            const filterTags = currentFilters.tags.map(t => String(t).toLowerCase());
            const tagsMatch = filterTags.length === 0 || filterTags.every(filterTag => videoTags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm && currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                // חפש רק בכותרת ובתגיות
                searchTermMatch = videoTitle.includes(term) ||
                    videoTags.some(tag => tag.includes(term));
            }
            return categoryMatch && tagsMatch && searchTermMatch;
        });
    }
    
    function handlePlayVideo(event, buttonElement) {
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article');
        
        if (!videoCard) {
            console.error("CAR-טיב: handlePlayVideo - Could not find parent article for play button:", buttonElement);
            return;
        }

        const iframe = videoCard.querySelector('.video-iframe');
        const thumbnail = videoCard.querySelector('.thumbnail-image');
        const playIconContainer = videoCard.querySelector('.play-video-button');

        console.log(`CAR-טיב: handlePlayVideo - Play button clicked! Video ID: ${videoId}`);
        console.log("CAR-טיב: handlePlayVideo - Found iframe:", iframe);
        console.log("CAR-טיב: handlePlayVideo - Found thumbnail:", thumbnail);
        console.log("CAR-טיב: handlePlayVideo - Found playIconContainer:", playIconContainer);

        if (iframe && videoId) {
            const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&enablejsapi=1`;
            iframe.src = videoSrc;
            iframe.classList.remove('hidden');
            console.log(`CAR-טיב: handlePlayVideo - Iframe src set to: ${videoSrc}. Iframe should be visible.`);

            if (thumbnail) {
                thumbnail.style.display = 'none'; 
                console.log("CAR-טיב: handlePlayVideo - Thumbnail hidden.");
            }
            if (playIconContainer) {
                playIconContainer.style.display = 'none';
                console.log("CAR-טיב: handlePlayVideo - Play icon container hidden.");
            }
        } else {
            if (!iframe) console.error("CAR-טיב: handlePlayVideo - Iframe element not found inside video card for ID:", videoId);
            if (!videoId) console.error("CAR-טיב: handlePlayVideo - Video ID not found on play button dataset.");
        }
    }

    function renderSelectedTagsChips() {
        if (!selectedTagsContainer) return;
        selectedTagsContainer.innerHTML = '';
        currentFilters.tags.forEach(tagName => {
            const tagChip = document.createElement('span');
            tagChip.className = 'flex items-center gap-1.5 bg-purple-600 text-white text-sm font-medium px-3 py-1.5 rounded-full cursor-default';
            
            const removeIcon = document.createElement('i');
            removeIcon.className = 'fas fa-times cursor-pointer text-xs opacity-75 hover:opacity-100';
            removeIcon.setAttribute('aria-label', `הסר תגית ${tagName}`);
            removeIcon.onclick = () => {
                const popularTagEl = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(tagName)}"]`) : null;
                toggleTagSelection(tagName, popularTagEl);
            };
            
            const textNode = document.createTextNode(escapeHTML(tagName));
            tagChip.appendChild(textNode);
            tagChip.appendChild(removeIcon);
            selectedTagsContainer.appendChild(tagChip);
        });
    }
    
    function escapeAttributeValue(value) {
        return String(value).replace(/"/g, '"');
    }

    // --- Filtering Logic ---
    function getFilteredVideos() {
        if (!allVideos || allVideos.length === 0) return [];

        return allVideos.filter(video => {
            if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || 
                typeof video.category !== 'string' || !Array.isArray(video.tags)) {
                return false; 
            }

            const category = video.category.toLowerCase();
            const videoTitle = video.title.toLowerCase();
            const videoDescription = (video.description || "").toLowerCase();
            const videoChannel = (video.channelName || "").toLowerCase();
            const videoTags = video.tags.map(t => String(t).toLowerCase());

            const categoryMatch = currentFilters.category === 'all' || category === currentFilters.category.toLowerCase();
            
            const filterTags = currentFilters.tags.map(t => String(t).toLowerCase());
            const tagsMatch = filterTags.length === 0 || filterTags.every(filterTag => videoTags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm && currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = videoTitle.includes(term) ||
                    videoDescription.includes(term) ||
                    videoTags.some(tag => tag.includes(term)) ||
                    videoChannel.includes(term);
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

        const categoryButtonsContainer = document.querySelector('#categories-wrapper');
        if (categoryButtonsContainer) {
            categoryButtonsContainer.addEventListener('click', function(event) {
                const button = event.target.closest('.category-btn');
                if (button && button.dataset.category) {
                    categoryButtonsContainer.querySelectorAll('.category-btn').forEach(btn => 
                        btn.classList.remove('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500')
                    );
                    button.classList.add('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
                    currentFilters.category = button.dataset.category;
                    console.log("CAR-טיב: Category filter changed to:", currentFilters.category);
                    renderFilteredVideos();
                }
            });
        } else {
            console.warn("CAR-טיב: Category buttons container ('#categories-wrapper') not found.");
        }
        
        if (popularTagsContainer) {
            popularTagsContainer.addEventListener('click', function(event) {
                const clickedTagElement = event.target.closest('button.tag');
                if (clickedTagElement && clickedTagElement.dataset.tagValue) {
                    toggleTagSelection(clickedTagElement.dataset.tagValue, clickedTagElement);
                }
            });
        }  else {
            console.warn("CAR-טיב: Popular tags container ('#popular-tags-container') not found.");
        }

        if (customTagForm) {
            customTagForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const newTagName = tagSearchInput.value.trim();
                if (newTagName) {
                    const normalizedNewTag = newTagName.toLowerCase();
                    const isAlreadySelected = currentFilters.tags.some(t => t.toLowerCase() === normalizedNewTag);
                    if (!isAlreadySelected) {
                        const existingPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(newTagName)}"]`) : null;
                        toggleTagSelection(newTagName, existingPopularTag);
                    }
                }
                tagSearchInput.value = '';
            });
        }

        if (videoCardsContainer) {
            videoCardsContainer.addEventListener('click', function(event) {
                const playButton = event.target.closest('.play-video-button');
                if (playButton) {
                    handlePlayVideo(event, playButton);
                }
            });
        }

        const desktopSearchInput = document.getElementById('desktop-search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        if (desktopSearchForm) desktopSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, desktopSearchInput));
        if (mobileSearchForm) mobileSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, mobileSearchInput));
        if(desktopSearchInput) desktopSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));
        if(mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));

        document.addEventListener('mousemove', handleSparkleEffect);

        const mainNavLinks = document.querySelectorAll('header nav .nav-link:not(#theme-toggle a)');
        mainNavLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                mainNavLinks.forEach(lnk => lnk.classList.remove('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold'));
                this.classList.add('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold');

                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetElement = document.querySelector(href);
                    if (targetElement) {
                        const headerElement = document.querySelector('header');
                        const headerOffset = headerElement ? headerElement.offsetHeight + 20 : 80; 
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                    }
                } else if (href === 'index.html' || href === './' || href === '/') {
                     e.preventDefault(); 
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
        console.log("CAR-טיב: Event listeners set up complete.");
    }
    
    // --- Event Handlers ---
    function openMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('translate-x-full');
        if (backdrop) {
            backdrop.classList.remove('invisible', 'opacity-0');
            backdrop.classList.add('visible', 'opacity-100');
        }
        document.body.style.overflow = 'hidden';
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.add('translate-x-full');
        if (backdrop) {
            backdrop.classList.remove('visible', 'opacity-100');
            backdrop.classList.add('invisible', 'opacity-0');
        }
        document.body.style.overflow = '';
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleTagSelection(tagName, tagElement) {
        const normalizedTagName = String(tagName).toLowerCase();
        const index = currentFilters.tags.map(t => String(t).toLowerCase()).indexOf(normalizedTagName);
    
        if (index > -1) {
            currentFilters.tags.splice(index, 1);
            if (tagElement) {
                tagElement.classList.remove('active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500', 'dark:text-white');
                tagElement.classList.add('bg-purple-100', 'text-purple-700', 'dark:bg-slate-700', 'dark:text-purple-300');
            }
        } else {
            currentFilters.tags.push(tagName);
            if (tagElement) {
                tagElement.classList.add('active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500', 'dark:text-white');
                tagElement.classList.remove('bg-purple-100', 'text-purple-700', 'dark:bg-slate-700', 'dark:text-purple-300');
            }
        }
        renderSelectedTagsChips();
        renderFilteredVideos();
        console.log("CAR-טיב: Tag selection toggled. Current tags:", currentFilters.tags);
    }

    let searchDebounceTimer;
    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = String(searchTerm).trim();
            console.log("CAR-טיב: Search term updated (debounced):", currentFilters.searchTerm);
            renderFilteredVideos();
        }, 350);
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault();
        currentFilters.searchTerm = String(searchInputElement.value).trim();
        console.log("CAR-טיב: Search submitted with term:", currentFilters.searchTerm);
        renderFilteredVideos();
        searchInputElement.blur();
    }
    
    function handleSparkleEffect(e) {
         if (Math.random() < 0.03) { 
            if (e.target.closest('button, input, a, .swiper-slide, .tag, textarea, select, iframe')) {
                return;
            }
            const sparkle = document.createElement('div');
            sparkle.className = 'magic-sparkle';
            sparkle.style.left = `${e.pageX - 4}px`;
            sparkle.style.top = `${e.pageY - 4}px`;
            document.body.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 1000);
        }
    }
    
    // --- Utility Functions ---
    function initializeSwiper() {
        if (document.querySelector('.categories-swiper')) {
            if (swiperInstance) {
                swiperInstance.destroy(true, true);
            }
            swiperInstance = new Swiper('.categories-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 10,
                freeMode: {
                    enabled: true,
                    sticky: false, 
                    momentumBounce: false,
                },
                pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
                watchSlidesProgress: true,
                resistanceRatio: 0.85,
                observer: true, 
                observeParents: true,
            });
            console.log("CAR-טיב: Swiper initialized/updated.");
        } else {
            console.warn("CAR-טיב: Swiper container not found for initialization.");
        }
    }

    function updateFooterYear() {
        const yearSpan = document.getElementById('current-year-footer');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }

    function escapeHTML(str) {
        if (str === null || typeof str === 'undefined') return '';
        if (typeof str !== 'string') str = String(str); 
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    // --- Start the application ---
    initializePage();
});

// js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
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
    const homepageCategoriesGrid = document.getElementById('homepage-categories-grid');
    const hebrewFilterToggle = document.getElementById('hebrew-filter-toggle');

    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    const MAX_POPULAR_TAGS = 30;
    // let swiperInstance = null; // Not used

      const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600 dark:from-green-600 dark:to-teal-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700" },
        { id: "collectors", name: "רכבי אספנות", description: "קלאסיקות ופנינים מוטוריות", icon: "fa-car-side", gradient: "from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600 dark:from-yellow-600 dark:to-amber-700" },
        { id: "troubleshooting", name: "איתור תקלות", description: "פתרון בעיות נפוצות", icon: "fa-microscope", gradient: "from-cyan-300 to-sky-400 dark:from-cyan-400 dark:to-sky-500" }

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
        console.log("CAR-טיב: Theme applied:", theme, "HTML classList:", document.documentElement.classList.toString());
    }

    function toggleTheme() {
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        const newTheme = isCurrentlyDark ? 'light' : 'dark'; // תקן: אם כהה, שנה לבהיר, ולהפך
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        console.log("CAR-טיב: Theme toggled to:", newTheme);
    }

    // --- Initialization ---
    async function initializePage() {
        console.log("CAR-טיב: Initializing page...");
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        console.log("CAR-טיב: Initial theme to apply:", savedTheme);
        applyTheme(savedTheme); // קריאה ראשונית להחלת ערכת הנושא
        const categoryFromURL = getCategoryFromURL();

        try {
            await loadLocalVideos(); 
            
            if (allVideos && allVideos.length > 0) {
                console.log("CAR-טיב: Videos loaded, proceeding with dependent renders.");
                if (isHomePage()) {
                    if (homepageCategoriesGrid) {
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
                    currentFilters.category = 'all';
                    if (homepageCategoriesGrid) renderHomepageCategoryButtons();
                    loadAndRenderPopularTags(null);
                }
                renderFilteredVideos();
            } else {
                 console.warn("CAR-טיב: No videos loaded or data source is empty.");
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
        return !params.has('name') && (path.endsWith('/') || path.endsWith('index.html') || path === '' || path.toLowerCase().endsWith('/car-tube/'));
    }

    function getCategoryFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name');
    }

    function updateCategoryPageTitleAndBreadcrumbs(categoryId) {
        const categoryData = PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const categoryName = categoryData ? categoryData.name : categoryId;
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
        if (homepageCategoriesSection) {
            homepageCategoriesSection.style.display = 'none';
        }
    }

    // --- Data Loading ---
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
                console.log("CAR-טיב: Parsed allVideos structure (first video):", allVideos.length > 0 ? JSON.stringify(allVideos[0], null, 2) : "Empty array");

                allVideos.forEach((video, index) => {
                    if (typeof video.id === 'undefined' || 
                        typeof video.title === 'undefined' ||
                        typeof video.category === 'undefined' || 
                        !Array.isArray(video.tags) ||
                        typeof video.hebrewContent === 'undefined'
                        ) {
                        console.warn(`CAR-טיב: Video at index ${index} in JSON is missing one or more essential fields (id, title, category, tags as array, hebrewContent). Data:`, video);
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
                    if(normalizedTag) {
                        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                    } else {
                        // console.warn("CAR-טיב: Found an empty or invalid tag in video:", video.id, "Original tag value:", tag);
                    }
                });
            } else {
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

    // --- Rendering Videos (מותאם ל-JSON רזה וללא תמונה ממוזערת) ---
    function renderFilteredVideos() {
        console.log("CAR-טיב: Rendering filtered videos (lean JSON, no thumbnail) with current filters:", JSON.parse(JSON.stringify(currentFilters)));
        if (!videoCardsContainer) {
             console.error("CAR-טיב: CRITICAL - Video cards container ('video-cards-container') not found in DOM.");
             return;
        }
        if (!videoCardTemplate) {
            console.error("CAR-טיב: CRITICAL - Video card template ('video-card-template') not found in DOM.");
            return;
        }

        videoCardsContainer.innerHTML = '';
        const filteredVideos = getFilteredVideos();
        console.log(`CAR-טיב: Found ${filteredVideos.length} videos after applying filters. Example:`, filteredVideos.length > 0 ? filteredVideos[0] : "N/A");

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        
        console.log(`CAR-טיב: Starting to render ${filteredVideos.length} video cards (lean, no thumbnail)...`);

        filteredVideos.forEach((video, index) => {
            try {
                if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || 
                    typeof video.category !== 'string' || !Array.isArray(video.tags) ||
                    typeof video.hebrewContent !== 'boolean' ) {
                    console.warn(`CAR-טיב: Skipping video at index ${index} due to missing essential data. Video data:`, video);
                    return; 
                }

                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                
                if (!cardElement) {
                    console.error(`CAR-טיב: Could not find 'article' element in template clone for video ID: ${video.id}.`);
                    return;
                }

                cardElement.querySelectorAll('[class_exists]').forEach(el => {
                    el.setAttribute('class', el.getAttribute('class_exists'));
                    el.removeAttribute('class_exists');
                });
                
                cardElement.dataset.category = video.category;
                cardElement.dataset.tags = video.tags.join(',');

                const sanitizedTitle = escapeHTML(video.title);
                const videoLink = `https://www.youtube.com/watch?v=${video.id}`;
                
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
                    if (video.tags && video.tags.length > 0) {
                        tagsContainerEl.innerHTML = video.tags.map(tag => 
                            `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-slate-600 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(String(tag))}</span>`
                        ).join('');
                    } else {
                        tagsContainerEl.innerHTML = '';
                    }
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
        console.log(`CAR-טיב: Finished appending cards (lean, no thumbnail). videoCardsContainer child count: ${videoCardsContainer.children.length}`);
    }
    
    function handlePlayVideo(buttonElement) {
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article'); 
        
        if (!videoCard) {
            console.error("CAR-טיב: handlePlayVideo - Could not find parent article for play button:", buttonElement);
            return;
        }

        const iframe = videoCard.querySelector('.video-iframe');
        const playIconContainer = buttonElement; 

        console.log(`CAR-טיב: handlePlayVideo - Play button clicked! Video ID: ${videoId}`);
        console.log("CAR-טיב: handlePlayVideo - Found iframe:", iframe);
        console.log("CAR-טיב: handlePlayVideo - Found playIconContainer (button itself):", playIconContainer);

        if (iframe && videoId) {
            const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&enablejsapi=1&origin=${window.location.origin}`;
            iframe.src = videoSrc;
            iframe.classList.remove('hidden');
            console.log(`CAR-טיב: handlePlayVideo - Iframe src set to: ${videoSrc}. Iframe should be visible.`);

            if (playIconContainer) {
                playIconContainer.style.display = 'none';
                console.log("CAR-טיב: handlePlayVideo - Play icon container (button) hidden.");
            }
        } else {
            if (!iframe) console.error("CAR-טיב: handlePlayVideo - Iframe element NOT FOUND for ID:", videoId);
            if (!videoId) console.error("CAR-טיב: handlePlayVideo - Video ID NOT FOUND on play button dataset.");
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

    // --- Filtering Logic (מותאם ל-JSON רזה) ---
    function getFilteredVideos() {
        if (!allVideos || allVideos.length === 0) return [];

        return allVideos.filter(video => {
            if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || 
                typeof video.category !== 'string' || !Array.isArray(video.tags) ||
                typeof video.hebrewContent !== 'boolean') { // בדיקה נוספת
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
                searchTermMatch = videoTitle.includes(term) ||
                    videoTags.some(tag => tag.includes(term));
            }

            const hebrewContentMatch = !currentFilters.hebrewOnly || (currentFilters.hebrewOnly && video.hebrewContent === true);

            return categoryMatch && tagsMatch && searchTermMatch && hebrewContentMatch;
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
        
        if (hebrewFilterToggle) {
            hebrewFilterToggle.addEventListener('change', function() {
                currentFilters.hebrewOnly = this.checked;
                console.log("CAR-טיב: Hebrew filter toggled:", currentFilters.hebrewOnly);
                renderFilteredVideos();
            });
        } else {
            console.warn("CAR-טיב: Hebrew filter toggle button ('#hebrew-filter-toggle') not found.");
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
                    handlePlayVideo(playButton);
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
        console.log("CAR-טיב: initializeSwiper called, but no specific Swiper for homepage categories is being initialized as it was removed.");
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

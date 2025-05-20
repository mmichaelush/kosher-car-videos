// js/main.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("CAR-טיב: main.js SCRIPT HAS STARTED"); // הדפסה ראשונה אפשרית
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
    const videoCardTemplate = document.getElementById('video-card-template');
    const homepageCategoriesGrid = document.getElementById('homepage-categories-grid');
    const hebrewFilterToggle = document.getElementById('hebrew-filter-toggle');
    const videoCountHeroElement = document.getElementById('video-count-hero');

    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    const MAX_POPULAR_TAGS = 30;

  const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600" },
        { id: "troubleshooting", name: "תיקון תקלות", description: "פתרון ותיקון בעיות ותקלות", icon: "fa-microscope", gradient: "from-lime-400 to-yellow-500 dark:from-lime-500 dark:to-yellow-600"
 },
        { id: "collectors", name: "רכבי אספנות", description: "קלאסיקות ופנינים מוטוריות", icon: "fa-car-side", gradient: "from-red-500 to-pink-600" }
    ];

    // --- Initialization ---
    async function initializePage() {
        setupEventListeners();
        initializeSwiperIfNeeded();

        const categoryFromURL = getCategoryFromURL();

        try {
            await loadLocalVideos(); 
            
            if (allVideos && allVideos.length > 0) {
                if (isHomePage()) {
                    if (homepageCategoriesGrid) renderHomepageCategoryButtons();
                    currentFilters.category = 'all'; 
                    loadAndRenderPopularTags(null);
                } else if (categoryFromURL) {
                    currentFilters.category = categoryFromURL;
                    updateCategoryPageTitleAndBreadcrumbs(categoryFromURL);
                    loadAndRenderPopularTags(categoryFromURL);
                } else {
                    currentFilters.category = 'all'; // Fallback
                    if (homepageCategoriesGrid) renderHomepageCategoryButtons();
                    loadAndRenderPopularTags(null);
                }
                renderFilteredVideos();
            } else {
                 if(loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                    loadingPlaceholder.innerHTML = 'לא נטענו סרטונים. בדוק את קובץ הנתונים `data/videos.json`.';
                 }
                 if(noVideosFoundMessage && noVideosFoundMessage.classList.contains("hidden")) {
                    noVideosFoundMessage.classList.remove('hidden');
                 }
                 if(popularTagsContainer) popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
            }
        } catch (error) {
            console.error("CAR-טיב: Critical error during page initialization:", error);
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                 loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה קריטית בטעינת נתוני הסרטונים.`;
            }
            if (noVideosFoundMessage && noVideosFoundMessage.classList.contains("hidden")) noVideosFoundMessage.classList.remove('hidden');
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
            pageTitleElement.innerHTML = `<i class="fas ${categoryIcon} text-purple-600 mr-3"></i>${escapeHTML(categoryName)}`;
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
        if (loadingPlaceholder) {
            loadingPlaceholder.classList.remove('hidden');
            loadingPlaceholder.innerHTML = `<i class="fas fa-spinner fa-spin fa-2x mb-3"></i><br>טוען סרטונים...`;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        try {
            const response = await fetch('data/videos.json'); 
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for videos.json. URL: ${response.url}`);
            }
            const responseText = await response.text();
            try {
                allVideos = JSON.parse(responseText);
                if (!Array.isArray(allVideos)) {
                    allVideos = []; 
                    throw new Error("Parsed JSON from videos.json is not an array.");
                }
                allVideos.forEach((video, index) => {
                    if (typeof video.id !== 'string' || typeof video.title !== 'string' ||
                        typeof video.category !== 'string' || !Array.isArray(video.tags) ||
                        typeof video.hebrewContent !== 'boolean') {
                        console.warn(`CAR-טיב: Video at index ${index} in JSON is missing essential fields or has incorrect types. Data:`, video);
                    }
                });
            } catch (jsonError) {
                console.error("CAR-טיב: Error parsing JSON from videos.json:", jsonError);
                allVideos = []; 
                throw new Error(`Invalid JSON format in videos.json. ${jsonError.message}`);
            }

            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');

            if (videoCountHeroElement) {
                const countSpan = videoCountHeroElement.querySelector('span');
                if (countSpan) {
                    countSpan.textContent = allVideos.length;
                } else {
                     videoCountHeroElement.innerHTML = `במאגר יש כרגע <span class="font-bold text-white">${allVideos.length}</span> סרטונים.`;
                }
            }

        } catch (error) {
            console.error("CAR-טיב: Could not load or parse videos.json:", error);
            if (loadingPlaceholder) {
                loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת קובץ הסרטונים.`;
                loadingPlaceholder.classList.remove('hidden');
            }
            if (videoCountHeroElement) {
                const countSpan = videoCountHeroElement.querySelector('span');
                if (countSpan) countSpan.textContent = "שגיאה";
                else videoCountHeroElement.innerHTML = `שגיאה בטעינת מספר הסרטונים.`;
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = [];
        }
    }
    
    // --- Homepage Categories Buttons ---
    function renderHomepageCategoryButtons() {
        const loadingCategoriesPlaceholder = document.getElementById('loading-homepage-categories');
        if (!homepageCategoriesGrid) {
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
    }

    // --- Popular Tags ---
    function loadAndRenderPopularTags(forCategoryId = null) {
        if (!popularTagsContainer) return;
        if (!allVideos || allVideos.length === 0) {
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 text-sm">אין סרטונים לטעינת תגיות.</p>';
            return;
        }

        const tagCounts = {};
        const videosToConsider = forCategoryId && forCategoryId !== 'all' 
            ? allVideos.filter(v => v.category === forCategoryId) 
            : allVideos;
        
        if (videosToConsider.length === 0 && forCategoryId && forCategoryId !== 'all') {
             popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 text-sm">אין סרטונים בקטגוריה זו להצגת תגיות.</p>`;
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
            popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 text-sm">לא נמצאו תגיות${forCategoryId && forCategoryId !== 'all' ? ' לקטגוריה זו' : ''}.</p>`;
            return;
        }

        sortedTags.forEach(tag => {
            const tagElement = document.createElement('button');
            tagElement.className = 'tag bg-purple-100 hover:bg-purple-200 text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5';
            tagElement.dataset.tagValue = tag;
            const iconClass = getIconForTag(tag);
            tagElement.innerHTML = `<i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(tag)}`;
            popularTagsContainer.appendChild(tagElement);
        });
    }
    
    function getIconForTag(tag) {
        const tagIcons = {
    "מנוע": "fa-cogs",
    "בלמים": "fa-hand-paper",
    "גיר": "fa-cog",
    "תיבת הילוכים": "fa-cog",
    "שמן מנוע": "fa-oil-can",
    "מצבר": "fa-car-battery",
    "מערכת בלימה": "fa-car-crash",
    "בדיקת רכב": "fa-stethoscope",
    "תחזוקה": "fa-tools",
    "טיפול": "fa-wrench",
    "בדיקה לפני קנייה": "fa-search-dollar",
    "שיפורים": "fa-tools",
    "אביזרים": "fa-box-open",
    "רכב חשמלי": "fa-charging-station",
    "טעינה": "fa-plug",
    "חשמל": "fa-bolt",
    "חיישנים": "fa-rss",
    "מערכת בטיחות": "fa-shield-alt",
    "מצלמות רוורס": "fa-video",
    "תאורה": "fa-lightbulb",
    "מערכת מולטימדיה": "fa-music",
    "בקרת שיוט": "fa-road",
    "מערכות הרכב": "fa-sliders-h",
    "היברידי": "fa-battery-half",
    "בנזין": "fa-fire",
    "דיזל": "fa-gas-pump",
    "הנעה כפולה": "fa-compass",
    "רכב שטח": "fa-mountain",
    "שטח": "fa-mountain",
    "רכב משפחתי": "fa-car",
    "מיני רכב": "fa-car-side",
    "קלאסי": "fa-car-side",
    "רכבי אספנות": "fa-car-alt",
    "וואן": "fa-shuttle-van",
    "רכב עבודה": "fa-truck",
    "טנדר": "fa-truck-pickup",
    "משאית": "fa-truck-moving",
    "קרוואן": "fa-caravan",
    "טויוטה": "fa-horse-head",
    "טסלה": "fa-leaf",
    "יונדאי": "fa-hippo",
    "סובארו": "fa-paw",
    "פורד": "fa-flag-usa",
    "מרצדס": "fa-star",
    "ב.מ.וו": "fa-gem",
    "סקירה": "fa-search",
    "השוואה": "fa-balance-scale",
    "מבחן דרכים": "fa-road",
    "חוות דעת": "fa-comment-dots",
    "ביטוח": "fa-file-invoice-dollar",
    "נהיגה": "fa-steering-wheel", // דורש FA 6
    "נהיגה בטוחה": "fa-shield-heart", // FA Pro
    "אבחון": "fa-stethoscope",
    "כשל טכני": "fa-exclamation-triangle",
    "איתור תקלות": "fa-microscope",
};

        return tagIcons[String(tag).toLowerCase()] || "fa-tag";
    }

    // --- Rendering Videos ---
    function renderFilteredVideos() {
        if (!videoCardsContainer || !videoCardTemplate) {
             console.error("CAR-טיב: Missing videoCardsContainer or videoCardTemplate for rendering.");
             return;
        }

        videoCardsContainer.innerHTML = '';
        const filteredVideos = getFilteredVideos();

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        
        filteredVideos.forEach((video) => {
            try {
                if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || 
                    typeof video.category !== 'string' || !Array.isArray(video.tags) ||
                    typeof video.hebrewContent !== 'boolean' ) {
                    console.warn(`CAR-טיב: Skipping video due to missing essential data. Video data:`, video);
                    return; 
                }

                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                if (!cardElement) {
                    console.error("CAR-טיב: Could not find 'article' in template clone.");
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
                            `<span class="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(String(tag))}</span>`
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
    }
    
    function handlePlayVideo(buttonElement) {
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article'); 
        if (!videoCard) {
            console.error("CAR-טיב: handlePlayVideo - Could not find parent article for play button.");
            return;
        }

        const iframe = videoCard.querySelector('.video-iframe');
        const playIconContainer = buttonElement; 

        if (iframe && videoId) {
            const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&enablejsapi=1&origin=${window.location.origin}`;
            iframe.src = videoSrc;
            iframe.classList.remove('hidden');
            if (playIconContainer) playIconContainer.style.display = 'none';
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
                typeof video.hebrewContent !== 'boolean') {
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
        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link').forEach(link => {
            link.addEventListener('click', () => setTimeout(closeMobileMenu, 150));
        });
        
        if (hebrewFilterToggle) {
            hebrewFilterToggle.addEventListener('change', function() {
                currentFilters.hebrewOnly = this.checked;
                renderFilteredVideos();
                scrollToVideoGridIfNeeded();
            });
        }
        
        if (popularTagsContainer) {
            popularTagsContainer.addEventListener('click', function(event) {
                const clickedTagElement = event.target.closest('button.tag');
                if (clickedTagElement && clickedTagElement.dataset.tagValue) {
                    toggleTagSelection(clickedTagElement.dataset.tagValue, clickedTagElement);
                }
            });
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

        const mainNavLinks = document.querySelectorAll('header nav .nav-link');
        mainNavLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                mainNavLinks.forEach(lnk => lnk.classList.remove('active', 'text-purple-600', 'font-semibold'));
                this.classList.add('active', 'text-purple-600', 'font-semibold');

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
                tagElement.classList.remove('active-search-tag', 'bg-purple-600', 'text-white');
                tagElement.classList.add('bg-purple-100', 'text-purple-700');
            }
        } else {
            currentFilters.tags.push(tagName);
            if (tagElement) {
                tagElement.classList.add('active-search-tag', 'bg-purple-600', 'text-white');
                tagElement.classList.remove('bg-purple-100', 'text-purple-700');
            }
        }
        renderSelectedTagsChips();
        renderFilteredVideos();
        scrollToVideoGridIfNeeded();
    }

    let searchDebounceTimer;
    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = String(searchTerm).trim();
            renderFilteredVideos();
            if (currentFilters.searchTerm) scrollToVideoGridIfNeeded();
        }, 400);
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault();
        currentFilters.searchTerm = String(searchInputElement.value).trim();
        renderFilteredVideos();
        searchInputElement.blur();
        if (currentFilters.searchTerm) scrollToVideoGridIfNeeded();
    }
    
    function handleSparkleEffect(e) {
         if (Math.random() < 0.03) { 
            if (e.target.closest('button, input, a, .tag, textarea, select, iframe')) {
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
    function scrollToVideoGridIfNeeded() {
        const videoGridSection = document.getElementById('video-grid-section');
        if (videoGridSection) {
            const rect = videoGridSection.getBoundingClientRect();
            if (rect.top < (window.innerHeight / 3) && rect.bottom > 0) { 
                return;
            }
            
            const headerElement = document.querySelector('header');
            const headerOffset = headerElement ? headerElement.offsetHeight + 20 : 80; 
            const elementPosition = rect.top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    }

    function initializeSwiperIfNeeded() {
        const anySwiperElement = document.querySelector('.swiper'); 
        if (anySwiperElement && typeof Swiper !== 'undefined') {
            if (swiperInstance && typeof swiperInstance.destroy === 'function') { // ודא שה-destroy קיים
                swiperInstance.destroy(true, true);
            }
            swiperInstance = new Swiper(anySwiperElement, {
                slidesPerView: 'auto',
                spaceBetween: 10,
            });
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

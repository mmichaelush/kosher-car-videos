document.addEventListener('DOMContentLoaded', function () {
    // DOM Element Selections
    const bodyElement = document.body;
    const darkModeToggles = document.querySelectorAll('.dark-mode-toggle-button');
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const videoCountHeroElement = document.getElementById('video-count-hero');
    const currentYearFooter = document.getElementById('current-year-footer');
    const desktopSearchForm = document.getElementById('desktop-search-form') || document.getElementById('desktop-search-form-category');
    const mobileSearchForm = document.getElementById('mobile-search-form') || document.getElementById('mobile-search-form-category');
    const desktopSearchInput = document.getElementById('desktop-search-input') || document.getElementById('desktop-search-input-category');
    const mobileSearchInput = document.getElementById('mobile-search-input') || document.getElementById('mobile-search-input-category');
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

    // State Variables
    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    let searchDebounceTimer;

    // Constants
    const MAX_POPULAR_TAGS = 30;
    const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600", darkGradient: "dark:from-purple-600 dark:to-indigo-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600", darkGradient: "dark:from-blue-600 dark:to-cyan-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה עצמית", icon: "fa-tools", gradient: "from-green-500 to-teal-600", darkGradient: "dark:from-green-600 dark:to-teal-700" },
        { id: "troubleshooting", name: "תיקון תקלות", description: "פתרון ותיקון בעיות ותקלות", icon: "fa-microscope", gradient: "from-lime-400 to-yellow-500", darkGradient: "dark:from-lime-500 dark:to-yellow-600" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג ושיפור הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600", darkGradient: "dark:from-orange-600 dark:to-red-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מערכות, מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600", darkGradient: "dark:from-yellow-600 dark:to-amber-700" },
        { id: "collectors", name: "רכבי אספנות", description: "נוסטלגית רכבים מימים שעברו", icon: "fa-car-side", gradient: "from-red-500 to-pink-600", darkGradient: "dark:from-red-600 dark:to-pink-700" }
    ];

    // --- Initialization ---
    async function initializePage() {
        initializeDarkModeVisuals();
        setupEventListeners();
        updateFooterYear();

        const categoryFromURL = getCategoryFromURL();

        try {
            await loadLocalVideos();

            if (allVideos && allVideos.length > 0) {
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
                renderFilteredVideos();
            } else {
                displayErrorState("לא נטענו סרטונים. בדוק את קובץ הנתונים `data/videos.json`.");
                if (popularTagsContainer) {
                    popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
                }
            }
        } catch (error) {
            displayErrorState(`שגיאה קריטית בטעינת נתוני הסרטונים: ${error.message}`);
        }
    }

    // --- UI & State Management ---
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
        return filename === '' || filename === 'index.html' || filename.toLowerCase() === document.location.host.toLowerCase();
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
        if (homepageCategoriesSection) homepageCategoriesSection.style.display = 'none';

        const heroSection = document.querySelector('.hero-gradient');
        if (heroSection) heroSection.style.display = 'none';
    }

    function updateDarkModeToggleVisuals(toggleButton, isDark) {
        const moonIcon = toggleButton.querySelector('.fa-moon');
        const sunIcon = toggleButton.querySelector('.fa-sun');
        const toggleDot = toggleButton.querySelector('.dot');

        if (isDark) {
            if (moonIcon) moonIcon.classList.add('hidden');
            if (sunIcon) sunIcon.classList.remove('hidden');
            if (toggleDot) toggleDot.style.transform = 'translateX(-100%)'; 
            toggleButton.setAttribute('aria-checked', 'true');
        } else {
            if (moonIcon) moonIcon.classList.remove('hidden');
            if (sunIcon) sunIcon.classList.add('hidden');
            if (toggleDot) toggleDot.style.transform = 'translateX(0%)'; 
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
                if(countSpan) countSpan.textContent = allVideos.length;
                else videoCountHeroElement.innerHTML = `במאגר יש כרגע <span class="font-bold text-white dark:text-gray-50">${allVideos.length}</span> סרטונים.`;
            }
        } catch (error) {
            if (videoCountHeroElement) {
                const countSpan = videoCountHeroElement.querySelector('span.font-bold');
                if(countSpan) countSpan.textContent = "שגיאה";
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
        const tagIcons = {
            "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "גיר": "fa-cog", "תיבת הילוכים": "fa-cog",
            "שמן מנוע": "fa-oil-can", "מצבר": "fa-car-battery", "מערכת בלימה": "fa-car-crash",
            "בדיקת רכב": "fa-stethoscope", "תחזוקה": "fa-tools", "טיפול": "fa-wrench",
            "בדיקה לפני קנייה": "fa-search-dollar", "שיפורים": "fa-rocket", "אביזרים": "fa-box-open",
            "רכב חשמלי": "fa-charging-station", "טעינה": "fa-plug", "חשמל": "fa-bolt", "חיישנים": "fa-rss",
            "מערכת בטיחות": "fa-shield-alt", "מצלמות רוורס": "fa-video", "תאורה": "fa-lightbulb",
            "מערכת מולטימדיה": "fa-music", "בקרת שיוט": "fa-road", "מערכות הרכב": "fa-sliders-h",
            "היברידי": "fa-battery-half", "בנזין": "fa-fire", "דיזל": "fa-gas-pump",
            "הנעה כפולה": "fa-compass", "רכב שטח": "fa-mountain", "שטח": "fa-mountain",
            "רכב משפחתי": "fa-car", "מיני רכב": "fa-car-side", "קלאסי": "fa-car-side", "רכבי אספנות": "fa-car-alt",
            "וואן": "fa-shuttle-van", "רכב עבודה": "fa-truck", "טנדר": "fa-truck-pickup", "משאית": "fa-truck-moving",
            "קרוואן": "fa-caravan", "טויוטה": "fa-horse-head", "טסלה": "fa-leaf", "יונדאי": "fa-hippo", "סובארו": "fa-paw",
            "פורד": "fa-flag-usa", "מרצדס": "fa-star", "ב.מ.וו": "fa-gem",
            "סקירה": "fa-search", "השוואה": "fa-balance-scale", "מבחן דרכים": "fa-road", "חוות דעת": "fa-comment-dots",
            "ביטוח": "fa-file-invoice-dollar", "נהיגה": "fa-person-biking", "נהיגה בטוחה": "fa-shield-heart",
            "אבחון": "fa-stethoscope", "כשל טכני": "fa-exclamation-triangle", "איתור תקלות": "fa-microscope",
            "עשה זאת בעצמך": "fa-hand-sparkles", "הכנופיה": "fa-users-cog", "יונדאי i10": "fa-car",
            "ניקוי מצערת": "fa-spray-can-sparkles", "וסת לחץ": "fa-gauge-high", "אספנות": "fa-gem", "נוזל בלמים": "fa-tint"
        };
        return tagIcons[tag.toLowerCase()] || "fa-tag"; 
    }

   function createVideoCardElement(video) {
        if (!videoCardTemplate) return null;
        if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' ||
            typeof video.thumbnail !== 'string' || typeof video.category !== 'string' ||
            !Array.isArray(video.tags)) {
            return null; 
        }

       const cardClone = videoCardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('article'); 
        if (!cardElement) return null;

        if (cardElement.hasAttribute('class_exists')) {
            cardElement.setAttribute('class', cardElement.getAttribute('class_exists'));
            cardElement.removeAttribute('class_exists');
        }

        const innerElementsWithClassExists = cardElement.querySelectorAll('[class_exists]');
        innerElementsWithClassExists.forEach(el => {
            if (el.hasAttribute('class_exists')) { 
                el.setAttribute('class', el.getAttribute('class_exists'));
                el.removeAttribute('class_exists');
            }
        });

        const sanitizedTitle = escapeHTML(video.title);
        const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

        const thumbnailImgElement = cardElement.querySelector('.video-thumbnail-img');
        const playButtonElement = cardElement.querySelector('.play-video-button');
        const videoThumbnailContainer = cardElement.querySelector('.video-thumbnail-container');
        const durationElement = cardElement.querySelector('.video-duration');

        if (thumbnailImgElement && video.thumbnail) {
            thumbnailImgElement.src = video.thumbnail;
            thumbnailImgElement.alt = `תמונה ממוזערת של הסרטון: ${sanitizedTitle}`;
            thumbnailImgElement.classList.remove('hidden');
            thumbnailImgElement.onerror = function() { 
                this.classList.add('hidden');
                if (videoThumbnailContainer) videoThumbnailContainer.classList.add('bg-slate-200', 'dark:bg-slate-700'); 
            };
        } else if (thumbnailImgElement) {
            thumbnailImgElement.classList.add('hidden'); 
            if (videoThumbnailContainer) videoThumbnailContainer.classList.add('bg-slate-200', 'dark:bg-slate-700');
        }

        if (durationElement && video.duration) {
            durationElement.textContent = escapeHTML(video.duration);
        } else if (durationElement) {
            durationElement.classList.add('hidden');
        }

        if (playButtonElement) {
            playButtonElement.dataset.videoId = video.id;
            playButtonElement.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);
        }
        
        const iframeEl = cardElement.querySelector('.video-iframe');
        if (iframeEl) {
            iframeEl.title = `נגן וידאו: ${sanitizedTitle}`; 
            iframeEl.setAttribute('loading', 'lazy'); 
        }

        const videoTitleLinkEl = cardElement.querySelector('.video-link');
        if (videoTitleLinkEl) {
            videoTitleLinkEl.href = videoLink;
            videoTitleLinkEl.textContent = sanitizedTitle;
        }

        const channelLogoElement = cardElement.querySelector('.channel-logo');
        const channelNameElement = cardElement.querySelector('.channel-name');
        if (channelNameElement && video.channel) {
            channelNameElement.textContent = escapeHTML(video.channel);
        } else if (channelNameElement) {
            channelNameElement.textContent = ''; 
        }
        
        if (channelLogoElement && video.channelImage) {
            channelLogoElement.src = video.channelImage;
            channelLogoElement.alt = `לוגו הערוץ ${escapeHTML(video.channel || 'לא ידוע')}`;
            channelLogoElement.classList.remove('hidden');
            channelLogoElement.onerror = function() { 
                this.classList.add('hidden');
            };
        } else if (channelLogoElement) {
            channelLogoElement.classList.add('hidden');
        }

        const tagsContainerEl = cardElement.querySelector('.video-tags');
        if (tagsContainerEl) {
            if (video.tags && video.tags.length > 0) {
                tagsContainerEl.innerHTML = video.tags.map(tag =>
                    `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-xs font-medium px-2 py-0.5 rounded-md">${escapeHTML(capitalizeFirstLetter(tag))}</span>`
                ).join('');
            } else {
                tagsContainerEl.innerHTML = ''; 
            }
        }

        const categoryDisplayEl = cardElement.querySelector('.video-category-display');
        if (categoryDisplayEl) {
            const categoryData = PREDEFINED_CATEGORIES.find(c => c.id === video.category);
            const categoryName = categoryData ? categoryData.name : capitalizeFirstLetter(video.category);
            const iconElement = categoryDisplayEl.querySelector('i'); 
            categoryDisplayEl.innerHTML = ''; 
            if (iconElement) categoryDisplayEl.appendChild(iconElement.cloneNode(true)); 
            categoryDisplayEl.appendChild(document.createTextNode(` ${escapeHTML(categoryName)}`)); 
        }

        return cardElement;
    }


    function renderFilteredVideos() {
        if (!videoCardsContainer) return;
        videoCardsContainer.innerHTML = ''; 

        const filteredVideos = getFilteredVideos();
        
        let feedbackEl = document.getElementById('video-grid-loading-feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'video-grid-loading-feedback';
            feedbackEl.setAttribute('aria-live', 'polite'); 
            feedbackEl.className = 'sr-only'; 
            if (videoCardsContainer.parentNode) {
                 videoCardsContainer.parentNode.appendChild(feedbackEl);
            }
        }

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) {
                noVideosFoundMessage.classList.remove('hidden');
                noVideosFoundMessage.innerHTML = `
                    <div class="col-span-full text-center text-slate-500 dark:text-slate-400 py-16">
                        <i class="fas fa-video-slash fa-4x mb-6 text-purple-400 dark:text-purple-500"></i>
                        <p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p>
                        <p class="text-lg">נסה לשנות את הסינון או מונח החיפוש.</p>
                    </div>`;
                feedbackEl.textContent = "לא נמצאו סרטונים התואמים לסינון.";
            }
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                 loadingPlaceholder.classList.add('hidden');
            }
            return;
        }

        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
            loadingPlaceholder.classList.add('hidden');
        }

        const fragment = document.createDocumentFragment();
        filteredVideos.forEach((video) => {
            const cardElement = createVideoCardElement(video);
            if (cardElement) fragment.appendChild(cardElement);
        });
        videoCardsContainer.appendChild(fragment);
        feedbackEl.textContent = `נמצאו ${filteredVideos.length} סרטונים.`;
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
            removeButton.onclick = () => {
                const popularTagEl = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(tagName)}"]`) : null;
                toggleTagSelection(tagName, popularTagEl);
            };

            tagChip.appendChild(textNode);
            tagChip.appendChild(removeButton);
            selectedTagsContainer.appendChild(tagChip);
        });
    }

    function getFilteredVideos() {
        if (!allVideos || allVideos.length === 0) return [];
        return allVideos.filter(video => {
            const categoryMatch = currentFilters.category === 'all' || video.category === currentFilters.category;
            const tagsMatch = currentFilters.tags.length === 0 || currentFilters.tags.every(filterTag => video.tags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm) {
                const searchTermLower = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = video.title.toLowerCase().includes(searchTermLower) ||
                                  video.tags.some(tag => tag.toLowerCase().includes(searchTermLower));
            }

            const hebrewContentMatch = !currentFilters.hebrewOnly || video.hebrewContent;
            return categoryMatch && tagsMatch && searchTermMatch && hebrewContentMatch;
        });
    }

    function setupEventListeners() {
        darkModeToggles.forEach(toggle => {
            toggle.addEventListener('click', toggleDarkMode);
        });

        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);

        document.querySelectorAll('#mobile-menu .nav-link, #site-footer a, header nav a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.startsWith('#') || href === 'index.html' || href === './' || href === '/' || href.startsWith('index.html#'))) {
                link.addEventListener('click', handleNavLinkClick);
            }
        });

        if (hebrewFilterToggle) {
            hebrewFilterToggle.addEventListener('change', function () {
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
                const newTagName = tagSearchInput.value.trim().toLowerCase();
                if (newTagName) {
                    const existingPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(newTagName)}"]`) : null;
                    
                    const feedbackClasses = {
                        success: ['border-green-500', 'focus:border-green-500', 'focus:ring-green-500', 'dark:border-green-400', 'dark:focus:border-green-400', 'dark:focus:ring-green-400'],
                        warning: ['border-yellow-500', 'focus:border-yellow-500', 'focus:ring-yellow-500', 'dark:border-yellow-400', 'dark:focus:border-yellow-400', 'dark:focus:ring-yellow-400']
                    };
                    
                    let currentFeedback = [];
                    if (!currentFilters.tags.includes(newTagName)) {
                        toggleTagSelection(newTagName, existingPopularTag); 
                        currentFeedback = feedbackClasses.success;
                    } else {
                        currentFeedback = feedbackClasses.warning;
                    }
                    tagSearchInput.classList.add(...currentFeedback);
                    setTimeout(() => {
                        tagSearchInput.classList.remove(...currentFeedback);
                    }, 1500); 
                }
                tagSearchInput.value = ''; 
            });
        }

        if (videoCardsContainer) {
            videoCardsContainer.addEventListener('click', function(event) {
                const playButton = event.target.closest('.play-video-button');
                if (playButton) handlePlayVideo(playButton);
            });
        }

        if (desktopSearchForm) desktopSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, desktopSearchInput));
        if (mobileSearchForm) mobileSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, mobileSearchInput));
        if (desktopSearchInput) desktopSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));
        if (mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));
    
        if (backToTopButton) {
            window.addEventListener('scroll', toggleBackToTopButtonVisibility);
            backToTopButton.addEventListener('click', scrollToTop);
        }
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
        renderFilteredVideos();
        scrollToVideoGridIfNeeded();
    }

    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = String(searchTerm).trim().toLowerCase();
            renderFilteredVideos();
            if (currentFilters.searchTerm) scrollToVideoGridIfNeeded(); 
        }, 400); 
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault(); 
        if (searchInputElement) {
            currentFilters.searchTerm = String(searchInputElement.value).trim().toLowerCase();
            renderFilteredVideos();
            searchInputElement.blur(); 
            if (currentFilters.searchTerm) scrollToVideoGridIfNeeded();
        }
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
        return String(value).replace(/"/g, '&quot;'); 
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    initializePage();
});

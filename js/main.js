document.addEventListener('DOMContentLoaded', function() {
    console.log("CAR-טיב: DOMContentLoaded event fired.");

    // --- DOM Element Selectors (Grouped for clarity) ---
    // General UI
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const videoCountHeroElement = document.getElementById('video-count-hero');
    const currentYearFooter = document.getElementById('current-year-footer');

    // Search
    const desktopSearchForm = document.getElementById('desktop-search-form');
    const mobileSearchForm = document.getElementById('mobile-search-form');
    const desktopSearchInput = document.getElementById('desktop-search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');

    // Video Display
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
    const videoCardTemplate = document.getElementById('video-card-template');

    // Categories
    const homepageCategoriesGrid = document.getElementById('homepage-categories-grid');

    // Filtering
    const hebrewFilterToggle = document.getElementById('hebrew-filter-toggle');
    const popularTagsContainer = document.getElementById('popular-tags-container');
    const tagSearchInput = document.getElementById('tag-search-input');
    const customTagForm = document.getElementById('custom-tag-form');
    const selectedTagsContainer = document.getElementById('selected-tags-container');

    // --- State and Configuration ---
    let allVideos = [];
    let currentFilters = {
        category: 'all', // Will be updated based on URL or homepage
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    const MAX_POPULAR_TAGS = 30;
    let searchDebounceTimer;

    const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "fa-magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "fa-tools", gradient: "from-green-500 to-teal-600" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "fa-oil-can", gradient: "from-blue-500 to-cyan-600" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "fa-rocket", gradient: "from-orange-500 to-red-600" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "fa-cogs", gradient: "from-yellow-500 to-amber-600" },
        { id: "troubleshooting", name: "תיקון תקלות", description: "פתרון ותיקון בעיות ותקלות", icon: "fa-microscope", gradient: "from-lime-400 to-yellow-500 dark:from-lime-500 dark:to-yellow-600" },
        { id: "collectors", name: "רכבי אספנות", description: "קלאסיקות ופנינים מוטוריות", icon: "fa-car-side", gradient: "from-red-500 to-pink-600" }
    ];

    // --- Initialization ---
    async function initializePage() {
        console.log("CAR-טיב: Initializing page...");
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
                    currentFilters.category = categoryFromURL.toLowerCase(); // Ensure category is lowercase
                    updateCategoryPageUI(currentFilters.category);
                } else {
                    // Fallback for unexpected scenarios (e.g., category.html without query param)
                    currentFilters.category = 'all';
                    if (homepageCategoriesGrid) renderHomepageCategoryButtons(); // Show categories if on a page that should have them
                    console.warn("CAR-טיב: Category page loaded without a category name, defaulting to 'all'.");
                }
                // Load popular tags based on the current context (all videos or category-specific)
                loadAndRenderPopularTags(currentFilters.category !== 'all' ? currentFilters.category : null);
                renderFilteredVideos();

            } else {
                displayErrorState("לא נטענו סרטונים. בדוק את קובץ הנתונים `data/videos.json`.");
                if (popularTagsContainer) popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
            }
        } catch (error) {
            console.error("CAR-טיב: Critical error during page initialization:", error);
            displayErrorState(`שגיאה קריטית בטעינת נתוני הסרטונים: ${error.message}`);
        }
        console.log("CAR-טיב: Page initialization complete.");
    }

    function displayErrorState(message) {
        if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
            loadingPlaceholder.innerHTML = `<div class="text-center text-red-500 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${escapeHTML(message)}</p></div>`;
        }
        if (noVideosFoundMessage && noVideosFoundMessage.classList.contains("hidden")) {
            noVideosFoundMessage.classList.remove('hidden');
            noVideosFoundMessage.innerHTML = `<div class="text-center text-slate-500 py-16"><i class="fas fa-exclamation-circle fa-4x mb-6 text-purple-400"></i><p class="text-2xl font-semibold mb-2">אופס!</p><p class="text-lg">${escapeHTML(message)}</p></div>`;
        }
    }

    function isHomePage() {
        const path = window.location.pathname;
        // More robust check for homepage, accounts for being in a subfolder like /car-tube/
        return path.endsWith('/') || path.endsWith('index.html') || path.split('/').pop() === '' || path.toLowerCase().endsWith(document.location.host.toLowerCase() + '/');
    }

    function getCategoryFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name'); // Will be lowercased when assigned to currentFilters.category
    }

    function updateCategoryPageUI(categoryId) {
        const categoryData = PREDEFINED_CATEGORIES.find(cat => cat.id.toLowerCase() === categoryId.toLowerCase());
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
        
        // Hide homepage-specific sections if on a category page
        const homepageCategoriesSection = document.getElementById('homepage-categories-section');
        if (homepageCategoriesSection) {
            homepageCategoriesSection.style.display = 'none';
        }
        const heroSection = document.querySelector('.hero-gradient');
        if(heroSection) heroSection.style.display = 'none';

    }

    // --- Data Loading ---
    async function loadLocalVideos() {
        if (loadingPlaceholder) {
            loadingPlaceholder.classList.remove('hidden');
            loadingPlaceholder.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin fa-3x mb-3 text-purple-600"></i><p class="text-lg text-slate-600">טוען סרטונים...</p></div>`;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) {
                throw new Error(`שגיאת HTTP ${response.status} בטעינת videos.json.`);
            }
            const responseText = await response.text();
            try {
                allVideos = JSON.parse(responseText);
                if (!Array.isArray(allVideos)) {
                    throw new Error("המידע בקובץ videos.json אינו מערך תקין.");
                }
                // Basic validation and normalization for each video object
                allVideos = allVideos.map((video, index) => {
                    if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' ||
                        typeof video.category !== 'string' || !Array.isArray(video.tags) ||
                        typeof video.hebrewContent !== 'boolean') {
                        console.warn(`CAR-טיב: סרטון באינדקס ${index} חסר שדות חיוניים או עם טיפוסים שגויים.`, video);
                        return null; // Mark for removal
                    }
                    // Normalize category and tags to lowercase for consistent filtering
                    return {
                        ...video,
                        category: video.category.toLowerCase(),
                        tags: video.tags.map(tag => String(tag).toLowerCase())
                    };
                }).filter(video => video !== null); // Remove invalid video objects

            } catch (jsonError) {
                throw new Error(`שגיאה בפענוח קובץ videos.json: ${jsonError.message}`);
            }

            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');

            if (videoCountHeroElement) {
                const countSpan = videoCountHeroElement.querySelector('span.font-bold');
                if (countSpan) {
                    countSpan.textContent = allVideos.length;
                } else {
                     videoCountHeroElement.innerHTML = `במאגר יש כרגע <span class="font-bold text-white">${allVideos.length}</span> סרטונים.`;
                }
            }

        } catch (error) {
            console.error("CAR-טיב: לא ניתן לטעון או לפענח את videos.json:", error);
            if (videoCountHeroElement) {
                 const countSpan = videoCountHeroElement.querySelector('span.font-bold');
                 if (countSpan) countSpan.textContent = "שגיאה";
                 else videoCountHeroElement.innerHTML = `שגיאה בטעינת מספר הסרטונים.`;
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = []; // Ensure allVideos is empty on error
            throw error; // Re-throw to be caught by initializePage
        }
    }
    
    // --- Homepage Categories Rendering ---
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
            link.className = `category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${cat.gradient || 'from-slate-700 to-slate-800'} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white`;
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

    // --- Popular Tags Rendering ---
    function loadAndRenderPopularTags(forCategoryId = null) { // forCategoryId should be lowercase
        if (!popularTagsContainer) return;
        if (!allVideos || allVideos.length === 0) {
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 text-sm">אין סרטונים לטעינת תגיות.</p>';
            return;
        }

        const tagCounts = {};
        // Filter videos if a specific category is provided (already normalized to lowercase in allVideos)
        const videosToConsider = forCategoryId && forCategoryId !== 'all'
            ? allVideos.filter(v => v.category === forCategoryId)
            : allVideos;
        
        if (videosToConsider.length === 0 && forCategoryId && forCategoryId !== 'all') {
             popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 text-sm">אין סרטונים בקטגוריה זו להצגת תגיות.</p>`;
             return;
        }

        videosToConsider.forEach(video => {
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => { // Tags in allVideos are already lowercased
                    if(tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a],[,b]) => b - a)
            .slice(0, MAX_POPULAR_TAGS)
            .map(([tag]) => tag); // tag is already lowercased

        popularTagsContainer.innerHTML = '';
        if (sortedTags.length === 0) {
            popularTagsContainer.innerHTML = `<p class="w-full text-slate-500 text-sm">לא נמצאו תגיות${forCategoryId && forCategoryId !== 'all' ? ' רלוונטיות לקטגוריה זו' : ''}.</p>`;
            return;
        }

        sortedTags.forEach(tag => { // tag is lowercased
            const tagElement = document.createElement('button');
            tagElement.className = 'tag bg-purple-100 hover:bg-purple-200 text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5';
            tagElement.dataset.tagValue = tag; // Store the lowercased tag value
            const iconClass = getIconForTag(tag); // getIconForTag expects lowercased tag
            // Display the tag (you might want to capitalize it for display if preferred)
            tagElement.innerHTML = `<i class="fas ${iconClass} opacity-80 text-xs"></i> ${escapeHTML(capitalizeFirstLetter(tag))}`;
            popularTagsContainer.appendChild(tagElement);
        });
    }
    
    function getIconForTag(tag) { // Expects lowercased tag
        const tagIcons = {
            "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "גיר": "fa-cog", "תיבת הילוכים": "fa-cog",
            "שמן מנוע": "fa-oil-can", "מצבר": "fa-car-battery", "מערכת בלימה": "fa-car-crash",
            "בדיקת רכב": "fa-stethoscope", "תחזוקה": "fa-tools", "טיפול": "fa-wrench",
            "בדיקה לפני קנייה": "fa-search-dollar", "שיפורים": "fa-rocket", "אביזרים": "fa-box-open",
            "רכב חשמלי": "fa-charging-station", "טעינה": "fa-plug", "חשמל": "fa-bolt",
            "חיישנים": "fa-rss", "מערכת בטיחות": "fa-shield-alt", "מצלמות רוורס": "fa-video",
            "תאורה": "fa-lightbulb", "מערכת מולטימדיה": "fa-music", "בקרת שיוט": "fa-road",
            "מערכות הרכב": "fa-sliders-h", "היברידי": "fa-battery-half", "בנזין": "fa-fire",
            "דיזל": "fa-gas-pump", "הנעה כפולה": "fa-compass", "רכב שטח": "fa-mountain", "שטח": "fa-mountain",
            "רכב משפחתי": "fa-car", "מיני רכב": "fa-car-side", "קלאסי": "fa-car-side",
            "רכבי אספנות": "fa-car-alt", "וואן": "fa-shuttle-van", "רכב עבודה": "fa-truck",
            "טנדר": "fa-truck-pickup", "משאית": "fa-truck-moving", "קרוואן": "fa-caravan",
            "טויוטה": "fa-horse-head", "טסלה": "fa-leaf", "יונדאי": "fa-hippo", "סובארו": "fa-paw",
            "פורד": "fa-flag-usa", "מרצדס": "fa-star", "ב.מ.וו": "fa-gem", "סקירה": "fa-search",
            "השוואה": "fa-balance-scale", "מבחן דרכים": "fa-road", "חוות דעת": "fa-comment-dots",
            "ביטוח": "fa-file-invoice-dollar", "נהיגה": "fa-person-biking", // fa-steering-wheel is Pro
            "נהיגה בטוחה": "fa-shield-heart", "אבחון": "fa-stethoscope",
            "כשל טכני": "fa-exclamation-triangle", "איתור תקלות": "fa-microscope",
            // Add more specific mappings from your JSON tags (all lowercase)
            "עשה זאת בעצמך": "fa-hand-sparkles", "הכנופיה": "fa-users-cog", "יונדאי i10": "fa-car",
            "ניקוי מצערת": "fa-spray-can-sparkles", "וסת לחץ": "fa-gauge-high", "אספנות": "fa-gem",
            "נוזל בלמים": "fa-tint"
        };
        return tagIcons[tag] || "fa-tag";
    }

    // --- Video Card Rendering ---
    function createVideoCardElement(video) {
        if (!videoCardTemplate) {
            console.error("CAR-טיב: Video card template not found.");
            return null;
        }
        if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' ||
            typeof video.category !== 'string' || !Array.isArray(video.tags)) {
            console.warn(`CAR-טיב: Skipping video due to missing/invalid data. Video:`, video);
            return null;
        }

        const cardClone = videoCardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('article');
        if (!cardElement) {
            console.error("CAR-טיב: Could not find 'article' in template clone.");
            return null;
        }

        // Activate Tailwind classes from class_exists attribute
        cardElement.querySelectorAll('[class_exists]').forEach(el => {
            el.setAttribute('class', el.getAttribute('class_exists'));
            el.removeAttribute('class_exists');
        });
        
        cardElement.dataset.category = video.category; // category is already lowercased
        cardElement.dataset.tags = video.tags.join(','); // tags are already lowercased

        const sanitizedTitle = escapeHTML(video.title);
        const videoLink = `https://www.youtube.com/watch?v=${video.id}`;
        
        const playButton = cardElement.querySelector('.play-video-button');
        if (playButton) {
            playButton.dataset.videoId = video.id;
            playButton.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);
        }
        
        const iframeEl = cardElement.querySelector('.video-iframe');
        if (iframeEl) iframeEl.title = `נגן וידאו: ${sanitizedTitle}`;
        
        const videoTitleLinkEl = cardElement.querySelector('.video-link');
        if (videoTitleLinkEl) {
            videoTitleLinkEl.href = videoLink;
            videoTitleLinkEl.textContent = sanitizedTitle;
        }
        
        const tagsContainerEl = cardElement.querySelector('.video-tags');
        if (tagsContainerEl) {
            if (video.tags && video.tags.length > 0) {
                tagsContainerEl.innerHTML = video.tags.map(tag => 
                    // Display capitalized tag for better readability
                    `<span class="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(capitalizeFirstLetter(tag))}</span>`
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
        
        return cardElement;
    }

    function renderFilteredVideos() {
        if (!videoCardsContainer) {
             console.error("CAR-טיב: Missing videoCardsContainer for rendering.");
             if (loadingPlaceholder) loadingPlaceholder.innerHTML = "שגיאה: מיכל הסרטונים לא קיים.";
             return;
        }

        videoCardsContainer.innerHTML = ''; // Clear previous videos
        const filteredVideos = getFilteredVideos();

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) {
                noVideosFoundMessage.classList.remove('hidden');
                noVideosFoundMessage.innerHTML = `
                    <div class="col-span-full text-center text-slate-500 py-16">
                        <i class="fas fa-video-slash fa-4x mb-6 text-purple-400"></i>
                        <p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p>
                        <p class="text-lg">נסה לשנות את הסינון או מונח החיפוש.</p>
                    </div>`;
            }
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) loadingPlaceholder.classList.add('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) loadingPlaceholder.classList.add('hidden');
        
        const fragment = document.createDocumentFragment();
        filteredVideos.forEach((video) => {
            const cardElement = createVideoCardElement(video);
            if (cardElement) {
                fragment.appendChild(cardElement);
            }
        });
        videoCardsContainer.appendChild(fragment); // Append all cards at once for better performance
    }
    
    function handlePlayVideo(buttonElement) {
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article');
        if (!videoCard) {
            console.error("CAR-טיב: handlePlayVideo - Could not find parent article.");
            return;
        }

        const iframe = videoCard.querySelector('.video-iframe');
        const playIconContainer = buttonElement; 

        if (iframe && videoId) {
            const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&enablejsapi=1&origin=${window.location.origin}`;
            iframe.src = videoSrc;
            iframe.classList.remove('hidden');
            if (playIconContainer) playIconContainer.style.display = 'none'; // Hide play button
        }
    }

    function renderSelectedTagsChips() {
        if (!selectedTagsContainer) return;
        selectedTagsContainer.innerHTML = '';
        currentFilters.tags.forEach(tagName => { // tagName is lowercased
            const tagChip = document.createElement('span');
            tagChip.className = 'flex items-center gap-1.5 bg-purple-600 text-white text-sm font-medium ps-3 pe-2 py-1.5 rounded-full cursor-default transition-all hover:bg-purple-700';
            
            const textNode = document.createTextNode(escapeHTML(capitalizeFirstLetter(tagName))); // Display capitalized
            
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'text-xs opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none';
            removeButton.innerHTML = `<i class="fas fa-times"></i>`;
            removeButton.setAttribute('aria-label', `הסר תגית ${escapeHTML(capitalizeFirstLetter(tagName))}`);
            removeButton.onclick = () => {
                // Find corresponding popular tag button to visually deselect it
                const popularTagEl = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(tagName)}"]`) : null;
                toggleTagSelection(tagName, popularTagEl); // tagName is already lowercased
            };
            
            tagChip.appendChild(textNode);
            tagChip.appendChild(removeButton);
            selectedTagsContainer.appendChild(tagChip);
        });
    }
    
    // --- Filtering Logic ---
    function getFilteredVideos() {
        if (!allVideos || allVideos.length === 0) return [];

        return allVideos.filter(video => {
            // video.category and video.tags are already lowercased from loadLocalVideos
            const categoryMatch = currentFilters.category === 'all' || video.category === currentFilters.category;
            
            const tagsMatch = currentFilters.tags.length === 0 || 
                              currentFilters.tags.every(filterTag => video.tags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm) { // searchTerm is already lowercased
                searchTermMatch = video.title.toLowerCase().includes(currentFilters.searchTerm) ||
                                  video.tags.some(tag => tag.includes(currentFilters.searchTerm));
            }

            const hebrewContentMatch = !currentFilters.hebrewOnly || video.hebrewContent;

            return categoryMatch && tagsMatch && searchTermMatch && hebrewContentMatch;
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Mobile Menu
        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link, #site-footer .nav-link, header nav .nav-link').forEach(link => {
            link.addEventListener('click', handleNavLinkClick);
        });
        
        // Filters
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
                    toggleTagSelection(clickedTagElement.dataset.tagValue, clickedTagElement); // tagValue is lowercased
                }
            });
        }

        if (customTagForm) {
            customTagForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const newTagName = tagSearchInput.value.trim().toLowerCase(); // Normalize to lowercase
                if (newTagName) {
                    if (!currentFilters.tags.includes(newTagName)) {
                        // Find if this tag exists as a popular tag button to update its style
                        const existingPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(newTagName)}"]`) : null;
                        toggleTagSelection(newTagName, existingPopularTag);
                    }
                }
                tagSearchInput.value = '';
            });
        }

        // Video Play
        if (videoCardsContainer) {
            videoCardsContainer.addEventListener('click', function(event) {
                const playButton = event.target.closest('.play-video-button');
                if (playButton) {
                    handlePlayVideo(playButton);
                }
            });
        }

        // Search
        if (desktopSearchForm) desktopSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, desktopSearchInput));
        if (mobileSearchForm) mobileSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, mobileSearchInput));
        if(desktopSearchInput) desktopSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));
        if(mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));

        // Smooth scroll for in-page links in header and footer (already covered by handleNavLinkClick)
        // Removed Swiper initialization as it's not used.
        // Removed sparkle effect for a cleaner UI, can be re-added if desired.
    }
    
    // --- Event Handlers ---
    function openMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('translate-x-full');
        if (backdrop) {
            backdrop.classList.remove('invisible', 'opacity-0');
            backdrop.classList.add('visible', 'opacity-100');
        }
        document.body.classList.add('overflow-hidden', 'md:overflow-auto'); // Prevent body scroll on mobile
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.add('translate-x-full');
        if (backdrop) {
            backdrop.classList.remove('visible', 'opacity-100');
            backdrop.classList.add('invisible', 'opacity-0');
        }
        document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function handleNavLinkClick(event) {
        const link = event.currentTarget;
        const href = link.getAttribute('href');

        // Close mobile menu if a link inside it is clicked
        if (link.closest('#mobile-menu')) {
            setTimeout(closeMobileMenu, 150);
        }

        // Handle active state for header navigation
        if (link.closest('header nav')) {
            document.querySelectorAll('header nav .nav-link').forEach(lnk => {
                lnk.classList.remove('active', 'text-purple-600', 'font-semibold', 'bg-purple-100');
            });
            link.classList.add('active', 'text-purple-600', 'font-semibold', 'bg-purple-100');
        }

        if (href && href.startsWith('#')) {
            event.preventDefault();
            const targetElement = document.querySelector(href);
            if (targetElement) {
                const headerElement = document.querySelector('header.sticky');
                const headerOffset = headerElement ? headerElement.offsetHeight + 20 : 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        } else if (href === 'index.html' || href === './' || (href.startsWith('/') && !href.includes('.'))) { // Basic check for homepage link
             // If it's a link to index.html from index.html, just scroll to top
            if (isHomePage() && (href === 'index.html' || href === './' || href.endsWith('/'))) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            // Allow normal navigation for other cases (e.g. category.html to index.html)
        }
    }

    function toggleTagSelection(tagName, tagElement) { // tagName is already lowercased
        const index = currentFilters.tags.indexOf(tagName);
    
        if (index > -1) { // Tag exists, remove it
            currentFilters.tags.splice(index, 1);
            if (tagElement) { // Visually deselect popular tag button
                tagElement.classList.remove('active-search-tag', 'bg-purple-600', 'text-white', 'hover:bg-purple-700');
                tagElement.classList.add('bg-purple-100', 'text-purple-700', 'hover:bg-purple-200');
            }
        } else { // Tag doesn't exist, add it
            currentFilters.tags.push(tagName);
            if (tagElement) { // Visually select popular tag button
                tagElement.classList.add('active-search-tag', 'bg-purple-600', 'text-white', 'hover:bg-purple-700');
                tagElement.classList.remove('bg-purple-100', 'text-purple-700', 'hover:bg-purple-200');
            }
        }
        renderSelectedTagsChips();
        renderFilteredVideos();
        scrollToVideoGridIfNeeded();
    }

    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = String(searchTerm).trim().toLowerCase(); // Normalize to lowercase
            renderFilteredVideos();
            if (currentFilters.searchTerm) scrollToVideoGridIfNeeded();
        }, 400);
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault();
        currentFilters.searchTerm = String(searchInputElement.value).trim().toLowerCase(); // Normalize
        renderFilteredVideos();
        searchInputElement.blur(); // Remove focus after submit
        if (currentFilters.searchTerm) scrollToVideoGridIfNeeded();
    }
        
    // --- Utility Functions ---
    function scrollToVideoGridIfNeeded() {
        const videoGridSection = document.getElementById('video-grid-section');
        if (videoGridSection) {
            const rect = videoGridSection.getBoundingClientRect();
            // Only scroll if the top of the section is below the fold or significantly above viewport
             if (rect.top < 0 || rect.top > window.innerHeight * 0.66) {
                const headerElement = document.querySelector('header.sticky'); // Ensure header is sticky
                const headerOffset = headerElement ? headerElement.offsetHeight + 20 : 80;
                const elementPosition = rect.top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        }
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

    function escapeAttributeValue(value) { // For data attributes, etc.
        return String(value).replace(/"/g, '"');
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // --- Start the application ---
    initializePage();
});

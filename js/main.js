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
        console.log("Initializing page...");
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        setupEventListeners(); // הגדר מאזיני אירועים *לפני* טעינת נתונים
        
        try {
            await loadVideos(); // טוענים את כל הוידאו
            // רק אם הסרטונים נטענו בהצלחה, נמשיך
            if (allVideos.length > 0) {
                loadAndRenderCategories();
                loadAndRenderPopularTags();
                renderFilteredVideos();
            } else {
                 console.warn("No videos loaded, skipping dependent renders.");
                 if(loadingPlaceholder) loadingPlaceholder.innerHTML = 'לא נטענו סרטונים. בדוק את קובץ הנתונים.';
                 if(noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Initialization failed due to video loading error:", error);
            if (loadingPlaceholder) loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה קריטית בטעינת נתוני הסרטונים.`;
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden'); // הצג הודעת "לא נמצאו"
        }
        
        initializeSwiper(); // אתחול ה-Swiper אחרי שהקטגוריות (אם דינמיות) נטענו
        updateFooterYear();
        console.log("Page initialization complete.");
    }

    // --- Data Loading ---
    async function loadVideos() {
        console.log("Attempting to load videos...");
        if (loadingPlaceholder) {
            loadingPlaceholder.classList.remove('hidden');
            loadingPlaceholder.innerHTML = `<i class="fas fa-spinner fa-spin fa-2x mb-3"></i><br>טוען סרטונים...`;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        try {
            const response = await fetch('data/videos.json'); 
            console.log("Fetch response status:", response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for videos.json. Path: 'data/videos.json'`);
            }
            allVideos = await response.json();
            console.log('Videos loaded successfully:', allVideos.length, allVideos); // הדפס את הנתונים לראות שהם תקינים
            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');
        } catch (error) {
            console.error("Could not load videos.json:", error);
            if (loadingPlaceholder) {
                loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת קובץ הסרטונים. ודא שהקובץ 'data/videos.json' קיים והנתיב נכון.`;
                loadingPlaceholder.classList.remove('hidden');
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = []; // אפס את המערך אם הטעינה נכשלה
            // throw error; // חשוב להמשיך לזרוק את השגיאה כדי שה-catch ב-initializePage יתפוס אותה
        }
    }
    
    // --- Categories ---
    function loadAndRenderCategories() {
        console.log("Loading and rendering categories...");
        if (!categoriesWrapper) {
            console.warn("Categories wrapper not found.");
            return;
        }
        
        // כרגע הקטגוריות מוגדרות סטטית ב-HTML בתוך categories-wrapper
        // נוודא רק שהן קיימות ושה-event listeners מחוברים (זה נעשה ב-setupEventListeners)
        const staticCategoryButtons = categoriesWrapper.querySelectorAll('.category-btn');
        if (staticCategoryButtons.length > 0) {
            console.log(`${staticCategoryButtons.length} static categories found in HTML.`);
            // ודא שהראשון אקטיבי אם אין אחר אקטיבי (למקרה שהוספת/הסרת מה-HTML)
            const कोईActive = Array.from(staticCategoryButtons).some(btn => btn.classList.contains('active'));
            if (!कोईActive && staticCategoryButtons.length > 0) {
                staticCategoryButtons[0].classList.add('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
                currentFilters.category = staticCategoryButtons[0].dataset.category || 'all';
            }
        } else {
            console.warn("No static category buttons found. Consider adding them to HTML or implementing fully dynamic category generation.");
            // אם אין כפתורים סטטיים, אפשר לייצר אותם כאן דינמית על בסיס allVideos
            // אבל כרגע נשאיר את ההנחה שהם ב-HTML
        }
        if (swiperInstance) swiperInstance.update(); // עדכן את ה-Swiper
    }

    // --- Popular Tags ---
    function loadAndRenderPopularTags() {
        console.log("Loading and rendering popular tags...");
        if (!popularTagsContainer) {
             console.warn("Popular tags container not found.");
             return;
        }
        if (allVideos.length === 0) {
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">יש לטעון סרטונים כדי להציג תגיות פופולריות.</p>';
            console.warn("Cannot render popular tags: no videos loaded.");
            return;
        }

        const tagCounts = {};
        allVideos.forEach(video => {
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => {
                    const normalizedTag = String(tag).trim(); // ודא שזה סטרינג
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
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא נמצאו תגיות להצגה.</p>';
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
        console.log("Popular tags rendered:", sortedTags.length);
    }
    
    function getIconForTag(tag) {
        // ... (פונקציה כפי שהייתה)
        const tagIcons = {
            "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "חשמל": "fa-bolt",
            "טסלה": "fa-leaf", "סקירה": "fa-search", "טיפול": "fa-wrench",
            "שטח": "fa-mountain", "קלאסי": "fa-car-side", 
            "רכבי אספנות": "fa-car-alt", "מוסטנג": "fa-horse-head", // יותר מתאים
        };
        return tagIcons[String(tag).toLowerCase()] || "fa-tag";
    }

    // --- Rendering Videos ---
    function renderFilteredVideos() {
        console.log("Rendering filtered videos with filters:", currentFilters);
        if (!videoCardsContainer) {
             console.error("Video cards container not found for rendering.");
             return;
        }
        videoCardsContainer.innerHTML = '';

        const filteredVideos = getFilteredVideos();
        console.log(`Found ${filteredVideos.length} videos after filtering.`);

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        filteredVideos.forEach(video => {
            if (videoCardTemplate) {
                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                
                cardElement.querySelectorAll('[class_exists]').forEach(el => {
                    el.setAttribute('class', el.getAttribute('class_exists'));
                    el.removeAttribute('class_exists');
                });
                
                cardElement.dataset.category = video.category;
                cardElement.dataset.tags = video.tags ? video.tags.join(',') : '';

                const sanitizedTitle = escapeHTML(video.title);
                const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

                cardElement.querySelector('.thumbnail-image').src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                cardElement.querySelector('.thumbnail-image').alt = `תמונה ממוזערת: ${sanitizedTitle}`;
                
                const playButton = cardElement.querySelector('.play-video-button');
                playButton.dataset.videoId = video.id;
                playButton.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);
                // Event listener for play button is added in setupEventListeners using delegation

                cardElement.querySelector('.video-iframe').title = sanitizedTitle;

                cardElement.querySelector('.channel-image').src = escapeHTML(video.channelImage || 'assets/images/default-channel.png');
                cardElement.querySelector('.channel-image').alt = `ערוץ: ${escapeHTML(video.channelName)}`;
                
                const videoTitleLink = cardElement.querySelector('.video-link');
                videoTitleLink.href = videoLink;
                videoTitleLink.textContent = sanitizedTitle;

                cardElement.querySelector('.channel-name').textContent = escapeHTML(video.channelName);
                cardElement.querySelector('.video-description').textContent = escapeHTML(video.description);
                
                const tagsContainer = cardElement.querySelector('.video-tags');
                if (video.tags && video.tags.length > 0) {
                    tagsContainer.innerHTML = video.tags.map(tag => 
                        `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-slate-600 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(String(tag))}</span>`
                    ).join('');
                } else {
                    tagsContainer.innerHTML = '';
                }

                cardElement.querySelector('.video-views').innerHTML = `<i class="fas fa-eye ml-1 opacity-70"></i> ${escapeHTML(video.views)}`;
                cardElement.querySelector('.video-upload-date').innerHTML = `<i class="far fa-clock ml-1 opacity-70"></i> ${escapeHTML(video.uploadDate)}`;
                
                videoCardsContainer.appendChild(cardElement);
            } else {
                console.error("Video card template not found!");
            }
        });
    }
    
    function handlePlayVideo(event, buttonElement) {
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article');
        const iframe = videoCard.querySelector('.video-iframe');
        const thumbnail = videoCard.querySelector('.thumbnail-image');

        if (iframe && videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
            iframe.classList.remove('hidden');
            if (thumbnail) thumbnail.style.display = 'none'; // עדיף להשתמש ב-style.display מאשר class hidden אם יש אנימציות
            buttonElement.style.display = 'none';
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
        // ... (אותה לוגיקה כמו קודם, לוודא שאין שגיאות עם video.tags אם הוא undefined)
        return allVideos.filter(video => {
            const categoryMatch = currentFilters.category === 'all' || video.category === currentFilters.category;
            
            const videoTags = (video.tags && Array.isArray(video.tags)) ? video.tags.map(t => String(t).toLowerCase()) : [];
            const filterTags = currentFilters.tags.map(t => String(t).toLowerCase());
            const tagsMatch = filterTags.length === 0 || filterTags.every(filterTag => videoTags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm && currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = (video.title && String(video.title).toLowerCase().includes(term)) ||
                    (video.description && String(video.description).toLowerCase().includes(term)) ||
                    (videoTags.some(tag => tag.includes(term))) ||
                    (video.channelName && String(video.channelName).toLowerCase().includes(term));
            }
            return categoryMatch && tagsMatch && searchTermMatch;
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("Setting up event listeners...");
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
                if (button && button.dataset.category) { // ודא שיש data-category
                    categoryButtonsContainer.querySelectorAll('.category-btn').forEach(btn => 
                        btn.classList.remove('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500')
                    );
                    button.classList.add('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
                    currentFilters.category = button.dataset.category;
                    renderFilteredVideos();
                }
            });
        } else {
            console.warn("Category buttons container ('#categories-wrapper') not found.");
        }
        
        if (popularTagsContainer) {
            popularTagsContainer.addEventListener('click', function(event) {
                const clickedTagElement = event.target.closest('button.tag'); // ודא שזה כפתור עם class tag
                if (clickedTagElement && clickedTagElement.dataset.tagValue) {
                    toggleTagSelection(clickedTagElement.dataset.tagValue, clickedTagElement);
                }
            });
        }  else {
            console.warn("Popular tags container ('#popular-tags-container') not found.");
        }


        if (customTagForm) {
            customTagForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const newTagName = tagSearchInput.value.trim();
                if (newTagName) {
                    const normalizedNewTag = newTagName.toLowerCase();
                    if (!currentFilters.tags.map(t=>t.toLowerCase()).includes(normalizedNewTag)) {
                        const existingPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`button.tag[data-tag-value="${escapeAttributeValue(newTagName)}"]`) : null;
                        toggleTagSelection(newTagName, existingPopularTag);
                    }
                }
                tagSearchInput.value = '';
            });
        }

        if (videoCardsContainer) { // הוספת מאזין ל-container של כרטיסי הווידאו
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

        // ... (קוד הניווט הראשי ללא שינוי)
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
                        const headerOffset = document.querySelector('header').offsetHeight + 20; 
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

        console.log("Event listeners set up.");
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
        // ... (אותה לוגיקה כמו קודם, ודא שה-classes שמוסרים/מוסיפים תואמים למה שמוגדר ב-loadAndRenderPopularTags)
        const normalizedTagName = String(tagName).toLowerCase();
        const index = currentFilters.tags.map(t => String(t).toLowerCase()).indexOf(normalizedTagName);
    
        if (index > -1) {
            currentFilters.tags.splice(index, 1);
            if (tagElement) {
                tagElement.classList.remove('active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500', 'dark:text-white');
                tagElement.classList.add('bg-purple-100', 'text-purple-700', 'dark:bg-slate-700', 'dark:text-purple-300');
            }
        } else {
            currentFilters.tags.push(tagName); // שמור את השם המקורי, לא את ה-normalized
            if (tagElement) {
                tagElement.classList.add('active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500', 'dark:text-white');
                tagElement.classList.remove('bg-purple-100', 'text-purple-700', 'dark:bg-slate-700', 'dark:text-purple-300');
            }
        }
        renderSelectedTagsChips();
        renderFilteredVideos();
    }


    let searchDebounceTimer;
    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = String(searchTerm).trim(); // ודא שזה סטרינג
            renderFilteredVideos();
        }, 350);
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault();
        currentFilters.searchTerm = String(searchInputElement.value).trim(); // ודא שזה סטרינג
        renderFilteredVideos();
        searchInputElement.blur();
    }
    
    function handleSparkleEffect(e) { /* שמור כפי שהיה */ }
    
    // --- Utility Functions ---
    function initializeSwiper() {
        if (document.querySelector('.categories-swiper')) {
            // אם ה-Swiper כבר אותחל, השמד אותו קודם
            if (swiperInstance) {
                swiperInstance.destroy(true, true);
            }
            swiperInstance = new Swiper('.categories-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 10, // אפשר להגדיל ל-12 או 14
                freeMode: {
                    enabled: true,
                    sticky: false, // נסה עם false לראות אם הגלילה יותר חלקה
                    momentumBounce: false, // מונע "קפיצה" בסוף
                },
                pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
                watchSlidesProgress: true,
                resistanceRatio: 0.85,
                observer: true, // חשוב אם התוכן משתנה
                observeParents: true, // חשוב אם התוכן משתנה
            });
            console.log("Swiper initialized/updated.");
        } else {
            console.warn("Swiper container not found for initialization.");
        }
    }


    function updateFooterYear() {
        const yearSpan = document.getElementById('current-year-footer');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return String(str); // ודא שזה תמיד מחזיר סטרינג
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str)); // השיטה הבטוחה ביותר
        return p.innerHTML;
    }

    // --- Start the application ---
    initializePage();
});

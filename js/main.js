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

        setupEventListeners();
        
        try {
            await loadVideos(); 
            if (allVideos.length > 0) {
                console.log("CAR-טיב: Videos loaded, proceeding with dependent renders.");
                loadAndRenderCategories();
                loadAndRenderPopularTags();
                renderFilteredVideos();
            } else {
                 console.warn("CAR-טיב: No videos loaded from data source. Dependent renders (categories, tags, videos) will be skipped or show empty state.");
                 if(loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) { // רק אם הוא עדיין מוצג
                    loadingPlaceholder.innerHTML = 'לא נמצאו סרטונים בקובץ הנתונים.';
                 }
                 if(noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden'); // הצג הודעת "לא נמצאו"
                 if(popularTagsContainer) popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">לא ניתן לטעון תגיות ללא סרטונים.</p>';
            }
        } catch (error) {
            console.error("CAR-טיב: Critical error during page initialization (likely video loading):", error);
            if (loadingPlaceholder && !loadingPlaceholder.classList.contains('hidden')) {
                 loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה קריטית בטעינת נתוני הסרטונים.`;
            }
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
        }
        
        initializeSwiper();
        updateFooterYear();
        console.log("CAR-טיב: Page initialization complete.");
    }

    // --- Data Loading ---
    async function loadVideos() {
        console.log("CAR-טיב: Attempting to load videos from 'data/videos.json'...");
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
            // נסה לקרוא את התגובה כטקסט קודם כדי לראות אם ה-JSON תקין
            const responseText = await response.text();
            // console.log("CAR-טיב: Raw response text from videos.json:", responseText);
            try {
                allVideos = JSON.parse(responseText);
            } catch (jsonError) {
                console.error("CAR-טיב: Error parsing JSON from videos.json:", jsonError);
                console.error("CAR-טיב: Received text that failed to parse:", responseText.substring(0, 500) + "..."); // הצג חלק מהטקסט
                throw new Error(`Invalid JSON format in videos.json. ${jsonError.message}`);
            }

            console.log(`CAR-טיב: Videos loaded successfully: ${allVideos.length} videos.`, allVideos.slice(0,2)); // הצג את שני הראשונים
            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');
        } catch (error) {
            console.error("CAR-טיב: Could not load or parse videos.json:", error);
            if (loadingPlaceholder) {
                loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת קובץ הסרטונים. ודא שהקובץ 'data/videos.json' קיים, הנתיב נכון, והתוכן הוא JSON תקין.`;
                loadingPlaceholder.classList.remove('hidden');
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = '';
            allVideos = []; // אפס אם הטעינה נכשלה כדי למנוע שגיאות המשך
            // throw error; // תפיסה ב-initializePage תטפל בהמשך
        }
    }
    
    // --- Categories ---
    function loadAndRenderCategories() {
        console.log("CAR-טיב: Loading and rendering categories...");
        if (!categoriesWrapper) {
            console.warn("CAR-טיב: Categories wrapper ('#categories-wrapper') not found.");
            return;
        }
        
        const staticCategoryButtons = categoriesWrapper.querySelectorAll('.category-btn');
        if (staticCategoryButtons.length > 0) {
            console.log(`CAR-טיב: ${staticCategoryButtons.length} static categories found in HTML.`);
            let isActiveSet = false;
            staticCategoryButtons.forEach(btn => {
                if(btn.classList.contains('active')) isActiveSet = true;
            });

            if (!isActiveSet && staticCategoryButtons.length > 0) {
                staticCategoryButtons[0].classList.add('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
                currentFilters.category = staticCategoryButtons[0].dataset.category || 'all';
                console.log("CAR-טיב: Set first category as active by default:", currentFilters.category);
            } else if (isActiveSet) {
                // אם כבר יש active, עדכן את currentFilters
                const activeBtn = categoriesWrapper.querySelector('.category-btn.active');
                if (activeBtn && activeBtn.dataset.category) {
                    currentFilters.category = activeBtn.dataset.category;
                    console.log("CAR-טיב: Found pre-selected active category:", currentFilters.category);
                }
            }
        } else {
            console.warn("CAR-טיב: No static category buttons found. Dynamic category generation from video data is not fully implemented here yet.");
        }
        if (swiperInstance) {
            swiperInstance.update();
            console.log("CAR-טיב: Swiper instance updated for categories.");
        } else {
            console.warn("CAR-טיב: Swiper instance not available for categories update.");
        }
    }

    // --- Popular Tags ---
    function loadAndRenderPopularTags() {
        console.log("CAR-טיב: Loading and rendering popular tags...");
        if (!popularTagsContainer) {
             console.warn("CAR-טיב: Popular tags container ('#popular-tags-container') not found.");
             return;
        }
        if (allVideos.length === 0) {
            popularTagsContainer.innerHTML = '<p class="w-full text-slate-500 dark:text-slate-400 text-sm">טען סרטונים כדי להציג תגיות פופולריות.</p>';
            console.warn("CAR-טיב: Cannot render popular tags because no videos are loaded.");
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
            tagElement.dataset.tagValue = tag; // חשוב לזיהוי התגית
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
        console.log("CAR-טיב: Rendering filtered videos with current filters:", currentFilters);
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
        console.log(`CAR-טיב: Found ${filteredVideos.length} videos after applying filters.`);

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');
        
        console.log(`CAR-טיב: Starting to render ${filteredVideos.length} video cards...`);

        filteredVideos.forEach((video, index) => {
            // console.log(`CAR-טיב: Rendering video ${index + 1}/${filteredVideos.length}: ID = ${video.id}, Title = ${video.title}`);
            try {
                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                
                if (!cardElement) {
                    console.error(`CAR-טיב: Could not find 'article' element in template clone for video ID: ${video.id}. Template content:`, videoCardTemplate.innerHTML);
                    return; 
                }

                cardElement.querySelectorAll('[class_exists]').forEach(el => {
                    el.setAttribute('class', el.getAttribute('class_exists'));
                    el.removeAttribute('class_exists');
                });
                
                cardElement.dataset.category = video.category;
                cardElement.dataset.tags = video.tags ? video.tags.join(',') : '';

                const sanitizedTitle = escapeHTML(video.title);
                const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

                const thumbnailImg = cardElement.querySelector('.thumbnail-image');
                if (thumbnailImg) {
                    thumbnailImg.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                    thumbnailImg.alt = `תמונה ממוזערת: ${sanitizedTitle}`;
                } else { console.warn(`CAR-טיב: .thumbnail-image not found for video ${video.id}`); }
                
                const playButton = cardElement.querySelector('.play-video-button');
                if (playButton) {
                    playButton.dataset.videoId = video.id;
                    playButton.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);
                } else { console.warn(`CAR-טיב: .play-video-button not found for video ${video.id}`); }

                const iframeEl = cardElement.querySelector('.video-iframe');
                if (iframeEl) {
                    iframeEl.title = sanitizedTitle;
                } else { console.warn(`CAR-טיב: .video-iframe not found for video ${video.id}`); }

                const channelImg = cardElement.querySelector('.channel-image');
                if (channelImg) {
                    channelImg.src = escapeHTML(video.channelImage || 'assets/images/default-channel.png'); // ודא שהתמונה הדיפולטיבית קיימת
                    channelImg.alt = `ערוץ: ${escapeHTML(video.channelName)}`;
                } else { console.warn(`CAR-טיב: .channel-image not found for video ${video.id}`); }
                
                const videoTitleLinkEl = cardElement.querySelector('.video-link');
                if (videoTitleLinkEl) {
                    videoTitleLinkEl.href = videoLink;
                    videoTitleLinkEl.textContent = sanitizedTitle;
                } else { console.warn(`CAR-טיב: .video-link not found for video ${video.id}`); }

                const channelNameEl = cardElement.querySelector('.channel-name');
                if (channelNameEl) {
                    channelNameEl.textContent = escapeHTML(video.channelName);
                } else { console.warn(`CAR-טיב: .channel-name not found for video ${video.id}`); }

                const descriptionEl = cardElement.querySelector('.video-description');
                if (descriptionEl) {
                    descriptionEl.textContent = escapeHTML(video.description);
                } else { console.warn(`CAR-טיב: .video-description not found for video ${video.id}`); }
                
                const tagsContainerEl = cardElement.querySelector('.video-tags');
                if (tagsContainerEl) {
                    if (video.tags && video.tags.length > 0) {
                        tagsContainerEl.innerHTML = video.tags.map(tag => 
                            `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-slate-600 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(String(tag))}</span>`
                        ).join('');
                    } else {
                        tagsContainerEl.innerHTML = '';
                    }
                } else { console.warn(`CAR-טיב: .video-tags not found for video ${video.id}`); }

                const viewsEl = cardElement.querySelector('.video-views');
                if (viewsEl) {
                    viewsEl.innerHTML = `<i class="fas fa-eye ml-1 opacity-70"></i> ${escapeHTML(video.views)}`;
                } else { console.warn(`CAR-טיב: .video-views not found for video ${video.id}`); }

                const uploadDateEl = cardElement.querySelector('.video-upload-date');
                if (uploadDateEl) {
                    uploadDateEl.innerHTML = `<i class="far fa-clock ml-1 opacity-70"></i> ${escapeHTML(video.uploadDate)}`;
                } else { console.warn(`CAR-טיב: .video-upload-date not found for video ${video.id}`); }
                
                videoCardsContainer.appendChild(cardElement);

            } catch (e) {
                console.error(`CAR-טיב: Error rendering card for video ID: ${video.id}`, e, video);
            }
        });
        console.log("CAR-טיב: Finished rendering video cards.");
    }
    
    function handlePlayVideo(event, buttonElement) {
        const videoId = buttonElement.dataset.videoId;
        const videoCard = buttonElement.closest('article');
        
        if (!videoCard) {
            console.error("CAR-טיב: Could not find parent article for play button:", buttonElement);
            return;
        }

        const iframe = videoCard.querySelector('.video-iframe');
        const thumbnail = videoCard.querySelector('.thumbnail-image');
        const playIconContainer = videoCard.querySelector('.play-video-button'); // הכפתור עצמו

        console.log(`CAR-טיב: Play button clicked for video ID: ${videoId}. Iframe found: ${!!iframe}, Thumbnail found: ${!!thumbnail}`);

        if (iframe && videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1`;
            iframe.classList.remove('hidden');
            if (thumbnail) thumbnail.style.display = 'none'; 
            if (playIconContainer) playIconContainer.style.display = 'none'; // הסתר גם את הכפתור
            console.log(`CAR-טיב: Iframe src set to: ${iframe.src}`);
        } else {
            if (!iframe) console.error("CAR-טיב: Iframe element not found inside video card for ID:", videoId);
            if (!videoId) console.error("CAR-טיב: Video ID not found on play button dataset.");
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
            tagChip.appendChild(removeIcon); // הוסף את האייקון אחרי הטקסט
            selectedTagsContainer.appendChild(tagChip);
        });
    }
    
    function escapeAttributeValue(value) {
        return String(value).replace(/"/g, '"'); // מספיק לרוב המקרים ב-dataset
    }

    // --- Filtering Logic ---
    function getFilteredVideos() {
        return allVideos.filter(video => {
            // ודא שלכל וידאו יש את השדות הנדרשים לפני הסינון
            const category = video.category || "";
            const videoTitle = video.title || "";
            const videoDescription = video.description || "";
            const videoChannel = video.channelName || "";
            const videoTags = (video.tags && Array.isArray(video.tags)) ? video.tags.map(t => String(t).toLowerCase()) : [];


            const categoryMatch = currentFilters.category === 'all' || category.toLowerCase() === currentFilters.category.toLowerCase();
            
            const filterTags = currentFilters.tags.map(t => String(t).toLowerCase());
            const tagsMatch = filterTags.length === 0 || filterTags.every(filterTag => videoTags.includes(filterTag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm && currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = videoTitle.toLowerCase().includes(term) ||
                    videoDescription.toLowerCase().includes(term) ||
                    videoTags.some(tag => tag.includes(term)) ||
                    videoChannel.toLowerCase().includes(term);
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
                    if (!currentFilters.tags.map(t=>t.toLowerCase()).includes(normalizedNewTag)) {
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
                // הסר אקטיב מכל הקישורים
                mainNavLinks.forEach(lnk => lnk.classList.remove('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold'));
                // הוסף אקטיב לקישור שנלחץ
                this.classList.add('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold');

                if (href && href.startsWith('#')) { // אם זה קישור עוגן פנימי
                    e.preventDefault();
                    const targetElement = document.querySelector(href);
                    if (targetElement) {
                        const headerOffset = document.querySelector('header').offsetHeight + 20; 
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                    }
                } else if (href === 'index.html' || href === './' || href === '/') { // אם זה קישור לדף הבית
                     e.preventDefault(); 
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                // אם זה קישור חיצוני (לא מתחיל ב-# ולא לדף הבית), הוא יפעל כרגיל
            });
        });
        console.log("CAR-טיב: Event listeners set up complete.");
    }
    
    // --- Event Handlers ---
    function openMobileMenu() { /* שמור כפי שהיה */ }
    function closeMobileMenu() { /* שמור כפי שהיה */ }

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
                console.log("CAR-טיב: Previous Swiper instance destroyed.");
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
        if (str === null || typeof str === 'undefined') return ''; // החזר מחרוזת ריקה אם הערך הוא null או undefined
        if (typeof str !== 'string') str = String(str); // המר למחרוזת אם זה לא

        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    // --- Start the application ---
    initializePage();
});

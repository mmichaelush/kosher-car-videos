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


    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: ''
    };
    const MAX_POPULAR_TAGS = 25;

    // --- Theme Management ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-sun text-xl text-yellow-400"></i>';
        } else {
            document.documentElement.classList.remove('dark');
            if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-moon text-xl text-purple-600"></i>';
        }
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    // --- Initialization ---
    async function initializePage() {
        // Apply initial theme
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        setupEventListeners();
        try {
            await loadVideos(); // קודם טוענים את כל הוידאו
            loadPopularTags();  // אז מייצרים את התגיות הפופולריות
            renderVideos();     // ואז מרנדרים את הוידאו
        } catch (error) {
            console.error("Initialization failed:", error);
             if (loadingPlaceholder) loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת הנתונים.`;
        }
        initializeSwiper();
        updateFooterYear();
    }

    // --- Data Loading ---
    async function loadVideos() {
        if (loadingPlaceholder) loadingPlaceholder.classList.remove('hidden');
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        try {
            const response = await fetch('data/videos.json'); // ודא שהנתיב נכון!
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for videos.json`);
            }
            allVideos = await response.json();
            console.log('Videos loaded:', allVideos.length);
            if (loadingPlaceholder) loadingPlaceholder.classList.add('hidden');
        } catch (error) {
            console.error("Could not load videos:", error);
            if (loadingPlaceholder) {
                loadingPlaceholder.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i><br>שגיאה בטעינת הסרטונים.`;
                loadingPlaceholder.classList.remove('hidden');
            }
            if (videoCardsContainer) videoCardsContainer.innerHTML = ''; // נקה אם היו שם דברים
            throw error; // זרוק את השגיאה כדי ש-initializePage יתפוס אותה
        }
    }

    function loadPopularTags() {
        if (!popularTagsContainer || allVideos.length === 0) return;

        const tagCounts = {};
        allVideos.forEach(video => {
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a],[,b]) => b - a)
            .slice(0, MAX_POPULAR_TAGS)
            .map(([tag]) => tag);

        popularTagsContainer.innerHTML = ''; // נקה תוכן קודם (כמו "טוען תגיות...")
        sortedTags.forEach(tag => {
            const tagElement = document.createElement('button');
            tagElement.className = 'tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-slate-700 dark:text-purple-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-colors text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5';
            tagElement.dataset.tagValue = tag;
            const iconClass = getIconForTag(tag);
            tagElement.innerHTML = `<i class="fas ${iconClass} opacity-80"></i> ${escapeHTML(tag)}`;
            popularTagsContainer.appendChild(tagElement);
        });
    }

    function getIconForTag(tag) {
        const tagIcons = {
            "מנוע": "fa-cogs", "בלמים": "fa-hand-paper", "חשמל": "fa-bolt",
            "טסלה": "fa-leaf", "סקירה": "fa-search", "טיפול": "fa-wrench",
            "שטח": "fa-mountain", "קלאסי": "fa-vintage-car", /* שים לב ש-vintage-car לא קיים ב-FA חינמי */
            // נשתמש ב-fa-car-side או משהו דומה
             "רכבי אספנות": "fa-car-alt", "מוסטנג": "fa-horse",
        };
        return tagIcons[tag.toLowerCase()] || "fa-tag";
    }

    // --- Rendering Functions ---
    function renderVideos() {
        if (!videoCardsContainer) return;
        videoCardsContainer.innerHTML = '';

        const filteredVideos = getFilteredVideos();

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        filteredVideos.forEach(video => {
            if (videoCardTemplate) {
                const cardClone = videoCardTemplate.content.cloneNode(true);
                const cardElement = cardClone.querySelector('article');
                
                // החלפת class_exists ב-class
                cardElement.querySelectorAll('[class_exists]').forEach(el => {
                    el.setAttribute('class', el.getAttribute('class_exists'));
                    el.removeAttribute('class_exists');
                });
                
                cardElement.dataset.category = video.category;
                cardElement.dataset.tags = video.tags.join(',');

                const sanitizedTitle = escapeHTML(video.title);
                const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

                cardElement.querySelector('.thumbnail-image').src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                cardElement.querySelector('.thumbnail-image').alt = `תמונה ממוזערת: ${sanitizedTitle}`;
                
                const playButton = cardElement.querySelector('.play-video-button');
                playButton.dataset.videoId = video.id;
                playButton.setAttribute('aria-label', `נגן את הסרטון ${sanitizedTitle}`);
                playButton.addEventListener('click', handlePlayVideo);

                cardElement.querySelector('.video-iframe').title = sanitizedTitle;

                cardElement.querySelector('.channel-image').src = escapeHTML(video.channelImage || 'assets/images/default-channel.png');
                cardElement.querySelector('.channel-image').alt = `ערוץ: ${escapeHTML(video.channelName)}`;
                
                const videoTitleLink = cardElement.querySelector('.video-link');
                videoTitleLink.href = videoLink;
                videoTitleLink.textContent = sanitizedTitle;

                cardElement.querySelector('.channel-name').textContent = escapeHTML(video.channelName);
                cardElement.querySelector('.video-description').textContent = escapeHTML(video.description);
                
                const tagsContainer = cardElement.querySelector('.video-tags');
                tagsContainer.innerHTML = video.tags.map(tag => 
                    `<span class="inline-block bg-purple-100 text-purple-700 dark:bg-slate-700 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">${escapeHTML(tag)}</span>`
                ).join('');

                cardElement.querySelector('.video-views').innerHTML = `<i class="fas fa-eye ml-1 opacity-70"></i> ${escapeHTML(video.views)}`;
                cardElement.querySelector('.video-upload-date').innerHTML = `<i class="far fa-clock ml-1 opacity-70"></i> ${escapeHTML(video.uploadDate)}`;
                
                videoCardsContainer.appendChild(cardElement);
            }
        });
    }
    
    function handlePlayVideo(event) {
        const button = event.currentTarget;
        const videoId = button.dataset.videoId;
        const videoCard = button.closest('article'); // השתנה ל-article מהתבנית
        const iframe = videoCard.querySelector('.video-iframe');
        const thumbnail = videoCard.querySelector('.thumbnail-image');

        if (iframe && videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
            iframe.classList.remove('hidden');
            if (thumbnail) thumbnail.classList.add('hidden');
            button.classList.add('hidden');
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
                const popularTagEl = popularTagsContainer ? popularTagsContainer.querySelector(`.tag[data-tag-value="${tagName}"]`) : null;
                toggleTagSelection(tagName, popularTagEl);
            };
            
            const textNode = document.createTextNode(escapeHTML(tagName));
            tagChip.appendChild(textNode);
            tagChip.appendChild(removeIcon);
            selectedTagsContainer.appendChild(tagChip);
        });
    }

    // --- Filtering Logic ---
    function getFilteredVideos() {
        return allVideos.filter(video => {
            const categoryMatch = currentFilters.category === 'all' || video.category === currentFilters.category;
            
            const tagsMatch = currentFilters.tags.length === 0 || 
                              (video.tags && currentFilters.tags.every(filterTag => 
                                video.tags.some(videoTag => videoTag.toLowerCase() === filterTag.toLowerCase())
                              ));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = (video.title && video.title.toLowerCase().includes(term)) ||
                    (video.description && video.description.toLowerCase().includes(term)) ||
                    (video.tags && video.tags.some(tag => tag.toLowerCase().includes(term))) ||
                    (video.channelName && video.channelName.toLowerCase().includes(term));
            }
            return categoryMatch && tagsMatch && searchTermMatch;
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Theme Toggle
        if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);

        // Mobile Menu
        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link').forEach(link => {
            link.addEventListener('click', () => setTimeout(closeMobileMenu, 150));
        });

        // Category Buttons
        const categoryButtonsContainer = document.querySelector('.categories-swiper .swiper-wrapper');
        if (categoryButtonsContainer) {
            categoryButtonsContainer.addEventListener('click', function(event) {
                const button = event.target.closest('.category-btn');
                if (button) {
                    document.querySelectorAll('.categories-swiper .category-btn').forEach(btn => btn.classList.remove('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500'));
                    button.classList.add('active', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
                    currentFilters.category = button.dataset.category;
                    renderVideos();
                }
            });
        }
        
        // Popular Tags
        if (popularTagsContainer) {
            popularTagsContainer.addEventListener('click', function(event) {
                const clickedTagElement = event.target.closest('.tag');
                if (clickedTagElement && clickedTagElement.dataset.tagValue) {
                    toggleTagSelection(clickedTagElement.dataset.tagValue, clickedTagElement);
                }
            });
        }

        // Custom Tag Form
        if (customTagForm) {
            customTagForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const newTagName = tagSearchInput.value.trim();
                if (newTagName) {
                    if (!currentFilters.tags.includes(newTagName)) {
                        toggleTagSelection(newTagName, popularTagsContainer.querySelector(`.tag[data-tag-value="${newTagName}"]`));
                    }
                }
                tagSearchInput.value = '';
            });
        }

        // Search Forms
        const desktopSearchInput = document.getElementById('desktop-search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');

        if (desktopSearchForm) desktopSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, desktopSearchInput));
        if (mobileSearchForm) mobileSearchForm.addEventListener('submit', (e) => handleSearchSubmit(e, mobileSearchInput));
        
        if(desktopSearchInput) desktopSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));
        if(mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearchInputDebounced(e.target.value));

        // Magic Sparkle
        document.addEventListener('mousemove', handleSparkleEffect);

        // Active Nav Link on click (main nav)
        const mainNavLinks = document.querySelectorAll('header nav .nav-link:not(#theme-toggle a)'); // Exclude theme toggle if it's a link
        mainNavLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Only for hash links, normal links will navigate away
                if (this.getAttribute('href').startsWith('#') || this.getAttribute('href') === 'index.html') {
                     // If it's a hash link, prevent default if you want to ensure smooth scroll AND active state update
                    if (this.getAttribute('href').startsWith('#')) e.preventDefault();

                    mainNavLinks.forEach(lnk => lnk.classList.remove('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold'));
                    this.classList.add('active', 'text-purple-600', 'dark:text-purple-400', 'font-semibold');

                    if (this.getAttribute('href').startsWith('#')) {
                        const targetElement = document.querySelector(this.getAttribute('href'));
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    } else if (this.getAttribute('href') === 'index.html') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
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
        const index = currentFilters.tags.indexOf(tagName);
        if (index > -1) {
            currentFilters.tags.splice(index, 1);
            if (tagElement) tagElement.classList.remove('active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
        } else {
            currentFilters.tags.push(tagName);
            if (tagElement) tagElement.classList.add('active-search-tag', 'bg-purple-600', 'text-white', 'dark:bg-purple-500');
        }
        renderSelectedTagsChips();
        renderVideos();
    }
    
    let searchDebounceTimer;
    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = searchTerm.trim();
            renderVideos();
        }, 350); // קצת יותר דיליי לחיפוש חי
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault();
        currentFilters.searchTerm = searchInputElement.value.trim();
        renderVideos();
        searchInputElement.blur(); // הסר פוקוס מהשדה
    }
    
    function handleSparkleEffect(e) { /* שמור על הפונקציה כפי שהייתה */ }

    // --- Utility Functions ---
    function initializeSwiper() {
        if (document.querySelector('.categories-swiper')) {
            new Swiper('.categories-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 12, // התאמת רווח
                freeMode: true, // מאפשר גלילה חופשית יותר
                pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
                watchSlidesProgress: true, // חשוב ל-freeMode Sticky
                // breakpoints: { /* אפשר להוסיף אם צריך */ }
            });
        }
    }

    function updateFooterYear() {
        const yearSpan = document.getElementById('current-year-footer');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return String(str); // המר לסטרינג אם לא
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    // --- Start the application ---
    initializePage();
});

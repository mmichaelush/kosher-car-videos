/ js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
    // const categoriesWrapper = document.getElementById('categories-wrapper'); // Keep if categories are dynamic
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

    let allVideos = [];
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: ''
    };
    const MAX_POPULAR_TAGS = 20; // הגבל את מספר התגיות הפופולריות שיוצגו

    // --- Initialization ---
    initializePage();

    async function initializePage() {
        setupEventListeners();
        await loadVideos(); // חשוב לטעון את הסרטונים לפני טעינת התגיות
        loadPopularTags();  // טען תגיות פופולריות מהנתונים
        renderVideos();
        initializeSwiper();
        updateFooterYear();
    }

    // --- Data Loading ---
    async function loadVideos() {
        try {
            // ודא שהנתיב לקובץ ה-JSON נכון
            const response = await fetch('../data/videos.json'); // שינוי נתיב אם הקובץ בתיקיית data
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, while fetching videos.json`);
            }
            allVideos = await response.json();
            console.log('Videos loaded:', allVideos.length);
            if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
        } catch (error) {
            console.error("Could not load videos:", error);
            if (loadingPlaceholder) loadingPlaceholder.textContent = 'שגיאה בטעינת הסרטונים. בדוק את ה-console.';
        }
    }

    function loadPopularTags() {
        if (!popularTagsContainer || allVideos.length === 0) return;

        const tagCounts = {};
        allVideos.forEach(video => {
            video.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a],[,b]) => b - a) // Sort by count descending
            .slice(0, MAX_POPULAR_TAGS) // Take top N tags
            .map(([tag]) => tag); // Get just the tag name

        popularTagsContainer.innerHTML = ''; // Clear existing static tags
        sortedTags.forEach(tag => {
            const tagElement = document.createElement('button'); // Changed to button for accessibility
            tagElement.className = 'tag focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1';
            tagElement.dataset.tagValue = tag;
            // מציאת אייקון מתאים יכולה להיות מורכבת כאן, נשאיר פשוט לעת עתה
            // או שתשמור מילון של תגיות ואייקונים
            const iconClass = getIconForTag(tag); // פונקציית עזר (דוגמה)
            tagElement.innerHTML = `<i class="fas ${iconClass} ml-1"></i> ${escapeHTML(tag)}`;
            popularTagsContainer.appendChild(tagElement);
        });
    }

    function getIconForTag(tag) {
        // מילון דוגמה. תצטרך להרחיב אותו.
        const tagIcons = {
            "מנוע": "fa-cogs",
            "בלמים": "fa-hand-paper",
            "חשמל": "fa-bolt",
            "טסלה": "fa-car-battery", // Just an example
            // ... הוסף עוד מיפויים
        };
        return tagIcons[tag] || "fa-tag"; // Default icon
    }


    // --- Rendering Functions ---
    function renderVideos() {
        if (!videoCardsContainer) {
            console.error("videoCardsContainer not found");
            return;
        }
        videoCardsContainer.innerHTML = '';

        const filteredVideos = getFilteredVideos();

        if (filteredVideos.length === 0) {
            if (noVideosFoundMessage) noVideosFoundMessage.classList.remove('hidden');
            return;
        }
        if (noVideosFoundMessage) noVideosFoundMessage.classList.add('hidden');

        filteredVideos.forEach(video => {
            const videoCard = createVideoCardElement(video);
            videoCardsContainer.appendChild(videoCard);
        });
    }

    function createVideoCardElement(video) {
        const article = document.createElement('article');
        article.className = 'video-card group bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1';
        article.dataset.category = video.category;
        article.dataset.tags = video.tags.join(',');

        const sanitizedTitle = escapeHTML(video.title);
        const sanitizedChannelName = escapeHTML(video.channelName);
        const sanitizedDescription = escapeHTML(video.description);

        // לקבלת תמונה ממוזערת איכותית יותר מיוטיוב
        const thumbnailUrl = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;


        article.innerHTML = `
            <div class="video-container aspect-video bg-black group"> <!-- aspect-video עוזר לשמור על יחס גובה-רוחב -->
                <img src="${thumbnailUrl}" alt="תמונה ממוזערת עבור ${sanitizedTitle}" class="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
                <button aria-label="נגן את הסרטון ${sanitizedTitle}" data-video-id="${video.id}" class="play-video-button absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <i class="fas fa-play-circle fa-5x text-white text-opacity-80"></i>
                </button>
                <iframe class="hidden absolute top-0 left-0 w-full h-full" loading="lazy" title="${sanitizedTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="p-5 flex flex-col flex-grow">
                <div class="flex items-start mb-3">
                    <img src="${escapeHTML(video.channelImage || 'assets/images/default-channel.png')}" alt="ערוץ: ${sanitizedChannelName}" class="flex-shrink-0 h-10 w-10 rounded-full object-cover mr-3 border">
                    <div>
                        <h3 class="font-bold text-lg mb-1 group-hover:text-purple-600 transition-colors leading-tight">
                            <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener noreferrer" class="hover:underline focus:outline-none focus:ring-1 focus:ring-purple-500 rounded">
                                ${sanitizedTitle}
                            </a>
                        </h3>
                        <p class="text-gray-600 text-sm">${sanitizedChannelName}</p>
                    </div>
                </div>
                <p class="text-gray-700 text-sm mb-3 leading-relaxed flex-grow line-clamp-3">${sanitizedDescription}</p> <!-- line-clamp-3 לקיצור טקסט ארוך -->
                <div class="flex flex-wrap mb-3 gap-1">
                    ${video.tags.map(tag => `<span class="tag !text-xs !py-0.5 !px-2 bg-purple-100 text-purple-700">${escapeHTML(tag)}</span>`).join('')}
                </div>
                <div class="flex items-center text-gray-500 text-sm mt-auto pt-2 border-t border-gray-200">
                    <span><i class="fas fa-eye ml-1"></i> ${escapeHTML(video.views)}</span>
                    <span class="mx-2" aria-hidden="true">•</span>
                    <span><i class="far fa-clock ml-1"></i> ${escapeHTML(video.uploadDate)}</span>
                </div>
            </div>
        `;
        // הוספת event listener לכפתור הנגינה
        const playButton = article.querySelector('.play-video-button');
        if(playButton) {
            playButton.addEventListener('click', handlePlayVideo);
        }
        return article;
    }

    function handlePlayVideo(event) {
        const button = event.currentTarget;
        const videoId = button.dataset.videoId;
        const videoCard = button.closest('.video-card');
        const iframe = videoCard.querySelector('iframe');
        const thumbnail = videoCard.querySelector('.video-container img');

        if (iframe && videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`; // הוספת autoplay
            iframe.classList.remove('hidden');
            if (thumbnail) thumbnail.classList.add('hidden'); // הסתר תמונה ממוזערת
            button.classList.add('hidden'); // הסתר כפתור נגינה
        }
    }


    function renderSelectedTagsChips() {
        if (!selectedTagsContainer) return;
        selectedTagsContainer.innerHTML = '';
        currentFilters.tags.forEach(tagName => {
            const tagChip = document.createElement('span');
            tagChip.className = 'tag bg-purple-600 text-white hover:bg-purple-700 cursor-default !py-1 !px-3';
            
            const removeIcon = document.createElement('i');
            removeIcon.className = 'fas fa-times ml-2 cursor-pointer text-xs opacity-75 hover:opacity-100';
            removeIcon.setAttribute('aria-label', `הסר תגית ${tagName}`);
            removeIcon.onclick = () => {
                const popularTagEl = popularTagsContainer ? popularTagsContainer.querySelector(`.tag[data-tag-value="${tagName}"]`) : null;
                toggleTagSelection(tagName, popularTagEl);
            };
            
            tagChip.textContent = escapeHTML(tagName);
            tagChip.appendChild(removeIcon);
            selectedTagsContainer.appendChild(tagChip);
        });
    }

    // --- Filtering Logic ---
    function getFilteredVideos() {
        return allVideos.filter(video => {
            const categoryMatch = currentFilters.category === 'all' || video.category === currentFilters.category;
            const tagsMatch = currentFilters.tags.length === 0 || currentFilters.tags.every(tag => video.tags.includes(tag));
            
            let searchTermMatch = true;
            if (currentFilters.searchTerm !== '') {
                const term = currentFilters.searchTerm.toLowerCase();
                searchTermMatch = video.title.toLowerCase().includes(term) ||
                    video.description.toLowerCase().includes(term) ||
                    video.tags.some(tag => tag.toLowerCase().includes(term)) ||
                    video.channelName.toLowerCase().includes(term);
            }
            return categoryMatch && tagsMatch && searchTermMatch;
        });
    }

    function updateFiltersAndRender() {
        renderVideos();
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Mobile Menu
        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const targetId = link.getAttribute('href');
                if (targetId && targetId.startsWith('#')) {
                    // Close menu slightly after to allow scroll to start
                    setTimeout(closeMobileMenu, 150);
                } else {
                    closeMobileMenu(); // For external links or non-hash links
                }
            });
        });

        // Category Buttons
        const categoryButtonsContainer = document.querySelector('.categories-swiper .swiper-wrapper');
        if (categoryButtonsContainer) {
            categoryButtonsContainer.addEventListener('click', function(event) {
                const button = event.target.closest('.category-btn');
                if (button) {
                    document.querySelectorAll('.categories-swiper .category-btn').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    currentFilters.category = button.dataset.category;
                    updateFiltersAndRender();
                }
            });
        }
        
        // Popular Tags (Event Delegation)
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
                        // If you want to add the new tag to the popular list visually (temporary):
                        // if (!popularTagsContainer.querySelector(`.tag[data-tag-value="${newTagName}"]`)) {
                        //     const newPopularTagElement = document.createElement('button');
                        //     newPopularTagElement.className = 'tag focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1';
                        //     newPopularTagElement.dataset.tagValue = newTagName;
                        //     newPopularTagElement.innerHTML = `<i class="fas fa-tag ml-1"></i> ${escapeHTML(newTagName)}`;
                        //     popularTagsContainer.appendChild(newPopularTagElement);
                        //     toggleTagSelection(newTagName, newPopularTagElement);
                        // } else {
                        //     const existingTagEl = popularTagsContainer.querySelector(`.tag[data-tag-value="${newTagName}"]`);
                        //     toggleTagSelection(newTagName, existingTagEl);
                        // }
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


        // Magic Sparkle (Mouse Move)
        document.addEventListener('mousemove', handleSparkleEffect);

        // Update active nav link on scroll
        // (This is a more complex feature, consider IntersectionObserver for accuracy)
        // For now, keep it simple with click-based active state for main nav
        const mainNavLinks = document.querySelectorAll('header nav .nav-link');
        mainNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                mainNavLinks.forEach(lnk => lnk.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // --- Event Handlers ---
    function openMobileMenu() {
        if (mobileMenu) mobileMenu.classList.add('open'); // Uses CSS transform
        if (backdrop) backdrop.classList.add('active'); // Uses CSS opacity/visibility
        document.body.style.overflow = 'hidden';
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
        if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleTagSelection(tagName, tagElement) {
        const index = currentFilters.tags.indexOf(tagName);
        if (index > -1) {
            currentFilters.tags.splice(index, 1);
            if (tagElement) tagElement.classList.remove('active-search-tag');
        } else {
            currentFilters.tags.push(tagName);
            if (tagElement) tagElement.classList.add('active-search-tag');
        }
        renderSelectedTagsChips();
        updateFiltersAndRender();
    }
    
    let searchDebounceTimer;
    function handleSearchInputDebounced(searchTerm) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = searchTerm.trim();
            updateFiltersAndRender();
        }, 300);
    }

    function handleSearchSubmit(event, searchInputElement) {
        event.preventDefault();
        currentFilters.searchTerm = searchInputElement.value.trim();
        updateFiltersAndRender();
    }
    
    function handleSparkleEffect(e) {
        if (Math.random() < 0.03) { // Further reduced frequency
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
        // ודא שה-Swiper מאותחל רק אם האלמנט קיים
        if (document.querySelector('.categories-swiper')) {
            const categoriesSwiper = new Swiper('.categories-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 10,
                pagination: { el: '.swiper-pagination', clickable: true },
                breakpoints: { 640: { spaceBetween: 12 }, 1024: { spaceBetween: 16 } }
            });
        }
    }

    function updateFooterYear() {
        const yearSpan = document.getElementById('current-year-footer'); // Changed ID to be specific
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return str;
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    console.log("CAR-טיב: Scripts loaded and DOM fully parsed.");
});

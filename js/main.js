// js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const videoCardsContainer = document.getElementById('video-cards-container');
    const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
    const noVideosFoundMessage = document.getElementById('no-videos-found');
    const categoriesWrapper = document.getElementById('categories-wrapper'); // If loading categories dynamically
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

    let allVideos = []; // To store all videos fetched from JSON
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: ''
    };

    // --- Initialization ---
    initializePage();

    async function initializePage() {
        setupEventListeners();
        await loadVideos();
        // loadCategories(); // Optional: if categories are also dynamic
        // loadPopularTags(); // Optional: if popular tags are dynamic
        renderVideos(); // Initial render of all videos
        initializeSwiper();
        updateFooterYear();
    }

    // --- Data Loading ---
    async function loadVideos() {
        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allVideos = await response.json();
            console.log('Videos loaded:', allVideos.length);
            if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
        } catch (error) {
            console.error("Could not load videos:", error);
            if (loadingPlaceholder) loadingPlaceholder.textContent = 'שגיאה בטעינת הסרטונים.';
            // Potentially display a more user-friendly error message on the page
        }
    }

    // --- Rendering Functions ---
    function renderVideos() {
        if (!videoCardsContainer) return;
        videoCardsContainer.innerHTML = ''; // Clear previous videos

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
        article.className = 'video-card group bg-white rounded-xl shadow-lg overflow-hidden flex flex-col';
        // Add data attributes for filtering
        article.dataset.category = video.category;
        article.dataset.tags = video.tags.join(',');


        // Sanitize inputs to prevent XSS if data comes from untrusted sources
        // For this example, assuming data/videos.json is trusted.
        // In a real app with user-generated content, use a sanitization library.
        const sanitizedTitle = escapeHTML(video.title);
        const sanitizedChannelName = escapeHTML(video.channelName);
        const sanitizedDescription = escapeHTML(video.description);

        article.innerHTML = `
            <div class="video-container">
                <iframe loading="lazy" src="https://www.youtube.com/embed/${video.id}" title="${sanitizedTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="p-5 flex flex-col flex-grow">
                <div class="flex items-start mb-3">
                    <img src="${escapeHTML(video.channelImage || 'assets/images/default-channel.png')}" alt="Channel: ${sanitizedChannelName}" class="flex-shrink-0 h-10 w-10 rounded-full object-cover mr-3 border">
                    <div>
                        <h3 class="font-bold text-lg mb-1 group-hover:text-purple-600 transition-colors leading-tight">
                            <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener noreferrer" class="hover:underline focus:outline-none focus:ring-1 focus:ring-purple-500 rounded">
                                ${sanitizedTitle}
                            </a>
                        </h3>
                        <p class="text-gray-600 text-sm">${sanitizedChannelName}</p>
                    </div>
                </div>
                <p class="text-gray-700 text-sm mb-3 leading-relaxed flex-grow">${sanitizedDescription}</p>
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
        return article;
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
            const searchTermMatch = currentFilters.searchTerm === '' ||
                video.title.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) ||
                video.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) ||
                video.tags.some(tag => tag.toLowerCase().includes(currentFilters.searchTerm.toLowerCase())) ||
                video.channelName.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());

            return categoryMatch && tagsMatch && searchTermMatch;
        });
    }

    function updateFiltersAndRender() {
        // This function can be called after any filter change
        renderVideos();
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Mobile Menu
        if (openMenuBtn) openMenuBtn.addEventListener('click', openMobileMenu);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
        if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
        document.querySelectorAll('#mobile-menu .nav-link').forEach(link => {
            link.addEventListener('click', () => setTimeout(closeMobileMenu, 150));
        });

        // Category Buttons (assuming they are static in HTML for now)
        document.querySelectorAll('.categories-swiper .category-btn').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('.categories-swiper .category-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                currentFilters.category = this.dataset.category;
                updateFiltersAndRender();
            });
        });
        
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
                        // Optional: Add to popular tags visually if not already there
                        // addCustomTagToPopularDisplay(newTagName); 
                        const newPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`.tag[data-tag-value="${newTagName}"]`) : null;
                        toggleTagSelection(newTagName, newPopularTag);
                    } else {
                        // If tag already selected, maybe just highlight it or do nothing
                        const existingPopularTag = popularTagsContainer ? popularTagsContainer.querySelector(`.tag.active-search-tag[data-tag-value="${newTagName}"]`) : null;
                        if (existingPopularTag) existingPopularTag.focus(); // Example: focus if already selected
                    }
                }
                tagSearchInput.value = '';
            });
        }

        // Search Forms
        if (desktopSearchForm) {
            desktopSearchForm.addEventListener('submit', handleSearchSubmit);
        }
        if (mobileSearchForm) {
            mobileSearchForm.addEventListener('submit', handleSearchSubmit);
        }
        // Optional: live search on input
        const desktopSearchInput = document.getElementById('desktop-search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        if(desktopSearchInput) desktopSearchInput.addEventListener('input', handleSearchInput);
        if(mobileSearchInput) mobileSearchInput.addEventListener('input', handleSearchInput);

        // Magic Sparkle (Mouse Move)
        document.addEventListener('mousemove', handleSparkleEffect);
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
            if (tagElement) tagElement.classList.remove('active-search-tag');
        } else {
            currentFilters.tags.push(tagName);
            if (tagElement) tagElement.classList.add('active-search-tag');
        }
        renderSelectedTagsChips();
        updateFiltersAndRender();
    }
    
    let searchDebounceTimer;
    function handleSearchInput(event) {
        const searchTerm = event.target.value;
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentFilters.searchTerm = searchTerm;
            updateFiltersAndRender();
        }, 300); // Debounce for 300ms
    }

    function handleSearchSubmit(event) {
        event.preventDefault();
        const searchInput = event.target.querySelector('input[type="search"]');
        currentFilters.searchTerm = searchInput.value.trim();
        updateFiltersAndRender();
    }
    
    function handleSparkleEffect(e) {
        if (Math.random() < 0.05) { // Reduced frequency
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
        const categoriesSwiper = new Swiper('.categories-swiper', {
            slidesPerView: 'auto',
            spaceBetween: 10,
            pagination: { el: '.swiper-pagination', clickable: true },
            breakpoints: { 640: { spaceBetween: 12 }, 1024: { spaceBetween: 16 } }
        });
    }

    function updateFooterYear() {
        const yearSpan = document.getElementById('current-year-footer');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return str; // Return non-strings as is
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    console.log("CAR-טיב: Scripts loaded and DOM fully parsed.");
});

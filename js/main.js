document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const dom = {
        body: document.body,
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        openMenuBtn: document.getElementById('open-menu'),
        closeMenuBtn: document.getElementById('close-menu'),
        mobileMenu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        liveFeedbackRegion: document.getElementById('live-feedback-region'),
        
        // Main content area
        videoCardsContainer: document.getElementById('video-cards-container'),
        noVideosFoundMessage: document.getElementById('no-videos-found'),
        
        // Templates
        videoCardTemplate: document.getElementById('video-card-template'),
        skeletonTemplate: document.getElementById('video-card-skeleton-template'),

        // Filtering controls
        filterControls: document.getElementById('filter-controls'),
        filterCounter: document.getElementById('filter-counter'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        hebrewFilterToggle: document.getElementById('hebrew-filter-toggle'),
        popularTagsContainer: document.getElementById('popular-tags-container'),
        selectedTagsContainer: document.getElementById('selected-tags-container'),
        
        // Other elements
        currentYearFooter: document.getElementById('current-year-footer'),
        homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
        backToTopButton: document.getElementById('back-to-top-btn'),
    };

    // --- State & Constants ---
    let allVideos = [];
    let fuse = null;
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: '', // This can be added back if search functionality is restored
        hebrewOnly: false,
    };
    const VIDEOS_TO_SHOW_INITIALLY = 12;
    const PREDEFINED_CATEGORIES = [
        { id: "all", name: "הכל", icon: "fa-film" },
        { id: "review", name: "סקירות רכב", icon: "fa-magnifying-glass-chart" },
        { id: "maintenance", name: "טיפולים", icon: "fa-oil-can" },
        { id: "diy", name: "עשה זאת בעצמך", icon: "fa-tools" },
        { id: "troubleshooting", name: "איתור ותיקון תקלות", icon: "fa-microscope" },
        { id: "upgrades", name: "שיפורים ושדרוגים", icon: "fa-rocket" },
        { id: "systems", name: "מערכות הרכב", icon: "fa-cogs" },
        { id: "collectors", name: "רכבי אספנות", icon: "fa-car-side" }
    ];

    // --- Initialization ---
    async function initializePage() {
        setupEventListeners();
        initializeDarkModeVisuals();
        updateFooterYear();
        showSkeletonLoader(VIDEOS_TO_SHOW_INITIALLY);
        updateLiveFeedback('טוען סרטונים...');

        const categoryFromURL = new URLSearchParams(window.location.search).get('name');
        
        try {
            await loadVideos();
            const FUSE_OPTIONS = { keys: ['title', 'tags'], threshold: 0.4 };
            fuse = new Fuse(allVideos, FUSE_OPTIONS);

            if (categoryFromURL) {
                currentFilters.category = categoryFromURL.toLowerCase();
                updateCategoryPageUI(currentFilters.category);
            } else if (dom.homepageCategoriesGrid) {
                renderHomepageCategoryButtons();
            }

            renderPopularTags();
            applyFilters(false); // Initial render without animation
        } catch (error) {
            console.error("Critical error initializing page:", error);
            displayErrorState(error.message);
            updateLiveFeedback(`שגיאה בטעינת האתר: ${error.message}`);
        }
    }

    // --- Core Logic & Rendering ---
    function applyFilters(withAnimation = true) {
        if (withAnimation) {
            showSkeletonLoader(6);
            setTimeout(() => {
                renderFilteredVideos();
                scrollToVideoGridIfNeeded();
            }, 150);
        } else {
            renderFilteredVideos();
        }
        updateFilterControls();
    }
    
    function getFilteredVideos() {
        let videos = allVideos;
        
        if (currentFilters.category !== 'all') {
            videos = videos.filter(v => v.category === currentFilters.category);
        }
        if (currentFilters.hebrewOnly) {
            videos = videos.filter(v => v.hebrewContent);
        }
        if (currentFilters.tags.length > 0) {
            videos = videos.filter(v => currentFilters.tags.every(tag => v.tags.includes(tag)));
        }
        return videos;
    }

    function renderFilteredVideos() {
        const filteredVideos = getFilteredVideos();
        dom.videoCardsContainer.innerHTML = ''; 

        if (filteredVideos.length === 0) {
            renderNoResultsMessage();
        } else {
            dom.noVideosFoundMessage.classList.add('hidden');
            const fragment = document.createDocumentFragment();
            filteredVideos.forEach(video => {
                const cardElement = createVideoCardElement(video);
                if (cardElement) fragment.appendChild(cardElement);
            });
            dom.videoCardsContainer.appendChild(fragment);
        }
        updateLiveFeedback(`נמצאו ${filteredVideos.length} סרטונים.`);
    }

    // --- UI Components & Helpers ---
    function showSkeletonLoader(count) {
        if (!dom.skeletonTemplate || !dom.videoCardsContainer) return;
        dom.videoCardsContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            fragment.appendChild(dom.skeletonTemplate.content.cloneNode(true));
        }
        dom.videoCardsContainer.appendChild(fragment);
    }
    
    function createVideoCardElement(video) {
        if (!dom.videoCardTemplate) return null;
        const cardClone = dom.videoCardTemplate.content.cloneNode(true);
        const card = cardClone.querySelector('article');
        const sanitizedTitle = video.title.replace(/</g, "<").replace(/>/g, ">");
        
        card.querySelector('.video-thumbnail-img').src = video.thumbnail;
        card.querySelector('.video-thumbnail-img').alt = `תמונה ממוזערת: ${sanitizedTitle}`;
        card.querySelector('.video-duration').textContent = video.duration || '';
        card.querySelector('.play-video-button').dataset.videoId = video.id;
        
        const videoLink = card.querySelector('.video-link');
        videoLink.href = `https://www.youtube.com/watch?v=${video.id}`;
        videoLink.textContent = sanitizedTitle;
        
        const tagsContainer = card.querySelector('.video-tags');
        if (video.tags && video.tags.length > 0) {
            tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${tag}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${capitalizeFirstLetter(tag)}</button>`
            ).join('');
        }
        return card;
    }

    function renderPopularTags() {
        if (!dom.popularTagsContainer) return;
        const videosToConsider = currentFilters.category !== 'all' ? allVideos.filter(v => v.category === currentFilters.category) : allVideos;

        const tagCounts = videosToConsider.flatMap(v => v.tags).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});

        const sortedTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 50).map(([tag]) => tag);
        
        dom.popularTagsContainer.innerHTML = sortedTags.map(tag =>
            `<button class="tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full px-3 py-1.5 text-sm font-medium" data-tag-value="${tag}">${capitalizeFirstLetter(tag)}</button>`
        ).join('');
    }

    function renderSelectedTagsChips() {
        if (!dom.selectedTagsContainer) return;
        dom.selectedTagsContainer.innerHTML = currentFilters.tags.map(tag => `
            <span class="flex items-center gap-1.5 bg-purple-600 text-white text-sm font-medium ps-3 pe-2 py-1.5 rounded-full">
                ${capitalizeFirstLetter(tag)}
                <button type="button" class="remove-tag-btn" data-tag-to-remove="${tag}" aria-label="הסר תגית ${tag}"><i class="fas fa-times text-xs"></i></button>
            </span>
        `).join('');
    }

    function updateFilterControls() {
        if(!dom.filterControls || !dom.filterCounter) return;
        const activeFilterCount = currentFilters.tags.length + (currentFilters.hebrewOnly ? 1 : 0);
        if (activeFilterCount > 0) {
            dom.filterCounter.textContent = `${activeFilterCount} סינונים פעילים`;
            dom.filterControls.classList.remove('hidden');
        } else {
            dom.filterControls.classList.add('hidden');
        }
    }
    
    function renderNoResultsMessage() {
        if (!dom.noVideosFoundMessage) return;
        dom.noVideosFoundMessage.classList.remove('hidden');
        let message = `<div class="text-center py-16"><i class="fas fa-video-slash fa-4x mb-6 text-purple-400"></i><p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים התואמים לחיפוש.</p>`;
        if (currentFilters.tags.length > 0 || currentFilters.hebrewOnly) {
            message += `<p class="text-lg">נסה לשנות את הסינון או <button id="clear-filters-from-empty" class="font-semibold text-purple-600 hover:underline">לנקות את כל הסינונים</button>.</p>`;
        }
        dom.noVideosFoundMessage.innerHTML = message + `</div>`;
    }
    
    // --- Event Handlers ---
    function handleTagClick(tagButton, fromCard = false) {
        const tagName = fromCard ? tagButton.dataset.tag : tagButton.dataset.tagValue;
        const index = currentFilters.tags.indexOf(tagName);

        if (index > -1 && !fromCard) {
            currentFilters.tags.splice(index, 1);
        } else if (index === -1) {
            currentFilters.tags.push(tagName);
        }
        
        document.querySelectorAll(`.tag[data-tag-value="${tagName}"]`).forEach(btn => btn.classList.toggle('active-search-tag', currentFilters.tags.includes(tagName)));
        renderSelectedTagsChips();
        applyFilters();
    }
    
    function resetFilters() {
        currentFilters.tags = [];
        currentFilters.hebrewOnly = false;
        if (dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = false;
        renderSelectedTagsChips();
        document.querySelectorAll('.tag.active-search-tag').forEach(t => t.classList.remove('active-search-tag'));
        applyFilters();
    }
    
    function setupEventListeners() {
        dom.darkModeToggles.forEach(toggle => toggle.addEventListener('click', initializeDarkModeVisuals));
        dom.openMenuBtn?.addEventListener('click', () => dom.mobileMenu?.classList.remove('translate-x-full'));
        dom.closeMenuBtn?.addEventListener('click', () => dom.mobileMenu?.classList.add('translate-x-full'));
        dom.backdrop?.addEventListener('click', () => dom.mobileMenu?.classList.add('translate-x-full'));
        dom.backToTopButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => dom.backToTopButton?.classList.toggle('opacity-0', window.pageYOffset <= 300));
        
        dom.hebrewFilterToggle?.addEventListener('change', e => {
            currentFilters.hebrewOnly = e.target.checked;
            applyFilters();
        });
        dom.clearFiltersBtn?.addEventListener('click', resetFilters);
        dom.popularTagsContainer?.addEventListener('click', e => e.target.closest('button.tag') && handleTagClick(e.target.closest('button.tag')));
        dom.selectedTagsContainer?.addEventListener('click', e => {
            const btn = e.target.closest('.remove-tag-btn');
            if(btn) handleTagClick(document.querySelector(`.tag[data-tag-value="${btn.dataset.tagToRemove}"]`));
        });
        dom.noVideosFoundMessage?.addEventListener('click', e => e.target.id === 'clear-filters-from-empty' && resetFilters());

        dom.videoCardsContainer?.addEventListener('click', e => {
            const playBtn = e.target.closest('.play-video-button');
            if (playBtn) {
                const iframe = playBtn.nextElementSibling;
                iframe.src = `https://www.youtube.com/embed/${playBtn.dataset.videoId}?autoplay=1`;
                iframe.classList.remove('hidden');
                playBtn.style.display = 'none';
                return;
            }
            const tagBtn = e.target.closest('.video-tag-button');
            if(tagBtn) handleTagClick(tagBtn, true);
        });
    }

    // --- Utility Functions ---
    const capitalizeFirstLetter = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    const updateLiveFeedback = msg => { if(dom.liveFeedbackRegion) dom.liveFeedbackRegion.textContent = msg; };
    const updateFooterYear = () => { if (dom.currentYearFooter) dom.currentYearFooter.textContent = new Date().getFullYear(); };
    const scrollToVideoGridIfNeeded = () => document.getElementById('video-grid-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const initializeDarkModeVisuals = () => {
        const isDark = document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches));
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        dom.darkModeToggles.forEach(toggle => {
            toggle.querySelector('.fa-moon')?.classList.toggle('hidden', isDark);
            toggle.querySelector('.fa-sun')?.classList.toggle('hidden', !isDark);
        });
    };
    
    async function loadVideos() {
        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            allVideos = await response.json();
            if(document.getElementById('video-count-hero')) document.getElementById('video-count-hero').querySelector('span').textContent = allVideos.length;
        } catch(e) {
            throw new Error('Could not load video data.');
        }
    }

    function updateCategoryPageUI(categoryId) {
        const categoryData = PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        if (!categoryData) return;
        document.title = `${categoryData.name} - CAR-טיב`;
        const pageTitle = document.getElementById('category-page-title');
        if (pageTitle) pageTitle.innerHTML = `<i class="fas ${categoryData.icon} text-purple-600 dark:text-purple-400 mr-3"></i>${categoryData.name}`;
        const breadcrumb = document.getElementById('breadcrumb-category-name');
        if (breadcrumb) breadcrumb.textContent = categoryData.name;
    }

    function renderHomepageCategoryButtons() {
        if (!dom.homepageCategoriesGrid) return;
        document.getElementById('loading-homepage-categories-skeleton')?.remove();
        dom.homepageCategoriesGrid.innerHTML = PREDEFINED_CATEGORIES.filter(c => c.id !== 'all').map(cat => `<a href="category.html?name=${cat.id}" class="category-showcase-card group block p-6 rounded-xl shadow-lg hover:shadow-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-center"><div class="h-full flex flex-col justify-center items-center"><i class="fas ${cat.icon} fa-3x mb-4"></i><h3 class="text-2xl font-semibold">${cat.name}</h3></div></a>`).join('');
    }

    function displayErrorState(message) {
        if(dom.videoCardsContainer) dom.videoCardsContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${message}</p></div>`;
    }

    initializePage();
});

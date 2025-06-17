document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const dom = {
        liveFeedbackRegion: document.getElementById('live-feedback-region'),
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        videoCardsContainer: document.getElementById('video-cards-container'),
        noVideosFoundMessage: document.getElementById('no-videos-found'),
        videoCardTemplate: document.getElementById('video-card-template'),
        skeletonTemplate: document.getElementById('video-card-skeleton-template'),
        hebrewFilterToggle: document.getElementById('hebrew-filter-toggle'),
        popularTagsContainer: document.getElementById('popular-tags-container'),
        tagSearchInput: document.getElementById('tag-search-input'),
        customTagForm: document.getElementById('custom-tag-form'),
        selectedTagsContainer: document.getElementById('selected-tags-container'),
        filterControls: document.getElementById('filter-controls'),
        filterCounter: document.getElementById('filter-counter'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        // Other elements
        body: document.body,
        openMenuBtn: document.getElementById('open-menu'),
        closeMenuBtn: document.getElementById('close-menu'),
        mobileMenu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        videoCountHero: document.getElementById('video-count-hero'),
        currentYearFooter: document.getElementById('current-year-footer'),
        homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
        backToTopButton: document.getElementById('back-to-top-btn'),
        checkYtIdLink: document.getElementById('check-yt-id-link'),
    };

    // --- State & Constants ---
    let allVideos = [];
    let fuse = null;
    let currentFilters = {
        category: 'all',
        tags: [],
        searchTerm: '',
        hebrewOnly: false
    };
    const VIDEOS_TO_SHOW_INITIALLY = 12;

    // --- Initialization ---
    async function initializePage() {
        setupEventListeners();
        initializeDarkModeVisuals();
        updateFooterYear();
        showSkeletonLoader(VIDEOS_TO_SHOW_INITIALLY);
        updateLiveFeedback('טוען אתר...');

        const categoryFromURL = new URLSearchParams(window.location.search).get('name');
        try {
            await loadVideos();
            const FUSE_OPTIONS = { keys: [{ name: 'title', weight: 0.6 }, { name: 'tags', weight: 0.3 }], threshold: 0.4, minMatchCharLength: 2 };
            fuse = new Fuse(allVideos, FUSE_OPTIONS);

            if (categoryFromURL) {
                currentFilters.category = categoryFromURL.toLowerCase();
                updateCategoryPageUI(currentFilters.category);
            } else if (dom.homepageCategoriesGrid) {
                renderHomepageCategoryButtons();
            }

            renderPopularTags();
            renderFilteredVideos();
            updateLiveFeedback('האתר נטען בהצלחה.');
        } catch (error) {
            console.error("Critical error initializing page:", error);
            displayErrorState(`שגיאה קריטית: ${error.message}`);
            updateLiveFeedback(`שגיאה בטעינת האתר: ${error.message}`);
        }
    }

    // --- Core Logic & Rendering ---
    function renderFilteredVideos() {
        const filteredVideos = getFilteredVideos();
        dom.videoCardsContainer.innerHTML = ''; // Clear skeletons or previous results

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

    function getFilteredVideos() {
        let videos = allVideos;
        if (currentFilters.searchTerm.length >= 2) {
            videos = fuse.search(currentFilters.searchTerm).map(result => result.item);
        }
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

    function applyFilters() {
        showSkeletonLoader(6);
        setTimeout(() => {
            renderFilteredVideos();
            updateFilterControls();
            scrollToVideoGridIfNeeded();
        }, 200); // Simulate network delay for better UX
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
        const channelLogo = card.querySelector('.channel-logo');
        if (video.channelImage) {
            channelLogo.src = video.channelImage;
            channelLogo.alt = `לוגו ערוץ ${video.channel}`;
            channelLogo.classList.remove('hidden');
        }
        card.querySelector('.channel-name').textContent = video.channel || '';

        const tagsContainer = card.querySelector('.video-tags');
        if (video.tags && video.tags.length > 0) {
            tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${tag}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${capitalizeFirstLetter(tag)}</button>`
            ).join('');
        }

        const categoryData = PREDEFINED_CATEGORIES.find(c => c.id === video.category);
        if (categoryData) {
            const categoryDisplay = card.querySelector('.video-category-display');
            categoryDisplay.querySelector('i').className = `fas ${categoryData.icon || 'fa-folder-open'} ml-1.5 opacity-70 text-purple-500 dark:text-purple-400`;
            categoryDisplay.append(` ${categoryData.name}`);
        }
        return card;
    }

    function renderPopularTags() {
        if (!dom.popularTagsContainer) return;
        const videosToConsider = currentFilters.category !== 'all'
            ? allVideos.filter(v => v.category === currentFilters.category)
            : allVideos;

        const tagCounts = videosToConsider.flatMap(v => v.tags).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});

        const sortedTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 50)
            .map(([tag]) => tag);
        
        dom.popularTagsContainer.innerHTML = sortedTags.map(tag =>
            `<button class="tag bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full px-3 py-1.5 text-sm font-medium" data-tag-value="${tag}">${capitalizeFirstLetter(tag)}</button>`
        ).join('');
    }

    function renderSelectedTagsChips() {
        if (!dom.selectedTagsContainer) return;
        dom.selectedTagsContainer.innerHTML = currentFilters.tags.map(tag => `
            <span class="flex items-center gap-1.5 bg-purple-600 text-white text-sm font-medium ps-3 pe-2 py-1.5 rounded-full">
                ${capitalizeFirstLetter(tag)}
                <button type="button" class="remove-tag-btn" data-tag-to-remove="${tag}" aria-label="הסר תגית ${tag}">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </span>
        `).join('');
    }

    function updateFilterControls() {
        const activeFilterCount = currentFilters.tags.length + (currentFilters.hebrewOnly ? 1 : 0);
        if (activeFilterCount > 0) {
            dom.filterCounter.textContent = `${activeFilterCount} סינונים פעילים`;
            dom.filterControls.classList.remove('hidden');
        } else {
            dom.filterControls.classList.add('hidden');
        }
    }
    
    function renderNoResultsMessage() {
        dom.noVideosFoundMessage.classList.remove('hidden');
        let message = `<div class="text-center py-16"><i class="fas fa-video-slash fa-4x mb-6 text-purple-400"></i><p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים התואמים לחיפוש.</p>`;
        if (currentFilters.tags.length > 0 || currentFilters.hebrewOnly) {
            message += `<p class="text-lg">נסה לשנות את הסינון או <button id="clear-filters-from-empty" class="font-semibold text-purple-600 hover:underline">לנקות את כל הסינונים</button>.</p>`;
        }
        message += `</div>`;
        dom.noVideosFoundMessage.innerHTML = message;
    }
    
    // --- Event Handlers & Actions ---
    function resetFilters() {
        currentFilters.tags = [];
        currentFilters.hebrewOnly = false;
        if (dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = false;
        renderSelectedTagsChips();
        dom.popularTagsContainer.querySelectorAll('.tag.active-search-tag').forEach(t => t.classList.remove('active-search-tag', 'bg-purple-600', 'text-white'));
        applyFilters();
    }
    
    function handleTagClick(tagButton) {
        const tagName = tagButton.dataset.tagValue;
        const index = currentFilters.tags.indexOf(tagName);
        if (index > -1) {
            currentFilters.tags.splice(index, 1);
            tagButton.classList.remove('active-search-tag', 'bg-purple-600', 'text-white');
        } else {
            currentFilters.tags.push(tagName);
            tagButton.classList.add('active-search-tag', 'bg-purple-600', 'text-white');
        }
        renderSelectedTagsChips();
        applyFilters();
    }
    
    // --- Setup & Utility functions ---
    function setupEventListeners() {
        dom.darkModeToggles.forEach(toggle => toggle.addEventListener('click', toggleDarkMode));
        dom.openMenuBtn?.addEventListener('click', openMobileMenu);
        dom.closeMenuBtn?.addEventListener('click', closeMobileMenu);
        dom.backdrop?.addEventListener('click', closeMobileMenu);
        dom.backToTopButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
             dom.backToTopButton?.classList.toggle('opacity-0', window.pageYOffset <= 300);
             dom.backToTopButton?.classList.toggle('invisible', window.pageYOffset <= 300);
        });

        // Filtering
        dom.hebrewFilterToggle?.addEventListener('change', e => {
            currentFilters.hebrewOnly = e.target.checked;
            applyFilters();
        });
        dom.popularTagsContainer?.addEventListener('click', e => {
            const tagButton = e.target.closest('button.tag');
            if (tagButton) handleTagClick(tagButton);
        });
        dom.clearFiltersBtn?.addEventListener('click', resetFilters);
        dom.noVideosFoundMessage?.addEventListener('click', e => {
            if(e.target.id === 'clear-filters-from-empty') resetFilters();
        });
        dom.videoCardsContainer?.addEventListener('click', e => {
             const tagButton = e.target.closest('.video-tag-button');
             if (tagButton) {
                 const tagName = tagButton.dataset.tag;
                 if (!currentFilters.tags.includes(tagName)) {
                     currentFilters.tags.push(tagName);
                     renderSelectedTagsChips();
                     applyFilters();
                 }
             }
        });
        
        // Search
        ['desktop-search-form', 'mobile-search-form', 'main-content-search-form'].forEach(id => {
            document.getElementById(id)?.addEventListener('submit', e => {
                e.preventDefault();
                const input = e.target.querySelector('input[type="search"]');
                currentFilters.searchTerm = input.value.trim();
                applyFilters();
            });
        });

        // Other functionalities
        dom.checkYtIdLink?.addEventListener('click', e => {
            e.preventDefault();
            promptAndCheckVideo();
        });
    }

    // --- Other Minor Functions ---
    const capitalizeFirstLetter = (str) => !str ? '' : str.charAt(0).toUpperCase() + str.slice(1);
    const updateLiveFeedback = (message) => { if(dom.liveFeedbackRegion) dom.liveFeedbackRegion.textContent = message; };
    const openMobileMenu = () => { dom.mobileMenu?.classList.remove('translate-x-full'); dom.backdrop?.classList.remove('invisible', 'opacity-0'); };
    const closeMobileMenu = () => { dom.mobileMenu?.classList.add('translate-x-full'); dom.backdrop?.classList.add('invisible', 'opacity-0'); };
    const updateFooterYear = () => { if (dom.currentYearFooter) dom.currentYearFooter.textContent = new Date().getFullYear(); };
    const scrollToVideoGridIfNeeded = () => document.getElementById('video-grid-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    async function loadVideos() {
        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            allVideos = await response.json();
            if (dom.videoCountHero) dom.videoCountHero.querySelector('span').textContent = allVideos.length;
        } catch(e) {
            console.error("Failed to load videos:", e);
            throw new Error('Could not load video data.');
        }
    }
    
    // ... rest of the helper functions from before (updateCategoryPageUI, etc)
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
        dom.homepageCategoriesGrid.innerHTML = PREDEFINED_CATEGORIES
            .filter(cat => cat.id !== 'all')
            .map(cat => `
                <a href="category.html?name=${cat.id}" class="category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl bg-gradient-to-br ${cat.gradient} ${cat.darkGradient || ''} text-white text-center transition-all transform hover:-translate-y-1.5">
                    <div class="flex flex-col items-center justify-center h-full min-h-[150px]">
                        <i class="fas ${cat.icon || 'fa-folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all"></i>
                        <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300">${cat.name}</h3>
                        <p class="text-sm opacity-80 mt-1">${cat.description}</p>
                    </div>
                </a>
            `).join('');
        document.getElementById('loading-homepage-categories-skeleton')?.remove();
    }

    function displayErrorState(message) {
        if(dom.videoCardsContainer) dom.videoCardsContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${message}</p></div>`;
    }

    async function promptAndCheckVideo() {
        const userInput = prompt("הכנס קישור לסרטון יוטיוב לבדיקה:");
        if (!userInput) return;
        const videoId = userInput.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/)([\w-]{11})/)?.[1] || userInput.match(/(?:https?:\/\/)?youtu\.be\/([\w-]{11})/)?.[1];
        if (videoId) {
            if (allVideos.length === 0) await loadVideos();
            const found = allVideos.find(v => v.id === videoId);
            alert(found ? `הסרטון "${found.title}" כבר קיים במאגר.` : `הסרטון אינו קיים במאגר. אפשר להוסיף!`);
        } else {
            alert("לא זוהה ID תקין של יוטיוב.");
        }
    }
    
    function handleCheckIdFromHash() {
        if(window.location.hash === '#check-yt-id') promptAndCheckVideo();
    }
    
    function initializeDarkModeVisuals() {
        const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
        dom.darkModeToggles.forEach(toggle => {
            toggle.querySelector('.fa-moon')?.classList.toggle('hidden', isDark);
            toggle.querySelector('.fa-sun')?.classList.toggle('hidden', !isDark);
        });
    }

    initializePage();
});

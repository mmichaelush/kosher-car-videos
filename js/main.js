/**
 * Main application script for CAR-TIV website.
 * Handles data fetching, rendering, filtering, search, UI interactions, and routing.
 *
 * Refactored for clarity, maintainability, and performance.
 *
 * @author Michael Ush <michaelush613@gmail.com> (with AI assistance)
 * @version 2.0.6
 */
document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // Application state
        state: {
            allVideos: [],
            categories: {
                "review": { "name": "סקירות רכב", "icon": "fa-car-on", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-review.jpg" },
                "maintenance": { "name": "טיפולים", "icon": "fa-oil-can", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-maintenance.jpg" },
                "diy": { "name": "עשה זאת בעצמך", "icon": "fa-tools", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-diy.jpg" },
                "upgrades": { "name": "שיפורים ושדרוגים", "icon": "fa-rocket", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-upgrades.jpg" },
                "troubleshooting": { "name": "איתור ותיקון תקלות", "icon": "fa-microscope", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-troubleshooting.jpg" },
                "systems": { "name": "מערכות הרכב", "icon": "fa-cogs", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-systems.jpg" },
                "collectors": { "name": "רכבי אספנות", "icon": "fa-car-side", "image": "https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/assets/images/category-collectors.jpg" }
            },
            tags: {},
            fuse: null,
            currentPage: 'home', // 'home', 'category', 'add-video', 'single-video'
            currentFilters: {
                tags: new Set(),
                hebrewOnly: false,
                searchQuery: '',
                category: null,
                videoId: null
            },
            currentSort: 'date-desc',
            activeSuggestionIndex: -1,
        },

        // DOM element cache
        elements: {},

        // Configuration
        config: {
            videosUrl: 'https://cdn.jsdelivr.net/gh/mmichaelush/kosher-car-videos.io@main/data/videos.json',
            fuseOptions: {
                keys: ['title', 'tags', 'channelName'],
                includeScore: true,
                threshold: 0.4,
                minMatchCharLength: 2,
            },
            popularTagsCount: 15,
        },

        /**
         * Initializes the entire application.
         */
        async init() {
            this.detectPage();
            this.cacheDOMElements();
            this.setupEventListeners();
            this.initDarkMode();
            this.initBackToTopButton();
            this.updateFooterYear();

            try {
                await this.fetchData();
                this.processUrlParams();
                this.initFuse();
                this.initPage();
            } catch (error) {
                console.error("Failed to initialize application:", error);
                this.showErrorState();
            }
        },

        /**
         * Determines the current page based on the body's ID or other selectors.
         */
        detectPage() {
            const path = window.location.pathname;
            if (path.includes('category.html')) {
                this.state.currentPage = 'category';
            } else if (path.includes('add-video.html')) {
                this.state.currentPage = 'add-video';
            } else {
                this.state.currentPage = 'home';
            }
        },

        /**
         * Caches frequently accessed DOM elements.
         */
        cacheDOMElements() {
            const sel = (selector) => document.querySelector(selector);
            const selAll = (selector) => document.querySelectorAll(selector);

            this.elements = {
                mainHeader: sel('#main-header'),
                mainPageContent: sel('#main-page-content'),
                singleVideoView: sel('#single-video-view'),
                videoCardsContainer: sel('#video-cards-container'),
                videoCardTemplate: sel('#video-card-template'),
                loadingPlaceholder: sel('#loading-videos-placeholder'),
                noVideosFound: sel('#no-videos-found'),
                sortBySelect: sel('#sort-by-select'),
                darkModeToggles: selAll('.dark-mode-toggle-button'),
                mobileMenu: sel('#mobile-menu'),
                mobileMenuBackdrop: sel('#mobile-menu-backdrop'),
                openMenuBtn: sel('#open-menu-btn'),
                closeMenuBtn: sel('#close-menu-btn'),
                backToTopBtn: sel('#back-to-top-btn'),
                footerYear: sel('#current-year-footer'),
                videoCountHero: sel('#video-count-hero'),
                
                // Filtering
                popularTagsContainer: sel('#popular-tags-container'),
                selectedTagsContainer: sel('#selected-tags-container'),
                hebrewFilterToggle: sel('#hebrew-filter-toggle'),
                customTagForm: sel('#custom-tag-form'),
                tagSearchInput: sel('#tag-search-input'),
                filterSummaryContainer: sel('#filter-summary-container'),
                filterSummaryText: sel('#filter-summary-text'),
                clearFiltersBtn: sel('#clear-filters-btn'),
                shareFiltersBtn: sel('#share-filters-btn'),

                // Search
                searchInputs: selAll('.search-input'),
                searchSuggestionContainers: selAll('.search-suggestions-container'),
                
                // Homepage specific
                homepageCategoriesGrid: sel('#homepage-categories-grid'),
                homepageCategoriesSkeleton: sel('#loading-homepage-categories-skeleton'),

                // Category page specific
                categoryPageTitle: sel('#category-page-title'),
                breadcrumbCategoryName: sel('#breadcrumb-category-name'),
                
                // Single Video
                singleVideoPlayerContainer: sel('#single-video-player-container'),
                singleVideoTitle: sel('#single-video-title'),
                singleVideoChannel: sel('#single-video-channel'),
                singleVideoDuration: sel('#single-video-duration'),
                singleVideoDate: sel('#single-video-date'),
                singleVideoTags: sel('#single-video-tags'),
                singleVideoShareBtn: sel('#single-video-share-btn'),

                // Add Video Page
                checkVideoLinkAddPage: sel('#check-yt-id-link-add-page'),
            };
        },

        /**
         * Sets up all event listeners for the application.
         */
        setupEventListeners() {
            // Dark Mode
            this.elements.darkModeToggles.forEach(toggle => toggle.addEventListener('click', () => this.toggleDarkMode()));

            // Mobile Menu
            this.elements.openMenuBtn?.addEventListener('click', () => this.openMobileMenu());
            this.elements.closeMenuBtn?.addEventListener('click', () => this.closeMobileMenu());
            this.elements.mobileMenuBackdrop?.addEventListener('click', () => this.closeMobileMenu());
            
            this.elements.mobileMenu?.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => this.closeMobileMenu());
            });
            
            // Sorting
            this.elements.sortBySelect?.addEventListener('change', (e) => {
                this.state.currentSort = e.target.value;
                this.renderFilteredVideos();
            });

            // Filtering
            this.elements.hebrewFilterToggle?.addEventListener('change', (e) => {
                this.state.currentFilters.hebrewOnly = e.target.checked;
                this.updateURL();
                this.renderFilteredVideos();
            });
            this.elements.customTagForm?.addEventListener('submit', (e) => {
                e.preventDefault();
                const newTag = this.elements.tagSearchInput.value.trim();
                if (newTag) {
                    this.addTagFilter(newTag);
                    this.elements.tagSearchInput.value = '';
                }
            });
            this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
            this.elements.shareFiltersBtn?.addEventListener('click', () => this.shareFilters());

            // Search
            this.elements.searchInputs.forEach(input => {
                input.addEventListener('input', (e) => this.handleSearchInput(e));
                input.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
                input.addEventListener('blur', () => this.hideAllSuggestions());
                input.closest('form').addEventListener('submit', e => e.preventDefault());
            });

            // Single Video Share
            this.elements.singleVideoShareBtn?.addEventListener('click', () => this.shareCurrentVideo());
            
            // Page specific listeners
            const checkYtLink = document.getElementById('check-yt-id-link');
            if (checkYtLink) {
                 checkYtLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.checkIfVideoExists();
                });
            }

            if (this.elements.checkVideoLinkAddPage) {
                this.elements.checkVideoLinkAddPage.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.checkIfVideoExists();
                });
            }

            // Listen for URL changes (back/forward buttons)
            window.addEventListener('popstate', () => {
                this.processUrlParams();
                this.initPage();
            });
        },
        
        /**
         * Fetches video data from the JSON file. Category data is now local.
         */
        async fetchData() {
            const videosResponse = await fetch(this.config.videosUrl);

            if (!videosResponse.ok) {
                throw new Error("Network response for videos.json was not ok.");
            }

            const videosData = await videosResponse.json();
            
            // FIX: The data uses `id` for the YouTube ID. The validation now checks for `id`.
            // Any video without an `id` is considered invalid and skipped.
            const cleanVideosData = videosData.filter(video => {
                const isValid = video && video.id;
                if (!isValid) {
                    console.warn('Skipping invalid video data (missing ID):', video);
                }
                return isValid;
            });
            
            // Pre-process videos: Add category details and parse date
            this.state.allVideos = cleanVideosData.map(video => ({
                ...video,
                // The `yt_id` field is no longer needed as we use `id` directly.
                categoryName: this.state.categories[video.category]?.name || 'ללא קטגוריה',
                categoryIcon: this.state.categories[video.category]?.icon || 'fa-folder',
                dateObj: new Date(video.dateAdded),
            }));
        },

        /**
         * Initializes the Fuse.js instance for searching.
         */
        initFuse() {
            if (window.Fuse) {
                this.state.fuse = new Fuse(this.state.allVideos, this.config.fuseOptions);
            } else {
                console.error("Fuse.js not loaded.");
            }
        },
        
        /**
         * Initializes page-specific content based on `this.state.currentPage`.
         */
        initPage() {
            // Hide all main views initially
            if(this.elements.mainPageContent) this.elements.mainPageContent.style.display = 'none';
            if(this.elements.singleVideoView) this.elements.singleVideoView.style.display = 'none';

            // Show the correct view
            if (this.state.currentPage === 'single-video' && this.state.currentFilters.videoId) {
                this.renderSingleVideo(this.state.currentFilters.videoId);
            } else if (this.state.currentPage === 'home') {
                this.renderHomepage();
            } else if (this.state.currentPage === 'category') {
                this.renderCategoryPage();
            } else if (this.state.currentPage === 'add-video') {
                this.renderAddVideoPage();
            }
        },

        renderHomepage() {
            this.elements.mainPageContent.style.display = 'block';
            if (this.elements.loadingPlaceholder) this.elements.loadingPlaceholder.textContent = 'טוען סרטונים...';
            this.updateVideoCount();
            this.renderHomepageCategories();
            this.renderPopularTags();
            this.renderFilteredVideos();
            this.updateActiveNavLinks();
        },

        renderCategoryPage() {
            const categoryKey = this.state.currentFilters.category;
            const category = this.state.categories[categoryKey];
            if (!category) {
                this.elements.mainPageContent.innerHTML = '<p class="text-center text-xl py-10">קטגוריה לא נמצאה.</p>';
                this.elements.mainPageContent.style.display = 'block';
                return;
            }
            
            this.elements.mainPageContent.style.display = 'block';
            if (this.elements.loadingPlaceholder) this.elements.loadingPlaceholder.textContent = `טוען סרטונים בקטגוריית ${category.name}...`;
            
            document.title = `${category.name} - CAR-טיב`;
            this.elements.categoryPageTitle.innerHTML = `<i class="fas ${category.icon} text-purple-600 dark:text-purple-400 mr-4"></i> ${category.name}`;
            this.elements.breadcrumbCategoryName.textContent = category.name;

            this.renderPopularTags(categoryKey);
            this.renderFilteredVideos();
        },
        
        renderAddVideoPage() {
            this.elements.mainPageContent.style.display = 'block';
        },

        renderSingleVideo(videoId) {
            const video = this.state.allVideos.find(v => v.id === videoId);
            if (!video) {
                this.elements.mainPageContent.innerHTML = '<p class="text-center text-xl py-10">סרטון לא נמצא.</p>';
                this.elements.mainPageContent.style.display = 'block';
                return;
            }

            this.elements.mainPageContent.style.display = 'none';
            this.elements.singleVideoView.style.display = 'block';

            document.title = `${video.title} - CAR-טיב`;
            this.elements.singleVideoTitle.textContent = video.title;
            // FIX: Use `video.id` for the YouTube embed URL. Removed redundant `allowfullscreen`.
            this.elements.singleVideoPlayerContainer.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`;
            
            this.elements.singleVideoChannel.innerHTML = `<img src="${video.channelLogo}" alt="${video.channelName}" class="h-7 w-7 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"/><span>${video.channelName}</span>`;
            this.elements.singleVideoDuration.innerHTML = `<i class="fas fa-clock fa-fw"></i> ${this.formatDuration(video.duration)}`;
            this.elements.singleVideoDate.innerHTML = `<i class="fas fa-calendar-alt fa-fw"></i> ${this.formatDate(video.dateObj)}`;
            
            this.elements.singleVideoTags.innerHTML = video.tags.map(tag => 
                `<a href="index.html?tags=${encodeURIComponent(tag)}" class="tag bg-purple-100 text-purple-800 dark:bg-slate-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm hover:bg-purple-200 dark:hover:bg-slate-600 transition-colors">${tag}</a>`
            ).join('');

            window.scrollTo(0, 0);
        },

        /**
         * Main render function for the video grid.
         */
        renderFilteredVideos() {
            if (!this.elements.videoCardsContainer) return;

            let videosToDisplay = [...this.state.allVideos];

            // 1. Filter by Category (for category page)
            if (this.state.currentPage === 'category' && this.state.currentFilters.category) {
                videosToDisplay = videosToDisplay.filter(v => v.category === this.state.currentFilters.category);
            }

            // 2. Filter by Search Query
            if (this.state.currentFilters.searchQuery && this.state.fuse) {
                const searchResults = this.state.fuse.search(this.state.currentFilters.searchQuery);
                const videoIds = new Set(searchResults.map(result => result.item.id));
                videosToDisplay = videosToDisplay.filter(v => videoIds.has(v.id));
            }

            // 3. Filter by Tags
            if (this.state.currentFilters.tags.size > 0) {
                videosToDisplay = videosToDisplay.filter(video => {
                    const videoTags = new Set(video.tags.map(t => t.toLowerCase()));
                    return [...this.state.currentFilters.tags].every(filterTag => videoTags.has(filterTag.toLowerCase()));
                });
            }

            // 4. Filter by Language
            if (this.state.currentFilters.hebrewOnly) {
                videosToDisplay = videosToDisplay.filter(video => video.isHebrew);
            }

            // 5. Sort
            videosToDisplay = this.sortVideos(videosToDisplay, this.state.currentSort);

            // 6. Render
            this.displayVideos(videosToDisplay);
            this.updateFilterSummary(videosToDisplay.length);
        },
        
        /**
         * Displays a list of video objects in the grid.
         * @param {Array} videos - The array of video objects to display.
         */
        displayVideos(videos) {
            this.elements.videoCardsContainer.innerHTML = '';
            
            if (this.elements.loadingPlaceholder) this.elements.loadingPlaceholder.style.display = 'none';

            if (videos.length === 0) {
                this.elements.noVideosFound.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-car-crash fa-3x text-slate-400 dark:text-slate-500 mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">אוי, לא מצאנו כלום!</h3>
                        <p class="text-slate-500 dark:text-slate-400">נסה לשנות את הסינון או לחפש מונח אחר.</p>
                    </div>`;
                this.elements.noVideosFound.style.display = 'block';
            } else {
                this.elements.noVideosFound.style.display = 'none';
                const fragment = document.createDocumentFragment();
                videos.forEach(video => {
                    const card = this.createVideoCard(video);
                    fragment.appendChild(card);
                });
                this.elements.videoCardsContainer.appendChild(fragment);
            }
        },

        /**
         * Creates a single video card element from a video object.
         * @param {Object} video - The video data object.
         * @returns {HTMLElement} - The article element for the video card.
         */
        createVideoCard(video) {
            const cardClone = this.elements.videoCardTemplate.content.cloneNode(true);
            const card = cardClone.querySelector('article');

            const videoLink = `index.html?video=${video.id}`;
            const videoTitleEl = card.querySelector('.video-title a');
            
            // FIX: Use `video.id` for thumbnail URL.
            card.querySelector('.video-thumbnail-img').src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
            card.querySelector('.video-thumbnail-img').alt = video.title;
            card.querySelector('.video-duration').textContent = this.formatDuration(video.duration);
            
            videoTitleEl.textContent = video.title;
            videoTitleEl.href = videoLink;

            card.querySelector('.video-link').href = videoLink; // For single video page
            card.querySelector('.video-play-link').href = videoLink;

            card.querySelector('.channel-logo').src = video.channelLogo;
            card.querySelector('.channel-logo').alt = video.channelName;
            card.querySelector('.channel-name').textContent = video.channelName;
            
            // FIX: Use `video.id` for the new tab link.
            card.querySelector('.new-tab-btn').href = `https://www.youtube.com/watch?v=${video.id}`;
            
            card.querySelector('.video-category-display').innerHTML += `<span>${video.categoryName}</span>`;
            card.querySelector('.video-category-icon').classList.add(video.categoryIcon);
            
            card.querySelector('.video-date-display').innerHTML += `<span>${this.formatDate(video.dateObj)}</span>`;
            
            const tagsContainer = card.querySelector('.video-tags');
            tagsContainer.innerHTML = (video.tags || []).slice(0, 3).map(tag =>
                `<span class="tag bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">${tag}</span>`
            ).join('');

            // Event listeners for card buttons
            card.querySelector('.share-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.shareVideo(video);
            });

            card.querySelector('.fullscreen-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.playInFullscreen(card.querySelector('.video-thumbnail-container'), video);
            });

            return card;
        },

        /**
         * Renders the category grid on the homepage.
         */
        renderHomepageCategories() {
            if (!this.elements.homepageCategoriesGrid) return;
            
            this.elements.homepageCategoriesGrid.innerHTML = '';
            
            Object.entries(this.state.categories).forEach(([key, category]) => {
                const categoryCard = document.createElement('a');
                categoryCard.href = `category.html?name=${key}`;
                categoryCard.className = 'group relative flex flex-col justify-end items-start p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 overflow-hidden';
                categoryCard.innerHTML = `
                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110" style="background-image: url('${category.image}')"></div>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div class="relative z-10">
                        <i class="fas ${category.icon} fa-2x text-white opacity-80 mb-2"></i>
                        <h3 class="text-2xl font-bold text-white">${category.name}</h3>
                        <p class="text-purple-300 group-hover:underline">${this.countVideosInCategory(key)} סרטונים</p>
                    </div>
                `;
                this.elements.homepageCategoriesGrid.appendChild(categoryCard);
            });
            if (this.elements.homepageCategoriesSkeleton) this.elements.homepageCategoriesSkeleton.style.display = 'none';
        },

        /**
         * Renders the most popular tags in the filter section.
         * @param {string|null} categoryKey - Optional category to scope the tags.
         */
        renderPopularTags(categoryKey = null) {
            if (!this.elements.popularTagsContainer) return;

            let sourceVideos = categoryKey 
                ? this.state.allVideos.filter(v => v.category === categoryKey)
                : this.state.allVideos;
            
            const tagCounts = sourceVideos
                .flatMap(video => video.tags || [])
                .reduce((acc, tag) => {
                    const lowerTag = tag.toLowerCase();
                    acc[lowerTag] = (acc[lowerTag] || 0) + 1;
                    return acc;
                }, {});

            const sortedTags = Object.entries(tagCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, this.config.popularTagsCount);
            
            this.elements.popularTagsContainer.innerHTML = sortedTags.map(([tag]) => {
                const isActive = this.state.currentFilters.tags.has(tag);
                return `<button class="tag capitalize px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'active-search-tag' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}" data-tag="${tag}">${tag}</button>`;
            }).join('');
            
            // Add event listeners to new tag buttons
            this.elements.popularTagsContainer.querySelectorAll('.tag').forEach(tagEl => {
                tagEl.addEventListener('click', () => this.toggleTagFilter(tagEl.dataset.tag));
            });
        },
        
        /**
         * Adds a tag to the current filter set and re-renders.
         * @param {string} tag - The tag to add.
         */
        addTagFilter(tag) {
            const lowerTag = tag.toLowerCase();
            if (this.state.currentFilters.tags.has(lowerTag)) return; // Avoid duplicates

            this.state.currentFilters.tags.add(lowerTag);
            this.updateURL();
            this.renderSelectedTags();
            this.renderFilteredVideos();
        },

        /**
         * Removes a tag from the current filter set and re-renders.
         * @param {string} tag - The tag to remove.
         */
        removeTagFilter(tag) {
            this.state.currentFilters.tags.delete(tag.toLowerCase());
            this.updateURL();
            this.renderSelectedTags();
            this.renderFilteredVideos();
        },

        /**
         * Toggles a tag in the filter.
         * @param {string} tag - The tag to toggle.
         */
        toggleTagFilter(tag) {
            const lowerTag = tag.toLowerCase();
            if (this.state.currentFilters.tags.has(lowerTag)) {
                this.removeTagFilter(lowerTag);
            } else {
                this.addTagFilter(lowerTag);
            }
        },

        /**
         * Renders the currently selected filter tags.
         */
        renderSelectedTags() {
            if (!this.elements.selectedTagsContainer) return;
            
            this.elements.selectedTagsContainer.innerHTML = [...this.state.currentFilters.tags].map(tag =>
                `<span class="selected-tag capitalize inline-flex items-center gap-2 bg-purple-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                    ${tag}
                    <button class="remove-tag-btn text-purple-200 hover:text-white" data-tag="${tag}">×</button>
                </span>`
            ).join('');

            // Add event listeners for remove buttons
            this.elements.selectedTagsContainer.querySelectorAll('.remove-tag-btn').forEach(btn => {
                btn.addEventListener('click', () => this.removeTagFilter(btn.dataset.tag));
            });
        },
        
        /**
         * Clears all active filters and re-renders.
         */
        clearFilters() {
            this.state.currentFilters.tags.clear();
            this.state.currentFilters.hebrewOnly = false;
            this.state.currentFilters.searchQuery = '';
            
            if (this.elements.hebrewFilterToggle) this.elements.hebrewFilterToggle.checked = false;
            this.elements.searchInputs.forEach(input => input.value = '');
            
            this.updateURL();
            this.renderSelectedTags();
            this.renderFilteredVideos();
            this.renderPopularTags(this.state.currentPage === 'category' ? this.state.currentFilters.category : null);
        },

        /**
         * Updates the filter summary text and visibility.
         * @param {number} count - The number of results found.
         */
        updateFilterSummary(count) {
            if (!this.elements.filterSummaryContainer) return;

            const hasFilters = this.state.currentFilters.tags.size > 0 || this.state.currentFilters.hebrewOnly;

            if (hasFilters) {
                this.elements.filterSummaryContainer.style.display = 'block';
                this.elements.filterSummaryText.textContent = `נמצאו ${count} סרטונים`;
            } else {
                this.elements.filterSummaryContainer.style.display = 'none';
            }
        },

        // --- URL and Routing --- //

        /**
         * Processes URL parameters on page load to set initial filters.
         */
        processUrlParams() {
            const params = new URLSearchParams(window.location.search);
            let needsRender = false;

            // Handle single video view
            if (params.has('video')) {
                this.state.currentPage = 'single-video';
                this.state.currentFilters.videoId = params.get('video');
                return; // Stop processing other params
            } else {
                // If we were on a single video page and now we are not, reset page type
                if(this.state.currentPage === 'single-video') {
                     this.state.currentPage = 'home';
                }
            }
            
            // Handle category page
            if (this.state.currentPage === 'category' && params.has('name')) {
                this.state.currentFilters.category = params.get('name');
                needsRender = true;
            }

            // Handle filters
            if (params.has('tags')) {
                const tags = params.get('tags').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                this.state.currentFilters.tags = new Set(tags);
                needsRender = true;
            }

            if (params.has('hebrewOnly')) {
                this.state.currentFilters.hebrewOnly = params.get('hebrewOnly') === 'true';
                if (this.elements.hebrewFilterToggle) this.elements.hebrewFilterToggle.checked = true;
                needsRender = true;
            }

            if (params.has('sort')) {
                const sortValue = params.get('sort');
                if (this.elements.sortBySelect) {
                    this.elements.sortBySelect.value = sortValue;
                    this.state.currentSort = sortValue;
                    needsRender = true;
                }
            }
            
            if(params.has('q')) {
                const query = params.get('q');
                this.state.currentFilters.searchQuery = query;
                this.elements.searchInputs.forEach(input => input.value = query);
                needsRender = true;
            }

            // If any params were processed, apply them
            if (needsRender) {
                this.renderSelectedTags();
            }
        },

        /**
         * Updates the browser URL with the current filters.
         */
        updateURL() {
            if(this.state.currentPage === 'single-video') return; // Don't update URL on single video page interactions
            
            const params = new URLSearchParams();
            
            if (this.state.currentFilters.tags.size > 0) {
                params.set('tags', [...this.state.currentFilters.tags].join(','));
            }
            if (this.state.currentFilters.hebrewOnly) {
                params.set('hebrewOnly', 'true');
            }
            if (this.state.currentSort !== 'date-desc') {
                params.set('sort', this.state.currentSort);
            }
            if (this.state.currentFilters.searchQuery) {
                params.set('q', this.state.currentFilters.searchQuery);
            }
            
            let url = window.location.pathname;
            if (this.state.currentPage === 'category' && this.state.currentFilters.category) {
                 params.set('name', this.state.currentFilters.category);
            }

            const newUrl = `${url}?${params.toString()}`;
            // Use replaceState to avoid cluttering browser history for every filter change
            window.history.replaceState({ path: newUrl }, '', newUrl);
        },
        
        // --- Search --- //
        
        handleSearchInput(e) {
            const query = e.target.value.trim();
            this.state.currentFilters.searchQuery = query;

            if (query.length < 2) {
                this.hideAllSuggestions();
                this.renderFilteredVideos();
                this.updateURL();
                return;
            }
            
            const results = this.state.fuse.search(query).slice(0, 5);
            this.displaySuggestions(results, e.target);
            this.renderFilteredVideos();
            this.updateURL();
        },

        displaySuggestions(results, inputElement) {
            const container = inputElement.closest('form').querySelector('.search-suggestions-container');
            const list = container.querySelector('ul');
            list.innerHTML = '';
            
            if(results.length === 0) {
                container.style.display = 'none';
                return;
            }

            results.forEach(result => {
                const li = document.createElement('li');
                li.className = 'px-4 py-2 cursor-pointer hover:bg-purple-50 dark:hover:bg-slate-700';
                li.textContent = result.item.title;
                li.addEventListener('mousedown', () => { // mousedown fires before blur
                    inputElement.value = result.item.title;
                    this.state.currentFilters.searchQuery = result.item.title;
                    this.hideAllSuggestions();
                    this.renderFilteredVideos();
                    this.updateURL();
                });
                list.appendChild(li);
            });
            
            container.style.display = 'block';
        },
        
        hideAllSuggestions() {
            this.elements.searchSuggestionContainers.forEach(c => c.style.display = 'none');
        },
        
        handleSearchKeydown(e) {
            const container = e.target.closest('form').querySelector('.search-suggestions-container');
            if (container.style.display === 'none') return;
            
            const suggestions = container.querySelectorAll('li');
            if(suggestions.length === 0) return;

            let { activeSuggestionIndex } = this.state;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestionIndex > -1) {
                    suggestions[activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown'));
                }
            } else if (e.key === 'Escape') {
                this.hideAllSuggestions();
            }

            suggestions.forEach((li, index) => {
                li.classList.toggle('active-suggestion', index === activeSuggestionIndex);
            });

            this.state.activeSuggestionIndex = activeSuggestionIndex;
        },

        // --- UI Interactions --- //
        
        openMobileMenu() {
            this.elements.mobileMenu.classList.remove('translate-x-full');
            this.elements.mobileMenuBackdrop.classList.remove('invisible', 'opacity-0');
            document.body.style.overflow = 'hidden';
        },

        closeMobileMenu() {
            this.elements.mobileMenu.classList.add('translate-x-full');
            this.elements.mobileMenuBackdrop.classList.add('invisible', 'opacity-0');
            document.body.style.overflow = '';
        },

        initDarkMode() {
            const toggleIcons = (isDark) => {
                this.elements.darkModeToggles.forEach(toggle => {
                    const sunIcon = toggle.querySelector('.fa-sun');
                    const moonIcon = toggle.querySelector('.fa-moon');
                    const dot = toggle.querySelector('.dot');
                    if (sunIcon && moonIcon) {
                        sunIcon.style.display = isDark ? 'inline-block' : 'none';
                        moonIcon.style.display = isDark ? 'none' : 'inline-block';
                    }
                    if (dot) {
                        dot.style.transform = isDark ? 'translateX(-100%)' : '';
                    }
                    toggle.setAttribute('aria-checked', isDark);
                });
            };

            const userPreference = localStorage.getItem('theme');
            const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = userPreference === 'dark' || (userPreference === null && systemPreference);

            document.documentElement.classList.toggle('dark', isDark);
            toggleIcons(isDark);
        },

        toggleDarkMode() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            this.initDarkMode(); // Re-run to update icons and state
        },
        
        initBackToTopButton() {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    this.elements.backToTopBtn.classList.remove('opacity-0', 'invisible');
                } else {
                    this.elements.backToTopBtn.classList.add('opacity-0', 'invisible');
                }
            });
            this.elements.backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        },
        
        updateActiveNavLinks() {
            const sections = document.querySelectorAll('main section[id]');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.remove('active-nav-link');
                            if (link.getAttribute('href') === `#${id}`) {
                                link.classList.add('active-nav-link');
                            }
                        });
                    }
                });
            }, { rootMargin: '-20% 0px -80% 0px' });

            sections.forEach(section => observer.observe(section));
        },

        // --- Helpers --- //
        
        updateFooterYear() {
            if(this.elements.footerYear) {
                this.elements.footerYear.textContent = new Date().getFullYear();
            }
        },

        updateVideoCount() {
            if(this.elements.videoCountHero) {
                this.elements.videoCountHero.querySelector('span').textContent = this.state.allVideos.length;
            }
        },
        
        sortVideos(videos, sortBy) {
            return videos.sort((a, b) => {
                const handleInvalidDates = (sortOrder) => {
                    const aValid = a.dateObj && !isNaN(a.dateObj.getTime());
                    const bValid = b.dateObj && !isNaN(b.dateObj.getTime());

                    if (aValid && !bValid) return -1 * sortOrder;
                    if (!aValid && bValid) return 1 * sortOrder;
                    if (!aValid && !bValid) return 0;
                    return null; // Both are valid, continue to normal comparison
                };

                switch (sortBy) {
                    case 'date-asc': {
                        const invalidResult = handleInvalidDates(1);
                        if (invalidResult !== null) return invalidResult;
                        return a.dateObj - b.dateObj;
                    }
                    case 'title-asc': return a.title.localeCompare(b.title, 'he');
                    case 'title-desc': return b.title.localeCompare(a.title, 'he');
                    case 'duration-asc': return a.duration - b.duration;
                    case 'duration-desc': return b.duration - a.duration;
                    case 'date-desc':
                    default: {
                         const invalidResult = handleInvalidDates(-1);
                        if (invalidResult !== null) return invalidResult;
                        return b.dateObj - a.dateObj;
                    }
                }
            });
        },
        
        formatDuration(seconds) {
            if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const pad = (num) => String(num).padStart(2, '0');
            return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
        },
        
        formatDate(date) {
            if (!date || isNaN(date.getTime())) {
                return ''; // Return an empty string for invalid dates
            }
            return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
        },
        
        countVideosInCategory(categoryKey) {
            return this.state.allVideos.filter(v => v.category === categoryKey).length;
        },
        
        playInFullscreen(container, video) {
            // FIX: Use `video.id` for the YouTube embed URL.
            container.innerHTML = `<iframe class="video-iframe absolute inset-0 w-full h-full z-30" src="https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"></iframe>`;
        },
        
        async shareVideo(video) {
            const shareUrl = `${window.location.origin}${window.location.pathname}?video=${video.id}`;
            const shareData = {
                title: `CAR-טיב: ${video.title}`,
                text: `צפו בסרטון "${video.title}" ב-CAR-טיב`,
                url: shareUrl,
            };
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(shareUrl);
                    alert('קישור לסרטון הועתק!');
                }
            } catch (err) {
                console.error('Error sharing:', err);
                alert('לא ניתן היה לשתף את הסרטון.');
            }
        },
        
        async shareCurrentVideo() {
            const videoId = this.state.currentFilters.videoId;
            const video = this.state.allVideos.find(v => v.id === videoId);
            if (video) this.shareVideo(video);
        },

        async shareFilters() {
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert('קישור עם הסינון הנוכחי הועתק!');
            } catch (err) {
                console.error('Failed to copy URL:', err);
                alert('שגיאה בהעתקת הקישור.');
            }
        },

        checkIfVideoExists() {
            const videoIdOrUrl = prompt("הדבק כאן מזהה סרטון (ID) או קישור מלא מיוטיוב:");
            if (!videoIdOrUrl) return;

            const ytIdMatch = videoIdOrUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            const videoId = ytIdMatch ? ytIdMatch[1] : videoIdOrUrl.trim();
            
            // FIX: Check against `video.id` as that is the YouTube ID.
            const foundVideo = this.state.allVideos.find(v => v.id === videoId);

            if (foundVideo) {
                const confirmation = confirm(`מצאנו! הסרטון "${foundVideo.title}" כבר קיים במאגר.\nהאם תרצה לעבור אליו?`);
                if (confirmation) {
                    window.location.href = `index.html?video=${foundVideo.id}`;
                }
            } else {
                alert("הסרטון לא נמצא במאגר. אתם מוזמנים להוסיף אותו דרך הטופס!");
            }
        },
        
        showErrorState() {
            if (this.elements.mainPageContent) {
                 this.elements.mainPageContent.innerHTML = `<p class="text-center text-xl py-10 text-red-500">שגיאה בטעינת הנתונים. נסו לרענן את הדף.</p>`;
                 this.elements.mainPageContent.style.display = 'block';
            }
        }
    };

    // Start the application
    App.init();

});

// Handles DOM manipulations and rendering HTML

window.App = window.App || {};

window.App.DOM = {
    body: document.body,
    preloader: document.getElementById('site-preloader'),
    darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
    openMenuBtn: document.getElementById('open-menu-btn'),
    closeMenuBtn: document.getElementById('close-menu-btn'),
    mobileMenu: document.getElementById('mobile-menu'),
    backdrop: document.getElementById('mobile-menu-backdrop'),
    videoCountHero: document.getElementById('video-count-hero'),
    currentYearFooter: document.getElementById('current-year-footer'),
    videoCardsContainer: document.getElementById('video-cards-container'),
    noVideosFoundMessage: document.getElementById('no-videos-found'),
    videoCardTemplate: document.getElementById('video-card-template'),
    homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
    hebrewFilterToggle: document.getElementById('hebrew-filter-toggle'),
    popularTagsContainer: document.getElementById('popular-tags-container'),
    tagSearchInput: document.getElementById('tag-search-input'),
    customTagForm: document.getElementById('custom-tag-form'),
    selectedTagsContainer: document.getElementById('selected-tags-container'),
    backToTopButton: document.getElementById('back-to-top-btn'),
    filterSummaryContainer: document.getElementById('filter-summary-container'),
    filterSummaryText: document.getElementById('filter-summary-text'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    shareFiltersBtn: document.getElementById('share-filters-btn'),
    sortSelect: document.getElementById('sort-by-select'),
    searchForms: {
        desktop: document.getElementById('desktop-search-form'),
        mobile: document.getElementById('mobile-search-form'),
        main: document.getElementById('main-content-search-form')
    },
    searchInputs: {
        desktop: document.getElementById('desktop-search-input'),
        mobile: document.getElementById('mobile-search-input'),
        main: document.getElementById('main-content-search-input')
    },
    searchSuggestions: {
        desktop: document.getElementById('desktop-search-suggestions'),
        mobile: document.getElementById('mobile-search-suggestions'),
        main: document.getElementById('main-content-search-suggestions')
    },
    contactForm: document.getElementById('contact-form'),
    homeViewContainer: document.getElementById('home-view-container'),
    siteFooter: document.getElementById('site-footer'),
    featuredChannelsTrack: document.getElementById('featured-channels-track'),
    singleVideoView: {
        container: document.getElementById('single-video-view'),
        player: document.getElementById('single-video-player-container'),
        title: document.getElementById('single-video-title'),
        content: document.getElementById('single-video-content'),
        descriptionContainer: document.getElementById('video-description-container'),
        tags: document.getElementById('single-video-tags'),
        channel: document.getElementById('single-video-channel'),
        duration: document.getElementById('single-video-duration'),
        date: document.getElementById('single-video-date'),
        category: document.getElementById('single-video-category'),
        categoryText: document.getElementById('single-video-category-text'),
        categoryIcon: document.getElementById('single-video-category-icon'),
        shareBtn: document.getElementById('single-video-share-btn'),
        backBtn: document.getElementById('single-video-back-btn'),
        homeBtn: document.getElementById('single-video-home-btn')
    },
    sections: {
        homeHero: document.getElementById('home-hero'),
        homepageCategories: document.getElementById('homepage-categories-section'),
        categoryTitle: document.getElementById('category-title-section'),
        featuredChannels: document.getElementById('featured-channels-section'),
        forum: document.getElementById('forum-inspiration-section'),
        about: document.getElementById('about-section'),
        contact: document.getElementById('contact-section')
    }
};

window.App.UI = {
    toggleSingleVideoMode: (isSingleVideo) => {
        const dom = window.App.DOM;
        
        if (isSingleVideo) {
            if (dom.homeViewContainer) dom.homeViewContainer.classList.add('hidden');
            if (dom.singleVideoView.container) dom.singleVideoView.container.classList.remove('hidden');
            window.scrollTo(0, 0);

        } else {
            if (dom.homeViewContainer) dom.homeViewContainer.classList.remove('hidden');
            if (dom.singleVideoView.container) dom.singleVideoView.container.classList.add('hidden');
            if (dom.singleVideoView.player) dom.singleVideoView.player.innerHTML = '';
        }
    },

    renderFeaturedChannels: (channels) => {
        const track = window.App.DOM.featuredChannelsTrack;
        if(!track || channels.length === 0) return;
        
        const displayChannels = [...channels, ...channels];
        track.innerHTML = displayChannels.map(channel => `
            <a href="${channel.channel_url}" target="_blank" rel="noopener noreferrer" class="channel-card group flex-shrink-0 block p-5 bg-white dark:bg-slate-700 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 text-center transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <div class="relative mx-auto w-20 h-20 mb-4">
                    <img src="${channel.channel_image_url}" alt="${channel.channel_name}" class="w-full h-full rounded-full object-cover border-2 border-slate-200 dark:border-slate-500 group-hover:border-purple-400 transition-colors shadow-sm" loading="lazy">
                </div>
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2 truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" title="${channel.channel_name}">${channel.channel_name}</h3>
                <p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-snug px-1">${channel.content_description}</p>
            </a>
        `).join('');

        const scrollContainer = document.querySelector('.channels-carousel-container');
        const btnLeft = document.getElementById('channels-scroll-left');
        const btnRight = document.getElementById('channels-scroll-right');
        if(btnLeft && btnRight && scrollContainer) {
            btnRight.addEventListener('click', () => {
                track.style.animationPlayState = 'paused';
                scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
            });
            btnLeft.addEventListener('click', () => {
                track.style.animationPlayState = 'paused';
                scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
            });
        }
    },

    createVideoCardElement: (video) => {
        const dom = window.App.DOM;
        if (!dom.videoCardTemplate || !dom.videoCardTemplate.content) return null;

        const cardClone = dom.videoCardTemplate.content.cloneNode(true);
        const card = {
            article: cardClone.querySelector('article'),
            thumbnailImg: cardClone.querySelector('.video-thumbnail-img'),
            duration: cardClone.querySelector('.video-duration'),
            playLink: cardClone.querySelector('.video-play-link'),
            iframe: cardClone.querySelector('.video-iframe'),
            titleLink: cardClone.querySelector('.video-link'),
            channelName: cardClone.querySelector('.channel-name'),
            channelLogo: cardClone.querySelector('.channel-logo'),
            tagsContainer: cardClone.querySelector('.video-tags'),
            categoryDisplay: cardClone.querySelector('.video-category-display'),
            dateDisplay: cardClone.querySelector('.video-date-display'),
            shareBtn: cardClone.querySelector('.share-btn'),
            newTabBtn: cardClone.querySelector('.new-tab-btn'),
            fullscreenBtn: cardClone.querySelector('.fullscreen-btn'),
        };

        if (!card.article || !card.thumbnailImg || !card.titleLink) return null;

        const videoPageUrl = `./?v=${video.id}`;
        card.article.dataset.videoId = video.id;
        
        card.thumbnailImg.src = video.thumbnail || window.App.DataService.getThumbnailUrl(video.id);
        card.thumbnailImg.alt = video.title;
        
        if(card.duration) {
            let dur = video.duration || '';
            // FIX: If just number like "25", make it "0:25"
            if (!dur.includes(':') && !isNaN(parseInt(dur))) {
                 dur = '0:' + dur;
            }
            if(dur.includes(':')) {
                 const parts = dur.split(':');
                 if(parts.length === 2) {
                     if(parts[1].length === 1) parts[1] = '0' + parts[1]; // seconds
                     dur = parts.join(':');
                 }
            }
            card.duration.textContent = dur;
        }

        if(card.playLink) card.playLink.href = "#";
        if(card.iframe) card.iframe.title = `נגן וידאו: ${video.title}`;
        
        card.titleLink.href = videoPageUrl;
        card.titleLink.innerHTML = video.title;
        
        if(card.channelName) card.channelName.textContent = video.channel || '';
        if (card.shareBtn) card.shareBtn.dataset.videoId = video.id;
        if (card.newTabBtn) card.newTabBtn.href = videoPageUrl;
        if (card.fullscreenBtn) card.fullscreenBtn.dataset.videoId = video.id;
        
        if(card.channelLogo) {
            card.channelLogo.src = video.channelImage || 'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGBgAAAABQABXvMqOgAAAABJRU5ErkJggg==';
            card.channelLogo.alt = `לוגו ערוץ ${video.channel}`;
            card.channelLogo.classList.toggle('hidden', !video.channelImage);
        }

        if (card.tagsContainer && video.tags && video.tags.length > 0) {
            card.tagsContainer.innerHTML = video.tags.map(tag =>
                `<button data-tag="${tag}" class="video-tag-button bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${tag.charAt(0).toUpperCase() + tag.slice(1)}</button>`
            ).join('');
        }

        if(card.categoryDisplay) {
            const categoryData = window.App.CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === video.category);
            const categoryName = categoryData ? categoryData.name : (video.category || '').charAt(0).toUpperCase() + (video.category || '').slice(1);
            const categoryIconEl = cardClone.querySelector('.video-category-icon');
            
            // Set link href WITHOUT hash
            card.categoryDisplay.href = `?name=${video.category}`;
            
            if (categoryIconEl) {
                const icon = categoryData ? categoryData.icon : 'folder-open';
                categoryIconEl.className = `video-category-icon fas fa-${icon} opacity-70 ml-2 text-purple-500 dark:text-purple-400`;
            }
            card.categoryDisplay.appendChild(document.createTextNode(categoryName));
        }

        if (card.dateDisplay) {
            // Robust Date Check
            if (video.dateAdded && video.dateAdded instanceof Date && !isNaN(video.dateAdded.getTime())) {
                card.dateDisplay.style.display = 'flex';
                card.dateDisplay.appendChild(document.createTextNode(video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })));
            } else {
                card.dateDisplay.style.display = 'none';
            }
        }

        return card.article;
    },

    renderVideoCards: (allMatchingVideos, isLoadMore, videoObserver) => {
        const dom = window.App.DOM;
        const state = window.App.state;
        const CONSTANTS = window.App.CONSTANTS;

        if (!dom.videoCardsContainer) return;
        
        if (!isLoadMore) {
            dom.videoCardsContainer.innerHTML = '';
            const skeletons = document.getElementById('video-skeletons');
            if (skeletons) skeletons.remove();
        }

        const videosToRender = allMatchingVideos.slice(
            state.ui.currentlyDisplayedVideosCount,
            state.ui.currentlyDisplayedVideosCount + (isLoadMore ? CONSTANTS.VIDEOS_TO_LOAD_MORE : CONSTANTS.VIDEOS_TO_SHOW_INITIALLY)
        );

        const fragment = document.createDocumentFragment();
        let addedCount = 0;

        videosToRender.forEach(video => {
            const cardElement = window.App.UI.createVideoCardElement(video);
            if (cardElement) {
                fragment.appendChild(cardElement);
                if (videoObserver) videoObserver.observe(cardElement);
                addedCount++;
            }
        });

        dom.videoCardsContainer.appendChild(fragment);
        state.ui.currentlyDisplayedVideosCount += addedCount;

        const hasVideos = allMatchingVideos.length > 0;
        if(dom.noVideosFoundMessage) {
            dom.noVideosFoundMessage.classList.toggle('hidden', hasVideos);
            if (!hasVideos && !isLoadMore) {
                dom.noVideosFoundMessage.innerHTML = `<div class="col-span-full text-center text-slate-500 dark:text-slate-400 py-16">
                    <i class="fas fa-video-slash fa-4x mb-6 text-purple-400 dark:text-purple-500"></i>
                    <p class="text-2xl font-semibold mb-2">לא נמצאו סרטונים</p>
                    <p class="text-lg mb-6">נסה לשנות את הסינון או לחפש משהו אחר.</p>
                    <button id="no-results-clear-btn" class="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-slate-800">נקה את כל הסינונים</button>
                </div>`;
            }
        }
        window.App.UI.updateLoadMoreButton(allMatchingVideos.length);
    },

    updateLoadMoreButton: (totalMatchingVideos) => {
        const dom = window.App.DOM;
        const state = window.App.state;
        let loadMoreBtn = document.getElementById('load-more-videos-btn');
        
        if (state.ui.currentlyDisplayedVideosCount < totalMatchingVideos) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-videos-btn';
                loadMoreBtn.className = 'mt-8 mb-4 mx-auto block px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:focus:ring-offset-slate-900 transition-transform hover:scale-105';
                
                loadMoreBtn.addEventListener('click', () => {
                    const event = new CustomEvent('load-more-clicked');
                    document.dispatchEvent(event);
                });

                if (dom.videoCardsContainer && dom.noVideosFoundMessage) {
                    dom.videoCardsContainer.parentNode.insertBefore(loadMoreBtn, dom.noVideosFoundMessage.nextSibling);
                }
            }
            loadMoreBtn.textContent = `טען עוד (${totalMatchingVideos - state.ui.currentlyDisplayedVideosCount} נותרו)`;
            loadMoreBtn.classList.remove('hidden');
        } else if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
    },

    renderHomepageCategoryButtons: () => {
        const dom = window.App.DOM;
        if (!dom.homepageCategoriesGrid) return;
        
        const skeleton = document.getElementById('loading-homepage-categories-skeleton');
        if (skeleton) skeleton.style.display = 'none';

        dom.homepageCategoriesGrid.innerHTML = window.App.CONSTANTS.PREDEFINED_CATEGORIES
            .filter(cat => cat.id !== 'all')
            .map(cat => {
                const count = window.App.state.allVideos.filter(v => v.category === cat.id).length;
                const gradientClasses = `${cat.gradient} ${cat.darkGradient || ''}`;
                return `
                    <a href="?name=${cat.id}" class="nav-internal-link relative category-showcase-card group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl focus:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1.5 focus:-translate-y-1.5 bg-gradient-to-br ${gradientClasses} text-white text-center focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white dark:focus:ring-purple-500/50">
                        <div class="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[180px]">
                            <i class="fas fa-${cat.icon || 'folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                            <h3 class="text-xl md:text-2xl font-semibold group-hover:text-yellow-300 dark:group-hover:text-yellow-200 transition-colors">${cat.name}</h3>
                            <p class="text-sm opacity-80 mt-1 px-2">${cat.description}</p>
                        </div>
                        <span class="absolute top-4 right-4 bg-black/30 text-white text-xs font-bold py-1 px-2.5 rounded-full">${count}</span>
                    </a>`;
            }).join('');
    },

    renderPopularTags: () => {
        const dom = window.App.DOM;
        if (!dom.popularTagsContainer) return;
        // Logic moved to App.js for performance, renderer only updates DOM
        // Placeholder to keep structure valid
    },

    updateActiveTagVisuals: () => {
        const state = window.App.state;
        document.querySelectorAll('.tag[data-tag-value]').forEach(tagElement => {
            const tagName = tagElement.dataset.tagValue;
            const isActive = state.currentFilters.tags.includes(tagName);
            tagElement.classList.toggle('active-search-tag', isActive);
        });
    },

    renderSelectedTagChips: () => {
        const dom = window.App.DOM;
        const state = window.App.state;
        if (!dom.selectedTagsContainer) return;
        
        dom.selectedTagsContainer.innerHTML = state.currentFilters.tags.map(tagName => `
            <span class="flex items-center gap-1.5 bg-purple-600 text-white dark:bg-purple-500 text-sm font-medium ps-3 pe-2 py-1.5 rounded-full">
                ${tagName.charAt(0).toUpperCase() + tagName.slice(1)}
                <button type="button" class="remove-tag-btn text-xs opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none" data-tag-to-remove="${tagName}" aria-label="הסר תגית ${tagName}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    },

    updateFilterSummary: () => {
        const dom = window.App.DOM;
        if (!dom.filterSummaryContainer) return;
        const { tags, hebrewOnly, searchTerm } = window.App.state.currentFilters;
        const count = tags.length + (hebrewOnly ? 1 : 0) + (searchTerm.length >= window.App.CONSTANTS.MIN_SEARCH_TERM_LENGTH ? 1 : 0);
        
        if (count > 0) {
            dom.filterSummaryText.textContent = `${count} סינונים פעילים`;
            dom.filterSummaryContainer.classList.remove('hidden');
        } else {
            dom.filterSummaryContainer.classList.add('hidden');
        }
    },

    updateCategoryPageUI: (categoryId) => {
        const dom = window.App.DOM;
        const CONSTANTS = window.App.CONSTANTS;
        const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId);
        const name = categoryData ? categoryData.name : (categoryId || 'קטגוריה').charAt(0).toUpperCase() + (categoryId || 'קטגוריה').slice(1);
        const icon = categoryData ? categoryData.icon : 'folder-open';
        
        const fullTitle = categoryId === 'all' 
            ? 'CAR-טיב - סרטוני רכבים כשרים' 
            : `${name} - CAR-טיב`;
            
        document.title = fullTitle;

        const pageTitle = document.getElementById('category-page-title');
        if (pageTitle) pageTitle.innerHTML = `<i class="fas fa-${icon} text-purple-600 dark:text-purple-400 mr-4"></i>${name}`;
        
        const breadcrumb = document.getElementById('breadcrumb-category-name');
        if (breadcrumb) breadcrumb.textContent = name;
        
        const searchPlaceholder = (categoryId && categoryId !== 'all') 
            ? `חפש סרטונים ב${name}...` 
            : 'חפש סרטונים באתר...';
        
        if (dom.searchInputs.main) dom.searchInputs.main.placeholder = searchPlaceholder;
        
        const countSummaryEl = document.getElementById('category-video-count-summary');
        if(countSummaryEl) {
            const categoryVideos = window.App.state.allVideos.filter(v => v.category === categoryId);
            const count = categoryVideos.length;
            countSummaryEl.innerHTML = count === 1
                ? `נמצא <strong class="text-purple-600 dark:text-purple-400">סרטון אחד</strong> בקטגוריה זו.`
                : `בקטגוריה זו קיימים <strong class="text-purple-600 dark:text-purple-400">${count}</strong> סרטונים.`;
        }

        if(categoryId && categoryId !== 'all') {
            if(dom.sections.homeHero) dom.sections.homeHero.classList.add('hidden');
            if(dom.sections.homepageCategories) dom.sections.homepageCategories.classList.add('hidden');
            if(dom.sections.featuredChannels) dom.sections.featuredChannels.classList.add('hidden');
            if(dom.sections.forum) dom.sections.forum.classList.add('hidden');
            if(dom.sections.about) dom.sections.about.classList.add('hidden');
            if(dom.sections.contact) dom.sections.contact.classList.add('hidden');
            
            if(dom.sections.categoryTitle) dom.sections.categoryTitle.classList.remove('hidden');
        } else {
            if(dom.sections.homeHero) dom.sections.homeHero.classList.remove('hidden');
            if(dom.sections.homepageCategories) dom.sections.homepageCategories.classList.remove('hidden');
            if(dom.sections.featuredChannels) dom.sections.featuredChannels.classList.remove('hidden');
            if(dom.sections.forum) dom.sections.forum.classList.remove('hidden');
            if(dom.sections.about) dom.sections.about.classList.remove('hidden');
            if(dom.sections.contact) dom.sections.contact.classList.remove('hidden');

            if(dom.sections.categoryTitle) dom.sections.categoryTitle.classList.add('hidden');
        }
    },

    displayError: (message, container = window.App.DOM.noVideosFoundMessage) => {
        if (container) {
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center text-red-500 dark:text-red-400 py-10"><i class="fas fa-exclamation-triangle fa-3x mb-4"></i><p class="text-xl font-semibold">${message}</p></div>`;
        }
    },

    syncUIToState: () => {
        const dom = window.App.DOM;
        const state = window.App.state;
        const { searchTerm, hebrewOnly, sortBy } = state.currentFilters;
        
        Object.values(dom.searchForms).forEach(form => {
            if(form) {
                const input = form.querySelector('input[type="search"]');
                if (input) input.value = searchTerm;
            }
        });
        
        if(dom.hebrewFilterToggle) dom.hebrewFilterToggle.checked = hebrewOnly;
        if(dom.sortSelect) dom.sortSelect.value = sortBy;
        
        window.App.UI.renderSelectedTagChips();
        window.App.UI.updateActiveTagVisuals();
    }
};

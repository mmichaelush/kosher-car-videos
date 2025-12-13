document.addEventListener('DOMContentLoaded', () => {
    // Shortcuts
    const App = window.App;
    const DOM = App.DOM;
    const State = App.state;
    const UI = App.UI;
    const Data = App.DataService;
    const CONSTANTS = App.CONSTANTS;

    let videoObserver;

    // --- Utility Functions ---
    const throttle = (callback, time) => {
        if (State.ui.throttleTimer) return;
        State.ui.throttleTimer = true;
        setTimeout(() => {
            callback();
            State.ui.throttleTimer = false;
        }, time);
    };

    // --- Preloader Logic ---
    function initPreloader() {
        const preloader = document.getElementById('site-preloader');
        if (!preloader) return;

        // Force at least 2 seconds duration
        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500); // Wait for transition to finish
        }, 2000);
    }

    // --- Search Logic ---
    function handleSearchInput(inputElement) {
        const suggestionsContainer = document.getElementById(`${inputElement.id.replace('-input', '')}-suggestions`);
        State.search.currentInput = inputElement;
        State.search.currentSuggestionsContainer = suggestionsContainer;
        
        const searchTerm = inputElement.value.trim();
        if (searchTerm.length < CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            clearSearchSuggestions();
            if (searchTerm === '' && State.currentFilters.searchTerm !== '') {
                State.currentFilters.searchTerm = '';
                updateFiltersAndURL(false);
            }
            return;
        }

        const fuseSource = (State.currentFilters.category !== 'all')
            ? State.allVideos.filter(v => v.category === State.currentFilters.category)
            : State.allVideos;
        
        displaySearchSuggestions(searchTerm, new Fuse(fuseSource, CONSTANTS.FUSE_OPTIONS));
    }

    function displaySearchSuggestions(searchTerm, fuseInstance) {
        if (!fuseInstance || !State.search.currentSuggestionsContainer) return;
        const suggestionsList = State.search.currentSuggestionsContainer.querySelector('ul');
        if (!suggestionsList) return;
        
        const results = fuseInstance.search(searchTerm).slice(0, CONSTANTS.MAX_SUGGESTIONS);
        suggestionsList.innerHTML = '';
        
        if (results.length === 0) {
            clearSearchSuggestions();
            return;
        }

        results.forEach((result, index) => {
            const li = document.createElement('li');
            li.className = 'px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer transition-colors';
            li.dataset.index = index;
            
            const titleMatch = result.matches && result.matches.find(m => m.key === 'title');
            li.innerHTML = titleMatch ? generateHighlightedText(result.item.title, titleMatch.indices) : result.item.title;
            
            li.addEventListener('mousedown', () => {
                State.search.isSuggestionClicked = true;
                const inputElement = State.search.currentInput;
                inputElement.value = result.item.title;
                handleSearchSubmit(inputElement.form);
            });
            
            li.addEventListener('mouseup', () => setTimeout(() => { State.search.isSuggestionClicked = false; }, 50));
            suggestionsList.appendChild(li);
        });

        if (State.search.currentSuggestionsContainer) {
            State.search.currentSuggestionsContainer.classList.remove('hidden');
        }
        State.search.activeSuggestionIndex = -1;
    }

    function handleSearchKeyDown(event) {
        if (!State.search.currentSuggestionsContainer || State.search.currentSuggestionsContainer.classList.contains('hidden')) return;
        const items = State.search.currentSuggestionsContainer.querySelectorAll('li');
        if (items.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                State.search.activeSuggestionIndex = (State.search.activeSuggestionIndex + 1) % items.length;
                break;
            case 'ArrowUp':
                event.preventDefault();
                State.search.activeSuggestionIndex = (State.search.activeSuggestionIndex - 1 + items.length) % items.length;
                break;
            case 'Enter':
                event.preventDefault();
                if (State.search.activeSuggestionIndex > -1) {
                    items[State.search.activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                } else {
                    handleSearchSubmit(event.target.form);
                }
                clearSearchSuggestions();
                return;
            case 'Escape':
                clearSearchSuggestions();
                return;
            default: return;
        }
        
        items.forEach((item, index) => {
            item.classList.toggle('active-suggestion', index === State.search.activeSuggestionIndex);
            if (index === State.search.activeSuggestionIndex) item.scrollIntoView({ block: 'nearest' });
        });
    }

    function clearSearchSuggestions() {
        Object.values(DOM.searchSuggestions).forEach(container => {
            if (container) {
                container.classList.add('hidden');
                const ul = container.querySelector('ul');
                if (ul) ul.innerHTML = '';
            }
        });
        State.search.activeSuggestionIndex = -1;
    }

    function generateHighlightedText(text, indices) {
        let result = '';
        let lastIndex = 0;
        indices.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
            if (start > lastIndex) result += text.substring(lastIndex, start);
            result += `<strong class="font-semibold text-purple-600 dark:text-purple-300">${text.substring(start, end + 1)}</strong>`;
            lastIndex = end + 1;
        });
        if (lastIndex < text.length) result += text.substring(lastIndex);
        return result;
    }

    function handleSearchSubmit(form) {
        const input = form.querySelector('input[type="search"]');
        if (!input) return;
        const searchTerm = input.value.trim();
        
        if (!DOM.singleVideoView.container.classList.contains('hidden')) {
             history.pushState(null, '', `./?search=${encodeURIComponent(searchTerm)}#video-grid-section`);
             handleRouting();
        } else {
            State.currentFilters.searchTerm = searchTerm;
            updateFiltersAndURL();
        }
    }


    // --- Filtering & Logic ---
    function getFilteredAndSortedVideos() {
        if (!State.allVideos) return [];
        let filtered = State.allVideos;

        if (State.currentFilters.category !== 'all') {
             filtered = filtered.filter(v => v.category === State.currentFilters.category);
        }

        if (State.currentFilters.searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH && State.fuse) {
            const fuseResults = State.fuse.search(State.currentFilters.searchTerm);
            const resultIds = new Set(fuseResults.map(r => r.item.id));
            filtered = filtered.filter(v => resultIds.has(v.id));
        }

        let videos = filtered.filter(video => {
            const tagsMatch = State.currentFilters.tags.length === 0 || State.currentFilters.tags.every(filterTag => (video.tags || []).includes(filterTag));
            const hebrewMatch = !State.currentFilters.hebrewOnly || video.hebrewContent;
            return tagsMatch && hebrewMatch;
        });

        videos.sort((a, b) => {
            switch (State.currentFilters.sortBy) {
                case 'date-desc': return (b.dateAdded || 0) - (a.dateAdded || 0);
                case 'date-asc': return (a.dateAdded || 0) - (b.dateAdded || 0);
                case 'title-asc': return a.title.localeCompare(b.title, 'he');
                case 'title-desc': return b.title.localeCompare(a.title, 'he');
                case 'duration-asc': return a.durationInSeconds - b.durationInSeconds;
                case 'duration-desc': return b.durationInSeconds - a.durationInSeconds;
                default: return 0;
            }
        });

        return videos;
    }

    function applyFilters(isLoadMore = false, andScroll = true) {
        if (!isLoadMore) {
            State.ui.currentlyDisplayedVideosCount = 0;
        }
        const allMatchingVideos = getFilteredAndSortedVideos();
        UI.renderVideoCards(allMatchingVideos, isLoadMore, videoObserver);
        
        if (andScroll && !isLoadMore) {
            scrollToVideoGridIfNeeded();
        }
        
        clearSearchSuggestions();
        UI.updateFilterSummary();
        UI.renderPopularTags();
    }

    function updateFiltersAndURL(andScroll = true) {
        applyFilters(false, andScroll);
        updateURLWithFilters();
    }

    function updateURLWithFilters(videoId = null) {
        if (!history.pushState) return;
        const url = new URL(window.location);
        const newParams = new URLSearchParams();

        if (videoId) {
            newParams.set('v', videoId);
        } else {
            const { searchTerm, tags, hebrewOnly, sortBy, category } = State.currentFilters;
            
            if (category && category !== 'all') newParams.set('name', category);
            if (searchTerm) newParams.set('search', searchTerm);
            if (tags.length > 0) newParams.set('tags', tags.join(','));
            if (hebrewOnly) newParams.set('hebrew', 'true');
            if (sortBy !== 'date-desc') newParams.set('sort', sortBy);
        }

        const newSearchString = newParams.toString();
        if (url.search.substring(1) !== newSearchString) {
             const newUrl = newSearchString ? `${window.location.pathname}?${newSearchString}` : window.location.pathname;
             history.pushState({ videoId, filters: State.currentFilters }, '', newUrl);
        }
    }

    // --- Navigation / Routing ---
    function handleRouting() {
        const params = new URLSearchParams(window.location.search);
        const videoId = params.get('v');
        const categoryParam = params.get('name');
        
        if (videoId) {
            showSingleVideoView(videoId);
        } else {
            hideSingleVideoView();
            
            let category = 'all';
            if (categoryParam) {
                const isValid = CONSTANTS.PREDEFINED_CATEGORIES.some(c => c.id === categoryParam.toLowerCase());
                if(isValid) category = categoryParam.toLowerCase();
            }
            State.currentFilters.category = category;
            
            UI.updateCategoryPageUI(category);

            State.currentFilters.searchTerm = params.get('search') || '';
            State.currentFilters.tags = params.get('tags') ? params.get('tags').split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean) : [];
            State.currentFilters.sortBy = params.get('sort') || 'date-desc';
            State.currentFilters.hebrewOnly = params.has('hebrew')
                ? params.get('hebrew') === 'true'
                : localStorage.getItem('hebrewOnlyPreference') === 'true';

            UI.syncUIToState();
            
            const fuseSource = category === 'all' ? State.allVideos : State.allVideos.filter(v => v.category === category);
            State.fuse = new Fuse(fuseSource, CONSTANTS.FUSE_OPTIONS);

            applyFilters(false, false);
            
            // Handle anchors scrolling nicely
            if(window.location.hash) {
                 setTimeout(() => {
                    const el = document.querySelector(window.location.hash);
                    if(el) {
                         const headerOffset = 100;
                         const elementPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                         window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                    }
                 }, 200);
            } else {
                 // If no hash and we just switched back to home view, scroll top
                 window.scrollTo(0,0);
            }
        }
    }

    async function showSingleVideoView(videoId) {
        if (!videoId) return;
        
        if (State.allVideos.length === 0) {
             await Data.loadVideos();
        }

        const video = State.allVideos.find(v => v.id === videoId);
        
        if (!video) {
             await Swal.fire({
                icon: 'error',
                title: 'הסרטון לא נמצא',
                text: 'לצערנו הסרטון שחיפשת אינו קיים במאגר או שהוסר.',
                confirmButtonText: 'חזרה לדף הבית',
                confirmButtonColor: '#7c3aed'
            });
            window.history.pushState(null, '', './');
            handleRouting();
            return;
        }

        // KEY CHANGE: Toggle Views via UI Renderer
        UI.toggleSingleVideoMode(true);
        
        window.scrollTo(0, 0);
        document.title = `${video.title} - CAR-טיב`;
        
        DOM.singleVideoView.title.innerHTML = video.title;
        DOM.singleVideoView.player.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        
        DOM.singleVideoView.channel.innerHTML = `<img src="${video.channelImage || ''}" alt="" class="h-6 w-6 rounded-full"><span class="font-medium">${video.channel}</span>`;
        DOM.singleVideoView.duration.innerHTML = `<i class="fas fa-clock fa-fw"></i> ${video.duration}`;
        
        if (video.content && DOM.singleVideoView.content) {
            DOM.singleVideoView.content.innerHTML = `<p class="text-slate-700 dark:text-slate-300 text-lg leading-relaxed bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border-r-4 border-purple-500">${video.content}</p>`;
            DOM.singleVideoView.content.classList.remove('hidden');
        } else if(DOM.singleVideoView.content) {
            DOM.singleVideoView.content.classList.add('hidden');
        }

        if (video.dateAdded && !isNaN(video.dateAdded.getTime())) {
            DOM.singleVideoView.date.style.display = 'flex';
            DOM.singleVideoView.date.innerHTML = `<i class="fas fa-calendar-alt fa-fw"></i> ${video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
            DOM.singleVideoView.date.style.display = 'none';
        }

        DOM.singleVideoView.tags.innerHTML = (video.tags || []).map(tag =>
            `<a href="./?tags=${encodeURIComponent(tag)}#video-grid-section" data-tag-link="true" class="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${tag.charAt(0).toUpperCase() + tag.slice(1)}</a>`
        ).join('');
    }

    function hideSingleVideoView() {
        UI.toggleSingleVideoMode(false);
        document.title = 'CAR-טיב - סרטוני רכבים כשרים';
    }

    function setupEventListeners() {
        document.body.addEventListener('click', (e) => {
            const { target } = e;
            const link = target.closest('a');
            const card = target.closest('article[data-video-id]');

            // Internal Navigation Links (with IDs)
            if (link && link.classList.contains('nav-internal-link')) {
                 const href = link.getAttribute('href');
                 const isHashLink = href.startsWith('#');
                 const targetId = isHashLink ? href.substring(1) : href.split('#')[1];

                 // If we are on single video view, force return to home
                 if (!DOM.singleVideoView.container.classList.contains('hidden')) {
                     e.preventDefault();
                     history.pushState(null, '', './' + (isHashLink ? href : '#' + targetId));
                     handleRouting();
                     return;
                 }
                 
                 // Fix: If clicking "Home" (./#home-hero) while on home, just scroll
                 if (targetId && document.getElementById(targetId)) {
                     e.preventDefault();
                     const el = document.getElementById(targetId);
                     const headerOffset = 100;
                     const elementPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                     window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                     
                     // Close mobile menu if open
                     if (DOM.mobileMenu && !DOM.mobileMenu.classList.contains('translate-x-full')) {
                         DOM.mobileMenu.classList.add('translate-x-full');
                         DOM.backdrop.classList.add('invisible', 'opacity-0');
                         document.body.classList.remove('overflow-hidden');
                     }
                 }
            }

            if (link && link.dataset.tagLink === "true") {
                 e.preventDefault();
                 const url = new URL(link.href, window.location.origin);
                 const tags = url.searchParams.get('tags');
                 history.pushState(null, '', `./?tags=${encodeURIComponent(tags)}#video-grid-section`);
                 handleRouting();
                 return;
            }

            if (target.closest('#check-yt-id-link') || target.closest('#check-yt-id-button')) handleCheckYtId(e);

            if (target.closest('button.tag[data-tag-value]')) {
                const tagName = target.closest('button.tag').dataset.tagValue;
                toggleTagSelection(tagName);
            }
            if (target.closest('.remove-tag-btn')) {
                toggleTagSelection(target.closest('.remove-tag-btn').dataset.tagToRemove);
            }

            const videoTagButton = target.closest('.video-tag-button[data-tag]');
            if(videoTagButton) {
                e.preventDefault();
                history.pushState(null, '', `./?tags=${encodeURIComponent(videoTagButton.dataset.tag)}#video-grid-section`);
                handleRouting();
            }

            if(card) {
                const videoId = card.dataset.videoId;
                if (target.closest('a.video-link') || target.closest('.video-play-link')) {
                    e.preventDefault();
                    if(target.closest('.video-play-link') && window.innerWidth >= 768) {
                         playVideoInline(card);
                    } else {
                        history.pushState(null, '', `./?v=${videoId}`);
                        handleRouting();
                    }
                } 
                else if (target.closest('.fullscreen-btn')) {
                    e.preventDefault();
                    playVideoInline(card);
                    const iframe = card.querySelector('.video-iframe');
                    if(iframe && typeof iframe.requestFullscreen === 'function') {
                        setTimeout(() => { iframe.requestFullscreen(); }, 150);
                    }
                } else if (target.closest('.share-btn')) {
                    e.preventDefault();
                    const video = State.allVideos.find(v => v.id === videoId);
                    const url = new URL(`?v=${videoId}`, window.location.href).href;
                    shareContent(url, target.closest('.share-btn'), 'הועתק!', video?.title || 'סרטון');
                }
            }

            if (target.closest('#single-video-share-btn')) {
                const videoId = new URLSearchParams(window.location.search).get('v');
                const video = State.allVideos.find(v => v.id === videoId);
                shareContent(window.location.href, target.closest('button'), 'הועתק!', video?.title || 'סרטון');
            }
            if (target.id === 'single-video-back-btn') {
                 e.preventDefault();
                 history.back(); 
            }
            if (target.id === 'no-results-clear-btn') clearAllFilters();
            
            if(target.closest('#open-menu-btn')) {
                 DOM.mobileMenu.classList.remove('translate-x-full');
                 DOM.backdrop.classList.remove('invisible', 'opacity-0');
                 document.body.classList.add('overflow-hidden');
            }
            if(target.closest('#close-menu-btn') || target === DOM.backdrop) {
                 DOM.mobileMenu.classList.add('translate-x-full');
                 DOM.backdrop.classList.add('invisible', 'opacity-0');
                 document.body.classList.remove('overflow-hidden');
            }
        });

        document.addEventListener('load-more-clicked', () => {
             applyFilters(true);
        });

        DOM.darkModeToggles.forEach(toggle => toggle.addEventListener('click', handleThemeToggle));

        window.addEventListener('scroll', () => throttle(() => {
             const scrollPosition = window.pageYOffset;
             if(DOM.backToTopButton) {
                const isVisible = scrollPosition > 300;
                DOM.backToTopButton.classList.toggle('invisible', !isVisible);
                DOM.backToTopButton.classList.toggle('opacity-0', !isVisible);
             }
        }, 100));

        Object.values(DOM.searchForms).forEach(form => {
            if(!form) return;
            form.addEventListener('submit', (e) => { e.preventDefault(); handleSearchSubmit(form); });
            const input = form.querySelector('input[type="search"]');
            if (input) {
                input.addEventListener('input', () => throttle(() => handleSearchInput(input), 300));
                input.addEventListener('keydown', handleSearchKeyDown);
                input.addEventListener('blur', () => setTimeout(() => { if (!State.search.isSuggestionClicked) clearSearchSuggestions(); }, 150));
            }
        });

        if(DOM.hebrewFilterToggle) DOM.hebrewFilterToggle.addEventListener('change', (e) => {
            State.currentFilters.hebrewOnly = e.target.checked;
            localStorage.setItem('hebrewOnlyPreference', String(e.target.checked));
            updateFiltersAndURL();
        });
        if(DOM.sortSelect) DOM.sortSelect.addEventListener('change', (e) => {
            State.currentFilters.sortBy = e.target.value;
            updateFiltersAndURL(false);
        });
        if(DOM.clearFiltersBtn) DOM.clearFiltersBtn.addEventListener('click', clearAllFilters);
        if(DOM.shareFiltersBtn) DOM.shareFiltersBtn.addEventListener('click', (e) => shareContent(window.location.href, e.currentTarget, 'הועתק!', 'סינון נוכחי'));
        
        if(DOM.customTagForm) DOM.customTagForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if(DOM.tagSearchInput) {
                const newTagName = DOM.tagSearchInput.value.trim().toLowerCase();
                if (newTagName && !State.currentFilters.tags.includes(newTagName)) {
                    toggleTagSelection(newTagName);
                    DOM.tagSearchInput.value = '';
                }
            }
        });
    }

    function toggleTagSelection(tagName) {
        if (!State.currentFilters.tags) return;
        const { tags } = State.currentFilters;
        const index = tags.indexOf(tagName);
        if (index > -1) {
            tags.splice(index, 1);
        } else {
            tags.push(tagName);
        }
        UI.updateActiveTagVisuals();
        UI.renderSelectedTagChips();
        updateFiltersAndURL();
    }

    function clearAllFilters() {
        State.currentFilters = { ...State.currentFilters, tags: [], searchTerm: '', hebrewOnly: false, sortBy: 'date-desc' };
        localStorage.removeItem('hebrewOnlyPreference');
        UI.syncUIToState();
        updateFiltersAndURL(false);
    }

    async function init() {
        initPreloader();
        await initializeApp();
    }

    init();
});

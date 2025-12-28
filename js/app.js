document.addEventListener('DOMContentLoaded', () => {

    const App = window.App;
    const DOM = App.DOM;
    const State = App.state;
    const UI = App.UI;
    const Data = App.DataService;
    const CONSTANTS = App.CONSTANTS;

    let videoObserver;

    function handleThemeToggle() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        DOM.darkModeToggles.forEach(toggle => {
            const moonIcon = toggle.querySelector('.fa-moon');
            const sunIcon = toggle.querySelector('.fa-sun');
            
            if (isDark) {
                if(moonIcon) moonIcon.classList.add('hidden');
                if(sunIcon) sunIcon.classList.remove('hidden');
            } else {
                if(moonIcon) moonIcon.classList.remove('hidden');
                if(sunIcon) sunIcon.classList.add('hidden');
            }
            toggle.setAttribute('aria-checked', String(isDark));
        });
    }

    const throttle = (callback, time) => {
        if (State.ui.throttleTimer) return;
        State.ui.throttleTimer = true;
        setTimeout(() => {
            callback();
            State.ui.throttleTimer = false;
        }, time);
    };

    function initPreloader() {
        const preloader = document.getElementById('site-preloader');
        if (!preloader) return;

        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }, 1500);
    }

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


    function handleTagInput(inputElement) {
        const suggestionsContainer = document.getElementById('tag-suggestions');
        const searchTerm = inputElement.value.trim().toLowerCase();

        if (searchTerm.length < 1) {
            suggestionsContainer.classList.add('hidden');
            return;
        }

        const allTags = new Set();
        const videosToConsider = (State.currentFilters.category !== 'all')
            ? State.allVideos.filter(v => v.category === State.currentFilters.category)
            : State.allVideos;

        videosToConsider.forEach(v => {
            if(v.tags) v.tags.forEach(t => allTags.add(t));
        });

        const matches = Array.from(allTags).filter(tag => tag.includes(searchTerm)).slice(0, 5);

        if (matches.length > 0) {
            suggestionsContainer.innerHTML = matches.map(tag => `
                <div class="px-3 py-2 hover:bg-purple-50 dark:hover:bg-slate-600 cursor-pointer text-sm text-slate-700 dark:text-slate-200" data-tag="${tag}">
                    ${tag}
                </div>
            `).join('');
            suggestionsContainer.classList.remove('hidden');

            suggestionsContainer.querySelectorAll('div').forEach(div => {
                div.addEventListener('click', () => {
                    const tag = div.dataset.tag;
                    toggleTagSelection(tag);
                    inputElement.value = '';
                    suggestionsContainer.classList.add('hidden');
                });
            });
        } else {
             suggestionsContainer.classList.add('hidden');
        }
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

    function getFilteredAndSortedVideos() {
        if (!State.allVideos) return [];
        let filtered = State.allVideos;

        if (State.currentFilters.category !== 'all') {
             filtered = filtered.filter(v => v.category === State.currentFilters.category);
        }

        if (State.currentFilters.searchTerm.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH && State.fuse) {
            
            let fuseResults = State.fuse.search(State.currentFilters.searchTerm);
            
            if (fuseResults.length < 5 && State.looseFuse) {
                const looseResults = State.looseFuse.search(State.currentFilters.searchTerm);
                
                const existingIds = new Set(fuseResults.map(r => r.item.id));
                const newResults = looseResults.filter(r => !existingIds.has(r.item.id));
                
                fuseResults = [...fuseResults, ...newResults];
            }

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
            UI.renderPopularTags();
        }

        const allMatchingVideos = getFilteredAndSortedVideos();
        UI.renderVideoCards(allMatchingVideos, isLoadMore, videoObserver);

        if (andScroll && !isLoadMore) {
            scrollToVideoGridIfNeeded();
        }

        clearSearchSuggestions();
        UI.updateFilterSummary();
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

        const currentSearchString = url.search.substring(1);

        if (currentSearchString !== newSearchString) {
             const newUrl = newSearchString ? `${window.location.pathname}?${newSearchString}` : window.location.pathname;
             history.pushState({ videoId, filters: State.currentFilters }, '', newUrl);
        }
    }

    function handleRouting() {
        const params = new URLSearchParams(window.location.search);
        const videoId = params.get('v');
        const categoryParam = params.get('name');
        
        const hasFilters = params.has('search') || params.has('tags') || (categoryParam && categoryParam !== 'all');

        if (videoId) {
            showSingleVideoView(videoId);
        } else {
            hideSingleVideoView();

            let category = 'all';
            if (categoryParam) {
                const isValid = CONSTANTS.PREDEFINED_CATEGORIES.some(c => c.id === categoryParam.toLowerCase());
                if(isValid) category = categoryParam.toLowerCase();
            }

            const categoryChanged = State.currentFilters.category !== category;
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
            State.looseFuse = new Fuse(fuseSource, CONSTANTS.FUSE_LOOSE_OPTIONS); // מנוע משני להשלמה סמנטית

            if(categoryChanged) UI.renderPopularTags();

            applyFilters(false, false);

            if(window.location.hash) {
                 setTimeout(() => {
                    const targetId = window.location.hash.substring(1);
                    const el = document.getElementById(targetId);
                    if(el) {
                         const headerOffset = 100;
                         const elementPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                         window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                    }
                 }, 200);
            } else if (hasFilters) {
                 setTimeout(() => scrollToVideoGridIfNeeded(), 300);
            } else {
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

        UI.toggleSingleVideoMode(true);

        window.scrollTo(0, 0);
        document.title = `${video.title} - CAR-טיב`;

        DOM.singleVideoView.title.innerHTML = video.title;
        DOM.singleVideoView.player.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;

        DOM.singleVideoView.channel.innerHTML = `<img src="${video.channelImage || ''}" alt="" class="h-6 w-6 rounded-full"><span class="font-medium">${video.channel}</span>`;
        DOM.singleVideoView.duration.innerHTML = `<i class="fas fa-clock fa-fw"></i> ${video.duration}`;

        if(DOM.singleVideoView.category) {
            const categoryData = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === video.category);
            const categoryName = categoryData ? categoryData.name : (video.category || 'כללי');
            const categoryIcon = categoryData ? categoryData.icon : 'folder';

            DOM.singleVideoView.categoryText.textContent = categoryName;
            DOM.singleVideoView.categoryIcon.className = `fas fa-${categoryIcon} fa-fw`;
            DOM.singleVideoView.category.href = `?name=${video.category}`;
            DOM.singleVideoView.category.dataset.categoryLink = "true";
        }

        if (video.content) {
            DOM.singleVideoView.content.innerHTML = `<p class="text-slate-700 dark:text-slate-300 text-lg leading-relaxed bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border-r-4 border-purple-500">${video.content}</p>`;
            DOM.singleVideoView.descriptionContainer.classList.remove('hidden');
        } else {
            DOM.singleVideoView.descriptionContainer.classList.add('hidden');
        }

        if (video.dateAdded && !isNaN(video.dateAdded.getTime())) {
            DOM.singleVideoView.date.style.display = 'flex';
            DOM.singleVideoView.date.innerHTML = `<i class="fas fa-calendar-alt fa-fw"></i> ${video.dateAdded.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
            DOM.singleVideoView.date.style.display = 'none';
        }

        DOM.singleVideoView.tags.innerHTML = (video.tags || []).map(tag =>
            `<a href="./?tags=${encodeURIComponent(tag)}" data-tag-link="true" class="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">${tag.charAt(0).toUpperCase() + tag.slice(1)}</a>`
        ).join('');
    }

    function hideSingleVideoView() {
        UI.toggleSingleVideoMode(false);
        document.title = 'CAR-טיב - סרטוני רכבים כשרים';
    }

    function playVideoInline(cardElement) {
        if (!cardElement) return;
        const videoId = cardElement.dataset.videoId;
        const iframe = cardElement.querySelector('.video-iframe');
        const playLink = cardElement.querySelector('.video-play-link');

        if (videoId && iframe && playLink && iframe.classList.contains('hidden')) {
            playLink.style.display = 'none';
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
            iframe.classList.remove('hidden');
        }
    }

    function scrollToVideoGridIfNeeded() {
        const gridSection = document.getElementById('video-grid-section');
        if (gridSection) {
            const rect = gridSection.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                 const header = document.querySelector('header.sticky');
                 const headerOffset = header ? header.offsetHeight + 20 : 80;
                 const elementPosition = rect.top + window.pageYOffset - headerOffset;
                 window.scrollTo({ top: elementPosition, behavior: "smooth" });
            }
        }
    }

    async function handleCheckYtId(e) {
        if (e) e.preventDefault();

        function extractYouTubeVideoId(url) {
            if (!url) return null;
            const patterns = [
                /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/|attribution_link\?a=.*&u=%2Fwatch%3Fv%3D)([\w-]{11})/,
                /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/,
                /^([\w-]{11})$/
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) return match[1];
            }
            return null;
        }

        const { value: userInput } = await Swal.fire({
            title: 'בדיקת סרטון במאגר',
            text: 'הכנס קישור לסרטון יוטיוב או מזהה (ID) לבדיקה:',
            input: 'url',
            inputPlaceholder: 'https://www.youtube.com/watch?v=...',
            confirmButtonText: 'בדוק',
            cancelButtonText: 'ביטול',
            showCancelButton: true,
            confirmButtonColor: '#7c3aed',
            inputAutoTrim: true
        });

        if (!userInput) return;

        const videoId = extractYouTubeVideoId(userInput);
        if (!videoId) {
            Swal.fire({
                icon: 'error',
                title: 'שגיאה',
                text: 'לא זוהה מזהה סרטון תקין.',
                confirmButtonColor: '#7c3aed'
            });
            return;
        }

        Swal.fire({
            title: 'מחפש במאגר...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        if (!State.allVideosCache || State.allVideosCache.length === 0) {
             const promises = CONSTANTS.CATEGORY_FILES.map(file => Data.fetchVideosFromFile(file));
             const results = await Promise.all(promises);
             State.allVideosCache = results.flat();
        }

        const foundVideo = State.allVideosCache.find(v => v.id === videoId);

        if (foundVideo) {
            Swal.fire({
                icon: 'info',
                title: 'הסרטון קיים!',
                html: `
                    <div class="text-right">
                        <p class="mb-2">הסרטון <strong>"${foundVideo.title}"</strong> כבר נמצא במאגר.</p>
                        <p class="text-sm text-gray-500">קטגוריה: ${foundVideo.category}</p>
                    </div>
                `,
                imageUrl: foundVideo.thumbnail,
                imageWidth: 320,
                imageHeight: 180,
                imageAlt: foundVideo.title,
                confirmButtonText: 'סגור',
                confirmButtonColor: '#7c3aed'
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: 'הסרטון לא קיים',
                text: `הסרטון (ID: ${videoId}) טרם נוסף למאגר. אתה מוזמן להוסיף אותו!`,
                confirmButtonText: 'מעולה, תודה',
                confirmButtonColor: '#10b981'
            });
        }
    }

    async function shareContent(url, buttonElement, successMessage, title) {
        const shareData = {
            title: `CAR-טיב: ${title}`,
            text: `צפה בסרטון "${title}" באתר CAR-טיב!`,
            url: url,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                if (buttonElement && successMessage) {
                    const icon = buttonElement.querySelector('i');
                    const originalIconClass = icon ? icon.className : '';
                    const textSpan = buttonElement.querySelector('span');
                    const originalText = textSpan ? textSpan.textContent : '';
                    if (icon) icon.className = 'fas fa-check text-green-500';
                    if (textSpan) textSpan.textContent = successMessage;
                    buttonElement.disabled = true;
                    setTimeout(() => {
                        if (icon) icon.className = originalIconClass;
                        if (textSpan) textSpan.textContent = originalText;
                        buttonElement.disabled = false;
                    }, 2000);
                } else {
                    alert('הקישור הועתק ללוח!');
                }
            } catch (err) {
                console.error('Failed to copy:', err);
                alert('לא ניתן היה להעתיק את הקישור.');
            }
        }
    }

    function setupEventListeners() {
        document.body.addEventListener('click', (e) => {
            const { target } = e;
            const link = target.closest('a');
            const card = target.closest('article[data-video-id]');

            if (link && link.classList.contains('nav-logo-link')) {
                e.preventDefault();
                window.location.href = './';
                return;
            }

            if (link && link.classList.contains('nav-internal-link')) {
                 const href = link.getAttribute('href');
                 const isHashLink = href.includes('#');
                 const targetId = isHashLink ? href.substring(href.lastIndexOf('#') + 1) : href.split('#')[1];

                 if (DOM.mobileMenu && !DOM.mobileMenu.classList.contains('translate-x-full')) {
                     DOM.mobileMenu.classList.add('translate-x-full');
                     DOM.backdrop.classList.add('invisible', 'opacity-0');
                     document.body.classList.remove('overflow-hidden');
                 }

                 if (!DOM.singleVideoView.container.classList.contains('hidden') || DOM.sections.homeHero.classList.contains('hidden')) {
                     e.preventDefault();

                     UI.toggleSingleVideoMode(false);
                     UI.updateCategoryPageUI('all');

                     history.pushState(null, '', './#' + (targetId || 'home-hero'));

                     setTimeout(() => {
                        if (targetId && document.getElementById(targetId)) {
                             const el = document.getElementById(targetId);
                             const headerOffset = 100;
                             const elementPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                             window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                             history.replaceState(null, '', './');
                        } else {
                             window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                     }, 100);
                 } else {
                     if (isHashLink && targetId) {
                         e.preventDefault();
                         const el = document.getElementById(targetId);
                         if (el) {
                             const headerOffset = 100;
                             const elementPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                             window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                             history.replaceState(null, '', './');
                         }
                     }
                 }
            }

            if (link && link.dataset.categoryLink === "true") {
                e.preventDefault();
                const url = new URL(link.href, window.location.origin);
                const category = url.searchParams.get('name');
                history.pushState(null, '', `?name=${category}`);
                handleRouting();
                setTimeout(() => scrollToVideoGridIfNeeded(), 100);
                return;
            }

            if (link && link.dataset.tagLink === "true") {
                 e.preventDefault();
                 const url = new URL(link.href, window.location.origin);
                 const tags = url.searchParams.get('tags');
                 history.pushState(null, '', `./?tags=${encodeURIComponent(tags)}`);
                 handleRouting();
                 setTimeout(() => scrollToVideoGridIfNeeded(), 100);
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
                history.pushState(null, '', `./?tags=${encodeURIComponent(videoTagButton.dataset.tag)}`);
                handleRouting();
                setTimeout(() => scrollToVideoGridIfNeeded(), 100);
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

            if (target.closest('#single-video-home-btn')) {
                 e.preventDefault();
                 history.pushState(null, '', './');
                 handleRouting();
            }

            if (target.closest('#single-video-back-btn')) {
                 e.preventDefault();
                 if (history.length > 1 && document.referrer.includes(window.location.host)) {
                    history.back();
                 } else {
                    history.pushState(null, '', './');
                    handleRouting();
                 }
            }

            if (target.closest('#no-results-clear-btn') || target.closest('#clear-filters-btn')) clearAllFilters();

            if (target.closest('#share-filters-btn')) shareContent(window.location.href, target.closest('#share-filters-btn'), 'הועתק!', 'סינון נוכחי');

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
                input.addEventListener('input', () => throttle(() => handleSearchInput(input), 500));
                input.addEventListener('keydown', handleSearchKeyDown);
                input.addEventListener('blur', () => setTimeout(() => { if (!State.search.isSuggestionClicked) clearSearchSuggestions(); }, 150));
            }
        });

        if(DOM.tagSearchInput) {
            DOM.tagSearchInput.addEventListener('input', () => throttle(() => handleTagInput(DOM.tagSearchInput), 300));
        }

        if(DOM.hebrewFilterToggle) DOM.hebrewFilterToggle.addEventListener('change', (e) => {
            State.currentFilters.hebrewOnly = e.target.checked;
            localStorage.setItem('hebrewOnlyPreference', String(e.target.checked));
            updateFiltersAndURL();
        });
        if(DOM.sortSelect) DOM.sortSelect.addEventListener('change', (e) => {
            State.currentFilters.sortBy = e.target.value;
            updateFiltersAndURL(false);
        });

        if(DOM.customTagForm) DOM.customTagForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if(DOM.tagSearchInput) {
                const newTagName = DOM.tagSearchInput.value.trim().toLowerCase();
                if (newTagName && !State.currentFilters.tags.includes(newTagName)) {
                    toggleTagSelection(newTagName);
                    DOM.tagSearchInput.value = '';
                    const suggestionsContainer = document.getElementById('tag-suggestions');
                    if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
                }
            }
        });

        if (DOM.backToTopButton) {
            DOM.backToTopButton.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
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

        if (DOM.currentYearFooter) DOM.currentYearFooter.textContent = new Date().getFullYear();

        const isDark = document.documentElement.classList.contains('dark');
        DOM.darkModeToggles.forEach(toggle => {
            const moonIcon = toggle.querySelector('.fa-moon');
            const sunIcon = toggle.querySelector('.fa-sun');
            
            if (isDark) {
                if(moonIcon) moonIcon.classList.add('hidden');
                if(sunIcon) sunIcon.classList.remove('hidden');
            } else {
                if(moonIcon) moonIcon.classList.remove('hidden');
                if(sunIcon) sunIcon.classList.add('hidden');
            }
            toggle.setAttribute('aria-checked', String(isDark));
        });

        if ('IntersectionObserver' in window) {
            videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const iframe = entry.target.querySelector('.video-iframe');
                    const playLink = entry.target.querySelector('.video-play-link');
                    if (!iframe || !playLink) return;
                    if (!entry.isIntersecting && !iframe.classList.contains('hidden')) {
                        iframe.src = '';
                        iframe.classList.add('hidden');
                        playLink.style.display = 'block';
                    }
                });
            }, { threshold: 0.1 });
        }

        await Data.loadVideos();
        const channels = await Data.loadFeaturedChannels();
        UI.renderFeaturedChannels(channels);
        UI.renderHomepageCategoryButtons();

        window.addEventListener('popstate', handleRouting);
        setupEventListeners();

        handleRouting();
    }

    init();
});

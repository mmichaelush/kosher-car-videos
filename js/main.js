document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------------
    // 1. קבועים והגדרות
    // --------------------------------------------------------------------------------
    const CONSTANTS = {
        MAX_POPULAR_TAGS: 50,
        VIDEOS_TO_SHOW_INITIALLY: 24,
        VIDEOS_TO_LOAD_MORE: 12,
        MIN_SEARCH_TERM_LENGTH: 2,
        FUSE_OPTIONS: {
            keys: ['title', 'tags', 'channel'],
            threshold: 0.3, // דיוק חיפוש (נמוך יותר = יותר מדויק)
            ignoreLocation: true
        },
        CATEGORY_FILES: [
            'collectors', 'diy', 'maintenance', 'review', 'systems',
            'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad',
        ],
        PREDEFINED_CATEGORIES: [
            { id: "all", name: "הכל", icon: "film", gradient: "from-gray-600 to-gray-800" }, // Fallback gradient
            { id: "review", name: "סקירות רכב", icon: "magnifying-glass-chart" },
            { id: "safety", name: "מבחני בטיחות", icon: "shield-halved" },
            { id: "offroad", name: "שטח ו-4X4", icon: "mountain" },
            { id: "maintenance", name: "טיפולים", icon: "oil-can" },
            { id: "diy", name: "עשה זאת בעצמך", icon: "tools" },
            { id: "troubleshooting", name: "איתור תקלות", icon: "microscope" },
            { id: "driving", name: "נהיגה נכונה", icon: "road" },
            { id: "upgrades", name: "שיפורים", icon: "rocket" },
            { id: "systems", name: "מערכות הרכב", icon: "cogs" },
            { id: "collectors", name: "אספנות", icon: "car-side" }
        ]
    };

    // --------------------------------------------------------------------------------
    // 2. אלמנטים בדף (DOM)
    // --------------------------------------------------------------------------------
    const dom = {
        // כללי
        preloader: document.getElementById('site-preloader'),
        videoCardsContainer: document.getElementById('video-cards-container'),
        videoCardTemplate: document.getElementById('video-card-template'),
        noVideosMessage: document.getElementById('no-videos-found'),
        
        // אזורי תוכן ראשיים
        homeContainer: document.getElementById('home-view-container'),
        homeBottomSection: document.getElementById('home-view-sections-bottom'),
        categoryHeader: document.getElementById('category-header-section'),
        mainContent: document.getElementById('main-page-content'),
        singleVideoContainer: document.getElementById('single-video-view'),
        footer: document.getElementById('site-footer'),

        // טקסטים וכותרות
        pageTitleCategory: document.getElementById('category-page-title'),
        breadcrumbName: document.getElementById('breadcrumb-category-name'),
        videoGridTitle: document.getElementById('videos-grid-title'),
        categoryCount: document.getElementById('category-video-count-summary'),
        heroCount: document.getElementById('video-count-hero'),
        
        // פילטרים וחיפוש
        searchInput: document.getElementById('main-content-search-input'),
        searchForm: document.getElementById('main-content-search-form'),
        searchSuggestions: document.getElementById('main-content-search-suggestions'),
        tagsContainer: document.getElementById('popular-tags-container'),
        activeTagsContainer: document.getElementById('selected-tags-container'),
        sortSelect: document.getElementById('sort-by-select'),
        hebrewToggle: document.getElementById('hebrew-filter-toggle'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        filterSummary: document.getElementById('filter-summary-container'),
        
        // כפתורים ותפריטים
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        mobileMenuBtn: document.getElementById('open-menu-btn'),
        closeMenuBtn: document.getElementById('close-menu-btn'),
        mobileMenu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        backToTopBtn: document.getElementById('back-to-top-btn'),

        // ערוצים מומלצים
        channelsTrack: document.getElementById('featured-channels-track'),
        
        // נגן יחיד
        player: {
            frame: document.getElementById('single-video-player-container'),
            title: document.getElementById('single-video-title'),
            desc: document.getElementById('single-video-content'),
            tags: document.getElementById('single-video-tags'),
            meta: document.getElementById('single-video-metadata'),
            backBtn: document.getElementById('single-video-back-btn'),
            shareBtn: document.getElementById('single-video-share-btn')
        }
    };

    // --------------------------------------------------------------------------------
    // 3. ניהול מצב (State)
    // --------------------------------------------------------------------------------
    let state = {
        allVideos: [],      // כל הסרטונים שנטענו
        filteredVideos: [], // הסרטונים המוצגים כרגע לאחר סינון
        fuse: null,         // מנוע חיפוש
        view: 'home',       // 'home', 'category', 'video'
        
        filters: {
            category: 'all',
            search: '',
            tags: [],
            hebrewOnly: false,
            sort: 'date-desc'
        },
        
        pagination: {
            count: 0
        },
        
        isSearchDirty: false
    };

    let videoObserver = null; // לטעינה עצלה של תמונות/אייפריימים

    // --------------------------------------------------------------------------------
    // 4. פונקציות עזר
    // --------------------------------------------------------------------------------
    const getThumbnail = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
    
    const parseDuration = (str) => {
        if (!str) return 0;
        const p = str.split(':').map(Number);
        return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p.length === 2 ? p[0]*60 + p[1] : 0;
    };

    const debounce = (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    // --------------------------------------------------------------------------------
    // 5. טעינת נתונים
    // --------------------------------------------------------------------------------
    async function fetchAllData() {
        try {
            // טעינת כל הקבצים במקביל
            const promises = CONSTANTS.CATEGORY_FILES.map(async file => {
                try {
                    const res = await fetch(`data/videos/${file}.json`);
                    if (!res.ok) return [];
                    const json = await res.json();
                    const list = Array.isArray(json) ? json : (json.videos || []);
                    
                    // עיבוד מקדים לשיפור ביצועים
                    return list.map(v => ({
                        id: v.id,
                        title: v.title,
                        category: v.category || file,
                        channel: v.channel,
                        channelImage: v.channelImage,
                        duration: v.duration,
                        durationSec: parseDuration(v.duration),
                        date: v.dateAdded ? new Date(v.dateAdded) : new Date(0), // תאריך ברירת מחדל אם אין
                        hebrew: v.hebrewContent,
                        tags: (v.tags || []).map(t => t.toLowerCase()),
                        content: v.content,
                        thumbnail: getThumbnail(v.id)
                    }));
                } catch (e) {
                    console.error(`Failed to load ${file}`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            state.allVideos = results.flat();
            
            // אתחול מנוע חיפוש
            state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);

            // עדכון מונה בדף הבית
            if(dom.heroCount) dom.heroCount.querySelector('span').textContent = state.allVideos.length;

            console.log(`Loaded ${state.allVideos.length} videos.`);

        } catch (error) {
            console.error("Critical Error Loading Data", error);
            dom.videoCardsContainer.innerHTML = '<p class="text-center text-red-500 mt-10">שגיאה בטעינת הנתונים. אנא רענן את הדף.</p>';
        }
    }

    async function loadFeaturedChannels() {
        if(!dom.channelsTrack) return;
        try {
            const res = await fetch('data/featured_channels.json');
            if(!res.ok) return;
            const data = await res.json();
            const channels = data.channels || data;
            
            if(channels.length) {
                const html = [...channels, ...channels].map(c => `
                    <a href="${c.channel_url}" target="_blank" class="channel-card block p-4 bg-white dark:bg-slate-700 rounded-xl shadow-md border border-slate-100 dark:border-slate-600 hover:border-purple-500 dark:hover:border-purple-400 text-center transition-transform hover:-translate-y-1 mx-2" style="min-width: 200px;">
                        <img src="${c.channel_image_url}" class="w-16 h-16 mx-auto rounded-full mb-3 object-cover border-2 border-slate-200" loading="lazy" alt="${c.channel_name}">
                        <h3 class="font-bold text-slate-800 dark:text-white truncate">${c.channel_name}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">${c.content_description}</p>
                    </a>
                `).join('');
                dom.channelsTrack.innerHTML = html;
            }
        } catch(e) { console.error(e); }
    }

    // --------------------------------------------------------------------------------
    // 6. לוגיקת ליבה - סינון ורינדור
    // --------------------------------------------------------------------------------
    function filterVideos() {
        let result = state.allVideos;

        // 1. קטגוריה
        if (state.filters.category !== 'all') {
            result = result.filter(v => v.category === state.filters.category);
        }

        // 2. חיפוש טקסט
        if (state.filters.search.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            const searchResults = state.fuse.search(state.filters.search);
            const ids = new Set(searchResults.map(r => r.item.id));
            result = result.filter(v => ids.has(v.id));
        }

        // 3. תגיות
        if (state.filters.tags.length > 0) {
            result = result.filter(v => state.filters.tags.every(tag => v.tags.includes(tag)));
        }

        // 4. עברית בלבד
        if (state.filters.hebrewOnly) {
            result = result.filter(v => v.hebrew);
        }

        // 5. מיון
        result.sort((a, b) => {
            switch (state.filters.sort) {
                case 'date-desc': return b.date - a.date;
                case 'date-asc': return a.date - b.date;
                case 'title-asc': return a.title.localeCompare(b.title, 'he');
                case 'title-desc': return b.title.localeCompare(a.title, 'he');
                case 'duration-asc': return a.durationSec - b.durationSec;
                case 'duration-desc': return b.durationSec - a.durationSec;
                default: return 0;
            }
        });

        state.filteredVideos = result;
        state.pagination.count = 0; // איפוס פגינציה
        
        renderGrid(false); // רינדור מחדש (לא Append)
        updateUI();
    }

    function renderGrid(isAppend) {
        const start = isAppend ? state.pagination.count : 0;
        const limit = isAppend ? CONSTANTS.VIDEOS_TO_LOAD_MORE : CONSTANTS.VIDEOS_TO_SHOW_INITIALLY;
        const nextBatch = state.filteredVideos.slice(start, start + limit);
        
        // אם זה לא Append, מנקים את הקונטיינר
        if (!isAppend) {
            dom.videoCardsContainer.innerHTML = '';
            window.scrollTo({ top: 0, behavior: 'instant' }); // גלילה למעלה רק בשינוי פילטר
            // אם אנחנו לא בדף הבית הראשי, אולי נרצה לגלול לאזור הוידאו
            if (state.view === 'home' && state.filters.category === 'all') {
                // Do nothing special on initial load
            } else {
                 const headerHeight = document.querySelector('header').offsetHeight || 80;
                 // אופציונלי: גלילה לאזור הוידאו
            }
        }

        // יצירת ה-HTML (String Concatenation מהיר יותר מ-DOM Nodes)
        const html = nextBatch.map(v => `
            <article class="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow" data-id="${v.id}">
                <div class="relative aspect-video bg-slate-200 dark:bg-slate-700 cursor-pointer video-thumb-wrapper">
                    <img src="${v.thumbnail}" alt="${v.title}" class="w-full h-full object-cover" loading="lazy">
                    <span class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">${v.duration}</span>
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <i class="fas fa-play-circle text-5xl text-white drop-shadow-lg"></i>
                    </div>
                </div>
                <div class="p-4 flex flex-col flex-grow">
                     <div class="flex justify-between items-center text-xs text-slate-500 mb-2">
                        <div class="flex items-center gap-2">
                             ${v.channelImage ? `<img src="${v.channelImage}" class="w-6 h-6 rounded-full">` : '<i class="fas fa-user-circle"></i>'}
                             <span class="truncate max-w-[120px]">${v.channel}</span>
                        </div>
                        <span class="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                             ${getCategoryName(v.category)}
                        </span>
                     </div>
                     <h3 class="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                         <a href="?v=${v.id}" class="hover:text-purple-600 transition-colors video-link">${v.title}</a>
                     </h3>
                     <div class="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                         <span>${v.date.toLocaleDateString('he-IL')}</span>
                         <button class="hover:text-purple-500 share-btn" title="שתף"><i class="fas fa-share-alt"></i></button>
                     </div>
                </div>
            </article>
        `).join('');

        if (isAppend) {
            dom.videoCardsContainer.insertAdjacentHTML('beforeend', html);
        } else {
            dom.videoCardsContainer.innerHTML = html;
        }

        state.pagination.count += nextBatch.length;
        
        // כפתור "טען עוד"
        let loadMoreBtn = document.getElementById('load-more-btn');
        if (state.pagination.count < state.filteredVideos.length) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-btn';
                loadMoreBtn.className = 'col-span-full mx-auto mt-8 px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-md';
                loadMoreBtn.textContent = 'טען עוד סרטונים';
                loadMoreBtn.onclick = () => renderGrid(true);
                dom.videoCardsContainer.parentNode.appendChild(loadMoreBtn);
            } else {
                loadMoreBtn.style.display = 'block';
                dom.videoCardsContainer.parentNode.appendChild(loadMoreBtn); // Move to bottom
            }
        } else if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }

        // הודעת "לא נמצאו תוצאות"
        if (state.filteredVideos.length === 0) {
            dom.noVideosMessage.classList.remove('hidden');
            dom.noVideosMessage.innerHTML = `
                <div class="text-center py-10">
                    <i class="fas fa-search fa-3x text-slate-300 mb-4"></i>
                    <p class="text-xl text-slate-500">לא נמצאו סרטונים התואמים את החיפוש.</p>
                    <button id="reset-search-btn" class="mt-4 text-purple-600 underline">נקה חיפוש וסינון</button>
                </div>
            `;
            document.getElementById('reset-search-btn')?.addEventListener('click', clearFilters);
        } else {
            dom.noVideosMessage.classList.add('hidden');
        }
    }

    function getCategoryName(id) {
        const cat = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === id);
        return cat ? cat.name : id;
    }

    // --------------------------------------------------------------------------------
    // 7. עדכון ממשק משתמש (UI)
    // --------------------------------------------------------------------------------
    function updateUI() {
        // עדכון כותרות
        if (state.view === 'category' && state.filters.category !== 'all') {
            const catName = getCategoryName(state.filters.category);
            dom.categoryHeader.classList.remove('hidden');
            dom.homeContainer.classList.add('hidden');
            dom.homeBottomSection.classList.add('hidden');
            
            if(dom.pageTitleCategory) dom.pageTitleCategory.textContent = catName;
            if(dom.breadcrumbName) dom.breadcrumbName.textContent = catName;
            if(dom.videoGridTitle) dom.videoGridTitle.textContent = `סרטונים בקטגוריה: ${catName}`;
            if(dom.categoryCount) dom.categoryCount.textContent = `נמצאו ${state.filteredVideos.length} סרטונים`;
        } else {
            // תצוגת הבית
            dom.categoryHeader.classList.add('hidden');
            dom.homeContainer.classList.remove('hidden');
            dom.homeBottomSection.classList.remove('hidden');
            if(dom.videoGridTitle) dom.videoGridTitle.textContent = 'כל הסרטונים';
        }

        // עדכון תגיות
        updateTagsCloud();
        
        // עדכון סימון תגיות פעילות
        updateActiveTagsUI();

        // עדכון סיכום פילטרים
        const activeCount = state.filters.tags.length + (state.filters.hebrewOnly ? 1 : 0) + (state.filters.search ? 1 : 0);
        dom.filterSummary.classList.toggle('hidden', activeCount === 0);
        if(activeCount > 0) {
            dom.filterSummary.querySelector('span').textContent = `${activeCount} סינונים פעילים`;
        }
    }

    function updateTagsCloud() {
        if (!dom.tagsContainer) return;
        
        // חישוב תגיות מתוך התוצאות הנוכחיות (או מתוך הקטגוריה)
        const sourceVideos = state.filters.category === 'all' 
            ? state.allVideos 
            : state.allVideos.filter(v => v.category === state.filters.category);

        const tagCounts = {};
        sourceVideos.forEach(v => {
            v.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONSTANTS.MAX_POPULAR_TAGS)
            .map(entry => entry[0]);

        dom.tagsContainer.innerHTML = sortedTags.map(tag => `
            <button class="tag-btn bg-slate-200 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full text-sm transition-colors ${state.filters.tags.includes(tag) ? 'ring-2 ring-purple-500 bg-purple-100' : ''}" data-tag="${tag}">
                ${tag}
            </button>
        `).join('');
    }

    function updateActiveTagsUI() {
        if(!dom.activeTagsContainer) return;
        dom.activeTagsContainer.innerHTML = state.filters.tags.map(tag => `
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                ${tag}
                <button type="button" class="remove-tag hover:text-purple-900" data-tag="${tag}">×</button>
            </span>
        `).join('');
    }

    // --------------------------------------------------------------------------------
    // 8. נגן וידאו (Single View)
    // --------------------------------------------------------------------------------
    function openVideo(id) {
        const video = state.allVideos.find(v => v.id === id);
        if (!video) return;

        state.view = 'video';
        
        // הסתרת הכל
        dom.mainContent.classList.add('hidden');
        dom.singleVideoContainer.classList.remove('hidden');
        
        // גלילה למעלה
        window.scrollTo(0,0);

        // מילוי תוכן
        dom.player.frame.innerHTML = `<iframe class="w-full h-full absolute inset-0" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
        dom.player.title.textContent = video.title;
        dom.player.desc.innerHTML = video.content || 'אין תיאור זמין.';
        dom.player.desc.classList.remove('hidden');
        
        // מטא דאטה
        let metaHtml = `<span class="flex items-center gap-2"><i class="fas fa-user-circle"></i> ${video.channel}</span>`;
        metaHtml += `<span class="flex items-center gap-2"><i class="fas fa-clock"></i> ${video.duration}</span>`;
        if(video.date) metaHtml += `<span class="flex items-center gap-2"><i class="fas fa-calendar"></i> ${video.date.toLocaleDateString('he-IL')}</span>`;
        dom.player.meta.innerHTML = metaHtml;

        // תגיות
        dom.player.tags.innerHTML = video.tags.map(t => 
            `<button class="text-sm text-purple-600 hover:underline cursor-pointer tag-link" data-tag="${t}">#${t}</button>`
        ).join(' ');

        // עדכון URL
        updateUrl();
    }

    function closeVideo() {
        state.view = state.filters.category === 'all' ? 'home' : 'category';
        dom.singleVideoContainer.classList.add('hidden');
        dom.mainContent.classList.remove('hidden');
        dom.player.frame.innerHTML = ''; // עצירת הוידאו
        
        // החזרת ה-UI למצב הקודם
        updateUI();
        updateUrl();
    }

    // --------------------------------------------------------------------------------
    // 9. ניהול URL וניווט
    // --------------------------------------------------------------------------------
    function updateUrl() {
        const params = new URLSearchParams();
        
        if (state.view === 'video') {
            const vidId = dom.singleVideoContainer.querySelector('iframe')?.src.split('/embed/')[1].split('?')[0];
            if(vidId) params.set('v', vidId);
        } else {
            if (state.filters.category !== 'all') params.set('name', state.filters.category);
            if (state.filters.search) params.set('search', state.filters.search);
            if (state.filters.tags.length) params.set('tags', state.filters.tags.join(','));
        }

        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        history.pushState(null, '', newUrl);
    }

    function readUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // בדיקת וידאו בודד
        const videoId = params.get('v');
        if (videoId) {
            // אנחנו חייבים לחכות שהנתונים ייטענו קודם
            if (state.allVideos.length > 0) {
                openVideo(videoId);
                return;
            }
        }

        // קטגוריה
        const cat = params.get('name');
        if (cat && CONSTANTS.PREDEFINED_CATEGORIES.some(c => c.id === cat)) {
            state.view = 'category';
            state.filters.category = cat;
        } else {
            state.view = 'home';
            state.filters.category = 'all';
        }

        // פילטרים נוספים
        if (params.get('search')) state.filters.search = params.get('search');
        if (params.get('tags')) state.filters.tags = params.get('tags').split(',');

        filterVideos();
    }

    // --------------------------------------------------------------------------------
    // 10. אירועים (Event Listeners)
    // --------------------------------------------------------------------------------
    function setupEvents() {
        // חיפוש
        dom.searchInput.addEventListener('input', debounce((e) => {
            state.filters.search = e.target.value.trim();
            filterVideos();
            updateUrl();
        }, 300));

        // קליק על כרטיס וידאו (Delegation)
        dom.videoCardsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('article');
            if (card && !e.target.closest('.share-btn')) { // מניעת פתיחה בלחיצה על שיתוף
                e.preventDefault();
                openVideo(card.dataset.id);
            }
        });

        // כפתורי תגיות (Delegation)
        document.addEventListener('click', (e) => {
            // הוספת תגית
            if (e.target.classList.contains('tag-btn') || e.target.classList.contains('tag-link')) {
                const tag = e.target.dataset.tag;
                if (!state.filters.tags.includes(tag)) {
                    state.filters.tags.push(tag);
                    filterVideos();
                    updateUrl();
                    // אם אנחנו בנגן, נסגור אותו ונחזור לגריד המסונן
                    if(state.view === 'video') closeVideo();
                }
            }
            // הסרת תגית
            if (e.target.classList.contains('remove-tag')) {
                const tag = e.target.dataset.tag;
                state.filters.tags = state.filters.tags.filter(t => t !== tag);
                filterVideos();
                updateUrl();
            }
        });

        // כפתור חזור בנגן
        dom.player.backBtn.addEventListener('click', closeVideo);

        // כפתור ניקוי פילטרים
        dom.clearFiltersBtn.addEventListener('click', clearFilters);

        // טוגל עברית
        dom.hebrewToggle.addEventListener('change', (e) => {
            state.filters.hebrewOnly = e.target.checked;
            filterVideos();
        });

        // מיון
        dom.sortSelect.addEventListener('change', (e) => {
            state.filters.sort = e.target.value;
            filterVideos();
        });

        // ניווט בדפדפן (Back/Forward)
        window.addEventListener('popstate', readUrl);
        
        // גלילה (Scroll to top button)
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) dom.backToTopBtn.classList.remove('invisible', 'opacity-0');
            else dom.backToTopBtn.classList.add('invisible', 'opacity-0');
        });
        dom.backToTopBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
        
        // תפריט מובייל
        dom.mobileMenuBtn.addEventListener('click', () => {
            dom.mobileMenu.classList.remove('translate-x-full');
            dom.backdrop.classList.remove('invisible', 'opacity-0');
        });
        const closeMenu = () => {
            dom.mobileMenu.classList.add('translate-x-full');
            dom.backdrop.classList.add('invisible', 'opacity-0');
        };
        dom.closeMenuBtn.addEventListener('click', closeMenu);
        dom.backdrop.addEventListener('click', closeMenu);
        
        // מצב לילה
        dom.darkModeToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            });
        });
    }

    function clearFilters() {
        state.filters.search = '';
        state.filters.tags = [];
        state.filters.hebrewOnly = false;
        state.filters.category = 'all'; // איפוס גם קטגוריה? לשיקולך. כרגע מאפס הכל.
        state.view = 'home'; // חוזר לבית
        
        dom.searchInput.value = '';
        dom.hebrewToggle.checked = false;
        
        filterVideos();
        updateUrl();
    }

    // --------------------------------------------------------------------------------
    // אתחול האפליקציה (Entry Point)
    // --------------------------------------------------------------------------------
    (async function init() {
        // 1. הסתרת תוכן עד לטעינה
        dom.mainContent.classList.add('hidden');
        dom.footer.classList.add('hidden');
        
        // 2. טעינת נתונים
        await fetchAllData();
        await loadFeaturedChannels();

        // 3. הגדרת אירועים
        setupEvents();

        // 4. קריאת מצב התחלתי מה-URL
        readUrl();

        // 5. הצגת האתר
        dom.preloader.style.opacity = '0';
        setTimeout(() => {
            dom.preloader.style.display = 'none';
            if (state.view !== 'video') {
                dom.mainContent.classList.remove('hidden');
            } else {
                // אם נכנסנו ישר לוידאו, ה-mainContent נשאר מוסתר ורק הנגן מוצג (טופל ב-openVideo)
            }
            dom.footer.classList.remove('hidden');
        }, 500);

    })();
});

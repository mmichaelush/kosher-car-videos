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
            threshold: 0.3,
            ignoreLocation: true
        },
        CATEGORY_FILES: [
            'collectors', 'diy', 'maintenance', 'review', 'systems',
            'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad',
        ],
        PREDEFINED_CATEGORIES: [
            { id: "all", name: "הכל", icon: "film", gradient: "from-gray-600 to-gray-800" },
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
        preloader: document.getElementById('site-preloader'),
        videoCardsContainer: document.getElementById('video-cards-container'),
        videoCardTemplate: document.getElementById('video-card-template'),
        noVideosMessage: document.getElementById('no-videos-found'),
        
        // אזורי תוכן
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
        homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
        
        // נגן יחיד
        player: {
            frame: document.getElementById('single-video-player-container'),
            title: document.getElementById('single-video-title'),
            desc: document.getElementById('single-video-content'),
            tags: document.getElementById('single-video-tags'),
            meta: document.getElementById('single-video-metadata'),
            channel: document.getElementById('single-video-channel'),
            duration: document.getElementById('single-video-duration'),
            date: document.getElementById('single-video-date'),
            backBtn: document.getElementById('single-video-back-btn'),
            shareBtn: document.getElementById('single-video-share-btn')
        }
    };

    // --------------------------------------------------------------------------------
    // 3. ניהול מצב (State)
    // --------------------------------------------------------------------------------
    let state = {
        allVideos: [],
        filteredVideos: [],
        fuse: null,
        view: 'home', // 'home', 'category', 'video'
        
        filters: {
            category: 'all',
            search: '',
            tags: [],
            hebrewOnly: false,
            sort: 'date-desc'
        },
        
        pagination: {
            count: 0
        }
    };

    let videoObserver;

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
            const promises = CONSTANTS.CATEGORY_FILES.map(async file => {
                try {
                    const res = await fetch(`data/videos/${file}.json`);
                    if (!res.ok) return [];
                    const json = await res.json();
                    const list = Array.isArray(json) ? json : (json.videos || []);
                    
                    return list.map(v => ({
                        id: v.id,
                        title: v.title,
                        category: v.category || file,
                        channel: v.channel,
                        channelImage: v.channelImage,
                        duration: v.duration,
                        durationSec: parseDuration(v.duration),
                        date: v.dateAdded ? new Date(v.dateAdded) : new Date(0),
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
            
            // בניית Fuse
            state.fuse = new Fuse(state.allVideos, CONSTANTS.FUSE_OPTIONS);

            // עדכון מונה ב-Hero
            if(dom.heroCount) dom.heroCount.querySelector('span').textContent = state.allVideos.length;

        } catch (error) {
            console.error("Critical Error", error);
            dom.videoCardsContainer.innerHTML = '<p class="text-center text-red-500 mt-10">שגיאה בטעינת הנתונים.</p>';
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
                    <a href="${c.channel_url}" target="_blank" class="channel-card block p-4 bg-white dark:bg-slate-700 rounded-xl shadow-md border border-slate-100 dark:border-slate-600 hover:border-purple-500 dark:hover:border-purple-400 text-center transition-transform hover:-translate-y-1 mx-2 shrink-0 w-64 snap-center">
                        <img src="${c.channel_image_url}" class="w-16 h-16 mx-auto rounded-full mb-3 object-cover border-2 border-slate-200" loading="lazy" alt="${c.channel_name}">
                        <h3 class="font-bold text-slate-800 dark:text-white truncate">${c.channel_name}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">${c.content_description}</p>
                    </a>
                `).join('');
                dom.channelsTrack.innerHTML = html;
            }
        } catch(e) { console.error(e); }
    }

    function renderHomepageCategoryButtons() {
        if (!dom.homepageCategoriesGrid) return;
        
        dom.homepageCategoriesGrid.innerHTML = CONSTANTS.PREDEFINED_CATEGORIES
            .filter(cat => cat.id !== 'all')
            .map(cat => {
                const count = state.allVideos.filter(v => v.category === cat.id).length;
                
                // צבעים דיפולטיביים אם אין בהגדרה
                const gradient = cat.gradient || "from-purple-500 to-indigo-600";
                
                return `
                    <a href="?name=${cat.id}" class="category-link relative group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${gradient} text-white text-center overflow-hidden">
                        <div class="flex flex-col items-center justify-center h-full min-h-[140px]">
                            <i class="fas fa-${cat.icon || 'folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                            <h3 class="text-xl font-bold">${cat.name}</h3>
                        </div>
                        <span class="absolute top-3 right-3 bg-black/30 text-white text-xs font-bold py-1 px-2.5 rounded-full">${count}</span>
                    </a>`;
            }).join('');
    }

    // --------------------------------------------------------------------------------
    // 6. לוגיקת סינון ורינדור
    // --------------------------------------------------------------------------------
    function filterVideos() {
        let result = state.allVideos;

        if (state.filters.category !== 'all') {
            result = result.filter(v => v.category === state.filters.category);
        }

        if (state.filters.search.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            const searchResults = state.fuse.search(state.filters.search);
            const ids = new Set(searchResults.map(r => r.item.id));
            result = result.filter(v => ids.has(v.id));
        }

        if (state.filters.tags.length > 0) {
            result = result.filter(v => state.filters.tags.every(tag => v.tags.includes(tag)));
        }

        if (state.filters.hebrewOnly) {
            result = result.filter(v => v.hebrew);
        }

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
        state.pagination.count = 0;
        
        renderGrid(false);
        updateUI();
    }

    function renderGrid(isAppend) {
        if (!dom.videoCardsContainer) return;

        const start = isAppend ? state.pagination.count : 0;
        const limit = isAppend ? CONSTANTS.VIDEOS_TO_LOAD_MORE : CONSTANTS.VIDEOS_TO_SHOW_INITIALLY;
        const nextBatch = state.filteredVideos.slice(start, start + limit);
        
        if (!isAppend) {
            dom.videoCardsContainer.innerHTML = '';
            // הסרת כפתור "טען עוד" ישן אם קיים
            const oldBtn = document.getElementById('load-more-btn');
            if(oldBtn) oldBtn.remove();
        }

        if (nextBatch.length === 0 && !isAppend) {
            dom.noVideosMessage.classList.remove('hidden');
            dom.noVideosMessage.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-video-slash fa-3x text-slate-400 mb-4"></i>
                    <p class="text-xl text-slate-500">לא נמצאו סרטונים.</p>
                    <button class="mt-4 text-purple-600 underline" onclick="document.getElementById('clear-filters-btn').click()">נקה סינון</button>
                </div>
            `;
            return;
        } else {
            dom.noVideosMessage.classList.add('hidden');
        }

        const html = nextBatch.map(v => {
            // יצירת תגיות HTML
            const tagsHtml = v.tags.slice(0, 3).map(tag => 
                `<span class="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full dark:bg-slate-700 dark:text-purple-300">#${tag}</span>`
            ).join('');

            // אייקון קטגוריה
            const cat = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === v.category);
            const catIcon = cat ? cat.icon : 'folder';
            const catName = cat ? cat.name : v.category;

            return `
            <article class="video-card group flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 transform hover:-translate-y-1" data-id="${v.id}">
                <!-- Thumbnail -->
                <div class="relative aspect-video bg-slate-200 dark:bg-slate-700 cursor-pointer overflow-hidden video-thumb-wrapper">
                    <img src="${v.thumbnail}" alt="${v.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                    
                    <!-- Duration Badge -->
                    <span class="absolute bottom-2 left-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-sm">
                        ${v.duration}
                    </span>

                    <!-- Play Overlay -->
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-[2px]">
                        <button class="bg-white/90 text-purple-600 rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                            <i class="fas fa-play fa-lg ml-1"></i>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4 flex flex-col flex-grow">
                     <!-- Channel Info -->
                     <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-2 min-w-0">
                             ${v.channelImage ? 
                                `<img src="${v.channelImage}" class="w-6 h-6 rounded-full border border-slate-200" alt="${v.channel}">` : 
                                `<div class="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><i class="fas fa-user text-xs"></i></div>`
                             }
                             <span class="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">${v.channel}</span>
                        </div>
                        <!-- Category Badge -->
                        <div class="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full shrink-0">
                            <i class="fas fa-${catIcon}"></i>
                            <span>${catName}</span>
                        </div>
                     </div>

                     <!-- Title -->
                     <h3 class="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-tight mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                         <a href="?v=${v.id}" class="video-link focus:outline-none">${v.title}</a>
                     </h3>

                     <!-- Tags -->
                     <div class="flex flex-wrap gap-1 mb-4 mt-auto">
                        ${tagsHtml}
                     </div>

                     <!-- Footer Actions -->
                     <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                         <span class="flex items-center gap-1.5">
                            <i class="far fa-calendar"></i>
                            ${v.date.toLocaleDateString('he-IL')}
                         </span>
                         <div class="flex gap-2">
                            <button class="hover:text-purple-500 transition-colors p-1 share-btn" title="שתף"><i class="fas fa-share-alt"></i></button>
                            <a href="?v=${v.id}" target="_blank" class="hover:text-purple-500 transition-colors p-1" title="פתח בטאב חדש"><i class="fas fa-external-link-alt"></i></a>
                         </div>
                     </div>
                </div>
            </article>
            `;
        }).join('');

        dom.videoCardsContainer.insertAdjacentHTML('beforeend', html);
        state.pagination.count += nextBatch.length;

        // ניהול כפתור "טען עוד"
        let loadMoreBtn = document.getElementById('load-more-btn');
        if (state.pagination.count < state.filteredVideos.length) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('div');
                loadMoreBtn.id = 'load-more-btn';
                loadMoreBtn.className = 'col-span-full flex justify-center mt-8';
                loadMoreBtn.innerHTML = `
                    <button class="px-8 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-full shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex items-center gap-2 group">
                        <span>טען עוד סרטונים</span>
                        <i class="fas fa-chevron-down group-hover:translate-y-1 transition-transform"></i>
                    </button>
                `;
                loadMoreBtn.querySelector('button').onclick = () => renderGrid(true);
                dom.videoCardsContainer.parentNode.appendChild(loadMoreBtn);
            } else {
                dom.videoCardsContainer.parentNode.appendChild(loadMoreBtn); // הזזה לסוף
            }
        } else if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
        
        // אתחול IntersectionObserver לתמונות אם צריך (כרגע הדפדפן מטפל ב-loading="lazy")
        if (videoObserver) {
            document.querySelectorAll('.video-card:not(.observed)').forEach(card => {
                videoObserver.observe(card);
                card.classList.add('observed');
            });
        }
    }

    function getCategoryName(id) {
        const cat = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === id);
        return cat ? cat.name : id;
    }

    // --------------------------------------------------------------------------------
    // 7. עדכון ממשק (UI)
    // --------------------------------------------------------------------------------
    function updateUI() {
        // עדכון כותרות ותצוגה ראשית
        if (state.view === 'category' && state.filters.category !== 'all') {
            const catName = getCategoryName(state.filters.category);
            dom.categoryHeader.classList.remove('hidden');
            dom.homeContainer.classList.add('hidden');
            dom.homeBottomSection.classList.add('hidden');
            
            dom.pageTitleCategory.textContent = catName;
            dom.breadcrumbName.textContent = catName;
            dom.videoGridTitle.textContent = `סרטונים בקטגוריה: ${catName}`;
            dom.categoryCount.textContent = `נמצאו ${state.filteredVideos.length} סרטונים`;
        } else {
            dom.categoryHeader.classList.add('hidden');
            dom.homeContainer.classList.remove('hidden');
            dom.homeBottomSection.classList.remove('hidden');
            dom.videoGridTitle.textContent = 'כל הסרטונים';
        }

        // עדכון תגיות פופולריות (Tag Cloud)
        updateTagsCloud();
        
        // עדכון תגיות נבחרות
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
            <button class="tag-btn bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/50 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-all border border-slate-200 dark:border-slate-600 ${state.filters.tags.includes(tag) ? '!bg-purple-600 !text-white !border-purple-600' : ''}" data-tag="${tag}">
                ${tag}
            </button>
        `).join('');
    }

    function updateActiveTagsUI() {
        if(!dom.activeTagsContainer) return;
        dom.activeTagsContainer.innerHTML = state.filters.tags.map(tag => `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-600 text-white shadow-sm animate-fadeIn">
                ${tag}
                <button type="button" class="remove-tag hover:bg-white/20 rounded-full p-0.5 transition-colors" data-tag="${tag}">
                    <i class="fas fa-times text-xs"></i>
                </button>
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
        
        dom.mainContent.classList.add('hidden');
        dom.singleVideoContainer.classList.remove('hidden');
        
        window.scrollTo({top: 0, behavior: 'smooth'});

        // נגן
        dom.player.frame.innerHTML = `<iframe class="w-full h-full absolute inset-0 rounded-lg" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
        
        // מידע
        dom.player.title.textContent = video.title;
        dom.player.desc.innerHTML = video.content ? `<p class="text-lg leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border-r-4 border-purple-500 shadow-sm">${video.content}</p>` : '';
        dom.player.desc.classList.toggle('hidden', !video.content);
        
        // מטא
        dom.player.channel.innerHTML = `<img src="${video.channelImage || ''}" class="w-8 h-8 rounded-full border border-slate-200"> <span class="text-lg font-medium">${video.channel}</span>`;
        dom.player.duration.innerHTML = `<i class="far fa-clock"></i> ${video.duration}`;
        dom.player.date.innerHTML = `<i class="far fa-calendar"></i> ${video.date.toLocaleDateString('he-IL')}`;
        dom.player.date.style.display = 'inline-flex';

        // תגיות
        dom.player.tags.innerHTML = video.tags.map(t => 
            `<button class="tag-link bg-purple-50 text-purple-700 dark:bg-slate-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm hover:bg-purple-100 transition-colors" data-tag="${t}">#${t}</button>`
        ).join('');

        updateUrl();
    }

    function closeVideo() {
        state.view = state.filters.category === 'all' ? 'home' : 'category';
        
        dom.singleVideoContainer.classList.add('hidden');
        dom.mainContent.classList.remove('hidden');
        dom.player.frame.innerHTML = ''; // ניקוי ה-iframe לעצירת ניגון
        
        updateUI();
        updateUrl();
        
        // גלילה חזרה לגריד אם צריך
        // dom.videoCardsContainer.scrollIntoView({ behavior: 'smooth' }); 
    }

    // --------------------------------------------------------------------------------
    // 9. ניהול URL וניווט
    // --------------------------------------------------------------------------------
    function updateUrl() {
        const params = new URLSearchParams();
        
        if (state.view === 'video') {
            const iframe = dom.player.frame.querySelector('iframe');
            if (iframe) {
                const vidId = iframe.src.split('/embed/')[1].split('?')[0];
                params.set('v', vidId);
            }
        } else {
            if (state.filters.category !== 'all') params.set('name', state.filters.category);
            if (state.filters.search) params.set('search', state.filters.search);
            if (state.filters.tags.length) params.set('tags', state.filters.tags.join(','));
            if (state.filters.hebrewOnly) params.set('hebrew', 'true');
        }

        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        history.pushState(null, '', newUrl);
    }

    function readUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // 1. וידאו ישיר
        const videoId = params.get('v');
        if (videoId && state.allVideos.length > 0) {
            openVideo(videoId);
            return;
        }

        // 2. קטגוריה
        const cat = params.get('name');
        if (cat && CONSTANTS.PREDEFINED_CATEGORIES.some(c => c.id === cat)) {
            state.view = 'category';
            state.filters.category = cat;
        } else {
            state.view = 'home';
            state.filters.category = 'all';
        }

        // 3. פילטרים
        if (params.get('search')) {
            state.filters.search = params.get('search');
            dom.searchInput.value = state.filters.search;
        }
        if (params.get('tags')) state.filters.tags = params.get('tags').split(',');
        if (params.get('hebrew')) {
            state.filters.hebrewOnly = true;
            dom.hebrewToggle.checked = true;
        }

        filterVideos();
    }

    // --------------------------------------------------------------------------------
    // 10. הגדרת אירועים (Event Listeners)
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
            // טיפול בלחיצה על כפתור שיתוף
            const shareBtn = e.target.closest('.share-btn');
            if (shareBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = shareBtn.closest('article');
                const url = new URL(`?v=${card.dataset.id}`, window.location.href).href;
                navigator.clipboard.writeText(url).then(() => alert('הקישור הועתק!'));
                return;
            }

            // טיפול בלחיצה על הכרטיס
            const card = e.target.closest('article');
            const link = e.target.closest('a'); // אם לחץ על קישור בתוך הכרטיס
            
            if (card) {
                e.preventDefault();
                openVideo(card.dataset.id);
            }
        });

        // קליק על קישורים בתפריט / קטגוריות
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            // קישורי קטגוריה (כמו בדף הבית)
            if (link.href.includes('?name=')) {
                e.preventDefault();
                const urlParams = new URLSearchParams(link.search);
                const cat = urlParams.get('name');
                state.filters.category = cat;
                state.view = 'category';
                filterVideos();
                updateUrl();
                return;
            }

            // חזרה לדף הבית / ניקוי קטגוריה
            if (link.getAttribute('href') === './' || link.getAttribute('href') === './index.html' || (link.hash === '#home' && state.view === 'category')) {
                e.preventDefault();
                state.filters.category = 'all';
                state.view = 'home';
                filterVideos();
                updateUrl();
                window.scrollTo({top:0, behavior:'smooth'});
            }
        });

        // ניהול תגיות (הוספה/הסרה)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.classList.contains('tag-btn') || btn.classList.contains('tag-link')) {
                const tag = btn.dataset.tag;
                if (!state.filters.tags.includes(tag)) {
                    state.filters.tags.push(tag);
                    // אם אנחנו בנגן, נסגור אותו
                    if (state.view === 'video') closeVideo();
                    else {
                        filterVideos();
                        updateUrl();
                    }
                }
            } else if (btn.classList.contains('remove-tag')) {
                const tag = btn.dataset.tag;
                state.filters.tags = state.filters.tags.filter(t => t !== tag);
                filterVideos();
                updateUrl();
            }
        });

        // כפתורים בנגן
        dom.player.backBtn.addEventListener('click', closeVideo);
        dom.player.shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => alert('הקישור הועתק!'));
        });

        // כפתורי פילטרים
        dom.clearFiltersBtn.addEventListener('click', clearFilters);
        dom.hebrewToggle.addEventListener('change', (e) => {
            state.filters.hebrewOnly = e.target.checked;
            filterVideos();
        });
        dom.sortSelect.addEventListener('change', (e) => {
            state.filters.sort = e.target.value;
            filterVideos();
        });

        // היסטוריית דפדפן
        window.addEventListener('popstate', readUrl);
        
        // גלילה
        window.addEventListener('scroll', () => {
            dom.backToTopBtn.classList.toggle('opacity-0', window.scrollY < 300);
            dom.backToTopBtn.classList.toggle('invisible', window.scrollY < 300);
        });
        dom.backToTopBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
        
        // תפריט נייד
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
        state.filters.category = 'all';
        state.view = 'home';
        
        dom.searchInput.value = '';
        dom.hebrewToggle.checked = false;
        
        filterVideos();
        updateUrl();
    }

    // --------------------------------------------------------------------------------
    // אתחול האפליקציה (Entry Point)
    // --------------------------------------------------------------------------------
    (async function init() {
        // הסתרת תוכן ראשונית
        dom.mainContent.classList.add('hidden');
        
        // טעינת נתונים
        await fetchAllData();
        await loadFeaturedChannels();
        renderHomepageCategoryButtons();

        // הגדרת אירועים
        setupEvents();

        // קריאת מצב התחלתי
        readUrl();

        // הצגת האתר
        dom.preloader.style.opacity = '0';
        setTimeout(() => {
            dom.preloader.style.display = 'none';
            if (state.view !== 'video') {
                dom.mainContent.classList.remove('hidden');
            }
            dom.footer.classList.remove('hidden');
        }, 500);

        // Intersection Observer לטעינה עצלה (אם יש אלמנטים נוספים)
        videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target.querySelector('img');
                    if (img && img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    videoObserver.unobserve(entry.target);
                }
            });
        });
    })();
});

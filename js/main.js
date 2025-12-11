document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------------
    // 1. הגדרות וקבועים
    // --------------------------------------------------------------------------------
    const CONSTANTS = {
        MAX_POPULAR_TAGS: 50,
        VIDEOS_TO_SHOW_INITIALLY: 24,
        VIDEOS_TO_LOAD_MORE: 12,
        MIN_SEARCH_TERM_LENGTH: 2,
        MAX_SUGGESTIONS: 5,
        FUSE_OPTIONS: {
            keys: [
                { name: 'title', weight: 0.6 },
                { name: 'tags', weight: 0.3 },
                { name: 'channel', weight: 0.1 }
            ],
            includeScore: true,
            threshold: 0.3,
            ignoreLocation: true
        },
        CATEGORY_FILES: [
            'collectors', 'diy', 'maintenance', 'review', 'systems',
            'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad',
        ],
        PREDEFINED_CATEGORIES: [
            { id: "all", name: "הכל", icon: "film", gradient: "from-gray-600 to-gray-800" },
            { id: "review", name: "סקירות רכב", icon: "magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600" },
            { id: "safety", name: "מבחני בטיחות", icon: "shield-halved", gradient: "from-red-500 to-rose-600" },
            { id: "offroad", name: "שטח ו-4X4", icon: "mountain", gradient: "from-amber-600 to-orange-700" },
            { id: "maintenance", name: "טיפולים", icon: "oil-can", gradient: "from-blue-500 to-cyan-600" },
            { id: "diy", name: "עשה זאת בעצמך", icon: "tools", gradient: "from-green-500 to-teal-600" },
            { id: "troubleshooting", name: "איתור תקלות", icon: "microscope", gradient: "from-lime-400 to-yellow-500" },
            { id: "driving", name: "נהיגה נכונה", icon: "road", gradient: "from-teal-500 to-emerald-600" },
            { id: "upgrades", name: "שיפורים", icon: "rocket", gradient: "from-orange-500 to-red-600" },
            { id: "systems", name: "מערכות הרכב", icon: "cogs", gradient: "from-yellow-500 to-amber-600" },
            { id: "collectors", name: "אספנות", icon: "car-side", gradient: "from-red-500 to-pink-600" }
        ]
    };

    // --------------------------------------------------------------------------------
    // 2. אלמנטים (DOM Elements)
    // --------------------------------------------------------------------------------
    const dom = {
        body: document.body,
        preloader: document.getElementById('site-preloader'),
        
        // תפריטים וניווט
        mobileMenuBtn: document.getElementById('open-menu-btn'),
        closeMenuBtn: document.getElementById('close-menu-btn'),
        mobileMenu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        darkModeToggles: document.querySelectorAll('.dark-mode-toggle-button'),
        backToTopBtn: document.getElementById('back-to-top-btn'),
        navLinks: document.querySelectorAll('.nav-link'),

        // אזורי תצוגה
        homeContainer: document.getElementById('home-view-container'),
        homeBottomSection: document.getElementById('home-view-sections-bottom'),
        categoryHeader: document.getElementById('category-header-section'),
        mainContent: document.getElementById('main-page-content'),
        singleVideoContainer: document.getElementById('single-video-view'),
        footer: document.getElementById('site-footer'),

        // רשת הסרטונים
        videoCardsContainer: document.getElementById('video-cards-container'),
        videoCardTemplate: document.getElementById('video-card-template'),
        noVideosMessage: document.getElementById('no-videos-found'),
        videosGridTitle: document.getElementById('videos-grid-title'),

        // חיפוש ופילטרים
        searchForms: [
            document.getElementById('desktop-search-form'),
            document.getElementById('mobile-search-form'),
            document.getElementById('main-content-search-form')
        ].filter(el => el !== null),

        searchSuggestions: {
            'desktop-search-input': document.getElementById('desktop-search-suggestions'),
            'mobile-search-input': document.getElementById('mobile-search-suggestions'),
            'main-content-search-input': document.getElementById('main-content-search-suggestions')
        },

        popularTagsContainer: document.getElementById('popular-tags-container'),
        selectedTagsContainer: document.getElementById('selected-tags-container'),
        tagSearchInput: document.getElementById('tag-search-input'),
        customTagForm: document.getElementById('custom-tag-form'),
        sortSelect: document.getElementById('sort-by-select'),
        hebrewToggle: document.getElementById('hebrew-filter-toggle'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        shareFiltersBtn: document.getElementById('share-filters-btn'),
        filterSummary: document.getElementById('filter-summary-container'),
        searchSectionTitle: document.getElementById('search-section-title'),
        
        // כותרות קטגוריה
        categoryPageTitle: document.getElementById('category-page-title'),
        breadcrumbName: document.getElementById('breadcrumb-category-name'),
        categoryCount: document.getElementById('category-video-count-summary'),
        heroCount: document.getElementById('video-count-hero'),

        // ערוצים מומלצים
        channelsTrack: document.getElementById('featured-channels-track'),
        homepageCategoriesGrid: document.getElementById('homepage-categories-grid'),
        channelsScrollLeft: document.getElementById('channels-scroll-left'),
        channelsScrollRight: document.getElementById('channels-scroll-right'),
        
        // טפסים
        contactForm: document.getElementById('contact-form'),
        checkYtBtn: document.getElementById('check-yt-id-button'),
        checkYtLink: document.getElementById('check-yt-id-link'),

        // נגן יחיד
        player: {
            container: document.getElementById('single-video-player-container'),
            frame: document.getElementById('single-video-player-container'),
            title: document.getElementById('single-video-title'),
            desc: document.getElementById('single-video-content'),
            tags: document.getElementById('single-video-tags'),
            meta: document.getElementById('single-video-metadata'),
            channel: document.getElementById('single-video-channel'),
            duration: document.getElementById('single-video-duration'),
            date: document.getElementById('single-video-date'),
            shareBtn: document.getElementById('single-video-share-btn'),
            backBtn: document.getElementById('single-video-back-btn')
        }
    };

    // --------------------------------------------------------------------------------
    // 3. ניהול מצב (State)
    // --------------------------------------------------------------------------------
    let state = {
        allVideos: [],
        filteredVideos: [],
        fuse: null,
        view: null, // 'home', 'category', 'video'
        
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
        
        search: {
            activeSuggestionIndex: -1,
            isSuggestionClicked: false,
            currentInput: null,
            currentSuggestionsContainer: null
        }
    };

    let videoObserver;

    // --------------------------------------------------------------------------------
    // 4. פונקציות עזר
    // --------------------------------------------------------------------------------
    const debounce = (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const parseDuration = (str) => {
        if (!str) return 0;
        const p = str.split(':').map(Number);
        return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p.length === 2 ? p[0]*60 + p[1] : 0;
    };

    const getThumbnail = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

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
            if(dom.videoCardsContainer) dom.videoCardsContainer.innerHTML = '<p class="text-center text-red-500 mt-10">שגיאה בטעינת הנתונים.</p>';
        }
    }

    async function loadFeaturedChannels() {
        if (!dom.channelsTrack) return;
        try {
            const res = await fetch('data/featured_channels.json');
            if(!res.ok) return;
            const data = await res.json();
            const channels = data.channels || data;
            
            if(channels.length) {
                const html = [...channels, ...channels].map(c => `
                    <a href="${c.channel_url}" target="_blank" rel="noopener noreferrer" class="channel-card group flex-shrink-0 block p-5 bg-white dark:bg-slate-700 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 text-center transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-500 mx-3 snap-center w-64">
                        <div class="relative w-20 h-20 mx-auto mb-3">
                            <img src="${c.channel_image_url}" alt="${c.channel_name}" class="w-full h-full rounded-full object-cover border-2 border-slate-200 dark:border-slate-500 group-hover:border-purple-400 transition-colors shadow-sm" loading="lazy">
                        </div>
                        <h3 class="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2 truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" title="${c.channel_name}">${c.channel_name}</h3>
                        <p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-snug px-1">${c.content_description}</p>
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
                const gradient = cat.gradient || "from-purple-500 to-indigo-600";
                
                return `
                    <a href="?name=${cat.id}" class="category-link relative group block p-6 md:p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${gradient} text-white text-center overflow-hidden focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white">
                        <div class="flex flex-col items-center justify-center h-full min-h-[140px]">
                            <i class="fas fa-${cat.icon || 'folder'} fa-3x mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></i>
                            <h3 class="text-xl md:text-2xl font-bold">${cat.name}</h3>
                        </div>
                        <span class="absolute top-3 right-3 bg-black/30 text-white text-xs font-bold py-1 px-2.5 rounded-full">${count}</span>
                    </a>`;
            }).join('');
    }

    // --------------------------------------------------------------------------------
    // 6. ניהול תצוגות (Routing)
    // --------------------------------------------------------------------------------
    function renderView() {
        // הסתרת נגן
        if (dom.singleVideoContainer) dom.singleVideoContainer.classList.add('hidden');
        if (dom.player.frame) dom.player.frame.innerHTML = '';
        if (dom.mainContent) dom.mainContent.classList.remove('hidden');
        if (dom.footer) dom.footer.classList.remove('hidden');

        if (state.view === 'category' && state.filters.category !== 'all') {
            // תצוגת קטגוריה
            if(dom.homeContainer) dom.homeContainer.classList.add('hidden');
            if(dom.homeBottomSection) dom.homeBottomSection.classList.add('hidden');
            if(dom.categoryHeader) dom.categoryHeader.classList.remove('hidden');

            const cat = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === state.filters.category);
            const catName = cat ? cat.name : state.filters.category;
            const icon = cat ? cat.icon : 'folder';

            document.title = `${catName} - CAR-טיב`;
            if(dom.pageTitleCategory) dom.pageTitleCategory.innerHTML = `<i class="fas fa-${icon} text-purple-600 dark:text-purple-400 mr-4"></i>${catName}`;
            if(dom.breadcrumbName) dom.breadcrumbName.textContent = catName;
            if(dom.videoGridTitle) dom.videoGridTitle.innerHTML = `סרטונים בקטגוריה: <span class="text-purple-600 dark:text-purple-400">${catName}</span>`;
            if(dom.searchSectionTitle) dom.searchSectionTitle.textContent = `חיפוש ב${catName}`;

        } else {
            // תצוגת בית
            state.view = 'home';
            state.filters.category = 'all';
            
            if(dom.categoryHeader) dom.categoryHeader.classList.add('hidden');
            if(dom.homeContainer) dom.homeContainer.classList.remove('hidden');
            if(dom.homeBottomSection) dom.homeBottomSection.classList.remove('hidden');
            
            document.title = 'CAR-טיב - סרטוני רכבים כשרים';
            if(dom.videoGridTitle) dom.videoGridTitle.textContent = 'כל הסרטונים';
            if(dom.searchSectionTitle) dom.searchSectionTitle.textContent = 'הכנס טקסט לחיפוש';
            
            if (dom.homepageCategoriesGrid && dom.homepageCategoriesGrid.children.length === 0) {
                renderHomepageCategoryButtons();
            }
        }
        
        handleScrollSpy();
        filterVideos();
    }

    // --------------------------------------------------------------------------------
    // 7. לוגיקת סינון ורינדור
    // --------------------------------------------------------------------------------
    function filterVideos() {
        let result = state.allVideos;

        // 1. קטגוריה
        if (state.filters.category !== 'all') {
            result = result.filter(v => v.category === state.filters.category);
        }

        // 2. חיפוש
        if (state.filters.search.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH && state.fuse) {
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
        state.pagination.count = 0;
        
        // עדכון מונה קטגוריה
        if (dom.categoryCount) {
             dom.categoryCount.innerHTML = state.filteredVideos.length === 0 
                ? 'לא נמצאו סרטונים.' 
                : `נמצאו <strong class="text-purple-600 dark:text-purple-400">${state.filteredVideos.length}</strong> סרטונים.`;
        }

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
            // הסרת כפתור טען עוד ישן
            const oldBtn = document.getElementById('load-more-btn');
            if(oldBtn) oldBtn.remove();
        }

        if (nextBatch.length === 0 && !isAppend) {
            dom.noVideosMessage.classList.remove('hidden');
            dom.noVideosMessage.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fas fa-video-slash fa-4x text-slate-300 dark:text-slate-600 mb-4"></i>
                    <p class="text-xl text-slate-500 dark:text-slate-400">לא נמצאו סרטונים התואמים את החיפוש.</p>
                    <button id="reset-filters-msg-btn" class="mt-4 text-purple-600 dark:text-purple-400 underline font-medium">נקה סינון</button>
                </div>
            `;
            document.getElementById('reset-filters-msg-btn')?.addEventListener('click', clearFilters);
            return;
        } else {
            dom.noVideosMessage.classList.add('hidden');
        }

        const html = nextBatch.map(v => {
            // יצירת תגיות HTML לכרטיס
            const tagsHtml = v.tags.slice(0, 3).map(tag => 
                `<button class="video-tag-button text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-0.5 rounded-full dark:bg-slate-700 dark:text-purple-300 dark:hover:bg-slate-600 transition-colors cursor-pointer" data-tag="${tag}">#${tag}</button>`
            ).join('');

            const cat = CONSTANTS.PREDEFINED_CATEGORIES.find(c => c.id === v.category);
            const catIcon = cat ? cat.icon : 'folder';
            const catName = cat ? cat.name : v.category;

            return `
            <article class="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 h-full animate-fadeIn" data-id="${v.id}">
                <!-- Thumbnail -->
                <div class="relative aspect-video bg-slate-200 dark:bg-slate-700 cursor-pointer overflow-hidden video-thumb-wrapper">
                    <img src="${v.thumbnail}" alt="${v.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                    <span class="absolute bottom-2 left-2 bg-black/75 text-white text-xs font-bold px-2 py-0.5 rounded backdrop-blur-sm">${v.duration}</span>
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[1px]">
                        <i class="fas fa-play-circle text-5xl text-white drop-shadow-xl transform scale-90 group-hover:scale-100 transition-transform"></i>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4 flex flex-col flex-grow">
                     <div class="flex justify-between items-start mb-2 text-xs text-slate-500 dark:text-slate-400">
                        <div class="flex items-center gap-1.5 min-w-0">
                             ${v.channelImage ? `<img src="${v.channelImage}" class="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-600">` : `<i class="fas fa-user-circle"></i>`}
                             <span class="truncate font-medium">${v.channel}</span>
                        </div>
                        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full shrink-0">
                             <i class="fas fa-${catIcon} text-[10px]"></i>
                             <span>${catName}</span>
                        </div>
                     </div>

                     <h3 class="font-bold text-slate-900 dark:text-white text-base leading-snug mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                         <a href="?v=${v.id}" class="video-link focus:outline-none">${v.title}</a>
                     </h3>

                     <div class="flex flex-wrap gap-1.5 mb-4 mt-auto">
                        ${tagsHtml}
                     </div>

                     <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                         <span class="flex items-center gap-1">
                            <i class="far fa-calendar-alt"></i>
                            ${v.date.toLocaleDateString('he-IL')}
                         </span>
                         <div class="flex gap-3">
                            <button class="hover:text-purple-500 transition-colors share-btn" title="שתף" aria-label="שתף"><i class="fas fa-share-alt"></i></button>
                            <a href="?v=${v.id}" target="_blank" class="hover:text-purple-500 transition-colors new-tab-btn" title="פתח בטאב חדש"><i class="fas fa-external-link-alt"></i></a>
                         </div>
                     </div>
                </div>
            </article>
            `;
        }).join('');

        dom.videoCardsContainer.insertAdjacentHTML('beforeend', html);
        state.pagination.count += nextBatch.length;

        // כפתור טען עוד
        let loadMoreBtn = document.getElementById('load-more-btn');
        if (state.pagination.count < state.filteredVideos.length) {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('div');
                loadMoreBtn.id = 'load-more-btn';
                loadMoreBtn.className = 'col-span-full flex justify-center mt-8 pb-4';
                loadMoreBtn.innerHTML = `
                    <button class="px-8 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-full shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <span>טען עוד סרטונים</span>
                        <i class="fas fa-chevron-down text-sm group-hover:translate-y-0.5 transition-transform"></i>
                    </button>
                `;
                loadMoreBtn.querySelector('button').onclick = () => renderGrid(true);
                dom.videoCardsContainer.parentNode.appendChild(loadMoreBtn);
            } else {
                dom.videoCardsContainer.parentNode.appendChild(loadMoreBtn);
            }
        } else {
             const btn = document.getElementById('load-more-btn');
             if(btn) btn.remove();
        }
        
        // אתחול IntersectionObserver לתמונות אם צריך
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
    // 8. עדכון ממשק (UI)
    // --------------------------------------------------------------------------------
    function updateUI() {
        // עדכון תגיות פופולריות
        updateTagsCloud();
        // עדכון תגיות נבחרות
        updateActiveTagsUI();
        
        // עדכון סיכום פילטרים
        const activeCount = state.filters.tags.length + (state.filters.hebrewOnly ? 1 : 0) + (state.filters.search ? 1 : 0);
        if(dom.filterSummary) {
            dom.filterSummary.classList.toggle('hidden', activeCount === 0);
            if(activeCount > 0) {
                dom.filterSummary.querySelector('span').textContent = `${activeCount} סינונים פעילים`;
            }
        }

        // סנכרון שדות קלט
        if(dom.hebrewToggle) dom.hebrewToggle.checked = state.filters.hebrewOnly;
        if(dom.sortSelect) dom.sortSelect.value = state.filters.sort;
        dom.searchForms.forEach(f => {
             const input = f.querySelector('input');
             if(input) input.value = state.filters.search;
        });
    }

    function updateTagsCloud() {
        if (!dom.tagsContainer) return;
        
        // חישוב תגיות מתוך הסרטונים הרלוונטיים
        // שינוי קריטי: אנחנו רוצים להראות את התגיות שרלוונטיות *לקטגוריה הנוכחית* ולחיפוש הנוכחי,
        // אבל *לפני* שהתחשבנו בתגיות שכבר נבחרו. אחרת, בחירת תגית אחת תעלים את כל השאר.
        let sourceVideos = state.allVideos;
        
        if (state.filters.category !== 'all') {
            sourceVideos = sourceVideos.filter(v => v.category === state.filters.category);
        }
        
        if (state.filters.search.length >= CONSTANTS.MIN_SEARCH_TERM_LENGTH && state.fuse) {
             const searchResults = state.fuse.search(state.filters.search);
             const ids = new Set(searchResults.map(r => r.item.id));
             sourceVideos = sourceVideos.filter(v => ids.has(v.id));
        }

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
            <button class="tag-btn bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 px-3 py-1.5 rounded-full text-sm border border-slate-200 transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-purple-900/50 dark:hover:text-purple-300 ${state.filters.tags.includes(tag) ? '!bg-purple-600 !text-white !border-purple-600 dark:!bg-purple-500' : ''}" data-tag="${tag}">
                ${tag}
            </button>
        `).join('');
    }

    function updateActiveTagsUI() {
        if(!dom.activeTagsContainer) return;
        dom.activeTagsContainer.innerHTML = state.filters.tags.map(tag => `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-600 text-white shadow-sm animate-fadeIn">
                ${tag}
                <button type="button" class="remove-tag hover:bg-white/20 rounded-full p-0.5 transition-colors focus:outline-none" data-tag="${tag}" aria-label="הסר תגית">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </span>
        `).join('');
    }

    // --------------------------------------------------------------------------------
    // 9. חיפוש והצעות (Autocomplete)
    // --------------------------------------------------------------------------------
    function handleSearchInput(input) {
        const query = input.value.trim();
        // מציאת קונטיינר ההצעות המתאים לאינפוט הנוכחי
        const suggestionsId = input.id.replace('input', 'suggestions');
        const suggestionsBox = dom.searchSuggestions[input.id];
        
        state.search.currentInput = input;
        state.search.currentSuggestionsContainer = suggestionsBox;

        // הסתרת כל ההצעות האחרות
        Object.values(dom.searchSuggestions).forEach(box => {
            if(box && box.id !== suggestionsId) box.classList.add('hidden');
        });

        if (query.length < CONSTANTS.MIN_SEARCH_TERM_LENGTH) {
            if(suggestionsBox) suggestionsBox.classList.add('hidden');
            return;
        }

        const results = state.fuse.search(query, { limit: CONSTANTS.MAX_SUGGESTIONS });
        
        if (results.length === 0) {
            if(suggestionsBox) suggestionsBox.classList.add('hidden');
            return;
        }

        const ul = suggestionsBox.querySelector('ul');
        ul.innerHTML = results.map((r, i) => {
            const title = r.item.title.replace(new RegExp(`(${query})`, 'gi'), '<strong class="text-purple-600 dark:text-purple-400">$1</strong>');
            return `
                <li class="px-4 py-2.5 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200 transition-colors" data-index="${i}">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-search text-slate-400 text-xs"></i>
                        <span class="truncate">${title}</span>
                    </div>
                </li>
            `;
        }).join('');

        suggestionsBox.classList.remove('hidden');
        state.search.activeSuggestionIndex = -1;
    }

    function handleSearchKeydown(e) {
        const box = state.search.currentSuggestionsContainer;
        if (!box || box.classList.contains('hidden')) return;

        const items = box.querySelectorAll('li');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.search.activeSuggestionIndex = (state.search.activeSuggestionIndex + 1) % items.length;
            updateActiveSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.search.activeSuggestionIndex = (state.search.activeSuggestionIndex - 1 + items.length) % items.length;
            updateActiveSuggestion(items);
        } else if (e.key === 'Enter') {
            if (state.search.activeSuggestionIndex > -1) {
                e.preventDefault();
                items[state.search.activeSuggestionIndex].click();
            }
        } else if (e.key === 'Escape') {
            box.classList.add('hidden');
        }
    }

    function updateActiveSuggestion(items) {
        items.forEach((item, index) => {
            if (index === state.search.activeSuggestionIndex) {
                item.classList.add('bg-purple-100', 'dark:bg-slate-600');
            } else {
                item.classList.remove('bg-purple-100', 'dark:bg-slate-600');
            }
        });
    }

    // --------------------------------------------------------------------------------
    // 10. ניווט, URL ונגן יחיד
    // --------------------------------------------------------------------------------
    function openVideo(id) {
        const video = state.allVideos.find(v => v.id === id);
        if (!video) return;

        state.view = 'video';
        
        dom.mainContent.classList.add('hidden');
        dom.footer.classList.remove('hidden');
        dom.singleVideoContainer.classList.remove('hidden');
        
        window.scrollTo({top: 0, behavior: 'instant'});

        document.title = `${video.title} - CAR-טיב`;

        dom.player.frame.innerHTML = `<iframe class="w-full h-full absolute inset-0 rounded-lg shadow-2xl" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
        dom.player.title.textContent = video.title;
        
        if (video.content) {
            dom.player.desc.innerHTML = `<p class="text-lg leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border-r-4 border-purple-500 shadow-sm">${video.content}</p>`;
            dom.player.desc.classList.remove('hidden');
        } else {
            dom.player.desc.classList.add('hidden');
        }
        
        dom.player.channel.innerHTML = `<img src="${video.channelImage || ''}" class="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 object-cover"> <span class="text-lg font-medium">${video.channel}</span>`;
        dom.player.duration.innerHTML = `<i class="far fa-clock"></i> ${video.duration}`;
        dom.player.date.innerHTML = `<i class="far fa-calendar-alt"></i> ${video.date.toLocaleDateString('he-IL')}`;
        dom.player.date.style.display = 'inline-flex';

        dom.player.tags.innerHTML = video.tags.map(t => 
            `<button class="tag-link bg-purple-50 text-purple-700 dark:bg-slate-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm hover:bg-purple-100 transition-colors cursor-pointer" data-tag="${t}">#${t}</button>`
        ).join(' ');

        updateUrl();
    }

    function closeVideo() {
        state.view = state.filters.category === 'all' ? 'home' : 'category';
        
        dom.singleVideoContainer.classList.add('hidden');
        dom.player.frame.innerHTML = '';
        
        renderView();
        updateUrl();
    }

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
        }

        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        history.replaceState(null, '', newUrl);
    }

    function readUrl() {
        const params = new URLSearchParams(window.location.search);
        
        const videoId = params.get('v');
        if (videoId && state.allVideos.length > 0) {
            openVideo(videoId);
            return;
        }

        const cat = params.get('name');
        if (cat && CONSTANTS.PREDEFINED_CATEGORIES.some(c => c.id === cat)) {
            state.view = 'category';
            state.filters.category = cat;
        } else {
            state.view = 'home';
            state.filters.category = 'all';
        }

        if (params.get('search')) {
            state.filters.search = params.get('search');
            if(dom.tagSearchInput) dom.tagSearchInput.value = state.filters.search;
            // Update search inputs as well
            dom.searchForms.forEach(f => {
                const input = f.querySelector('input');
                if(input) input.value = state.filters.search;
            });
        }
        if (params.get('tags')) state.filters.tags = params.get('tags').split(',');
        if (params.get('hebrew')) {
            state.filters.hebrewOnly = true;
            if(dom.hebrewToggle) dom.hebrewToggle.checked = true;
        }

        renderView();
    }

    // --------------------------------------------------------------------------------
    // 11. טיפול בטפסים
    // --------------------------------------------------------------------------------
    function handleContactFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const formStatus = document.getElementById('form-status');
        const checkbox = form.querySelector('input[type="checkbox"][name="privacy_policy"]');
        
        if(checkbox && !checkbox.checked) {
             Swal.fire({ title: 'שגיאה', text: 'יש לאשר את מדיניות הפרטיות', icon: 'error', confirmButtonColor: '#7c3aed' });
             return;
        }

        const originalButtonHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> שולח...`;
        if (formStatus) formStatus.innerHTML = '';

        fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            mode: 'no-cors',
        })
        .then(() => {
            if (formStatus) formStatus.innerHTML = "<p class='text-green-600 dark:text-green-500 font-semibold'>תודה! הודעתך נשלחה בהצלחה.</p>";
            form.reset();
        })
        .catch(error => {
            if (formStatus) formStatus.innerHTML = "<p class='text-red-600 dark:text-red-500 font-semibold'>אופס, אירעה שגיאת רשת.</p>";
        })
        .finally(() => {
            setTimeout(() => {
                 submitButton.disabled = false;
                 submitButton.innerHTML = originalButtonHtml;
                 if (formStatus) formStatus.innerHTML = '';
            }, 5000);
        });
    }

    async function handleCheckYtId(e) {
        e.preventDefault();
        const { value: url } = await Swal.fire({
            title: 'בדיקת סרטון',
            text: 'הכנס קישור ליוטיוב:',
            input: 'url',
            confirmButtonText: 'בדוק',
            confirmButtonColor: '#7c3aed',
            showCancelButton: true
        });

        if (!url) return;

        const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/);
        const id = match ? match[1] : null;

        if (!id) {
            Swal.fire('שגיאה', 'קישור לא תקין', 'error');
            return;
        }

        const exists = state.allVideos.find(v => v.id === id);
        if (exists) {
            Swal.fire({
                title: 'קיים במאגר!',
                text: `הסרטון "${exists.title}" כבר קיים בקטגורית ${exists.category}`,
                icon: 'info',
                confirmButtonColor: '#7c3aed'
            });
        } else {
            Swal.fire({
                title: 'לא נמצא',
                text: 'הסרטון אינו קיים במאגר. אתה מוזמן להוסיף אותו!',
                icon: 'success',
                confirmButtonColor: '#10b981'
            });
        }
    }

    function clearFilters() {
        state.filters.search = '';
        state.filters.tags = [];
        state.filters.hebrewOnly = false;
        state.filters.category = 'all';
        state.view = 'home';
        
        dom.searchForms.forEach(f => { if(f) f.querySelector('input').value = ''; });
        if(dom.hebrewToggle) dom.hebrewToggle.checked = false;
        
        renderView();
        updateUrl();
        window.scrollTo({top: 0, behavior: 'smooth'});
    }

    // --------------------------------------------------------------------------------
    // 12. הגדרת אירועים (Event Listeners)
    // --------------------------------------------------------------------------------
    function setupEvents() {
        // חיפוש
        dom.searchForms.forEach(form => {
            if (!form) return;
            const input = form.querySelector('input');
            
            input.addEventListener('input', debounce((e) => {
                // Live Filter
                state.filters.search = e.target.value.trim();
                renderView(); // Updates grid
                handleSearchInput(e.target); // Updates suggestions
            }, 300));
            
            input.addEventListener('keydown', handleSearchKeydown);

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                state.filters.search = input.value.trim();
                
                // סגירת כל ההצעות
                Object.values(dom.searchSuggestions).forEach(box => box.classList.add('hidden'));

                if (state.view === 'video') state.view = 'home';
                
                renderView();
                updateUrl();
            });
            
            // סגירה בלחיצה בחוץ (Blur)
            input.addEventListener('blur', () => {
                 setTimeout(() => {
                      if (!state.search.isSuggestionClicked) {
                          const boxId = input.id.replace('input', 'suggestions');
                          const box = document.getElementById(boxId);
                          if(box) box.classList.add('hidden');
                      }
                      state.search.isSuggestionClicked = false;
                 }, 200);
            });
        });

        // לחיצה על הצעת חיפוש
        document.addEventListener('click', (e) => {
            const suggestion = e.target.closest('li[data-index]');
            if (suggestion) {
                state.search.isSuggestionClicked = true;
                const text = suggestion.innerText;
                
                dom.searchForms.forEach(f => { if(f) f.querySelector('input').value = text; });
                
                state.filters.search = text;
                suggestion.closest('.search-suggestions-container').classList.add('hidden');
                
                if (state.view === 'video') state.view = 'home';
                renderView();
                updateUrl();
            }
        });

        // קליק על כרטיס וידאו
        if(dom.videoCardsContainer) {
            dom.videoCardsContainer.addEventListener('click', (e) => {
                const shareBtn = e.target.closest('.share-btn');
                if (shareBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = shareBtn.closest('article');
                    const url = new URL(`?v=${card.dataset.id}`, window.location.origin + window.location.pathname).href;
                    navigator.clipboard.writeText(url).then(() => alert('הקישור הועתק!'));
                    return;
                }
                
                const tagBtn = e.target.closest('.video-tag-button');
                if (tagBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const tag = tagBtn.dataset.tag;
                    if (!state.filters.tags.includes(tag)) {
                        state.filters.tags.push(tag);
                        renderView();
                        updateUrl();
                        window.scrollTo({top: 0, behavior: 'smooth'});
                    }
                    return;
                }

                const card = e.target.closest('article');
                if (card && !e.target.closest('a')) {
                    e.preventDefault();
                    openVideo(card.dataset.id);
                } else if (e.target.closest('a.video-link')) {
                    e.preventDefault();
                    openVideo(card.dataset.id);
                }
            });
        }

        // כפתורים גלובליים
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.classList.contains('tag-btn') || btn.classList.contains('tag-link')) {
                const tag = btn.dataset.tag;
                if (!state.filters.tags.includes(tag)) {
                    state.filters.tags.push(tag);
                    if (state.view === 'video') closeVideo();
                    else renderView();
                    updateUrl();
                }
            } else if (btn.classList.contains('remove-tag')) {
                const tag = btn.dataset.tag;
                state.filters.tags = state.filters.tags.filter(t => t !== tag);
                renderView();
                updateUrl();
            }
        });

        if(dom.player.backBtn) dom.player.backBtn.addEventListener('click', closeVideo);
        if(dom.player.shareBtn) dom.player.shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => alert('הקישור הועתק!'));
        });

        if(dom.clearFiltersBtn) dom.clearFiltersBtn.addEventListener('click', clearFilters);
        
        if(dom.hebrewToggle) {
            dom.hebrewToggle.addEventListener('change', (e) => {
                state.filters.hebrewOnly = e.target.checked;
                renderView();
            });
        }
        
        if(dom.sortSelect) {
            dom.sortSelect.addEventListener('change', (e) => {
                state.filters.sort = e.target.value;
                renderView();
            });
        }

        window.addEventListener('popstate', readUrl);
        
        window.addEventListener('scroll', () => {
            if(dom.backToTopBtn) {
                dom.backToTopBtn.classList.toggle('opacity-0', window.scrollY < 300);
                dom.backToTopBtn.classList.toggle('invisible', window.scrollY < 300);
            }
            handleScrollSpy();
        });
        if(dom.backToTopBtn) dom.backToTopBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
        
        if(dom.mobileMenuBtn) {
            dom.mobileMenuBtn.addEventListener('click', () => {
                dom.mobileMenu.classList.remove('translate-x-full');
                dom.backdrop.classList.remove('invisible', 'opacity-0');
            });
        }
        const closeMenu = () => {
            if(dom.mobileMenu) dom.mobileMenu.classList.add('translate-x-full');
            if(dom.backdrop) dom.backdrop.classList.add('invisible', 'opacity-0');
        };
        if(dom.closeMenuBtn) dom.closeMenuBtn.addEventListener('click', closeMenu);
        if(dom.backdrop) dom.backdrop.addEventListener('click', closeMenu);
        
        dom.darkModeToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            });
        });

        // גלילת ערוצים
        if (dom.channelsScrollLeft && dom.channelsScrollRight && dom.channelsTrack) {
             const scrollAmount = 300;
             const container = dom.channelsTrack.parentElement;
             
             dom.channelsScrollRight.addEventListener('click', () => {
                 container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
             });
             
             dom.channelsScrollLeft.addEventListener('click', () => {
                 container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
             });
        }

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            if (link.search && link.search.includes('name=')) {
                e.preventDefault();
                const params = new URLSearchParams(link.search);
                state.filters.category = params.get('name');
                state.view = 'category';
                renderView();
                updateUrl();
                closeMenu();
                return;
            }
            
            if (link.getAttribute('href') === './' || link.getAttribute('href') === './index.html' || link.hash === '#home') {
                 e.preventDefault();
                 if (state.view === 'video') closeVideo();
                 state.view = 'home';
                 state.filters.category = 'all';
                 renderView();
                 updateUrl();
                 window.scrollTo({top:0, behavior:'smooth'});
                 closeMenu();
            }
        });

        if (dom.checkYtBtn) dom.checkYtBtn.addEventListener('click', handleCheckYtId);
        if (dom.checkYtLink) dom.checkYtLink.addEventListener('click', handleCheckYtId);
        if (dom.contactForm) dom.contactForm.addEventListener('submit', handleContactFormSubmit);
    }

    // --------------------------------------------------------------------------------
    // 13. ניהול ScrollSpy
    // --------------------------------------------------------------------------------
    function handleScrollSpy() {
        if (state.view !== 'home') {
            dom.navLinks.forEach(link => link.classList.remove('active-nav-link'));
            return;
        }

        const headerHeight = document.querySelector('header')?.offsetHeight || 80;
        const scrollPos = window.scrollY + headerHeight + 50;

        dom.navLinks.forEach(link => {
            if (!link.hash) return;
            const targetId = link.hash.substring(1);
            const section = document.getElementById(targetId);
            
            if (section) {
                const top = section.offsetTop;
                const bottom = top + section.offsetHeight;

                if (scrollPos >= top && scrollPos < bottom) {
                    link.classList.add('active-nav-link'); 
                } else {
                    link.classList.remove('active-nav-link');
                }
            }
        });
    }

    // --------------------------------------------------------------------------------
    // אתחול (Entry Point)
    // --------------------------------------------------------------------------------
    (async function init() {
        // אתחול Intersection Observer לתמונות
        videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target.querySelector('img');
                    if (img && img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    entry.target.classList.add('observed');
                    videoObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        if(dom.mainContent) dom.mainContent.classList.add('hidden');
        
        await fetchAllData();
        await loadFeaturedChannels();
        renderHomepageCategoryButtons();

        setupEvents();
        readUrl();

        if(dom.preloader) {
            dom.preloader.style.opacity = '0';
            setTimeout(() => {
                dom.preloader.style.display = 'none';
                if (state.view !== 'video' && dom.mainContent) {
                    dom.mainContent.classList.remove('hidden');
                }
                if(dom.footer) dom.footer.classList.remove('hidden');
            }, 500);
        }
    })();
});

/**
 * CAR-tiv Main Logic (Refactored for SPA & Performance)
 */

const CONFIG = {
    CATEGORY_FILES: ['collectors', 'diy', 'maintenance', 'review', 'systems', 'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad'],
    CATEGORY_META: {
        'review': { name: 'סקירות רכב', icon: 'car-on', gradient: 'from-purple-500 to-indigo-600', desc: 'מבחני דרכים והשוואות' },
        'safety': { name: 'מבחני בטיחות', icon: 'shield-halved', gradient: 'from-red-500 to-rose-600', desc: 'מבחני ריסוק וציוני בטיחות' },
        'offroad': { name: 'שטח ו-4X4', icon: 'mountain', gradient: 'from-amber-600 to-orange-700', desc: 'טיולים ועבירות בשטח' },
        'maintenance': { name: 'טיפולים', icon: 'oil-can', gradient: 'from-blue-500 to-cyan-600', desc: 'תחזוקה שוטפת ומניעתית' },
        'diy': { name: 'עשה זאת בעצמך', icon: 'tools', gradient: 'from-green-500 to-teal-600', desc: 'מדריכי תיקונים לביצוע עצמי' },
        'troubleshooting': { name: 'איתור תקלות', icon: 'microscope', gradient: 'from-lime-500 to-green-600', desc: 'דיאגנוסטיקה ופתרון בעיות' },
        'driving': { name: 'נהיגה נכונה', icon: 'road', gradient: 'from-teal-500 to-emerald-600', desc: 'טיפים לנהיגה בטוחה' },
        'upgrades': { name: 'שיפורים', icon: 'rocket', gradient: 'from-orange-500 to-red-600', desc: 'שדרוגים ותוספות לרכב' },
        'systems': { name: 'מערכות הרכב', icon: 'cogs', gradient: 'from-yellow-500 to-amber-600', desc: 'הסברים טכניים' },
        'collectors': { name: 'אספנות', icon: 'car-side', gradient: 'from-pink-500 to-rose-600', desc: 'רכבים קלאסיים ונוסטלגיה' },
        'all': { name: 'כל הסרטונים', icon: 'film', gradient: 'from-gray-500 to-gray-700', desc: 'כל המאגר במקום אחד' }
    },
    INITIAL_LOAD: 24,
    LOAD_STEP: 12
};

const app = {
    data: {
        videos: [],
        channels: [],
        fuse: null,
        isLoaded: false
    },
    state: {
        currentView: 'home',
        currentCategory: 'all',
        visibleCount: 24,
        filters: { search: '', hebrew: false, sort: 'newest', tags: [] }
    },

    // --- אתחול ---
    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadData();
        this.handleRouting(); // בדיקת URL ראשונית
        
        // הסתרת טעינה
        document.getElementById('site-preloader').classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => document.getElementById('site-preloader').style.display = 'none', 500);
    },

    cacheDOM() {
        this.dom = {
            views: {
                home: document.getElementById('view-home'),
                category: document.getElementById('view-category'),
                video: document.getElementById('view-video')
            },
            homeGrid: document.getElementById('home-videos-grid'),
            catGrid: document.getElementById('homepage-categories-grid'),
            videoGrid: document.getElementById('video-grid-container'),
            catTitle: document.getElementById('category-page-title'),
            catDesc: document.getElementById('category-name'),
            catCount: document.getElementById('category-count'),
            catSearch: document.getElementById('category-search-input'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            tagsContainer: document.getElementById('popular-tags-container'),
            sortSelect: document.getElementById('sort-select'),
            hebrewFilter: document.getElementById('hebrew-filter'),
            
            // Single Video Elements
            svIframe: document.getElementById('single-video-iframe'),
            svTitle: document.getElementById('single-video-title'),
            svDesc: document.getElementById('single-video-desc'),
            svChannel: document.getElementById('single-video-channel'),
            svChannelImg: document.getElementById('single-video-channel-img'),
            svDate: document.getElementById('single-video-date'),
            svTags: document.getElementById('single-video-tags'),
            relatedGrid: document.getElementById('related-videos-grid')
        };
    },

    // --- טעינת נתונים עם Caching ---
    async loadData() {
        const cached = localStorage.getItem('cartiv_data_v3');
        const cachedTime = localStorage.getItem('cartiv_time_v3');
        
        if (cached && cachedTime && (Date.now() - cachedTime < 3600000)) {
            const parsed = JSON.parse(cached);
            this.data.videos = parsed.videos;
            this.data.channels = parsed.channels;
            this.initSearch();
            return;
        }

        try {
            // טעינת סרטונים
            const promises = CONFIG.CATEGORY_FILES.map(f => fetch(`data/videos/${f}.json`).then(r => r.json()).then(d => (d.videos || d).map(v => ({...v, category: f}))));
            const results = await Promise.all(promises);
            this.data.videos = results.flat();

            // טעינת ערוצים
            const chRes = await fetch('data/featured_channels.json');
            const chData = await chRes.json();
            this.data.channels = chData.channels || chData;

            // שמירה ל-Cache
            localStorage.setItem('cartiv_data_v3', JSON.stringify({ videos: this.data.videos, channels: this.data.channels }));
            localStorage.setItem('cartiv_time_v3', Date.now());
            
            this.initSearch();
        } catch (e) {
            console.error("Error loading data", e);
            Swal.fire('שגיאה', 'תקלה בטעינת הנתונים', 'error');
        }
    },

    initSearch() {
        if(window.Fuse) {
            this.data.fuse = new Fuse(this.data.videos, { keys: ['title', 'tags', 'channel'], threshold: 0.35 });
        }
    },

    // --- ניתוב (Routing) ---
    router(page, param = null) {
        // עדכון URL ללא רענון
        if (page === 'home') window.location.hash = '';
        else if (page === 'category') window.location.hash = `#/category/${param}`;
        else if (page === 'video') window.location.hash = `#/video/${param}`;
        else if (page === 'all-categories') window.location.hash = `#/categories`;
        else window.location.hash = `#/${page}`;
    },

    handleRouting() {
        const hash = window.location.hash;
        window.scrollTo(0, 0);
        
        // הסתרת כל המסכים
        Object.values(this.dom.views).forEach(el => el.classList.add('hidden'));

        if (hash.includes('#/video/')) {
            const id = hash.split('/').pop();
            this.renderVideo(id);
        } else if (hash.includes('#/category/')) {
            const cat = hash.split('/').pop();
            this.renderCategory(cat);
        } else if (hash.includes('#/categories')) {
            this.renderHome(); // במקרה זה נשתמש בדף הבית אבל נגלול לקטגוריות
            setTimeout(() => document.getElementById('homepage-categories-section').scrollIntoView(), 100);
        } else {
            this.renderHome();
        }
    },

    // --- רינדור דף הבית ---
    renderHome() {
        this.dom.views.home.classList.remove('hidden');
        document.getElementById('video-count-hero').querySelector('span').innerText = this.data.videos.length;

        // קטגוריות
        if(!this.dom.catGrid.innerHTML) {
            this.dom.catGrid.innerHTML = CONFIG.CATEGORY_FILES.map(cat => {
                const meta = CONFIG.CATEGORY_META[cat];
                return `
                <div onclick="app.router('category', '${cat}')" class="cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md hover:shadow-xl border-b-4 border-purple-500 hover:-translate-y-1 transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white mb-4 text-xl shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-${meta.icon}"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">${meta.name}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${meta.desc}</p>
                </div>`;
            }).join('');
        }

        // סרטונים אחרונים
        const latest = this.getFilteredVideos({ sort: 'newest' }).slice(0, 8);
        this.dom.homeGrid.innerHTML = latest.map(v => this.createCardHTML(v)).join('');

        // ערוצים
        const channelsTrack = document.getElementById('featured-channels-track');
        if(!channelsTrack.innerHTML && this.data.channels.length) {
            channelsTrack.innerHTML = this.data.channels.map(c => `
                <a href="${c.channel_url}" target="_blank" class="flex-shrink-0 w-64 bg-white dark:bg-slate-800 p-4 rounded-xl shadow hover:shadow-lg transition-all text-center border border-slate-200 dark:border-slate-700">
                    <img src="${c.channel_image_url}" class="w-16 h-16 rounded-full mx-auto mb-3 shadow-md">
                    <h4 class="font-bold text-slate-800 dark:text-white truncate">${c.channel_name}</h4>
                </a>
            `).join('');
        }
    },

    // --- רינדור קטגוריה / רשימה ---
    renderCategory(catKey) {
        this.dom.views.category.classList.remove('hidden');
        this.state.currentCategory = catKey;
        this.state.visibleCount = CONFIG.INITIAL_LOAD;
        
        // עדכון כותרות
        const meta = CONFIG.CATEGORY_META[catKey] || CONFIG.CATEGORY_META['all'];
        document.getElementById('breadcrumb-current').innerText = meta.name;
        document.getElementById('category-name').innerText = meta.name;
        document.getElementById('category-icon').className = `fas fa-${meta.icon} ml-3 text-purple-600`;
        
        this.renderGrid();
        this.renderTags();
    },

    renderGrid() {
        const videos = this.getFilteredVideos({
            category: this.state.currentCategory,
            search: this.state.filters.search,
            hebrew: this.state.filters.hebrew,
            sort: this.state.filters.sort,
            tags: this.state.filters.tags
        });

        this.dom.catCount.innerText = videos.length;
        const visible = videos.slice(0, this.state.visibleCount);
        
        if(videos.length === 0) {
            this.dom.videoGrid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500">לא נמצאו סרטונים.</div>`;
            this.dom.loadMoreBtn.classList.add('hidden');
        } else {
            this.dom.videoGrid.innerHTML = visible.map(v => this.createCardHTML(v)).join('');
            
            // כפתור טען עוד
            if (videos.length > this.state.visibleCount) {
                this.dom.loadMoreBtn.classList.remove('hidden');
                this.dom.loadMoreBtn.onclick = () => {
                    this.state.visibleCount += CONFIG.LOAD_STEP;
                    this.renderGrid();
                };
            } else {
                this.dom.loadMoreBtn.classList.add('hidden');
            }
        }
    },

    // --- רינדור סרטון יחיד ---
    renderVideo(id) {
        const video = this.data.videos.find(v => v.id === id);
        if(!video) { app.router('home'); return; }

        this.dom.views.video.classList.remove('hidden');
        
        // הזרקת תוכן
        this.dom.svIframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
        this.dom.svTitle.innerText = video.title;
        this.dom.svDesc.innerHTML = video.content || 'אין תיאור זמין.';
        this.dom.svChannel.innerText = video.channel;
        this.dom.svChannelImg.src = video.channelImage || 'data/assets/images/logo.png';
        this.dom.svDate.innerText = this.formatDate(video.dateAdded);
        
        // תגיות
        this.dom.svTags.innerHTML = (video.tags || []).map(t => 
            `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs rounded hover:bg-purple-100 cursor-pointer" onclick="app.filterByTag('${t}')">#${t}</span>`
        ).join('');

        // סרטונים קשורים
        const related = this.data.videos.filter(v => v.category === video.category && v.id !== video.id).slice(0, 3);
        this.dom.relatedGrid.innerHTML = related.map(v => this.createCardHTML(v)).join('');
    },

    // --- לוגיקה ---
    getFilteredVideos(filter) {
        let res = this.data.videos;

        if(filter.category && filter.category !== 'all') {
            res = res.filter(v => v.category === filter.category);
        }
        if(filter.search) {
            if(this.data.fuse) {
                res = this.data.fuse.search(filter.search).map(r => r.item);
            } else {
                res = res.filter(v => v.title.includes(filter.search));
            }
        }
        if(filter.hebrew) res = res.filter(v => v.hebrewContent);
        if(filter.tags && filter.tags.length) {
            res = res.filter(v => v.tags && v.tags.some(t => filter.tags.includes(t)));
        }

        // מיון
        if(filter.sort === 'newest') res.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        if(filter.sort === 'oldest') res.sort((a,b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
        if(filter.sort === 'az') res.sort((a,b) => a.title.localeCompare(b.title));

        return res;
    },

    renderTags() {
        // יצירת ענן תגיות מהסרטונים הנוכחיים בקטגוריה
        const currentVideos = this.data.videos.filter(v => this.state.currentCategory === 'all' || v.category === this.state.currentCategory);
        const tagsMap = {};
        currentVideos.forEach(v => (v.tags || []).forEach(t => tagsMap[t] = (tagsMap[t] || 0) + 1));
        
        // 15 תגיות מובילות
        const sortedTags = Object.keys(tagsMap).sort((a,b) => tagsMap[b] - tagsMap[a]).slice(0, 15);
        this.dom.tagsContainer.innerHTML = sortedTags.map(t => 
            `<button onclick="app.filterByTag('${t}')" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 border border-transparent hover:border-purple-300 transition-colors">${t}</button>`
        ).join('');
    },

    filterByTag(tag) {
        this.state.filters.search = tag;
        this.dom.catSearch.value = tag;
        if(this.state.currentCategory === 'all') this.router('category', 'all');
        else this.renderCategory(this.state.currentCategory);
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    createCardHTML(v) {
        const thumb = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; // שיפור ביצועים: mqdefault
        const meta = CONFIG.CATEGORY_META[v.category];
        return `
        <article class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col cursor-pointer" onclick="app.router('video', '${v.id}')">
            <div class="relative aspect-video overflow-hidden bg-gray-200">
                <img src="${thumb}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                <span class="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">${v.duration}</span>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/40"><i class="fas fa-play ml-1"></i></div>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-slate-700 dark:text-purple-300 truncate max-w-[60%]">${meta.name}</span>
                    <span class="text-[10px] text-slate-400">${this.formatDate(v.dateAdded)}</span>
                </div>
                <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-auto group-hover:text-purple-600 transition-colors">${v.title}</h3>
                <div class="flex items-center gap-2 pt-3 mt-2 border-t border-slate-50 dark:border-slate-700/50">
                    <img src="${v.channelImage || 'data/assets/images/logo.png'}" class="w-6 h-6 rounded-full object-cover bg-slate-200">
                    <span class="text-xs text-slate-600 dark:text-slate-400 truncate">${v.channel}</span>
                </div>
            </div>
        </article>`;
    },

    formatDate(d) {
        if(!d) return '';
        return new Date(d).toLocaleDateString('he-IL');
    },

    bindEvents() {
        // האזנה לשינוי URL
        window.addEventListener('hashchange', () => this.handleRouting());

        // חיפוש בקטגוריה
        const debouncedSearch = this.debounce((e) => {
            this.state.filters.search = e.target.value;
            this.renderGrid();
        }, 300);
        this.dom.catSearch.addEventListener('input', debouncedSearch);

        // פילטרים
        this.dom.hebrewFilter.addEventListener('change', (e) => {
            this.state.filters.hebrew = e.target.checked;
            this.renderGrid();
        });
        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.filters.sort = e.target.value;
            this.renderGrid();
        });

        // חיפוש גלובלי
        document.getElementById('global-search-input').addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                this.state.filters.search = e.target.value;
                this.router('category', 'all');
            }
        });

        // תפריט מובייל
        const mobileMenu = document.getElementById('mobile-menu');
        const backdrop = document.getElementById('mobile-menu-backdrop');
        const openBtn = document.getElementById('open-menu-btn');
        const closeBtn = document.getElementById('close-menu-btn');

        const toggleMenu = () => {
            mobileMenu.classList.toggle('translate-x-full');
            backdrop.classList.toggle('invisible');
            backdrop.classList.toggle('opacity-0');
        };

        openBtn.onclick = toggleMenu;
        closeBtn.onclick = toggleMenu;
        backdrop.onclick = toggleMenu;

        // דארק מוד
        document.querySelectorAll('.dark-mode-toggle-button').forEach(btn => {
            btn.onclick = () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            }
        });

        // גלילה למעלה
        const scrollBtn = document.getElementById('back-to-top-btn');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.remove('opacity-0', 'translate-y-10');
            } else {
                scrollBtn.classList.add('opacity-0', 'translate-y-10');
            }
        });
        scrollBtn.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// הפעלה
document.addEventListener('DOMContentLoaded', () => app.init());/**
 * CAR-tiv Main Logic (Refactored for SPA & Performance)
 */

const CONFIG = {
    CATEGORY_FILES: ['collectors', 'diy', 'maintenance', 'review', 'systems', 'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad'],
    CATEGORY_META: {
        'review': { name: 'סקירות רכב', icon: 'car-on', gradient: 'from-purple-500 to-indigo-600', desc: 'מבחני דרכים והשוואות' },
        'safety': { name: 'מבחני בטיחות', icon: 'shield-halved', gradient: 'from-red-500 to-rose-600', desc: 'מבחני ריסוק וציוני בטיחות' },
        'offroad': { name: 'שטח ו-4X4', icon: 'mountain', gradient: 'from-amber-600 to-orange-700', desc: 'טיולים ועבירות בשטח' },
        'maintenance': { name: 'טיפולים', icon: 'oil-can', gradient: 'from-blue-500 to-cyan-600', desc: 'תחזוקה שוטפת ומניעתית' },
        'diy': { name: 'עשה זאת בעצמך', icon: 'tools', gradient: 'from-green-500 to-teal-600', desc: 'מדריכי תיקונים לביצוע עצמי' },
        'troubleshooting': { name: 'איתור תקלות', icon: 'microscope', gradient: 'from-lime-500 to-green-600', desc: 'דיאגנוסטיקה ופתרון בעיות' },
        'driving': { name: 'נהיגה נכונה', icon: 'road', gradient: 'from-teal-500 to-emerald-600', desc: 'טיפים לנהיגה בטוחה' },
        'upgrades': { name: 'שיפורים', icon: 'rocket', gradient: 'from-orange-500 to-red-600', desc: 'שדרוגים ותוספות לרכב' },
        'systems': { name: 'מערכות הרכב', icon: 'cogs', gradient: 'from-yellow-500 to-amber-600', desc: 'הסברים טכניים' },
        'collectors': { name: 'אספנות', icon: 'car-side', gradient: 'from-pink-500 to-rose-600', desc: 'רכבים קלאסיים ונוסטלגיה' },
        'all': { name: 'כל הסרטונים', icon: 'film', gradient: 'from-gray-500 to-gray-700', desc: 'כל המאגר במקום אחד' }
    },
    INITIAL_LOAD: 24,
    LOAD_STEP: 12
};

const app = {
    data: {
        videos: [],
        channels: [],
        fuse: null,
        isLoaded: false
    },
    state: {
        currentView: 'home',
        currentCategory: 'all',
        visibleCount: 24,
        filters: { search: '', hebrew: false, sort: 'newest', tags: [] }
    },

    // --- אתחול ---
    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadData();
        this.handleRouting(); // בדיקת URL ראשונית
        
        // הסתרת טעינה
        document.getElementById('site-preloader').classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => document.getElementById('site-preloader').style.display = 'none', 500);
    },

    cacheDOM() {
        this.dom = {
            views: {
                home: document.getElementById('view-home'),
                category: document.getElementById('view-category'),
                video: document.getElementById('view-video')
            },
            homeGrid: document.getElementById('home-videos-grid'),
            catGrid: document.getElementById('homepage-categories-grid'),
            videoGrid: document.getElementById('video-grid-container'),
            catTitle: document.getElementById('category-page-title'),
            catDesc: document.getElementById('category-name'),
            catCount: document.getElementById('category-count'),
            catSearch: document.getElementById('category-search-input'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            tagsContainer: document.getElementById('popular-tags-container'),
            sortSelect: document.getElementById('sort-select'),
            hebrewFilter: document.getElementById('hebrew-filter'),
            
            // Single Video Elements
            svIframe: document.getElementById('single-video-iframe'),
            svTitle: document.getElementById('single-video-title'),
            svDesc: document.getElementById('single-video-desc'),
            svChannel: document.getElementById('single-video-channel'),
            svChannelImg: document.getElementById('single-video-channel-img'),
            svDate: document.getElementById('single-video-date'),
            svTags: document.getElementById('single-video-tags'),
            relatedGrid: document.getElementById('related-videos-grid')
        };
    },

    // --- טעינת נתונים עם Caching ---
    async loadData() {
        const cached = localStorage.getItem('cartiv_data_v3');
        const cachedTime = localStorage.getItem('cartiv_time_v3');
        
        if (cached && cachedTime && (Date.now() - cachedTime < 3600000)) {
            const parsed = JSON.parse(cached);
            this.data.videos = parsed.videos;
            this.data.channels = parsed.channels;
            this.initSearch();
            return;
        }

        try {
            // טעינת סרטונים
            const promises = CONFIG.CATEGORY_FILES.map(f => fetch(`data/videos/${f}.json`).then(r => r.json()).then(d => (d.videos || d).map(v => ({...v, category: f}))));
            const results = await Promise.all(promises);
            this.data.videos = results.flat();

            // טעינת ערוצים
            const chRes = await fetch('data/featured_channels.json');
            const chData = await chRes.json();
            this.data.channels = chData.channels || chData;

            // שמירה ל-Cache
            localStorage.setItem('cartiv_data_v3', JSON.stringify({ videos: this.data.videos, channels: this.data.channels }));
            localStorage.setItem('cartiv_time_v3', Date.now());
            
            this.initSearch();
        } catch (e) {
            console.error("Error loading data", e);
            Swal.fire('שגיאה', 'תקלה בטעינת הנתונים', 'error');
        }
    },

    initSearch() {
        if(window.Fuse) {
            this.data.fuse = new Fuse(this.data.videos, { keys: ['title', 'tags', 'channel'], threshold: 0.35 });
        }
    },

    // --- ניתוב (Routing) ---
    router(page, param = null) {
        // עדכון URL ללא רענון
        if (page === 'home') window.location.hash = '';
        else if (page === 'category') window.location.hash = `#/category/${param}`;
        else if (page === 'video') window.location.hash = `#/video/${param}`;
        else if (page === 'all-categories') window.location.hash = `#/categories`;
        else window.location.hash = `#/${page}`;
    },

    handleRouting() {
        const hash = window.location.hash;
        window.scrollTo(0, 0);
        
        // הסתרת כל המסכים
        Object.values(this.dom.views).forEach(el => el.classList.add('hidden'));

        if (hash.includes('#/video/')) {
            const id = hash.split('/').pop();
            this.renderVideo(id);
        } else if (hash.includes('#/category/')) {
            const cat = hash.split('/').pop();
            this.renderCategory(cat);
        } else if (hash.includes('#/categories')) {
            this.renderHome(); // במקרה זה נשתמש בדף הבית אבל נגלול לקטגוריות
            setTimeout(() => document.getElementById('homepage-categories-section').scrollIntoView(), 100);
        } else {
            this.renderHome();
        }
    },

    // --- רינדור דף הבית ---
    renderHome() {
        this.dom.views.home.classList.remove('hidden');
        document.getElementById('video-count-hero').querySelector('span').innerText = this.data.videos.length;

        // קטגוריות
        if(!this.dom.catGrid.innerHTML) {
            this.dom.catGrid.innerHTML = CONFIG.CATEGORY_FILES.map(cat => {
                const meta = CONFIG.CATEGORY_META[cat];
                return `
                <div onclick="app.router('category', '${cat}')" class="cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md hover:shadow-xl border-b-4 border-purple-500 hover:-translate-y-1 transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white mb-4 text-xl shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-${meta.icon}"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">${meta.name}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${meta.desc}</p>
                </div>`;
            }).join('');
        }

        // סרטונים אחרונים
        const latest = this.getFilteredVideos({ sort: 'newest' }).slice(0, 8);
        this.dom.homeGrid.innerHTML = latest.map(v => this.createCardHTML(v)).join('');

        // ערוצים
        const channelsTrack = document.getElementById('featured-channels-track');
        if(!channelsTrack.innerHTML && this.data.channels.length) {
            channelsTrack.innerHTML = this.data.channels.map(c => `
                <a href="${c.channel_url}" target="_blank" class="flex-shrink-0 w-64 bg-white dark:bg-slate-800 p-4 rounded-xl shadow hover:shadow-lg transition-all text-center border border-slate-200 dark:border-slate-700">
                    <img src="${c.channel_image_url}" class="w-16 h-16 rounded-full mx-auto mb-3 shadow-md">
                    <h4 class="font-bold text-slate-800 dark:text-white truncate">${c.channel_name}</h4>
                </a>
            `).join('');
        }
    },

    // --- רינדור קטגוריה / רשימה ---
    renderCategory(catKey) {
        this.dom.views.category.classList.remove('hidden');
        this.state.currentCategory = catKey;
        this.state.visibleCount = CONFIG.INITIAL_LOAD;
        
        // עדכון כותרות
        const meta = CONFIG.CATEGORY_META[catKey] || CONFIG.CATEGORY_META['all'];
        document.getElementById('breadcrumb-current').innerText = meta.name;
        document.getElementById('category-name').innerText = meta.name;
        document.getElementById('category-icon').className = `fas fa-${meta.icon} ml-3 text-purple-600`;
        
        this.renderGrid();
        this.renderTags();
    },

    renderGrid() {
        const videos = this.getFilteredVideos({
            category: this.state.currentCategory,
            search: this.state.filters.search,
            hebrew: this.state.filters.hebrew,
            sort: this.state.filters.sort,
            tags: this.state.filters.tags
        });

        this.dom.catCount.innerText = videos.length;
        const visible = videos.slice(0, this.state.visibleCount);
        
        if(videos.length === 0) {
            this.dom.videoGrid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500">לא נמצאו סרטונים.</div>`;
            this.dom.loadMoreBtn.classList.add('hidden');
        } else {
            this.dom.videoGrid.innerHTML = visible.map(v => this.createCardHTML(v)).join('');
            
            // כפתור טען עוד
            if (videos.length > this.state.visibleCount) {
                this.dom.loadMoreBtn.classList.remove('hidden');
                this.dom.loadMoreBtn.onclick = () => {
                    this.state.visibleCount += CONFIG.LOAD_STEP;
                    this.renderGrid();
                };
            } else {
                this.dom.loadMoreBtn.classList.add('hidden');
            }
        }
    },

    // --- רינדור סרטון יחיד ---
    renderVideo(id) {
        const video = this.data.videos.find(v => v.id === id);
        if(!video) { app.router('home'); return; }

        this.dom.views.video.classList.remove('hidden');
        
        // הזרקת תוכן
        this.dom.svIframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
        this.dom.svTitle.innerText = video.title;
        this.dom.svDesc.innerHTML = video.content || 'אין תיאור זמין.';
        this.dom.svChannel.innerText = video.channel;
        this.dom.svChannelImg.src = video.channelImage || 'data/assets/images/logo.png';
        this.dom.svDate.innerText = this.formatDate(video.dateAdded);
        
        // תגיות
        this.dom.svTags.innerHTML = (video.tags || []).map(t => 
            `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs rounded hover:bg-purple-100 cursor-pointer" onclick="app.filterByTag('${t}')">#${t}</span>`
        ).join('');

        // סרטונים קשורים
        const related = this.data.videos.filter(v => v.category === video.category && v.id !== video.id).slice(0, 3);
        this.dom.relatedGrid.innerHTML = related.map(v => this.createCardHTML(v)).join('');
    },

    // --- לוגיקה ---
    getFilteredVideos(filter) {
        let res = this.data.videos;

        if(filter.category && filter.category !== 'all') {
            res = res.filter(v => v.category === filter.category);
        }
        if(filter.search) {
            if(this.data.fuse) {
                res = this.data.fuse.search(filter.search).map(r => r.item);
            } else {
                res = res.filter(v => v.title.includes(filter.search));
            }
        }
        if(filter.hebrew) res = res.filter(v => v.hebrewContent);
        if(filter.tags && filter.tags.length) {
            res = res.filter(v => v.tags && v.tags.some(t => filter.tags.includes(t)));
        }

        // מיון
        if(filter.sort === 'newest') res.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        if(filter.sort === 'oldest') res.sort((a,b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
        if(filter.sort === 'az') res.sort((a,b) => a.title.localeCompare(b.title));

        return res;
    },

    renderTags() {
        // יצירת ענן תגיות מהסרטונים הנוכחיים בקטגוריה
        const currentVideos = this.data.videos.filter(v => this.state.currentCategory === 'all' || v.category === this.state.currentCategory);
        const tagsMap = {};
        currentVideos.forEach(v => (v.tags || []).forEach(t => tagsMap[t] = (tagsMap[t] || 0) + 1));
        
        // 15 תגיות מובילות
        const sortedTags = Object.keys(tagsMap).sort((a,b) => tagsMap[b] - tagsMap[a]).slice(0, 15);
        this.dom.tagsContainer.innerHTML = sortedTags.map(t => 
            `<button onclick="app.filterByTag('${t}')" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 border border-transparent hover:border-purple-300 transition-colors">${t}</button>`
        ).join('');
    },

    filterByTag(tag) {
        this.state.filters.search = tag;
        this.dom.catSearch.value = tag;
        if(this.state.currentCategory === 'all') this.router('category', 'all');
        else this.renderCategory(this.state.currentCategory);
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    createCardHTML(v) {
        const thumb = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; // שיפור ביצועים: mqdefault
        const meta = CONFIG.CATEGORY_META[v.category];
        return `
        <article class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col cursor-pointer" onclick="app.router('video', '${v.id}')">
            <div class="relative aspect-video overflow-hidden bg-gray-200">
                <img src="${thumb}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                <span class="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">${v.duration}</span>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/40"><i class="fas fa-play ml-1"></i></div>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-slate-700 dark:text-purple-300 truncate max-w-[60%]">${meta.name}</span>
                    <span class="text-[10px] text-slate-400">${this.formatDate(v.dateAdded)}</span>
                </div>
                <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-auto group-hover:text-purple-600 transition-colors">${v.title}</h3>
                <div class="flex items-center gap-2 pt-3 mt-2 border-t border-slate-50 dark:border-slate-700/50">
                    <img src="${v.channelImage || 'data/assets/images/logo.png'}" class="w-6 h-6 rounded-full object-cover bg-slate-200">
                    <span class="text-xs text-slate-600 dark:text-slate-400 truncate">${v.channel}</span>
                </div>
            </div>
        </article>`;
    },

    formatDate(d) {
        if(!d) return '';
        return new Date(d).toLocaleDateString('he-IL');
    },

    bindEvents() {
        // האזנה לשינוי URL
        window.addEventListener('hashchange', () => this.handleRouting());

        // חיפוש בקטגוריה
        const debouncedSearch = this.debounce((e) => {
            this.state.filters.search = e.target.value;
            this.renderGrid();
        }, 300);
        this.dom.catSearch.addEventListener('input', debouncedSearch);

        // פילטרים
        this.dom.hebrewFilter.addEventListener('change', (e) => {
            this.state.filters.hebrew = e.target.checked;
            this.renderGrid();
        });
        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.filters.sort = e.target.value;
            this.renderGrid();
        });

        // חיפוש גלובלי
        document.getElementById('global-search-input').addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                this.state.filters.search = e.target.value;
                this.router('category', 'all');
            }
        });

        // תפריט מובייל
        const mobileMenu = document.getElementById('mobile-menu');
        const backdrop = document.getElementById('mobile-menu-backdrop');
        const openBtn = document.getElementById('open-menu-btn');
        const closeBtn = document.getElementById('close-menu-btn');

        const toggleMenu = () => {
            mobileMenu.classList.toggle('translate-x-full');
            backdrop.classList.toggle('invisible');
            backdrop.classList.toggle('opacity-0');
        };

        openBtn.onclick = toggleMenu;
        closeBtn.onclick = toggleMenu;
        backdrop.onclick = toggleMenu;

        // דארק מוד
        document.querySelectorAll('.dark-mode-toggle-button').forEach(btn => {
            btn.onclick = () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            }
        });

        // גלילה למעלה
        const scrollBtn = document.getElementById('back-to-top-btn');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.remove('opacity-0', 'translate-y-10');
            } else {
                scrollBtn.classList.add('opacity-0', 'translate-y-10');
            }
        });
        scrollBtn.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// הפעלה
document.addEventListener('DOMContentLoaded', () => app.init());/**
 * CAR-tiv Main Logic (Refactored for SPA & Performance)
 */

const CONFIG = {
    CATEGORY_FILES: ['collectors', 'diy', 'maintenance', 'review', 'systems', 'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad'],
    CATEGORY_META: {
        'review': { name: 'סקירות רכב', icon: 'car-on', gradient: 'from-purple-500 to-indigo-600', desc: 'מבחני דרכים והשוואות' },
        'safety': { name: 'מבחני בטיחות', icon: 'shield-halved', gradient: 'from-red-500 to-rose-600', desc: 'מבחני ריסוק וציוני בטיחות' },
        'offroad': { name: 'שטח ו-4X4', icon: 'mountain', gradient: 'from-amber-600 to-orange-700', desc: 'טיולים ועבירות בשטח' },
        'maintenance': { name: 'טיפולים', icon: 'oil-can', gradient: 'from-blue-500 to-cyan-600', desc: 'תחזוקה שוטפת ומניעתית' },
        'diy': { name: 'עשה זאת בעצמך', icon: 'tools', gradient: 'from-green-500 to-teal-600', desc: 'מדריכי תיקונים לביצוע עצמי' },
        'troubleshooting': { name: 'איתור תקלות', icon: 'microscope', gradient: 'from-lime-500 to-green-600', desc: 'דיאגנוסטיקה ופתרון בעיות' },
        'driving': { name: 'נהיגה נכונה', icon: 'road', gradient: 'from-teal-500 to-emerald-600', desc: 'טיפים לנהיגה בטוחה' },
        'upgrades': { name: 'שיפורים', icon: 'rocket', gradient: 'from-orange-500 to-red-600', desc: 'שדרוגים ותוספות לרכב' },
        'systems': { name: 'מערכות הרכב', icon: 'cogs', gradient: 'from-yellow-500 to-amber-600', desc: 'הסברים טכניים' },
        'collectors': { name: 'אספנות', icon: 'car-side', gradient: 'from-pink-500 to-rose-600', desc: 'רכבים קלאסיים ונוסטלגיה' },
        'all': { name: 'כל הסרטונים', icon: 'film', gradient: 'from-gray-500 to-gray-700', desc: 'כל המאגר במקום אחד' }
    },
    INITIAL_LOAD: 24,
    LOAD_STEP: 12
};

const app = {
    data: {
        videos: [],
        channels: [],
        fuse: null,
        isLoaded: false
    },
    state: {
        currentView: 'home',
        currentCategory: 'all',
        visibleCount: 24,
        filters: { search: '', hebrew: false, sort: 'newest', tags: [] }
    },

    // --- אתחול ---
    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadData();
        this.handleRouting(); // בדיקת URL ראשונית
        
        // הסתרת טעינה
        document.getElementById('site-preloader').classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => document.getElementById('site-preloader').style.display = 'none', 500);
    },

    cacheDOM() {
        this.dom = {
            views: {
                home: document.getElementById('view-home'),
                category: document.getElementById('view-category'),
                video: document.getElementById('view-video')
            },
            homeGrid: document.getElementById('home-videos-grid'),
            catGrid: document.getElementById('homepage-categories-grid'),
            videoGrid: document.getElementById('video-grid-container'),
            catTitle: document.getElementById('category-page-title'),
            catDesc: document.getElementById('category-name'),
            catCount: document.getElementById('category-count'),
            catSearch: document.getElementById('category-search-input'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            tagsContainer: document.getElementById('popular-tags-container'),
            sortSelect: document.getElementById('sort-select'),
            hebrewFilter: document.getElementById('hebrew-filter'),
            
            // Single Video Elements
            svIframe: document.getElementById('single-video-iframe'),
            svTitle: document.getElementById('single-video-title'),
            svDesc: document.getElementById('single-video-desc'),
            svChannel: document.getElementById('single-video-channel'),
            svChannelImg: document.getElementById('single-video-channel-img'),
            svDate: document.getElementById('single-video-date'),
            svTags: document.getElementById('single-video-tags'),
            relatedGrid: document.getElementById('related-videos-grid')
        };
    },

    // --- טעינת נתונים עם Caching ---
    async loadData() {
        const cached = localStorage.getItem('cartiv_data_v3');
        const cachedTime = localStorage.getItem('cartiv_time_v3');
        
        if (cached && cachedTime && (Date.now() - cachedTime < 3600000)) {
            const parsed = JSON.parse(cached);
            this.data.videos = parsed.videos;
            this.data.channels = parsed.channels;
            this.initSearch();
            return;
        }

        try {
            // טעינת סרטונים
            const promises = CONFIG.CATEGORY_FILES.map(f => fetch(`data/videos/${f}.json`).then(r => r.json()).then(d => (d.videos || d).map(v => ({...v, category: f}))));
            const results = await Promise.all(promises);
            this.data.videos = results.flat();

            // טעינת ערוצים
            const chRes = await fetch('data/featured_channels.json');
            const chData = await chRes.json();
            this.data.channels = chData.channels || chData;

            // שמירה ל-Cache
            localStorage.setItem('cartiv_data_v3', JSON.stringify({ videos: this.data.videos, channels: this.data.channels }));
            localStorage.setItem('cartiv_time_v3', Date.now());
            
            this.initSearch();
        } catch (e) {
            console.error("Error loading data", e);
            Swal.fire('שגיאה', 'תקלה בטעינת הנתונים', 'error');
        }
    },

    initSearch() {
        if(window.Fuse) {
            this.data.fuse = new Fuse(this.data.videos, { keys: ['title', 'tags', 'channel'], threshold: 0.35 });
        }
    },

    // --- ניתוב (Routing) ---
    router(page, param = null) {
        // עדכון URL ללא רענון
        if (page === 'home') window.location.hash = '';
        else if (page === 'category') window.location.hash = `#/category/${param}`;
        else if (page === 'video') window.location.hash = `#/video/${param}`;
        else if (page === 'all-categories') window.location.hash = `#/categories`;
        else window.location.hash = `#/${page}`;
    },

    handleRouting() {
        const hash = window.location.hash;
        window.scrollTo(0, 0);
        
        // הסתרת כל המסכים
        Object.values(this.dom.views).forEach(el => el.classList.add('hidden'));

        if (hash.includes('#/video/')) {
            const id = hash.split('/').pop();
            this.renderVideo(id);
        } else if (hash.includes('#/category/')) {
            const cat = hash.split('/').pop();
            this.renderCategory(cat);
        } else if (hash.includes('#/categories')) {
            this.renderHome(); // במקרה זה נשתמש בדף הבית אבל נגלול לקטגוריות
            setTimeout(() => document.getElementById('homepage-categories-section').scrollIntoView(), 100);
        } else {
            this.renderHome();
        }
    },

    // --- רינדור דף הבית ---
    renderHome() {
        this.dom.views.home.classList.remove('hidden');
        document.getElementById('video-count-hero').querySelector('span').innerText = this.data.videos.length;

        // קטגוריות
        if(!this.dom.catGrid.innerHTML) {
            this.dom.catGrid.innerHTML = CONFIG.CATEGORY_FILES.map(cat => {
                const meta = CONFIG.CATEGORY_META[cat];
                return `
                <div onclick="app.router('category', '${cat}')" class="cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md hover:shadow-xl border-b-4 border-purple-500 hover:-translate-y-1 transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white mb-4 text-xl shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-${meta.icon}"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">${meta.name}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${meta.desc}</p>
                </div>`;
            }).join('');
        }

        // סרטונים אחרונים
        const latest = this.getFilteredVideos({ sort: 'newest' }).slice(0, 8);
        this.dom.homeGrid.innerHTML = latest.map(v => this.createCardHTML(v)).join('');

        // ערוצים
        const channelsTrack = document.getElementById('featured-channels-track');
        if(!channelsTrack.innerHTML && this.data.channels.length) {
            channelsTrack.innerHTML = this.data.channels.map(c => `
                <a href="${c.channel_url}" target="_blank" class="flex-shrink-0 w-64 bg-white dark:bg-slate-800 p-4 rounded-xl shadow hover:shadow-lg transition-all text-center border border-slate-200 dark:border-slate-700">
                    <img src="${c.channel_image_url}" class="w-16 h-16 rounded-full mx-auto mb-3 shadow-md">
                    <h4 class="font-bold text-slate-800 dark:text-white truncate">${c.channel_name}</h4>
                </a>
            `).join('');
        }
    },

    // --- רינדור קטגוריה / רשימה ---
    renderCategory(catKey) {
        this.dom.views.category.classList.remove('hidden');
        this.state.currentCategory = catKey;
        this.state.visibleCount = CONFIG.INITIAL_LOAD;
        
        // עדכון כותרות
        const meta = CONFIG.CATEGORY_META[catKey] || CONFIG.CATEGORY_META['all'];
        document.getElementById('breadcrumb-current').innerText = meta.name;
        document.getElementById('category-name').innerText = meta.name;
        document.getElementById('category-icon').className = `fas fa-${meta.icon} ml-3 text-purple-600`;
        
        this.renderGrid();
        this.renderTags();
    },

    renderGrid() {
        const videos = this.getFilteredVideos({
            category: this.state.currentCategory,
            search: this.state.filters.search,
            hebrew: this.state.filters.hebrew,
            sort: this.state.filters.sort,
            tags: this.state.filters.tags
        });

        this.dom.catCount.innerText = videos.length;
        const visible = videos.slice(0, this.state.visibleCount);
        
        if(videos.length === 0) {
            this.dom.videoGrid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500">לא נמצאו סרטונים.</div>`;
            this.dom.loadMoreBtn.classList.add('hidden');
        } else {
            this.dom.videoGrid.innerHTML = visible.map(v => this.createCardHTML(v)).join('');
            
            // כפתור טען עוד
            if (videos.length > this.state.visibleCount) {
                this.dom.loadMoreBtn.classList.remove('hidden');
                this.dom.loadMoreBtn.onclick = () => {
                    this.state.visibleCount += CONFIG.LOAD_STEP;
                    this.renderGrid();
                };
            } else {
                this.dom.loadMoreBtn.classList.add('hidden');
            }
        }
    },

    // --- רינדור סרטון יחיד ---
    renderVideo(id) {
        const video = this.data.videos.find(v => v.id === id);
        if(!video) { app.router('home'); return; }

        this.dom.views.video.classList.remove('hidden');
        
        // הזרקת תוכן
        this.dom.svIframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
        this.dom.svTitle.innerText = video.title;
        this.dom.svDesc.innerHTML = video.content || 'אין תיאור זמין.';
        this.dom.svChannel.innerText = video.channel;
        this.dom.svChannelImg.src = video.channelImage || 'data/assets/images/logo.png';
        this.dom.svDate.innerText = this.formatDate(video.dateAdded);
        
        // תגיות
        this.dom.svTags.innerHTML = (video.tags || []).map(t => 
            `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs rounded hover:bg-purple-100 cursor-pointer" onclick="app.filterByTag('${t}')">#${t}</span>`
        ).join('');

        // סרטונים קשורים
        const related = this.data.videos.filter(v => v.category === video.category && v.id !== video.id).slice(0, 3);
        this.dom.relatedGrid.innerHTML = related.map(v => this.createCardHTML(v)).join('');
    },

    // --- לוגיקה ---
    getFilteredVideos(filter) {
        let res = this.data.videos;

        if(filter.category && filter.category !== 'all') {
            res = res.filter(v => v.category === filter.category);
        }
        if(filter.search) {
            if(this.data.fuse) {
                res = this.data.fuse.search(filter.search).map(r => r.item);
            } else {
                res = res.filter(v => v.title.includes(filter.search));
            }
        }
        if(filter.hebrew) res = res.filter(v => v.hebrewContent);
        if(filter.tags && filter.tags.length) {
            res = res.filter(v => v.tags && v.tags.some(t => filter.tags.includes(t)));
        }

        // מיון
        if(filter.sort === 'newest') res.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        if(filter.sort === 'oldest') res.sort((a,b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
        if(filter.sort === 'az') res.sort((a,b) => a.title.localeCompare(b.title));

        return res;
    },

    renderTags() {
        // יצירת ענן תגיות מהסרטונים הנוכחיים בקטגוריה
        const currentVideos = this.data.videos.filter(v => this.state.currentCategory === 'all' || v.category === this.state.currentCategory);
        const tagsMap = {};
        currentVideos.forEach(v => (v.tags || []).forEach(t => tagsMap[t] = (tagsMap[t] || 0) + 1));
        
        // 15 תגיות מובילות
        const sortedTags = Object.keys(tagsMap).sort((a,b) => tagsMap[b] - tagsMap[a]).slice(0, 15);
        this.dom.tagsContainer.innerHTML = sortedTags.map(t => 
            `<button onclick="app.filterByTag('${t}')" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 border border-transparent hover:border-purple-300 transition-colors">${t}</button>`
        ).join('');
    },

    filterByTag(tag) {
        this.state.filters.search = tag;
        this.dom.catSearch.value = tag;
        if(this.state.currentCategory === 'all') this.router('category', 'all');
        else this.renderCategory(this.state.currentCategory);
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    createCardHTML(v) {
        const thumb = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; // שיפור ביצועים: mqdefault
        const meta = CONFIG.CATEGORY_META[v.category];
        return `
        <article class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col cursor-pointer" onclick="app.router('video', '${v.id}')">
            <div class="relative aspect-video overflow-hidden bg-gray-200">
                <img src="${thumb}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                <span class="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">${v.duration}</span>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/40"><i class="fas fa-play ml-1"></i></div>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-slate-700 dark:text-purple-300 truncate max-w-[60%]">${meta.name}</span>
                    <span class="text-[10px] text-slate-400">${this.formatDate(v.dateAdded)}</span>
                </div>
                <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-auto group-hover:text-purple-600 transition-colors">${v.title}</h3>
                <div class="flex items-center gap-2 pt-3 mt-2 border-t border-slate-50 dark:border-slate-700/50">
                    <img src="${v.channelImage || 'data/assets/images/logo.png'}" class="w-6 h-6 rounded-full object-cover bg-slate-200">
                    <span class="text-xs text-slate-600 dark:text-slate-400 truncate">${v.channel}</span>
                </div>
            </div>
        </article>`;
    },

    formatDate(d) {
        if(!d) return '';
        return new Date(d).toLocaleDateString('he-IL');
    },

    bindEvents() {
        // האזנה לשינוי URL
        window.addEventListener('hashchange', () => this.handleRouting());

        // חיפוש בקטגוריה
        const debouncedSearch = this.debounce((e) => {
            this.state.filters.search = e.target.value;
            this.renderGrid();
        }, 300);
        this.dom.catSearch.addEventListener('input', debouncedSearch);

        // פילטרים
        this.dom.hebrewFilter.addEventListener('change', (e) => {
            this.state.filters.hebrew = e.target.checked;
            this.renderGrid();
        });
        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.filters.sort = e.target.value;
            this.renderGrid();
        });

        // חיפוש גלובלי
        document.getElementById('global-search-input').addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                this.state.filters.search = e.target.value;
                this.router('category', 'all');
            }
        });

        // תפריט מובייל
        const mobileMenu = document.getElementById('mobile-menu');
        const backdrop = document.getElementById('mobile-menu-backdrop');
        const openBtn = document.getElementById('open-menu-btn');
        const closeBtn = document.getElementById('close-menu-btn');

        const toggleMenu = () => {
            mobileMenu.classList.toggle('translate-x-full');
            backdrop.classList.toggle('invisible');
            backdrop.classList.toggle('opacity-0');
        };

        openBtn.onclick = toggleMenu;
        closeBtn.onclick = toggleMenu;
        backdrop.onclick = toggleMenu;

        // דארק מוד
        document.querySelectorAll('.dark-mode-toggle-button').forEach(btn => {
            btn.onclick = () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            }
        });

        // גלילה למעלה
        const scrollBtn = document.getElementById('back-to-top-btn');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.remove('opacity-0', 'translate-y-10');
            } else {
                scrollBtn.classList.add('opacity-0', 'translate-y-10');
            }
        });
        scrollBtn.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// הפעלה
document.addEventListener('DOMContentLoaded', () => app.init());/**
 * CAR-tiv Main Logic (Refactored for SPA & Performance)
 */

const CONFIG = {
    CATEGORY_FILES: ['collectors', 'diy', 'maintenance', 'review', 'systems', 'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad'],
    CATEGORY_META: {
        'review': { name: 'סקירות רכב', icon: 'car-on', gradient: 'from-purple-500 to-indigo-600', desc: 'מבחני דרכים והשוואות' },
        'safety': { name: 'מבחני בטיחות', icon: 'shield-halved', gradient: 'from-red-500 to-rose-600', desc: 'מבחני ריסוק וציוני בטיחות' },
        'offroad': { name: 'שטח ו-4X4', icon: 'mountain', gradient: 'from-amber-600 to-orange-700', desc: 'טיולים ועבירות בשטח' },
        'maintenance': { name: 'טיפולים', icon: 'oil-can', gradient: 'from-blue-500 to-cyan-600', desc: 'תחזוקה שוטפת ומניעתית' },
        'diy': { name: 'עשה זאת בעצמך', icon: 'tools', gradient: 'from-green-500 to-teal-600', desc: 'מדריכי תיקונים לביצוע עצמי' },
        'troubleshooting': { name: 'איתור תקלות', icon: 'microscope', gradient: 'from-lime-500 to-green-600', desc: 'דיאגנוסטיקה ופתרון בעיות' },
        'driving': { name: 'נהיגה נכונה', icon: 'road', gradient: 'from-teal-500 to-emerald-600', desc: 'טיפים לנהיגה בטוחה' },
        'upgrades': { name: 'שיפורים', icon: 'rocket', gradient: 'from-orange-500 to-red-600', desc: 'שדרוגים ותוספות לרכב' },
        'systems': { name: 'מערכות הרכב', icon: 'cogs', gradient: 'from-yellow-500 to-amber-600', desc: 'הסברים טכניים' },
        'collectors': { name: 'אספנות', icon: 'car-side', gradient: 'from-pink-500 to-rose-600', desc: 'רכבים קלאסיים ונוסטלגיה' },
        'all': { name: 'כל הסרטונים', icon: 'film', gradient: 'from-gray-500 to-gray-700', desc: 'כל המאגר במקום אחד' }
    },
    INITIAL_LOAD: 24,
    LOAD_STEP: 12
};

const app = {
    data: {
        videos: [],
        channels: [],
        fuse: null,
        isLoaded: false
    },
    state: {
        currentView: 'home',
        currentCategory: 'all',
        visibleCount: 24,
        filters: { search: '', hebrew: false, sort: 'newest', tags: [] }
    },

    // --- אתחול ---
    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadData();
        this.handleRouting(); // בדיקת URL ראשונית
        
        // הסתרת טעינה
        document.getElementById('site-preloader').classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => document.getElementById('site-preloader').style.display = 'none', 500);
    },

    cacheDOM() {
        this.dom = {
            views: {
                home: document.getElementById('view-home'),
                category: document.getElementById('view-category'),
                video: document.getElementById('view-video')
            },
            homeGrid: document.getElementById('home-videos-grid'),
            catGrid: document.getElementById('homepage-categories-grid'),
            videoGrid: document.getElementById('video-grid-container'),
            catTitle: document.getElementById('category-page-title'),
            catDesc: document.getElementById('category-name'),
            catCount: document.getElementById('category-count'),
            catSearch: document.getElementById('category-search-input'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            tagsContainer: document.getElementById('popular-tags-container'),
            sortSelect: document.getElementById('sort-select'),
            hebrewFilter: document.getElementById('hebrew-filter'),
            
            // Single Video Elements
            svIframe: document.getElementById('single-video-iframe'),
            svTitle: document.getElementById('single-video-title'),
            svDesc: document.getElementById('single-video-desc'),
            svChannel: document.getElementById('single-video-channel'),
            svChannelImg: document.getElementById('single-video-channel-img'),
            svDate: document.getElementById('single-video-date'),
            svTags: document.getElementById('single-video-tags'),
            relatedGrid: document.getElementById('related-videos-grid')
        };
    },

    // --- טעינת נתונים עם Caching ---
    async loadData() {
        const cached = localStorage.getItem('cartiv_data_v3');
        const cachedTime = localStorage.getItem('cartiv_time_v3');
        
        if (cached && cachedTime && (Date.now() - cachedTime < 3600000)) {
            const parsed = JSON.parse(cached);
            this.data.videos = parsed.videos;
            this.data.channels = parsed.channels;
            this.initSearch();
            return;
        }

        try {
            // טעינת סרטונים
            const promises = CONFIG.CATEGORY_FILES.map(f => fetch(`data/videos/${f}.json`).then(r => r.json()).then(d => (d.videos || d).map(v => ({...v, category: f}))));
            const results = await Promise.all(promises);
            this.data.videos = results.flat();

            // טעינת ערוצים
            const chRes = await fetch('data/featured_channels.json');
            const chData = await chRes.json();
            this.data.channels = chData.channels || chData;

            // שמירה ל-Cache
            localStorage.setItem('cartiv_data_v3', JSON.stringify({ videos: this.data.videos, channels: this.data.channels }));
            localStorage.setItem('cartiv_time_v3', Date.now());
            
            this.initSearch();
        } catch (e) {
            console.error("Error loading data", e);
            Swal.fire('שגיאה', 'תקלה בטעינת הנתונים', 'error');
        }
    },

    initSearch() {
        if(window.Fuse) {
            this.data.fuse = new Fuse(this.data.videos, { keys: ['title', 'tags', 'channel'], threshold: 0.35 });
        }
    },

    // --- ניתוב (Routing) ---
    router(page, param = null) {
        // עדכון URL ללא רענון
        if (page === 'home') window.location.hash = '';
        else if (page === 'category') window.location.hash = `#/category/${param}`;
        else if (page === 'video') window.location.hash = `#/video/${param}`;
        else if (page === 'all-categories') window.location.hash = `#/categories`;
        else window.location.hash = `#/${page}`;
    },

    handleRouting() {
        const hash = window.location.hash;
        window.scrollTo(0, 0);
        
        // הסתרת כל המסכים
        Object.values(this.dom.views).forEach(el => el.classList.add('hidden'));

        if (hash.includes('#/video/')) {
            const id = hash.split('/').pop();
            this.renderVideo(id);
        } else if (hash.includes('#/category/')) {
            const cat = hash.split('/').pop();
            this.renderCategory(cat);
        } else if (hash.includes('#/categories')) {
            this.renderHome(); // במקרה זה נשתמש בדף הבית אבל נגלול לקטגוריות
            setTimeout(() => document.getElementById('homepage-categories-section').scrollIntoView(), 100);
        } else {
            this.renderHome();
        }
    },

    // --- רינדור דף הבית ---
    renderHome() {
        this.dom.views.home.classList.remove('hidden');
        document.getElementById('video-count-hero').querySelector('span').innerText = this.data.videos.length;

        // קטגוריות
        if(!this.dom.catGrid.innerHTML) {
            this.dom.catGrid.innerHTML = CONFIG.CATEGORY_FILES.map(cat => {
                const meta = CONFIG.CATEGORY_META[cat];
                return `
                <div onclick="app.router('category', '${cat}')" class="cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md hover:shadow-xl border-b-4 border-purple-500 hover:-translate-y-1 transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white mb-4 text-xl shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-${meta.icon}"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">${meta.name}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${meta.desc}</p>
                </div>`;
            }).join('');
        }

        // סרטונים אחרונים
        const latest = this.getFilteredVideos({ sort: 'newest' }).slice(0, 8);
        this.dom.homeGrid.innerHTML = latest.map(v => this.createCardHTML(v)).join('');

        // ערוצים
        const channelsTrack = document.getElementById('featured-channels-track');
        if(!channelsTrack.innerHTML && this.data.channels.length) {
            channelsTrack.innerHTML = this.data.channels.map(c => `
                <a href="${c.channel_url}" target="_blank" class="flex-shrink-0 w-64 bg-white dark:bg-slate-800 p-4 rounded-xl shadow hover:shadow-lg transition-all text-center border border-slate-200 dark:border-slate-700">
                    <img src="${c.channel_image_url}" class="w-16 h-16 rounded-full mx-auto mb-3 shadow-md">
                    <h4 class="font-bold text-slate-800 dark:text-white truncate">${c.channel_name}</h4>
                </a>
            `).join('');
        }
    },

    // --- רינדור קטגוריה / רשימה ---
    renderCategory(catKey) {
        this.dom.views.category.classList.remove('hidden');
        this.state.currentCategory = catKey;
        this.state.visibleCount = CONFIG.INITIAL_LOAD;
        
        // עדכון כותרות
        const meta = CONFIG.CATEGORY_META[catKey] || CONFIG.CATEGORY_META['all'];
        document.getElementById('breadcrumb-current').innerText = meta.name;
        document.getElementById('category-name').innerText = meta.name;
        document.getElementById('category-icon').className = `fas fa-${meta.icon} ml-3 text-purple-600`;
        
        this.renderGrid();
        this.renderTags();
    },

    renderGrid() {
        const videos = this.getFilteredVideos({
            category: this.state.currentCategory,
            search: this.state.filters.search,
            hebrew: this.state.filters.hebrew,
            sort: this.state.filters.sort,
            tags: this.state.filters.tags
        });

        this.dom.catCount.innerText = videos.length;
        const visible = videos.slice(0, this.state.visibleCount);
        
        if(videos.length === 0) {
            this.dom.videoGrid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500">לא נמצאו סרטונים.</div>`;
            this.dom.loadMoreBtn.classList.add('hidden');
        } else {
            this.dom.videoGrid.innerHTML = visible.map(v => this.createCardHTML(v)).join('');
            
            // כפתור טען עוד
            if (videos.length > this.state.visibleCount) {
                this.dom.loadMoreBtn.classList.remove('hidden');
                this.dom.loadMoreBtn.onclick = () => {
                    this.state.visibleCount += CONFIG.LOAD_STEP;
                    this.renderGrid();
                };
            } else {
                this.dom.loadMoreBtn.classList.add('hidden');
            }
        }
    },

    // --- רינדור סרטון יחיד ---
    renderVideo(id) {
        const video = this.data.videos.find(v => v.id === id);
        if(!video) { app.router('home'); return; }

        this.dom.views.video.classList.remove('hidden');
        
        // הזרקת תוכן
        this.dom.svIframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
        this.dom.svTitle.innerText = video.title;
        this.dom.svDesc.innerHTML = video.content || 'אין תיאור זמין.';
        this.dom.svChannel.innerText = video.channel;
        this.dom.svChannelImg.src = video.channelImage || 'data/assets/images/logo.png';
        this.dom.svDate.innerText = this.formatDate(video.dateAdded);
        
        // תגיות
        this.dom.svTags.innerHTML = (video.tags || []).map(t => 
            `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs rounded hover:bg-purple-100 cursor-pointer" onclick="app.filterByTag('${t}')">#${t}</span>`
        ).join('');

        // סרטונים קשורים
        const related = this.data.videos.filter(v => v.category === video.category && v.id !== video.id).slice(0, 3);
        this.dom.relatedGrid.innerHTML = related.map(v => this.createCardHTML(v)).join('');
    },

    // --- לוגיקה ---
    getFilteredVideos(filter) {
        let res = this.data.videos;

        if(filter.category && filter.category !== 'all') {
            res = res.filter(v => v.category === filter.category);
        }
        if(filter.search) {
            if(this.data.fuse) {
                res = this.data.fuse.search(filter.search).map(r => r.item);
            } else {
                res = res.filter(v => v.title.includes(filter.search));
            }
        }
        if(filter.hebrew) res = res.filter(v => v.hebrewContent);
        if(filter.tags && filter.tags.length) {
            res = res.filter(v => v.tags && v.tags.some(t => filter.tags.includes(t)));
        }

        // מיון
        if(filter.sort === 'newest') res.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        if(filter.sort === 'oldest') res.sort((a,b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
        if(filter.sort === 'az') res.sort((a,b) => a.title.localeCompare(b.title));

        return res;
    },

    renderTags() {
        // יצירת ענן תגיות מהסרטונים הנוכחיים בקטגוריה
        const currentVideos = this.data.videos.filter(v => this.state.currentCategory === 'all' || v.category === this.state.currentCategory);
        const tagsMap = {};
        currentVideos.forEach(v => (v.tags || []).forEach(t => tagsMap[t] = (tagsMap[t] || 0) + 1));
        
        // 15 תגיות מובילות
        const sortedTags = Object.keys(tagsMap).sort((a,b) => tagsMap[b] - tagsMap[a]).slice(0, 15);
        this.dom.tagsContainer.innerHTML = sortedTags.map(t => 
            `<button onclick="app.filterByTag('${t}')" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 border border-transparent hover:border-purple-300 transition-colors">${t}</button>`
        ).join('');
    },

    filterByTag(tag) {
        this.state.filters.search = tag;
        this.dom.catSearch.value = tag;
        if(this.state.currentCategory === 'all') this.router('category', 'all');
        else this.renderCategory(this.state.currentCategory);
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    createCardHTML(v) {
        const thumb = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; // שיפור ביצועים: mqdefault
        const meta = CONFIG.CATEGORY_META[v.category];
        return `
        <article class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col cursor-pointer" onclick="app.router('video', '${v.id}')">
            <div class="relative aspect-video overflow-hidden bg-gray-200">
                <img src="${thumb}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                <span class="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">${v.duration}</span>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/40"><i class="fas fa-play ml-1"></i></div>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-slate-700 dark:text-purple-300 truncate max-w-[60%]">${meta.name}</span>
                    <span class="text-[10px] text-slate-400">${this.formatDate(v.dateAdded)}</span>
                </div>
                <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-auto group-hover:text-purple-600 transition-colors">${v.title}</h3>
                <div class="flex items-center gap-2 pt-3 mt-2 border-t border-slate-50 dark:border-slate-700/50">
                    <img src="${v.channelImage || 'data/assets/images/logo.png'}" class="w-6 h-6 rounded-full object-cover bg-slate-200">
                    <span class="text-xs text-slate-600 dark:text-slate-400 truncate">${v.channel}</span>
                </div>
            </div>
        </article>`;
    },

    formatDate(d) {
        if(!d) return '';
        return new Date(d).toLocaleDateString('he-IL');
    },

    bindEvents() {
        // האזנה לשינוי URL
        window.addEventListener('hashchange', () => this.handleRouting());

        // חיפוש בקטגוריה
        const debouncedSearch = this.debounce((e) => {
            this.state.filters.search = e.target.value;
            this.renderGrid();
        }, 300);
        this.dom.catSearch.addEventListener('input', debouncedSearch);

        // פילטרים
        this.dom.hebrewFilter.addEventListener('change', (e) => {
            this.state.filters.hebrew = e.target.checked;
            this.renderGrid();
        });
        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.filters.sort = e.target.value;
            this.renderGrid();
        });

        // חיפוש גלובלי
        document.getElementById('global-search-input').addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                this.state.filters.search = e.target.value;
                this.router('category', 'all');
            }
        });

        // תפריט מובייל
        const mobileMenu = document.getElementById('mobile-menu');
        const backdrop = document.getElementById('mobile-menu-backdrop');
        const openBtn = document.getElementById('open-menu-btn');
        const closeBtn = document.getElementById('close-menu-btn');

        const toggleMenu = () => {
            mobileMenu.classList.toggle('translate-x-full');
            backdrop.classList.toggle('invisible');
            backdrop.classList.toggle('opacity-0');
        };

        openBtn.onclick = toggleMenu;
        closeBtn.onclick = toggleMenu;
        backdrop.onclick = toggleMenu;

        // דארק מוד
        document.querySelectorAll('.dark-mode-toggle-button').forEach(btn => {
            btn.onclick = () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            }
        });

        // גלילה למעלה
        const scrollBtn = document.getElementById('back-to-top-btn');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.remove('opacity-0', 'translate-y-10');
            } else {
                scrollBtn.classList.add('opacity-0', 'translate-y-10');
            }
        });
        scrollBtn.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// הפעלה
document.addEventListener('DOMContentLoaded', () => app.init());

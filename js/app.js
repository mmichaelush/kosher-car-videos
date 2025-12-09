// js/app.js
import { Utils, CONFIG } from './utils.js';
import { DataManager } from './data.js';

class App {
    constructor() {
        this.dataManager = new DataManager();
        this.currentView = 'home';
        this.currentCategory = null;
        this.visibleVideosCount = CONFIG.INITIAL_LOAD_COUNT;
        
        // אלמנטים ב-DOM לשימוש חוזר
        this.els = {
            preloader: document.getElementById('site-preloader'),
            appContainer: document.getElementById('app-container'),
            views: {
                home: document.getElementById('view-home'),
                category: document.getElementById('view-category'),
                video: document.getElementById('view-video'),
                channels: document.getElementById('view-channels'),
                about: document.getElementById('view-about')
            },
            mobileMenu: document.getElementById('mobile-menu'),
            mobileBackdrop: document.getElementById('mobile-menu-backdrop'),
            scrollBtn: document.getElementById('back-to-top-btn')
        };

        this.init();
    }

    async init() {
        try {
            await this.dataManager.init();
            
            // הסתרת מסך טעינה
            this.els.preloader.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => this.els.preloader.style.display = 'none', 500);

            // אתחול אירועים גלובליים
            this.setupGlobalEvents();
            
            // טיפול בניווט ראשוני (למשל אם המשתמש הגיע מקישור ישיר)
            this.handleHashChange();

        } catch (error) {
            console.error(error);
            this.els.preloader.innerHTML = '<p class="text-red-500">אירעה שגיאה בטעינת האתר. אנא רענן.</p>';
        }
    }

    /* --- ROUTING --- */
    
    handleHashChange() {
        const hash = window.location.hash.slice(1) || '/';
        const parts = hash.split('/');
        const route = parts[1] || 'home'; // ברירת מחדל home
        const param = parts[2];

        // הסתרת כל התצוגות
        Object.values(this.els.views).forEach(el => el.classList.add('hidden'));
        
        // סגירת תפריט מובייל במעבר דף
        this.closeMobileMenu();
        Utils.scrollTop();

        switch (route) {
            case 'home':
                this.renderHome();
                break;
            case 'categories': // מציג את כל הקטגוריות (בדומה לדף הבית אבל ממוקד)
            case 'all-videos': // מציג את כל הסרטונים כרשימה
                this.renderCategoryPage('all');
                break;
            case 'category':
                this.renderCategoryPage(param);
                break;
            case 'video':
                this.renderVideoPage(param);
                break;
            case 'channels':
                this.renderChannelsPage();
                break;
            case 'about':
                this.renderAboutPage();
                break;
            default:
                this.renderHome();
        }
    }

    /* --- RENDERING --- */

    renderHome() {
        this.els.views.home.classList.remove('hidden');
        
        // עדכון סטטיסטיקה בהירו
        const statsEl = document.getElementById('hero-stats');
        if (statsEl) statsEl.textContent = `במאגר יש כרגע ${this.dataManager.videos.length} סרטונים.`;

        // רינדור קטגוריות בדף הבית
        const catGrid = document.getElementById('home-categories-grid');
        if (catGrid && !catGrid.innerHTML.trim()) { // רנדר רק פעם אחת
            catGrid.innerHTML = CONFIG.CATEGORY_FILES.slice(0, 8).map(catKey => {
                const meta = CONFIG.CATEGORY_META[catKey];
                const count = this.dataManager.videos.filter(v => v.category === catKey).length;
                return `
                    <a href="#/category/${catKey}" class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 transition-all hover:-translate-y-1 group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                <i class="fas fa-${meta.icon}"></i>
                            </div>
                            <span class="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">${count}</span>
                        </div>
                        <h3 class="font-bold text-lg text-slate-800 dark:text-white mb-1">${meta.name}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">${meta.desc}</p>
                    </a>
                `;
            }).join('');
        }

        // רינדור סרטונים אחרונים
        const videoGrid = document.getElementById('home-videos-grid');
        if (videoGrid) {
            const latestVideos = this.dataManager.getVideos({ sort: 'newest' }).slice(0, 8);
            videoGrid.innerHTML = latestVideos.map(v => this.createVideoCard(v)).join('');
        }
    }

    renderCategoryPage(categoryKey) {
        this.els.views.category.classList.remove('hidden');
        this.currentCategory = categoryKey;
        this.visibleVideosCount = CONFIG.INITIAL_LOAD_COUNT;

        // עדכון כותרת ותיאור
        const titleEl = document.getElementById('category-title');
        const descEl = document.getElementById('category-desc');
        const breadcrumbEl = document.getElementById('breadcrumb-current');
        const meta = CONFIG.CATEGORY_META[categoryKey];

        if (categoryKey === 'all') {
            titleEl.textContent = 'כל הסרטונים';
            descEl.textContent = 'רשימת כל הסרטונים הזמינים במאגר, מכל הקטגוריות.';
            breadcrumbEl.textContent = 'כל הסרטונים';
        } else if (meta) {
            titleEl.textContent = meta.name;
            descEl.textContent = meta.desc;
            breadcrumbEl.textContent = meta.name;
        }

        // איפוס שדה חיפוש
        document.getElementById('category-search').value = '';
        
        this.updateVideoGrid();
    }

    updateVideoGrid(searchTerm = '') {
        const grid = document.getElementById('category-videos-grid');
        const countEl = document.getElementById('category-count');
        const loadMoreBtn = document.getElementById('load-more-container');

        let videos = this.dataManager.getVideos({ 
            category: this.currentCategory,
            search: searchTerm,
            sort: 'newest'
        });

        countEl.textContent = videos.length;

        if (videos.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500"><i class="fas fa-search fa-3x mb-4 opacity-50"></i><p>לא נמצאו סרטונים תואמים.</p></div>`;
            loadMoreBtn.classList.add('hidden');
            return;
        }

        // חיתוך לכמות המוצגת
        const videosToShow = videos.slice(0, this.visibleVideosCount);
        grid.innerHTML = videosToShow.map(v => this.createVideoCard(v)).join('');

        // טיפול בכפתור "טען עוד"
        if (videos.length > this.visibleVideosCount) {
            loadMoreBtn.classList.remove('hidden');
            loadMoreBtn.onclick = () => {
                this.visibleVideosCount += CONFIG.LOAD_MORE_COUNT;
                this.updateVideoGrid(searchTerm); // רינדור מחדש עם יותר סרטונים
            };
        } else {
            loadMoreBtn.classList.add('hidden');
        }
    }

    renderVideoPage(videoId) {
        const video = this.dataManager.getVideoById(videoId);
        if (!video) {
            Swal.fire('שגיאה', 'הסרטון לא נמצא', 'error').then(() => window.history.back());
            return;
        }

        this.els.views.video.classList.remove('hidden');

        // עדכון פרטי הסרטון
        document.getElementById('video-page-title').textContent = video.title;
        document.getElementById('video-description').textContent = video.content || 'אין תיאור נוסף לסרטון זה.';
        document.getElementById('video-channel-name').textContent = video.channel;
        document.getElementById('video-channel-img').src = video.channelImage || 'data/assets/images/logo.png';
        document.getElementById('video-date').textContent = Utils.formatDate(video.dateAdded);
        
        // תגיות
        const tagsContainer = document.getElementById('video-tags-container');
        if (video.tags) {
            tagsContainer.innerHTML = video.tags.map(tag => 
                `<span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded cursor-pointer hover:text-purple-600">#${tag}</span>`
            ).join('');
        }

        // נגן
        const player = document.getElementById('video-player-iframe');
        player.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;

        // כפתור שיתוף
        document.getElementById('share-video-btn').onclick = () => {
            navigator.clipboard.writeText(window.location.href);
            Swal.fire({
                icon: 'success',
                title: 'הקישור הועתק!',
                toast: true,
                position: 'bottom-start',
                showConfirmButton: false,
                timer: 1500
            });
        };

        // סרטונים קשורים
        const related = this.dataManager.getRelatedVideos(video);
        const relatedContainer = document.getElementById('related-videos-container');
        relatedContainer.innerHTML = related.map(v => `
            <a href="#/video/${v.id}" class="flex gap-3 group bg-white dark:bg-slate-800 p-2 rounded-lg hover:shadow-md transition-all">
                <div class="relative w-32 flex-shrink-0 aspect-video rounded overflow-hidden">
                    <img src="${Utils.getThumbnail(v.id)}" class="w-full h-full object-cover" loading="lazy">
                    <span class="absolute bottom-1 left-1 bg-black/80 text-white text-[10px] px-1 rounded">${v.duration}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-slate-800 dark:text-white line-clamp-2 group-hover:text-purple-600 transition-colors">${v.title}</h4>
                    <p class="text-xs text-slate-500 mt-1">${v.channel}</p>
                </div>
            </a>
        `).join('');
    }

    renderChannelsPage() {
        this.els.views.channels.classList.remove('hidden');
        const grid = document.getElementById('channels-grid');
        
        if (!grid.innerHTML.trim()) {
            grid.innerHTML = this.dataManager.channels.map(c => `
                <a href="${c.channel_url}" target="_blank" class="block bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700 transition-all hover:-translate-y-1">
                    <div class="flex items-center gap-4 mb-4">
                        <img src="${c.channel_image_url}" class="w-14 h-14 rounded-full shadow-md object-cover" alt="${c.channel_name}" onerror="this.src='data/assets/images/logo.png'">
                        <div class="text-right flex-1">
                            <h3 class="font-bold text-lg text-slate-900 dark:text-white">${c.channel_name}</h3>
                            <div class="text-xs text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full inline-block mt-1">ערוץ מומלץ</div>
                        </div>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">${c.content_description}</p>
                </a>
            `).join('');
        }
    }

    renderAboutPage() {
        this.els.views.about.classList.remove('hidden');
    }

    /* --- HELPERS --- */

    createVideoCard(video) {
        const template = document.getElementById('video-card-template');
        const clone = template.content.cloneNode(true);
        const meta = CONFIG.CATEGORY_META[video.category] || { name: video.category };

        const link = clone.querySelector('.video-link');
        link.href = `#/video/${video.id}`;
        
        clone.querySelector('.video-thumb').src = Utils.getThumbnail(video.id);
        clone.querySelector('.video-duration').textContent = video.duration;
        clone.querySelector('.category-badge').textContent = meta.name;
        clone.querySelector('.date-badge').textContent = Utils.formatDate(video.dateAdded);
        
        const titleLink = clone.querySelector('.video-link-text');
        titleLink.textContent = video.title;
        titleLink.href = `#/video/${video.id}`;
        
        clone.querySelector('.channel-img').src = video.channelImage || 'data/assets/images/logo.png';
        clone.querySelector('.channel-name').textContent = video.channel;

        // החזרת ה-HTML כמחרוזת (דרך קצת עקומה אבל עובדת עם ה-map למעלה)
        const div = document.createElement('div');
        div.appendChild(clone);
        return div.innerHTML;
    }

    setupGlobalEvents() {
        // Hash Change Listener
        window.addEventListener('hashchange', () => this.handleHashChange());

        // Mobile Menu Toggles
        document.getElementById('open-menu-btn').onclick = () => this.openMobileMenu();
        document.getElementById('close-menu-btn').onclick = () => this.closeMobileMenu();
        this.els.mobileBackdrop.onclick = () => this.closeMobileMenu();

        // Theme Toggle
        document.getElementById('theme-toggle-btn').onclick = () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        // Scroll to Top
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                this.els.scrollBtn.classList.remove('opacity-0', 'translate-y-10');
            } else {
                this.els.scrollBtn.classList.add('opacity-0', 'translate-y-10');
            }
        });
        this.els.scrollBtn.onclick = Utils.scrollTop;

        // Search Input (Global & Category)
        const setupSearch = (inputId, callback) => {
            const input = document.getElementById(inputId);
            if (input) input.addEventListener('input', Utils.debounce(callback, 300));
        };

        setupSearch('global-search-input', (e) => this.handleGlobalSearch(e.target.value));
        setupSearch('category-search', (e) => this.updateVideoGrid(e.target.value));
    }

    handleGlobalSearch(term) {
        const suggestionsBox = document.getElementById('search-suggestions');
        if (term.length < 2) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        const results = this.dataManager.getVideos({ search: term }).slice(0, 5);
        if (results.length > 0) {
            suggestionsBox.innerHTML = results.map(v => `
                <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0" 
                     onclick="window.location.hash='#/video/${v.id}'; document.getElementById('global-search-input').value=''; document.getElementById('search-suggestions').classList.add('hidden');">
                    <img src="${Utils.getThumbnail(v.id)}" class="w-16 h-9 object-cover rounded">
                    <div class="min-w-0">
                        <div class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">${v.title}</div>
                        <div class="text-xs text-slate-500">${v.channel}</div>
                    </div>
                </div>
            `).join('');
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.innerHTML = '<div class="p-4 text-center text-sm text-slate-500">לא נמצאו תוצאות</div>';
            suggestionsBox.classList.remove('hidden');
        }
    }

    openMobileMenu() {
        this.els.mobileMenu.classList.remove('translate-x-full');
        this.els.mobileBackdrop.classList.remove('hidden');
    }

    closeMobileMenu() {
        this.els.mobileMenu.classList.add('translate-x-full');
        this.els.mobileBackdrop.classList.add('hidden');
    }
}

// הפעלת האפליקציה
new App();

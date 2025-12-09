// js/data.js
import { CONFIG } from './utils.js';

export class DataManager {
    constructor() {
        this.videos = [];
        this.channels = [];
        this.fuse = null; // מנוע חיפוש מהיר
        this.isLoaded = false;
    }

    async init() {
        if (this.isLoaded) return;

        // בדיקת Cache ב-localStorage
        const cachedData = localStorage.getItem('cartiv_videos_cache_v2');
        const cachedTime = localStorage.getItem('cartiv_cache_time_v2');
        const CACHE_DURATION = 1000 * 60 * 60; // שעה אחת

        if (cachedData && cachedTime && (Date.now() - cachedTime < CACHE_DURATION)) {
            try {
                this.videos = JSON.parse(cachedData);
                this.loadChannels(); // טעינת ערוצים במקביל (פחות קריטי)
                this.initSearch();
                this.isLoaded = true;
                console.log('Loaded from cache');
                return;
            } catch (e) {
                console.warn('Cache corrupted, reloading...');
                localStorage.removeItem('cartiv_videos_cache_v2');
            }
        }

        // טעינה מהרשת אם אין Cache
        try {
            const promises = CONFIG.CATEGORY_FILES.map(filename => 
                fetch(`data/videos/${filename}.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Failed to load ${filename}`);
                        return res.json();
                    })
                    .then(data => {
                        const list = Array.isArray(data) ? data : (data.videos || []);
                        // הוספת שדה קטגוריה לכל סרטון
                        return list.map(v => ({ ...v, category: filename }));
                    })
                    .catch(err => {
                        console.error(err);
                        return [];
                    })
            );

            const results = await Promise.all(promises);
            this.videos = results.flat();

            // שמירה ל-Cache
            try {
                localStorage.setItem('cartiv_videos_cache_v2', JSON.stringify(this.videos));
                localStorage.setItem('cartiv_cache_time_v2', Date.now());
            } catch (e) { console.warn('Storage full'); }

            await this.loadChannels();
            this.initSearch();
            this.isLoaded = true;

        } catch (error) {
            console.error("Critical Data Load Error:", error);
            throw error;
        }
    }

    async loadChannels() {
        try {
            const res = await fetch('data/featured_channels.json');
            const data = await res.json();
            this.channels = Array.isArray(data) ? data : (data.channels || []);
        } catch (e) {
            console.error("Channels load error:", e);
            this.channels = [];
        }
    }

    initSearch() {
        if (window.Fuse) {
            this.fuse = new Fuse(this.videos, {
                keys: ['title', 'tags', 'channel'],
                threshold: 0.35,
                includeScore: true
            });
        }
    }

    getVideos(filter = {}) {
        let result = this.videos;

        // סינון לפי קטגוריה
        if (filter.category && filter.category !== 'all') {
            result = result.filter(v => v.category === filter.category);
        }

        // סינון לפי חיפוש טקסטואלי
        if (filter.search && this.fuse) {
            const fuseResults = this.fuse.search(filter.search);
            result = fuseResults.map(r => r.item);
        } else if (filter.search) {
            // Fallback אם Fuse לא נטען
            const term = filter.search.toLowerCase();
            result = result.filter(v => 
                v.title.toLowerCase().includes(term) || 
                (v.tags && v.tags.some(t => t.toLowerCase().includes(term)))
            );
        }

        // מיון
        if (filter.sort === 'newest') {
            result.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        } else if (filter.sort === 'oldest') {
            result.sort((a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
        }

        return result;
    }

    getVideoById(id) {
        return this.videos.find(v => v.id === id);
    }

    getRelatedVideos(currentVideo, limit = 5) {
        if (!currentVideo) return [];
        // לוגיקה בסיסית: מאותה קטגוריה, לא כולל הסרטון הנוכחי
        return this.videos
            .filter(v => v.category === currentVideo.category && v.id !== currentVideo.id)
            .sort(() => 0.5 - Math.random()) // ערבוב רנדומלי
            .slice(0, limit);
    }
}

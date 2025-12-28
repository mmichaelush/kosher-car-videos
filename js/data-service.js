// Handles fetching data, constants, and global state

// Global Application Namespace
window.App = window.App || {};

// Constants
window.App.CONSTANTS = {
    MAX_POPULAR_TAGS: 50,
    VIDEOS_TO_SHOW_INITIALLY: 30,
    VIDEOS_TO_LOAD_MORE: 15,
    MIN_SEARCH_TERM_LENGTH: 2,
    MAX_SUGGESTIONS: 7,
    FUSE_OPTIONS: {
        keys: [
            { name: 'title', weight: 0.4 },
            { name: 'content', weight: 0.3 },
            { name: 'tags', weight: 0.2 },
            { name: 'channel', weight: 0.1 }
        ],
        includeScore: true,
        includeMatches: true,
        threshold: 0.3,
        minMatchCharLength: 2,
        ignoreLocation: true
    },
    FUSE_LOOSE_OPTIONS: {
        keys: [
            { name: 'title', weight: 0.4 },
            { name: 'content', weight: 0.3 },
            { name: 'tags', weight: 0.2 },
            { name: 'channel', weight: 0.1 }
        ],
        includeScore: true,
        threshold: 0.6,
        ignoreLocation: true
    },
    CATEGORY_FILES: [
        'collectors',
        'diy',
        'maintenance',
        'review',
        'systems',
        'troubleshooting',
        'upgrades',
        'driving',
        'safety',
        'offroad',
    ],
    PREDEFINED_CATEGORIES: [
        { id: "all", name: "הכל", description: "כל הסרטונים באתר", icon: "film" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "tools", gradient: "from-emerald-500 to-green-600", darkGradient: "dark:from-emerald-600 dark:to-green-700" },
        { id: "troubleshooting", name: "איתור ותיקון תקלות", description: "אבחון ופתרון בעיות", icon: "microscope", gradient: "from-orange-500 to-amber-600", darkGradient: "dark:from-orange-600 dark:to-amber-700" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "oil-can", gradient: "from-blue-600 to-indigo-700", darkGradient: "dark:from-blue-700 dark:to-indigo-800" },
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "magnifying-glass-chart", gradient: "from-purple-600 to-violet-700", darkGradient: "dark:from-purple-700 dark:to-violet-800" },
        { id: "safety", name: "מבחני בטיחות", description: "מבחני ריסוק וציוני בטיחות", icon: "shield-halved", gradient: "from-red-600 to-rose-700", darkGradient: "dark:from-red-700 dark:to-rose-800" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "rocket", gradient: "from-fuchsia-600 to-pink-700", darkGradient: "dark:from-fuchsia-700 dark:to-pink-800" },
        { id: "offroad", name: "שטח ו-4X4", description: "טיולים, עבירות וחילוצים", icon: "mountain", gradient: "from-yellow-600 to-orange-800", darkGradient: "dark:from-yellow-700 dark:to-orange-900" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "cogs", gradient: "from-cyan-600 to-sky-700", darkGradient: "dark:from-cyan-700 dark:to-sky-800" },
        { id: "collectors", name: "רכבי אספנות", description: "רכבים נוסטלגיים שחזרו לכביש", icon: "car-side", gradient: "from-amber-400 to-yellow-600", darkGradient: "dark:from-amber-500 dark:to-yellow-700" },
        { id: "driving", name: "נהיגה נכונה", description: "טיפים לנהיגה בכביש ובשטח", icon: "road", gradient: "from-teal-500 to-emerald-600", darkGradient: "dark:from-teal-600 dark:to-emerald-700" }
    ]
};

// Global State
window.App.state = {
    allVideos: [],
    allVideosCache: null,
    fuse: null,
    looseFuse: null,
    currentFilters: {
        category: 'all',
        tags: [],
        searchTerm: '',
        hebrewOnly: false,
        sortBy: 'date-desc'
    },
    ui: {
        currentlyDisplayedVideosCount: 0,
        lastFocusedElement: null,
        throttleTimer: false
    },
    search: {
        activeSuggestionIndex: -1,
        currentInput: null,
        currentSuggestionsContainer: null,
        isSuggestionClicked: false
    },
    tagsCache: {}
};

// Data Fetching Functions
window.App.DataService = {
    getThumbnailUrl: (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

    parseDurationToSeconds: (durationStr) => {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        const parts = durationStr.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 1) return parts[0];
        return 0;
    },

    parseDate: (dateString) => {
        if (!dateString) return null;
        if (!isNaN(dateString) && !dateString.includes('/') && !dateString.includes('-')) {
             return new Date((dateString - (25567 + 2)) * 86400 * 1000);
        }
        if (typeof dateString === 'string') {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; 
                const year = parseInt(parts[2], 10);
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                     const d = new Date(year, month, day);
                     if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
                         return d;
                     }
                }
            }
        }
        const d = new Date(dateString);
        if (!isNaN(d.getTime())) {
            return d;
        }
        return null;
    },

    fetchVideosFromFile: async (filename) => {
        const filePath = `data/videos/${filename}.json`;
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                 console.warn(`File not found or network error: ${filePath}`);
                 return [];
            }
            
            // שיפור: טיפול פרטני בשגיאות JSON
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error(`%c שגיאת תחביר בקובץ JSON! `, 'background: #ef4444; color: #fff; font-size: 14px; padding: 4px; border-radius: 4px;');
                console.error(`הקובץ הבעייתי: %c${filePath}`, 'font-weight: bold; color: #facc15;');
                console.error(`פרטי השגיאה:`, jsonError.message);
                return []; // החזרת מערך ריק כדי לא לשבור את שאר האתר
            }

            let videosArray = [];
            if (Array.isArray(data)) {
                videosArray = data;
            } else if (data && Array.isArray(data.videos)) {
                videosArray = data.videos;
            }
            return videosArray.map(video => ({
                ...video,
                thumbnail: window.App.DataService.getThumbnailUrl(video.id),
                category: video.category || filename,
                tags: (video.tags || []).map(tag => String(tag).toLowerCase()),
                durationInSeconds: window.App.DataService.parseDurationToSeconds(video.duration),
                dateAdded: window.App.DataService.parseDate(video.dateAdded)
            }));
        } catch (e) {
            console.error(`General error loading ${filename}:`, e);
            return [];
        }
    },

    loadVideos: async () => {
        try {
            const promises = window.App.CONSTANTS.CATEGORY_FILES.map(file => window.App.DataService.fetchVideosFromFile(file));
            const results = await Promise.all(promises);
            window.App.state.allVideos = results.flat();
            window.App.state.allVideosCache = window.App.state.allVideos;
            
            const allTags = new Set();
            window.App.state.allVideos.forEach(v => {
                if(v.tags) v.tags.forEach(t => allTags.add(t));
            });
            window.App.state.tagsCache['all'] = Array.from(allTags);

            const videoCountHero = document.getElementById('video-count-hero');
            if (videoCountHero) {
                const countSpan = videoCountHero.querySelector('span');
                if (countSpan) countSpan.textContent = window.App.state.allVideos.length;
            }
        } catch (error) {
            console.error("Critical error loading videos:", error);
            window.App.state.allVideos = [];
        }
    },

    loadFeaturedChannels: async () => {
        try {
            const response = await fetch('data/featured_channels.json');
            if (!response.ok) return [];
            const data = await response.json();
            if(Array.isArray(data)) return data;
            if(data && Array.isArray(data.channels)) return data.channels;
            return [];
        } catch (e) {
            console.error("Error loading featured channels:", e);
            return [];
        }
    }
};

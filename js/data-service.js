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
            { name: 'title', weight: 0.6 },
            { name: 'tags', weight: 0.3 },
            { name: 'channel', weight: 0.1 },
            { name: 'content', weight: 0.1 }
        ],
        includeScore: true,
        includeMatches: true,
        threshold: 0.4,
        minMatchCharLength: 2,
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
        { id: "review", name: "סקירות רכב", description: "מבחנים והשוואות", icon: "magnifying-glass-chart", gradient: "from-purple-500 to-indigo-600", darkGradient: "dark:from-purple-600 dark:to-indigo-700" },
        { id: "safety", name: "מבחני בטיחות", description: "מבחני ריסוק וציוני בטיחות", icon: "shield-halved", gradient: "from-red-500 to-rose-600", darkGradient: "dark:from-red-600 dark:to-rose-700" },
        { id: "offroad", name: "שטח ו-4X4", description: "טיולים, עבירות וחילוצים", icon: "mountain", gradient: "from-amber-600 to-orange-700", darkGradient: "dark:from-amber-700 dark:to-orange-800" },
        { id: "maintenance", name: "טיפולים", description: "תחזוקה שוטפת ומניעתית", icon: "oil-can", gradient: "from-blue-500 to-cyan-600", darkGradient: "dark:from-blue-600 dark:to-cyan-700" },
        { id: "diy", name: "עשה זאת בעצמך", description: "מדריכי תיקונים ותחזוקה", icon: "tools", gradient: "from-green-500 to-teal-600", darkGradient: "dark:from-green-600 dark:to-teal-700" },
        { id: "troubleshooting", name: "איתור ותיקון תקלות", description: "אבחון ופתרון בעיות", icon: "microscope", gradient: "from-lime-400 to-yellow-500", darkGradient: "dark:from-lime-500 dark:to-yellow-600" },
        { id: "driving", name: "נהיגה נכונה", description: "טיפים לנהיגה בכביש ובשטח", icon: "road", gradient: "from-teal-500 to-emerald-600", darkGradient: "dark:from-teal-600 dark:to-emerald-700" },
        { id: "upgrades", name: "שיפורים ושדרוגים", description: "שדרוג הרכב והוספת אביזרים", icon: "rocket", gradient: "from-orange-500 to-red-600", darkGradient: "dark:from-orange-600 dark:to-red-700" },
        { id: "systems", name: "מערכות הרכב", description: "הסברים על מכלולים וטכנולוגיות", icon: "cogs", gradient: "from-yellow-500 to-amber-600", darkGradient: "dark:from-yellow-600 dark:to-amber-700" },
        { id: "collectors", name: "רכבי אספנות", description: "רכבים נוסטלגיים שחזרו לכביש", icon: "car-side", gradient: "from-red-500 to-pink-600", darkGradient: "dark:from-red-600 dark:to-pink-700" }
    ]
};

// Global State
window.App.state = {
    allVideos: [],
    allVideosCache: null,
    fuse: null,
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
    }
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

    // Robust Date Parser
    parseDate: (dateString) => {
        if (!dateString) return null;
        
        // Check for DD/MM/YYYY format
        const parts = dateString.split('/');
        if (parts.length === 3) {
            // Assume Day/Month/Year first
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Months are 0-11
            const year = parseInt(parts[2], 10);
            
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                 const d = new Date(year, month, day);
                 if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
                     return d;
                 }
            }
        }

        // Try standard Date parsing
        const d = new Date(dateString);
        if (!isNaN(d.getTime())) {
            return d;
        }

        return null;
    },

    fetchVideosFromFile: async (filename) => {
        try {
            const response = await fetch(`data/videos/${filename}.json`);
            if (!response.ok) {
                 return [];
            }
            const data = await response.json();
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
            console.warn(`Could not load videos for category: ${filename}`, e);
            return [];
        }
    },

    loadVideos: async () => {
        try {
            const promises = window.App.CONSTANTS.CATEGORY_FILES.map(file => window.App.DataService.fetchVideosFromFile(file));
            const results = await Promise.all(promises);
            window.App.state.allVideos = results.flat();
            window.App.state.allVideosCache = window.App.state.allVideos;
            
            // Update hero count if exists
            const videoCountHero = document.getElementById('video-count-hero');
            if (videoCountHero) {
                const countSpan = videoCountHero.querySelector('span');
                if (countSpan) countSpan.textContent = window.App.state.allVideos.length;
            }
        } catch (error) {
            console.error("Error loading videos:", error);
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

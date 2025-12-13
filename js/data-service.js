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
                dateAdded: video.dateAdded ? new Date(video.dateAdded) : null
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


// js/utils.js

export const Utils = {
    // יצירת קישור לתמונה ממוזערת של יוטיוב באיכות בינונית (לטעינה מהירה)
    getThumbnail: (videoId) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,

    // המרת שניות לפורמט קריא (אם צריך) או החזרת המחרוזת המקורית
    formatDuration: (duration) => duration,

    // פירמוט תאריך לפורמט עברי מקומי
    formatDate: (dateInput) => {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    },

    // פונקציית Debounce למניעת קריאות מרובות בחיפוש
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // גלילה לראש העמוד בצורה חלקה
    scrollTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),

    // פונקציה לבדיקה אם המכשיר הוא מובייל
    isMobile: () => window.innerWidth < 768
};

// הגדרות קבועות לאפליקציה
export const CONFIG = {
    CATEGORY_FILES: [
        'collectors', 'diy', 'maintenance', 'review', 'systems', 
        'troubleshooting', 'upgrades', 'driving', 'safety', 'offroad'
    ],
    CATEGORY_META: {
        'review': { name: 'סקירות רכב', icon: 'car-on', color: 'from-purple-500 to-indigo-600', desc: 'מבחני דרכים, השוואות וסקירות עומק.' },
        'safety': { name: 'מבחני בטיחות', icon: 'shield-halved', color: 'from-red-500 to-rose-600', desc: 'מבחני ריסוק רשמיים וציוני בטיחות.' },
        'offroad': { name: 'שטח ו-4X4', icon: 'mountain', color: 'from-amber-600 to-orange-700', desc: 'טיולים, עבירות וחילוצים בשטח.' },
        'maintenance': { name: 'טיפולים', icon: 'oil-can', color: 'from-blue-500 to-cyan-600', desc: 'מדריכים לתחזוקה שוטפת ומניעתית.' },
        'diy': { name: 'עשה זאת בעצמך', icon: 'tools', color: 'from-green-500 to-teal-600', desc: 'מדריכי תיקונים לביצוע עצמי בבית.' },
        'troubleshooting': { name: 'איתור תקלות', icon: 'microscope', color: 'from-lime-500 to-green-600', desc: 'דיאגנוסטיקה, אבחון ופתרון בעיות.' },
        'driving': { name: 'נהיגה נכונה', icon: 'road', color: 'from-teal-500 to-emerald-600', desc: 'טיפים לנהיגה בטוחה, חסכונית ומתקדמת.' },
        'upgrades': { name: 'שיפורים', icon: 'rocket', color: 'from-orange-500 to-red-600', desc: 'שדרוגים, אביזרים ותוספות לרכב.' },
        'systems': { name: 'מערכות הרכב', icon: 'cogs', color: 'from-yellow-500 to-amber-600', desc: 'הסברים טכניים על איך דברים עובדים.' },
        'collectors': { name: 'אספנות', icon: 'car-side', color: 'from-pink-500 to-rose-600', desc: 'רכבים קלאסיים, נוסטלגיה ושחזורים.' }
    },
    INITIAL_LOAD_COUNT: 24, // כמה סרטונים לטעון בהתחלה
    LOAD_MORE_COUNT: 12     // כמה לטעון בכל לחיצה על "טען עוד"
};

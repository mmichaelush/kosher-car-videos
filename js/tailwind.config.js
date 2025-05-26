/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // קריטי למצב כהה מבוסס קלאס
  content: [
    "./*.html",        // סורק קבצי HTML בתיקייה הראשית
    "./js/**/*.js",   // סורק קבצי JS בתיקיית js
  ],
  theme: {
    extend: {
      colors: {
        'sky-custom-light': '#f7fcff', // הצבע המותאם אישית שלך לרקע ה-header
        // תוכל להוסיף כאן עוד צבעים מותאמים אישית אם תרצה
      },
      fontFamily: { // אם אתה רוצה שהפונט 'Rubik' יוגדר דרך Tailwind
        rubik: ['Rubik', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

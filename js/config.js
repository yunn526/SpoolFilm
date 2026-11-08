// SpoolFilm 設定：請依 README 的步驟，把 Firebase 主控台給你的值貼進來。
// 這些值本來就會出現在前端，不是祕密；資料安全由 firestore.rules 決定。
window.SPOOL_CONFIG = {
  FIREBASE: {
    apiKey: 'AIzaSyDqGHc9slQHgOZaD9uKV-QnhPpg_ZGO3Nw',
    authDomain: 'spoolfilm.firebaseapp.com',
    projectId: 'spoolfilm',
    appId: '1:940493287504:web:e744be672843e71ea62155'
  },
  // 選填：Google Drive 雲端同步用的「網頁應用程式」OAuth 用戶端 ID（同一個 Google Cloud 專案）。留空則隱藏雲端同步。
  GOOGLE_CLIENT_ID: '230306416675-khh8tajhg0kb8h63ahvbsqsbgprj1hga.apps.googleusercontent.com'
};

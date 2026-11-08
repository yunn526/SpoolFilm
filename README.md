# SpoolFilm

12 台原創底片相機的網頁 App（PWA，可加到主畫面）。登入方式：Google、Email（Apple 登入需付費開發者帳號，目前未提供）。後端是 Firebase（Authentication + Firestore）。

照片只在使用者裝置上處理與保存；只有使用者主動按「同步到 Google Drive」時，才會直接傳到他自己的 Drive（`drive.file` 權限）。

## 檔案

- `index.html` / `admin.html`：App 與管理員後台
- `js/config.js`：**你要填的 Firebase 設定**
- `firebase/firestore.rules`：資料庫安全規則（必須部署）
- `privacy.html` / `terms.html`：隱私權政策與服務條款

## 設定步驟（一次性）

### 1. 建立 Firebase 專案
1. 到 https://console.firebase.google.com 建立專案（不需要 Analytics）。
2. 專案設定 → 一般 → 「你的應用程式」→ 新增 **網頁應用程式**，把給你的 `apiKey`、`authDomain`、`projectId`、`appId` 貼進 `js/config.js` 的 `FIREBASE`。
   這些值本來就會公開在前端，不是祕密，安全靠第 3 步的規則。

### 2. 啟用登入方式（Build → Authentication → Sign-in method）
- **Email/Password**：啟用。
- **Google**：啟用，並填入專案支援信箱。
- Authentication → Settings → **已授權網域**：加入你放網站的網域（例如 `yunn526.github.io`）。

### 3. 建立 Firestore 並部署規則
1. Build → Firestore Database → 建立資料庫（正式模式）。
2. 規則 → 把 `firebase/firestore.rules` 整份貼上 → 發布。
   （或用 Firebase CLI：`firebase deploy --only firestore:rules`）
3. 這份規則保證：使用者只能讀寫自己的資料、不能自己改成 PRO、不能偽造別人的紀錄。

### 4. 設定管理員
Firestore → 新增集合 `admins` → 文件 ID 填你的 **Email（小寫）**，欄位隨便放一個（例如 `ok: true`）。
這個集合前端無法寫入，只能在主控台建立。之後用該 Email 登入 `admin.html` 即可核發 PRO。

### 5.（選填）Google Drive 雲端同步
1. Google Cloud Console（和 Firebase 同一個專案）→ API 與服務 → 啟用 **Google Drive API**。
2. 憑證 → 建立 **OAuth 用戶端 ID**，類型選「網頁應用程式」，「已授權的 JavaScript 來源」加入你的網站網址（例如 `https://yunn526.github.io`）。
3. 把用戶端 ID 貼進 `js/config.js` 的 `GOOGLE_CLIENT_ID`。留空則「雲端同步」會提示尚未設定。
4. OAuth 同意畫面：應用程式名稱 `SpoolFilm`、首頁填網站網址、隱私權政策填 `…/privacy.html`、服務條款填 `…/terms.html`、已授權網域填你的網域。只用 `drive.file`（非敏感範圍），通常可直接發布，不需要完整的敏感範圍審查；但仍需在 Search Console 驗證網站所有權。

### 6. 上線
把整個資料夾放到 GitHub Pages（或 Firebase Hosting，免費）。Google 登入彈出視窗在 iPhone「加到主畫面」的獨立模式下可能被擋，App 會自動改用導向登入；若遇到問題，建議改放 Firebase Hosting 並使用它的網域當 `authDomain`。

## 方案與安全

- FREE：9 款濾鏡、6 台相機、最長邊 1280px、含浮水印。
- PRO：16 款濾鏡、12 台相機、原始解析度、無浮水印。目前由管理員在 `admin.html` 手動核發。
- 沒有 Cloud Functions（避免需要付費方案），因此 PRO 的功能開關由前端判斷、方案欄位由規則保護：使用者改不了自己的方案，但技術上懂的人可以改前端程式來略過本機的 PRO 限制（例如使用 PRO 濾鏡），並不會取得 PRO 方案或影響他人。若之後要真正收費，請改用 Cloud Functions 做伺服器端檢查與金流。

## 功能

- 12 台原創相機：奶油 CCD、夏日一次性、街角 35、薄荷公園、黃昏 FM、海邊正午（FREE）；夜行霓虹、舊相簿 98、便利店夜晚、櫻花日記、玫瑰即影、電影夜班（PRO）。
- 日期戳記、漏光、色溫、魚眼（WebGL）、雙重曝光、匯入相簿照片。
- 下載比例：原比例、IG 1:1、IG 4:5、小紅書 3:4、限動／Reels 9:16。
- 帳號：Google／Email 登入（Email 需驗證）、忘記密碼、App 內刪除帳號。
- 未實作：短片拍攝、閃光燈。

## 從舊版（Yunn Camera）升級

舊的 Apps Script 後端（`backend/Code.gs`）已移除，不再使用。舊版的使用者與方案資料不會自動搬移；需要的話請在 `admin.html` 重新核發 PRO。

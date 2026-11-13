/* SpoolFilm sign-in (Google / Email via Firebase Auth) and data access (Firestore).
 * 權限一律由 Firestore 安全規則（firestore.rules）決定，前端只負責顯示。
 * Firebase SDK 在需要時才從 gstatic 動態載入，避免拖慢首頁。 */
(function () {
  'use strict';
  var cfg = window.SPOOL_CONFIG || {};
  var fbCfg = cfg.FIREBASE || {};
  var BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var state = { user: null, ready: false, listeners: [] };
  var fb = null, auth = null, db = null, mounted = null, mode = 'signin', busy = false;
  var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var drive = { token: null, exp: 0 };

  function configured() { return !!(fbCfg.apiKey && fbCfg.projectId && fbCfg.appId); }
  function notify() { state.listeners.forEach(function (fn) { try { fn(state.user); } catch (e) { console.error(e); } }); }
  function nowIso() { return new Date().toISOString(); }

  var ERRORS = {
    'auth/invalid-credential': 'Email 或密碼不正確。',
    'auth/wrong-password': 'Email 或密碼不正確。',
    'auth/user-not-found': 'Email 或密碼不正確。',
    'auth/invalid-email': 'Email 格式不正確。',
    'auth/email-already-in-use': '這個 Email 已經註冊過了，請直接登入，或改用「忘記密碼」。',
    'auth/weak-password': '密碼至少需要 8 個字元。',
    'auth/too-many-requests': '嘗試次數太多，請稍後再試。',
    'auth/network-request-failed': '網路連線失敗，請確認網路後重試。',
    'auth/popup-closed-by-user': '登入視窗已關閉，尚未完成登入。',
    'auth/cancelled-popup-request': '登入視窗已關閉，尚未完成登入。',
    'auth/popup-blocked': '瀏覽器擋住了登入視窗，請允許彈出視窗後再試。',
    'auth/unauthorized-domain': '這個網址尚未加入 Firebase 的「已授權網域」，請見 README。',
    'auth/operation-not-allowed': '這種登入方式尚未在 Firebase 啟用，請見 README。',
    'auth/account-exists-with-different-credential': '這個 Email 已用其他方式註冊，請改用原本的登入方式。',
    'auth/requires-recent-login': '為了安全，請先登出再重新登入後，再執行這個動作。'
  };
  function explain(e) {
    var code = e && e.code ? String(e.code) : '';
    return ERRORS[code] || ('發生錯誤' + (code ? '（' + code + '）' : '') + '，請稍後再試。');
  }

  async function loadFirebase() {
    if (fb) return fb;
    var m = await Promise.all([
      import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')
    ]);
    fb = { app: m[0], auth: m[1], fs: m[2] };
    var app = fb.app.initializeApp(fbCfg);
    auth = fb.auth.getAuth(app);
    auth.useDeviceLanguage();
    db = fb.fs.getFirestore(app);
    return fb;
  }

  /* ---------- 方案與使用者資料 ---------- */
  function effectivePlan(plan, proUntil) {
    if (plan !== 'PRO') return 'FREE';
    if (!proUntil) return 'PRO';
    var t = new Date(proUntil).getTime();
    return (isNaN(t) || t > Date.now()) ? 'PRO' : 'FREE';
  }

  function userRef(email) { return fb.fs.doc(db, 'users', email); }

  async function ensureUser(u, isLogin) {
    var email = String(u.email).toLowerCase(), ref = userRef(email), fs = fb.fs;
    var snap = await fs.getDoc(ref), now = nowIso();
    var name = String(u.displayName || email.split('@')[0]).slice(0, 100);
    if (!snap.exists()) {
      await fs.setDoc(ref, { email: email, name: name, plan: 'FREE', proUntil: '', firstSeen: now, lastSeen: now,
        logins: 0, photos: 0, downloads: 0, syncs: 0, accountStatus: 'active' });
    }
    var d = (await fs.getDoc(ref)).data() || {};
    if (d.accountStatus && d.accountStatus !== 'active') {
      var blockedError = new Error('account_suspended'); blockedError.code = 'account-suspended'; throw blockedError;
    }
    var patch = { lastSeen: now, name: name };
    if (isLogin) patch.logins = fs.increment(1);
    await fs.updateDoc(ref, patch);
    d = (await fs.getDoc(ref)).data() || {};
    var isAdmin = false;
    try { isAdmin = (await fs.getDoc(fs.doc(db, 'admins', email))).exists(); } catch (e) { isAdmin = false; }
    return { email: email, name: d.name || name, plan: effectivePlan(d.plan, d.proUntil), isAdmin: isAdmin, uid: u.uid };
  }

  function counterFor(event) { return { photo: 'photos', download: 'downloads', cloud_sync: 'syncs' }[event]; }
  var PRO_ONLY = ['pro_filter', 'full_res'];

  async function logEvent(email, event, details) {
    var text = '';
    try { text = JSON.stringify(details || {}).slice(0, 300); } catch (e) { text = ''; }
    await fb.fs.addDoc(fb.fs.collection(db, 'events'), { time: nowIso(), email: email, event: event, details: text });
  }

  /** 與舊版後端相同形狀的 API，改由 Firestore 實作。 */
  async function api(action, payload) {
    payload = payload || {};
    if (!state.user || !fb) return { ok: false, error: 'auth' };
    var fs = fb.fs, email = state.user.email;
    try {
      if (action === 'me') {
        var d = await ensureUser(auth.currentUser, false);
        return { ok: true, email: d.email, name: d.name, plan: d.plan, isAdmin: d.isAdmin };
      }
      if (action === 'authorize') {
        var event = String(payload.event || '');
        var counter = counterFor(event);
        if (!counter) return { ok: false, error: 'bad_request' };
        var features = Array.isArray(payload.features) ? payload.features.slice(0, 5).map(String) : [];
        var cur = await ensureUser(auth.currentUser, false);
        var needsPro = features.some(function (f) { return PRO_ONLY.indexOf(f) !== -1; });
        if (needsPro && cur.plan !== 'PRO') {
          await logEvent(email, 'denied', { event: event, features: features });
          return { ok: true, allowed: false, plan: cur.plan, reason: 'pro_required' };
        }
        var inc = {}; inc[counter] = fs.increment(1);
        await fs.updateDoc(userRef(email), inc);
        var count = Math.max(0, Math.min(1000, Math.floor(Number(payload.count) || 0)));
        await logEvent(email, event, { filter: String(payload.filter || '').slice(0, 30), features: features, count: count });
        return { ok: true, allowed: true, plan: cur.plan };
      }
      if (action === 'submitFeedback') {
        var cats = ['雲端同步', '相機拍攝', '登入', '相簿／照片', '介面問題', '其他建議', 'Google 登入'];
        var category = String(payload.category || '').trim(), message = String(payload.message || '').trim();
        if (cats.indexOf(category) === -1 || !message || message.length > 1500) return { ok: false, error: 'bad_request' };
        var last = 0;
        try { last = Number(localStorage.getItem('sf_fb_last') || 0); } catch (e) {}
        if (Date.now() - last < 60000) return { ok: false, error: 'rate_limited' };
        await fs.addDoc(fs.collection(db, 'feedback'), { time: nowIso(), email: email, category: category, message: message, page: String(payload.page || '').slice(0, 40), status: 'pending' });
        try { localStorage.setItem('sf_fb_last', String(Date.now())); } catch (e) {}
        return { ok: true };
      }
      if (action === 'notifications') {
        var nq = await fs.getDocs(fs.query(fs.collection(db, 'notifications'), fs.where('email', '==', email), fs.limit(30)));
        var notices = []; nq.forEach(function (s) { var n = s.data(); notices.push({ id: s.id, title: n.title || 'SpoolFilm 通知', message: n.message || '', time: n.time || '', read: !!n.read }); }); notices.sort(function(a,b){return String(b.time).localeCompare(String(a.time));});
        return { ok: true, notifications: notices };
      }
      if (action === 'markNotificationRead') {
        var nid = String(payload.id || '');
        if (!/^[A-Za-z0-9_-]{1,150}$/.test(nid)) return { ok: false, error: 'bad_request' };
        await fs.updateDoc(fs.doc(db, 'notifications', nid), { read: true, readAt: nowIso() });
        return { ok: true };
      }
      if (action === 'adminSetAccountStatus') {
        if (!state.user.isAdmin) return { ok: false, error: 'forbidden' };
        var targetStatusEmail = String(payload.targetEmail || '').toLowerCase().trim();
        var accountStatus = String(payload.status || '');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(targetStatusEmail) || !['active','suspended','terminated'].includes(accountStatus)) return { ok: false, error: 'bad_request' };
        var statusRef = userRef(targetStatusEmail), statusSnap = await fs.getDoc(statusRef);
        if (!statusSnap.exists()) return { ok: false, error: 'not_found' };
        await fs.updateDoc(statusRef, { accountStatus: accountStatus, statusUpdatedAt: nowIso(), statusUpdatedBy: email });
        if (accountStatus !== 'active') {
          await fs.addDoc(fs.collection(db, 'notifications'), { email: targetStatusEmail, title: accountStatus === 'terminated' ? '帳號使用權限已終止' : '帳號暫停通知', message: accountStatus === 'terminated' ? '管理員已終止此帳號使用 SpoolFilm 的權限。如有疑問，請透過聯絡信箱與我們聯繫。' : '管理員已暫停此帳號使用 SpoolFilm 的權限。如有疑問，請透過聯絡信箱與我們聯繫。', time: nowIso(), read: false });
        }
        return { ok: true };
      }
      if (action === 'adminSendNotice') {
        if (!state.user.isAdmin) return { ok: false, error: 'forbidden' };
        var noticeEmail = String(payload.targetEmail || '').toLowerCase().trim();
        var noticeTitle = String(payload.title || '').trim(), noticeMessage = String(payload.message || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(noticeEmail) || !noticeTitle || noticeTitle.length > 80 || !noticeMessage || noticeMessage.length > 1200) return { ok: false, error: 'bad_request' };
        var noticeUser = await fs.getDoc(userRef(noticeEmail));
        if (!noticeUser.exists()) return { ok: false, error: 'not_found' };
        await fs.addDoc(fs.collection(db, 'notifications'), { email: noticeEmail, title: noticeTitle, message: noticeMessage, time: nowIso(), read: false });
        return { ok: true };
      }
      if (action === 'adminReplyFeedback') {
        if (!state.user.isAdmin) return { ok: false, error: 'forbidden' };
        var feedbackId = String(payload.id || ''), reply = String(payload.reply || '').trim();
        var feedbackStatus = String(payload.status || 'in_progress');
        if (!/^[A-Za-z0-9_-]{1,150}$/.test(feedbackId) || !reply || reply.length > 2000 || !['pending','in_progress','resolved'].includes(feedbackStatus)) return { ok: false, error: 'bad_request' };
        var feedbackRef = fs.doc(db, 'feedback', feedbackId), feedbackSnap = await fs.getDoc(feedbackRef);
        if (!feedbackSnap.exists()) return { ok: false, error: 'not_found' };
        var fbData = feedbackSnap.data();
        await fs.updateDoc(feedbackRef, { status: feedbackStatus, adminReply: reply, repliedAt: nowIso(), repliedBy: email });
        await fs.addDoc(fs.collection(db, 'notifications'), { email: fbData.email, title: '問題回報有新回覆', message: reply, time: nowIso(), read: false, feedbackId: feedbackId });
        // 若已安裝 Firebase Trigger Email 擴充功能，mail 集合會自動寄出 Email。
        await fs.addDoc(fs.collection(db, 'mail'), { to: fbData.email, message: { subject: 'SpoolFilm 問題回報處理通知', text: '感謝你回報 SpoolFilm 的問題／建議。\\n\\n管理員回覆：\\n' + reply + '\\n\\n你也可以登入 SpoolFilm，在「我的」查看應用程式內通知。' }, createdAt: nowIso() });
        return { ok: true };
      }
      if (action === 'adminStats') {
        if (!state.user.isAdmin) return { ok: false, error: 'forbidden' };
        var us = await fs.getDocs(fs.collection(db, 'users'));
        var totals = { users: 0, pro: 0, logins: 0, photos: 0, downloads: 0, syncs: 0 }, users = [];
        us.forEach(function (s) {
          var r = s.data(), plan = effectivePlan(r.plan, r.proUntil);
          totals.users++; if (plan === 'PRO') totals.pro++;
          totals.logins += Number(r.logins || 0); totals.photos += Number(r.photos || 0);
          totals.downloads += Number(r.downloads || 0); totals.syncs += Number(r.syncs || 0);
          users.push({ email: r.email || s.id, name: r.name || '', plan: plan, accountStatus: r.accountStatus || 'active', proUntil: r.proUntil || '', firstSeen: r.firstSeen || '',
            lastSeen: r.lastSeen || '', logins: Number(r.logins || 0), photos: Number(r.photos || 0),
            downloads: Number(r.downloads || 0), syncs: Number(r.syncs || 0) });
        });
        var ev = await fs.getDocs(fs.query(fs.collection(db, 'events'), fs.orderBy('time', 'desc'), fs.limit(100)));
        var recent = []; ev.forEach(function (s) { var r = s.data(); recent.push({ time: r.time, email: r.email, event: r.event, details: r.details }); });
        var fbq = await fs.getDocs(fs.query(fs.collection(db, 'feedback'), fs.orderBy('time', 'desc'), fs.limit(100)));
        var feedback = []; fbq.forEach(function (s) { var r = s.data(); feedback.push({ id: s.id, time: r.time, email: r.email, category: r.category, message: r.message, page: r.page, status: r.status || 'pending', adminReply: r.adminReply || '' }); });
        return { ok: true, totals: totals, users: users, recent: recent, feedback: feedback };
      }
      if (action === 'adminSetPlan') {
        if (!state.user.isAdmin) return { ok: false, error: 'forbidden' };
        var target = String(payload.targetEmail || '').toLowerCase().trim(), plan = String(payload.plan || ''), until = String(payload.proUntil || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target) || target.length > 200) return { ok: false, error: 'bad_request' };
        if (plan !== 'FREE' && plan !== 'PRO') return { ok: false, error: 'bad_request' };
        if (until && isNaN(new Date(until).getTime())) return { ok: false, error: 'bad_request' };
        if (plan === 'FREE') until = '';
        var tref = userRef(target), tsnap = await fs.getDoc(tref), t0 = nowIso();
        if (tsnap.exists()) await fs.updateDoc(tref, { plan: plan, proUntil: until });
        else await fs.setDoc(tref, { email: target, name: target.split('@')[0], plan: plan, proUntil: until, firstSeen: t0, lastSeen: t0, logins: 0, photos: 0, downloads: 0, syncs: 0 });
        return { ok: true };
      }
      return { ok: false, error: 'bad_action' };
    } catch (e) {
      var code = String(e && e.code || '');
      if (code === 'permission-denied') return { ok: false, error: 'forbidden' };
      if (code === 'unauthenticated') { return { ok: false, error: 'auth' }; }
      console.error('api error', action, e);
      return { ok: false, error: code || 'server_error' };
    }
  }

  /* ---------- Google Drive（drive.file，僅限本 App 建立的檔案；任何登入方式都可使用） ---------- */
  function loadGis() {
    return new Promise(function (resolve, reject) {
      if (window.google && google.accounts && google.accounts.oauth2) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { resolve(); }; s.onerror = function () { reject(new Error('gis')); };
      document.head.appendChild(s);
    });
  }

  function driveToken() {
    return new Promise(function (resolve, reject) {
      if (drive.token && Date.now() < drive.exp - 60000) { resolve(drive.token); return; }
      if (!cfg.GOOGLE_CLIENT_ID) { reject(new Error('no_client_id')); return; }
      loadGis().then(function () {
        var client = google.accounts.oauth2.initTokenClient({
          client_id: cfg.GOOGLE_CLIENT_ID,
          scope: DRIVE_SCOPE,
          callback: function (r) {
            if (r.error || !r.access_token) { reject(new Error(r.error || 'denied')); return; }
            drive.token = r.access_token; drive.exp = Date.now() + Number(r.expires_in || 3600) * 1000; resolve(drive.token);
          },
          error_callback: function (e) { reject(new Error((e && e.type) || 'popup')); }
        });
        client.requestAccessToken();
      }, function () { reject(new Error('gis')); });
    });
  }

  /* ---------- 登入動作 ---------- */
  function setMsg(text, ok) {
    var el = document.getElementById('loginMsg'); if (!el) return;
    el.textContent = text || ''; el.classList.toggle('ok', !!ok);
  }
  function setBusy(v) {
    busy = v;
    if (mounted) mounted.querySelectorAll('button, input').forEach(function (el) { el.disabled = v; });
  }

  async function oauthSignIn(kind) {
    if (busy) return;
    setMsg(''); setBusy(true);
    try {
      await loadFirebase();
      var provider = new fb.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try { await fb.auth.signInWithPopup(auth, provider); }
      catch (e) {
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
          await fb.auth.signInWithRedirect(auth, provider); return;
        }
        throw e;
      }
    } catch (e) { setMsg(explain(e)); }
    finally { setBusy(false); }
  }

  async function emailSubmit(ev) {
    ev.preventDefault();
    if (busy) return;
    var email = mounted.querySelector('[name=email]').value.trim();
    var pass = mounted.querySelector('[name=password]').value;
    var nick = (mounted.querySelector('[name=nickname]') || {}).value || '';
    setMsg(''); setBusy(true);
    try {
      await loadFirebase();
      var a = fb.auth;
      if (mode === 'reset') {
        await a.sendPasswordResetEmail(auth, email);
        setMsg('如果這個 Email 有註冊，重設密碼的信已經寄出，請到信箱查看。', true);
      } else if (mode === 'signup') {
        if (pass.length < 8) { setMsg(ERRORS['auth/weak-password']); return; }
        var cred = await a.createUserWithEmailAndPassword(auth, email, pass);
        if (nick.trim()) { try { await a.updateProfile(cred.user, { displayName: nick.trim().slice(0, 40) }); } catch (e) {} }
        await a.sendEmailVerification(cred.user);
        await a.signOut(auth);
        mode = 'signin'; renderForm();
        setMsg('驗證信已寄到 ' + email + '。請先點信中的連結完成驗證，再回來登入。', true);
      } else {
        var res = await a.signInWithEmailAndPassword(auth, email, pass);
        if (!res.user.emailVerified) {
          try { await a.sendEmailVerification(res.user); } catch (e) {}
          await a.signOut(auth);
          setMsg('這個 Email 還沒驗證。我們剛重新寄出驗證信，請點信中連結後再登入。');
        }
      }
    } catch (e) { setMsg(explain(e)); }
    finally { setBusy(false); }
  }

  /* ---------- 登入畫面 ---------- */
  var GOOGLE_SVG = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

  function renderForm() {
    var form = mounted.querySelector('.authform'); form.textContent = '';
    var title = { signin: '用 Email 登入', signup: '用 Email 註冊', reset: '重設密碼' }[mode];
    form.appendChild(el('div', 'authform-title', title));
    function field(name, type, label, ac) {
      var l = el('label', 'authfield'); l.appendChild(el('span', '', label));
      var i = document.createElement('input'); i.name = name; i.type = type; i.className = 'input'; i.required = name !== 'nickname';
      i.autocomplete = ac; if (name === 'password' && mode === 'signup') i.minLength = 8; if (name === 'nickname') i.maxLength = 40;
      l.appendChild(i); form.appendChild(l);
    }
    if (mode === 'signup') field('nickname', 'text', '暱稱（選填）', 'nickname');
    field('email', 'email', 'Email', 'email');
    if (mode !== 'reset') field('password', 'password', mode === 'signup' ? '密碼（至少 8 個字元）' : '密碼', mode === 'signup' ? 'new-password' : 'current-password');
    var submit = el('button', 'btn authsubmit', { signin: '登入', signup: '建立帳號', reset: '寄出重設信' }[mode]); submit.type = 'submit';
    form.appendChild(submit);
    var links = el('div', 'authlinks');
    function link(text, m) { var b = el('button', 'linkbtn', text); b.type = 'button'; b.addEventListener('click', function () { mode = m; setMsg(''); renderForm(); }); links.appendChild(b); }
    if (mode === 'signin') { link('還沒有帳號？註冊', 'signup'); link('忘記密碼', 'reset'); }
    else link('返回登入', 'signin');
    form.appendChild(links);
  }

  function mountLogin(container) {
    mounted = container; container.textContent = '';
    var box = el('div', 'authbox'); container.appendChild(box);
    var google = el('button', 'authbtn google'); google.type = 'button'; google.innerHTML = GOOGLE_SVG; google.appendChild(el('span', '', '使用 Google 繼續'));
    google.addEventListener('click', function () { oauthSignIn('google'); });
    var or = el('div', 'author'); or.appendChild(el('span', '', '或'));
    var form = el('form', 'authform'); form.addEventListener('submit', emailSubmit);
    box.append(google, or, form);
    renderForm();
  }

  /* ---------- 帳號 ---------- */
  async function signOut(expired) {
    if (drive.token && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(drive.token, function () {}); } catch (e) {}
    }
    drive.token = null; drive.exp = 0;
    try { sessionStorage.removeItem('sf_login_counted'); } catch (e) {}
    if (fb && auth) { try { await fb.auth.signOut(auth); } catch (e) {} }
    state.user = null; notify();
    if (expired) setMsg('登入已過期，請重新登入。');
  }

  /** 刪除帳號：移除 Firestore 的使用者資料、事件與回報，再刪除登入帳號。本機照片不受影響。 */
  async function deleteAccount() {
    if (!state.user || !fb) return { ok: false, error: 'auth' };
    var fs = fb.fs, email = state.user.email;
    try {
      async function purge(name) {
        var snap = await fs.getDocs(fs.query(fs.collection(db, name), fs.where('email', '==', email), fs.limit(400)));
        await Promise.all(snap.docs.map(function (d) { return fs.deleteDoc(d.ref); }));
      }
      await purge('events'); await purge('feedback');
      await fs.deleteDoc(userRef(email));
      await fb.auth.deleteUser(auth.currentUser);
      drive.token = null; state.user = null; notify();
      return { ok: true };
    } catch (e) { return { ok: false, error: explain(e) }; }
  }

  async function onAuthState(u) {
    state.ready = true;
    if (!u) { state.user = null; setReadyUi(); notify(); return; }
    var pwOnly = u.providerData.length > 0 && u.providerData.every(function (p) { return p.providerId === 'password'; });
    if (!u.email || (pwOnly && !u.emailVerified)) { state.user = null; setReadyUi(); notify(); return; }
    try {
      var fresh = true;
      try { fresh = !sessionStorage.getItem('sf_login_counted'); sessionStorage.setItem('sf_login_counted', '1'); } catch (e) {}
      state.user = await ensureUser(u, fresh);
    } catch (e) {
      console.error('login failed', e);
      state.user = null;
      setMsg(String(e && e.code) === 'account-suspended' ? '此帳號目前無法使用 SpoolFilm。如需協助，請聯絡管理員。' : (String(e && e.code) === 'permission-denied' ? '登入失敗（permission-denied）：Firestore 安全規則尚未部署，請見 README。' : '登入失敗（' + (e && (e.code || e.message) || 'unknown') + '），請稍後再試。'));
      try { await fb.auth.signOut(auth); } catch (x) {}
    }
    setReadyUi(); notify();
  }

  function setReadyUi() {
    if (!mounted) return;
    var load = mounted.parentNode && mounted.parentNode.querySelector('.auth-loading');
    if (load) load.style.display = 'none';
    mounted.style.display = '';
  }

  function start(container) {
    if (!configured()) { notify(); return; }
    if (container) {
      mountLogin(container);
      container.style.display = 'none';
      var load = el('p', 'auth-loading msg', '載入登入服務中…');
      container.parentNode.insertBefore(load, container);
      setTimeout(function () {
        if (!state.ready) { load.textContent = '無法載入登入服務，請確認網路連線後重新整理。'; }
      }, 9000);
    }
    loadFirebase().then(function () {
      fb.auth.onAuthStateChanged(auth, onAuthState);
      fb.auth.getRedirectResult(auth).catch(function (e) { setMsg(explain(e)); });
    }).catch(function (e) { console.error(e); var l = document.querySelector('.auth-loading'); if (l) l.textContent = '無法載入登入服務，請確認網路連線後重新整理。'; });
  }

  window.SpoolAuth = {
    configured: configured,
    start: start,
    api: api,
    driveToken: driveToken,
    deleteAccount: deleteAccount,
    signOut: function () { return signOut(false); },
    onChange: function (fn) { state.listeners.push(fn); },
    get user() { return state.user; }
  };
})();

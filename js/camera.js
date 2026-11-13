/* Camera, film looks, live effects and private on-device photo storage. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  // 16 original SpoolFilm looks: 9 FREE and 7 PRO.
  // These are independent browser-friendly color presets, not Fujifilm LUT files.
  var FILTERS = {
    original: { label: '原色', pro: false, p: {} },
    airy:     { label: '清透日光', pro: false, p: { brightness: 1.09, contrast: .95, saturate: .90 } },
    cream:    { label: '奶油柔光', pro: false, p: { brightness: 1.05, contrast: .93, sepia: .10, saturate: .94 } },
    mint:     { label: '日系微綠', pro: false, p: { brightness: 1.03, hue: -10, saturate: .88, contrast: .98 } },
    warm:     { label: '焦糖暖陽', pro: false, p: { brightness: 1.02, sepia: .14, saturate: 1.08, contrast: 1.02 } },
    mono:     { label: '黑白紀錄', pro: false, p: { gray: 1, contrast: 1.08 } },
    blue:     { label: '藍調街景', pro: false, p: { brightness: 1.01, contrast: 1.06, hue: -12, saturate: .96 } },
    soft:     { label: '柔光人像', pro: false, p: { brightness: 1.06, contrast: .89, saturate: .94, sepia: .04 } },
    pastel:   { label: '淡彩日記', pro: false, p: { brightness: 1.08, contrast: .91, saturate: .82, hue: 5 } },
    vivid:    { label: '鮮明旅行', pro: true, p: { brightness: 1.01, saturate: 1.35, contrast: 1.09 } },
    cool:     { label: '冷調夜色', pro: true, p: { brightness: .96, contrast: 1.07, hue: -18, saturate: .90 } },
    vintage:  { label: '復古底片', pro: true, p: { sepia: .27, contrast: .91, saturate: .82 } },
    fade:     { label: '褪色記憶', pro: true, p: { contrast: .82, brightness: 1.08, saturate: .72 } },
    rose:     { label: '玫瑰日記', pro: true, p: { brightness: 1.04, sepia: .18, hue: 10, saturate: .92 } },
    noir:     { label: '夜色高反差', pro: true, p: { brightness: .92, contrast: 1.18, saturate: .68, gray: .08 } },
    cinema:   { label: '低彩電影', pro: true, p: { brightness: .97, contrast: 1.08, saturate: .76, sepia: .08, hue: -4 } }
  };
  // 8 original SpoolFilm "cameras": each one bundles a look, grain, vignette, color temperature, light leak and date stamp.
  // Names, tones and parameters are SpoolFilm's own; they do not copy any other app's camera models.
  var MODELS = {
    none:       { label: '自由調色', pro: false, filter: null, dot: 'linear-gradient(135deg,#f5e8d5,#9c9a95)' },
    creamccd:   { label: '奶油 CCD', pro: false, filter: 'cream', grain: 6, vignette: 10, temp: 12, leak: null, date: true, dateColor: '#ff9a2e', dot: 'linear-gradient(135deg,#ffe3b4,#f0a35e)' },
    summer:     { label: '夏日一次性', pro: false, filter: 'warm', grain: 16, vignette: 25, temp: 18, leak: 'amber', leakAmt: 45, date: true, dateColor: '#ff8a1f', dot: 'linear-gradient(135deg,#ffd27a,#ee6f3c)' },
    street35:   { label: '街角 35', pro: false, filter: 'mono', grain: 22, vignette: 20, temp: 0, leak: null, date: false, dateColor: '#f4f4f4', dot: 'linear-gradient(135deg,#f7f7f7,#55515d)' },
    mintpark:   { label: '薄荷公園', pro: false, filter: 'mint', grain: 8, vignette: 8, temp: -8, leak: 'cyan', leakAmt: 25, date: true, dateColor: '#9bff7a', dot: 'linear-gradient(135deg,#d5e8c9,#58b99a)' },
    neon:       { label: '夜行霓虹', pro: true, filter: 'cool', grain: 14, vignette: 30, temp: -20, leak: 'pink', leakAmt: 40, date: true, dateColor: '#ff6fd8', dot: 'linear-gradient(135deg,#5d6dff,#ff6fd8)' },
    album98:    { label: '舊相簿 98', pro: true, filter: 'vintage', grain: 20, vignette: 28, temp: 15, leak: 'amber', leakAmt: 30, date: true, dateColor: '#ffb347', dot: 'linear-gradient(135deg,#c9a17c,#76564b)' },
    roseinstant:{ label: '玫瑰即影', pro: true, filter: 'rose', grain: 10, vignette: 18, temp: 6, leak: 'pink', leakAmt: 35, date: false, dateColor: '#ffe3ea', dot: 'linear-gradient(135deg,#f2b4c8,#a65d7d)' },
    dusk:       { label: '黃昏 FM', pro: false, filter: 'warm', grain: 12, vignette: 22, temp: 25, leak: 'red', leakAmt: 35, date: true, dateColor: '#ff7a2e', dot: 'linear-gradient(135deg,#ffb36b,#c4422f)' },
    noonsea:    { label: '海邊正午', pro: false, filter: 'airy', grain: 5, vignette: 8, temp: 5, leak: 'amber', leakAmt: 20, date: true, dateColor: '#ffd24a', dot: 'linear-gradient(135deg,#fff1b8,#5fc1d8)' },
    cvsnight:   { label: '便利店夜晚', pro: true, filter: 'noir', grain: 24, vignette: 30, temp: -5, leak: 'cyan', leakAmt: 30, date: true, dateColor: '#7dffb5', dot: 'linear-gradient(135deg,#7dffb5,#1f2a33)' },
    sakura:     { label: '櫻花日記', pro: true, filter: 'pastel', grain: 6, vignette: 10, temp: 8, leak: 'pink', leakAmt: 30, date: false, dateColor: '#ffe3ea', dot: 'linear-gradient(135deg,#ffd7e4,#f08fb0)' },
    nightshift: { label: '電影夜班', pro: true, filter: 'cinema', grain: 18, vignette: 35, temp: -10, leak: null, date: false, dateColor: '#dfe8e6', dot: 'linear-gradient(135deg,#6f8f95,#26343a)' }
  };
  var LEAKS = {
    amber: { label: '琥珀', rgb: [255, 150, 40] },
    pink:  { label: '粉紅', rgb: [255, 90, 150] },
    cyan:  { label: '青藍', rgb: [70, 200, 255] },
    red:   { label: '赤紅', rgb: [255, 60, 40] }
  };
  var FREE_MAX_EDGE = 1280, IMPORT_MAX_EDGE = 4096;
  var DB_NAME = 'spoolfilm-local', DB_VERSION = 1, STORE = 'photos';

  var stream = null, facing = 'environment';
  var filterKey = 'original', brightness = 1, filterStrength = 100, grain = 0, vignette = 0;
  var photos = [], busy = false, noiseTile = null, loadingOwner = '';
  var modelKey = 'none', tempVal = 0;
  var leakOn = false, leakColor = 'amber', leakAmt = 40, leakSeed = Math.random();
  var dateOn = false, dateColor = '#ff9a2e';
  var fisheyeOn = false, fxPreview = null, fxCapture = null, fxRaf = 0;
  var doubleOn = false, pending = null;

  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(function () { el.classList.remove('show'); }, 2800);
  }
  function isPro() { return !!(SpoolAuth.user && SpoolAuth.user.plan === 'PRO'); }
  function mixed(value, identity, amount) { return identity + (value - identity) * (amount / 100); }

  function effectiveParams() {
    var p = FILTERS[filterKey].p, amount = filterStrength;
    return {
      brightness: mixed(p.brightness || 1, 1, amount) * brightness,
      contrast: mixed(p.contrast || 1, 1, amount),
      saturate: mixed(p.saturate || 1, 1, amount),
      gray: mixed(p.gray || 0, 0, amount),
      sepia: mixed(p.sepia || 0, 0, amount),
      hue: (p.hue || 0) * amount / 100
    };
  }

  function cssFilter() {
    var p = effectiveParams();
    return [
      'brightness(' + p.brightness.toFixed(3) + ')',
      'contrast(' + p.contrast.toFixed(3) + ')',
      'saturate(' + p.saturate.toFixed(3) + ')',
      'grayscale(' + p.gray.toFixed(3) + ')',
      'sepia(' + p.sepia.toFixed(3) + ')',
      'hue-rotate(' + p.hue.toFixed(1) + 'deg)'
    ].join(' ');
  }

  // Fallback for browsers whose CanvasRenderingContext2D has no filter support.
  function pixelFilter(ctx, w, h) {
    var p = effectiveParams();
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * p.saturate; g = lum + (g - lum) * p.saturate; b = lum + (b - lum) * p.saturate;
      r += (lum - r) * p.gray; g += (lum - g) * p.gray; b += (lum - b) * p.gray;
      if (p.sepia) {
        var tr = 0.393 * r + 0.769 * g + 0.189 * b;
        var tg = 0.349 * r + 0.686 * g + 0.168 * b;
        var tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r += (tr - r) * p.sepia; g += (tg - g) * p.sepia; b += (tb - b) * p.sepia;
      }
      r = ((r - 128) * p.contrast + 128) * p.brightness;
      g = ((g - 128) * p.contrast + 128) * p.brightness;
      b = ((b - 128) * p.contrast + 128) * p.brightness;
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(img, 0, 0);
  }

  function makeNoiseTile() {
    if (noiseTile) return noiseTile;
    var c = document.createElement('canvas'); c.width = 128; c.height = 128;
    var x = c.getContext('2d'), image = x.createImageData(c.width, c.height);
    for (var i = 0; i < image.data.length; i += 4) {
      var n = Math.floor(Math.random() * 256);
      image.data[i] = n; image.data[i + 1] = n; image.data[i + 2] = n; image.data[i + 3] = 255;
    }
    x.putImageData(image, 0, 0); noiseTile = c; return c;
  }

  function viewSize() { var v = $('video').parentNode; return { w: v.clientWidth, h: v.clientHeight }; }

  function tintFor(t) { return t >= 0 ? [255, 140, 40] : [60, 140, 255]; }
  function tintAlpha(t) { return Math.abs(t) / 50 * .55; }

  function drawLeak(ctx, w, h, colorKey, amt, seed) {
    if (!amt || !LEAKS[colorKey]) return;
    var c = LEAKS[colorKey].rgb, a = amt / 100, fromRight = seed >= .5;
    var x0 = fromRight ? w : 0, big = Math.max(w, h);
    function rgba(k, al) { return 'rgba(' + Math.min(255, Math.round(c[0] * k)) + ',' + Math.min(255, Math.round(c[1] * k)) + ',' + Math.min(255, Math.round(c[2] * k)) + ',' + al.toFixed(3) + ')'; }
    ctx.save(); ctx.filter = 'none'; ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 1;
    var yBig = h * (.2 + (seed * 7 % 1) * .5);
    var g = ctx.createRadialGradient(x0, yBig, 0, x0, yBig, big * .78);
    g.addColorStop(0, rgba(1, .9 * a)); g.addColorStop(.45, rgba(1, .35 * a)); g.addColorStop(1, rgba(1, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var x1 = fromRight ? 0 : w, y1 = h * (.75 + (seed * 13 % 1) * .25);
    var g2 = ctx.createRadialGradient(x1, y1, 0, x1, y1, big * .42);
    g2.addColorStop(0, rgba(1.15, .55 * a)); g2.addColorStop(1, rgba(1, 0));
    ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawTemp(ctx, w, h, t) {
    if (!t) return;
    var c = tintFor(t);
    ctx.save(); ctx.filter = 'none'; ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + tintAlpha(t).toFixed(3) + ')';
    ctx.fillRect(0, 0, w, h); ctx.restore();
  }

  function dateText(d) {
    d = d || new Date();
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return "'" + String(d.getFullYear()).slice(2) + ' ' + z(d.getMonth() + 1) + ' ' + z(d.getDate());
  }

  function drawDate(ctx, w, h, color) {
    var m = Math.min(w, h), fs = Math.round(m * .05);
    ctx.save(); ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    ctx.font = 'bold ' + fs + 'px "Courier New", ui-monospace, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = color; ctx.shadowBlur = fs * .5;
    ctx.fillStyle = color; ctx.globalAlpha = .92;
    ctx.fillText(dateText(), w - m * .05, h - m * .06);
    ctx.restore();
  }

  function updateOverlays() {
    var vs = viewSize();
    var lc = $('leakCanvas');
    if (vs.w > 0) {
      lc.width = vs.w; lc.height = vs.h;
      var lctx = lc.getContext('2d'); lctx.clearRect(0, 0, vs.w, vs.h);
      if (leakOn) drawLeak(lctx, vs.w, vs.h, leakColor, leakAmt, leakSeed);
    }
    var t = $('tempOverlay'), c = tintFor(tempVal);
    t.style.background = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    t.style.opacity = tempVal ? tintAlpha(tempVal).toFixed(3) : '0';
    var ds = $('dateStamp');
    ds.style.display = dateOn ? '' : 'none';
    ds.textContent = dateText();
    ds.style.color = dateColor; ds.style.textShadow = '0 0 8px ' + dateColor;
    if (vs.w > 0) ds.style.fontSize = Math.round(Math.min(vs.w, vs.h) * .05) + 'px';
  }

  function updatePreviewEffects() {
    updateOverlays();
    var noise = makeNoiseTile();
    var grainLayer = $('grainOverlay'), vignetteLayer = $('vignetteOverlay');
    grainLayer.style.backgroundImage = 'url(' + noise.toDataURL('image/png') + ')';
    grainLayer.style.opacity = String(Math.min(.48, grain / 100 * .62));
    vignetteLayer.style.opacity = vignette ? '1' : '0';
    vignetteLayer.style.background = 'radial-gradient(ellipse at center, rgba(20,12,26,0) 42%, rgba(20,12,26,' + (vignette / 100 * .68).toFixed(2) + ') 100%)';
  }

  function applyPreview() {
    var f = cssFilter(), tr = facing === 'user' ? 'scaleX(-1)' : '';
    $('video').style.filter = f; $('video').style.transform = tr;
    $('fxCanvas').style.filter = f; $('fxCanvas').style.transform = tr;
    updatePreviewEffects();
  }

  /* ---------- Fisheye (WebGL barrel distortion, shared by preview and capture) ---------- */
  function makeFisheye(canvas, preserve) {
    var gl = canvas.getContext('webgl', { preserveDrawingBuffer: !!preserve, premultipliedAlpha: false });
    if (!gl) return null;
    function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a;varying vec2 v;void main(){v=a;gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
      'precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 crop;uniform float k;' +
      'void main(){vec2 q=v*(1.0+k*dot(v,v))/(1.0+k);' +
      'if(abs(q.x)>1.0||abs(q.y)>1.0){gl_FragColor=vec4(0.,0.,0.,1.);return;}' +
      'vec2 uv=q*0.5*crop+0.5;uv.y=1.0-uv.y;gl_FragColor=texture2D(t,uv);}'));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1f(gl.getUniformLocation(prog, 'k'), .8);
    var uCrop = gl.getUniformLocation(prog, 'crop');
    return {
      canvas: canvas,
      render: function (source, sw, sh2, outW, outH, cover) {
        if (canvas.width !== outW || canvas.height !== outH) { canvas.width = outW; canvas.height = outH; }
        gl.viewport(0, 0, outW, outH);
        var va = sw / sh2, ra = outW / outH, cx = 1, cy = 1;
        if (cover) { if (va > ra) cx = ra / va; else cy = va / ra; }
        gl.uniform2f(uCrop, cx, cy);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  }

  function fxLoop() {
    fxRaf = 0;
    if (!fisheyeOn || !stream || !fxPreview) return;
    var v = $('video'), vs = viewSize();
    if (v.videoWidth && vs.w > 0) {
      var scale = Math.min(1, 720 / Math.max(vs.w, vs.h));
      fxPreview.render(v, v.videoWidth, v.videoHeight, Math.round(vs.w * scale), Math.round(vs.h * scale), true);
    }
    fxRaf = requestAnimationFrame(fxLoop);
  }

  function syncFisheyePreview() {
    var on = fisheyeOn && !!stream && !!fxPreview;
    $('fxCanvas').style.display = on ? 'block' : 'none';
    $('video').style.opacity = on ? '0' : '';
    if (on && !fxRaf) fxRaf = requestAnimationFrame(fxLoop);
  }

  async function startCamera(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('此瀏覽器無法使用相機，請使用 HTTPS 網址。'); return; }
    try {
      var s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode } }, audio: false });
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = s; facing = mode;
      $('video').srcObject = s; $('video').classList.add('show');
      $('placeholder').style.display = 'none';
      $('camToggle').textContent = '關閉相機';
      $('camSwitch').disabled = false;
      $('camMode').textContent = mode === 'user' ? '前鏡頭' : '後鏡頭';
      applyPreview(); syncFisheyePreview();
    } catch (e) { toast('無法開啟相機，請確認瀏覽器已允許相機權限。'); }
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null;
    $('video').srcObject = null; $('video').classList.remove('show');
    $('placeholder').style.display = '';
    $('camToggle').textContent = '開啟相機';
    $('camSwitch').disabled = true;
    $('camMode').textContent = '相機尚未開啟';
    syncFisheyePreview();
  }

  function syncControls() {
    $('filterStrength').value = filterStrength; $('filterStrengthVal').textContent = filterStrength + '%';
    $('grain').value = grain; $('grainVal').textContent = String(grain);
    $('vignette').value = vignette; $('vignetteVal').textContent = String(vignette);
    $('temp').value = tempVal; $('tempVal').textContent = (tempVal > 0 ? '+' : '') + tempVal;
    $('leakAmt').value = leakAmt; $('leakAmtVal').textContent = String(leakAmt);
    $('leakColor').value = leakColor;
    $('tgDate').setAttribute('aria-pressed', dateOn ? 'true' : 'false'); $('tgDate').classList.toggle('on', dateOn);
    $('tgLeak').setAttribute('aria-pressed', leakOn ? 'true' : 'false'); $('tgLeak').classList.toggle('on', leakOn);
    $('tgFish').setAttribute('aria-pressed', fisheyeOn ? 'true' : 'false'); $('tgFish').classList.toggle('on', fisheyeOn);
    $('tgDouble').setAttribute('aria-pressed', doubleOn ? 'true' : 'false'); $('tgDouble').classList.toggle('on', doubleOn);
    $('fxHint').textContent = doubleOn ? (pending ? '雙重曝光：再拍第二張，兩張會疊在一起。' : '雙重曝光：先拍第一張。') : '';
  }

  function chooseModel(k) {
    var m = MODELS[k];
    if (m.pro && !isPro()) { toast('「' + m.label + '」是 PRO 專屬相機，升級後即可使用。'); return; }
    modelKey = k;
    if (m.filter) {
      filterKey = m.filter; filterStrength = 100; brightness = 1; $('bright').value = 0; $('brightVal').textContent = '0';
      grain = m.grain; vignette = m.vignette; tempVal = m.temp;
      leakOn = !!m.leak; if (m.leak) { leakColor = m.leak; leakAmt = m.leakAmt; leakSeed = Math.random(); }
      dateOn = !!m.date; dateColor = m.dateColor;
    }
    syncControls(); buildFilterButtons(); buildModelButtons(); applyPreview();
  }

  function buildModelButtons() {
    var wrap = $('models'); wrap.textContent = '';
    Object.keys(MODELS).forEach(function (k) {
      var m = MODELS[k], b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (k === modelKey ? ' on' : '');
      b.setAttribute('data-model', k); b.style.setProperty('--filter-dot', m.dot);
      b.textContent = m.label + (m.pro ? ' ✦' : '');
      b.setAttribute('aria-pressed', k === modelKey ? 'true' : 'false');
      if (m.pro && !isPro()) b.classList.add('locked');
      b.addEventListener('click', function () { chooseModel(k); });
      wrap.appendChild(b);
    });
  }

  function buildFilterButtons() {
    var wrap = $('filters'); wrap.textContent = '';
    Object.keys(FILTERS).forEach(function (k) {
      var f = FILTERS[k], b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (k === filterKey ? ' on' : '');
      b.setAttribute('data-filter', k);
      b.textContent = f.label + (f.pro ? ' ✦' : '');
      b.setAttribute('aria-pressed', k === filterKey ? 'true' : 'false');
      if (f.pro && !isPro()) b.classList.add('locked');
      b.addEventListener('click', function () {
        if (f.pro && !isPro()) { toast('「' + f.label + '」是 PRO 專屬風格，升級後即可使用。'); return; }
        filterKey = k; modelKey = 'none'; buildFilterButtons(); buildModelButtons(); applyPreview();
      });
      wrap.appendChild(b);
    });
  }

  function drawPhotoEffects(ctx, w, h) {
    ctx.save(); ctx.filter = 'none';
    if (grain > 0) {
      ctx.globalAlpha = Math.min(.48, grain / 100 * .62);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = ctx.createPattern(makeNoiseTile(), 'repeat');
      ctx.fillRect(0, 0, w, h);
    }
    if (vignette > 0) {
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      var radius = Math.max(w, h) * .72;
      var gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, radius);
      gradient.addColorStop(0, 'rgba(20,12,26,0)');
      gradient.addColorStop(1, 'rgba(20,12,26,' + (vignette / 100 * .68).toFixed(2) + ')');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  function openPhotoDB() {
    return new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('本機儲存不受支援')); return; }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('owner', 'owner', { unique: false });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('無法開啟本機相簿')); };
    });
  }

  async function savePhotoRecord(photo) {
    var db = await openPhotoDB();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: photo.id, owner: photo.owner, blob: photo.blob, time: photo.time, filter: photo.filter, synced: !!photo.synced });
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); reject(tx.error || new Error('儲存失敗')); };
    });
  }

  async function removePhotoRecord(id) {
    if (!id) return;
    var db = await openPhotoDB();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id);
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); reject(tx.error || new Error('刪除失敗')); };
    });
  }

  async function loadSavedPhotos(owner) {
    loadingOwner = owner;
    photos.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
    photos = []; renderGallery();
    try {
      var db = await openPhotoDB();
      var records = await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).index('owner').getAll(owner);
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error || new Error('讀取失敗')); };
        tx.oncomplete = function () { db.close(); };
      });
      if (loadingOwner !== owner || !SpoolAuth.user || SpoolAuth.user.email.toLowerCase() !== owner) return;
      photos.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
      photos = records.sort(function (a, b) { return (b.timeValue || 0) - (a.timeValue || 0); }).map(function (p) {
        p.url = URL.createObjectURL(p.blob); return p;
      });
      renderGallery();
    } catch (e) {
      toast('無法讀取本機相簿，仍可正常拍照與下載。');
    }
  }

  function showCaptureFlash() {
    var flash = $('captureFlash');
    if (!flash) return;
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(function () { flash.classList.remove('active'); }, 260);
  }

  /** Draw a video frame or image through fisheye (optional) and the colour filter. */
  function grabFrame(source, sw, sh, mirror, maxEdge) {
    var w = sw, h = sh, scale = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    var native = 'filter' in ctx;
    if (native) ctx.filter = cssFilter();
    ctx.save();
    if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    var drawn = false;
    if (fisheyeOn) {
      if (!fxCapture) { try { fxCapture = makeFisheye(document.createElement('canvas'), true); } catch (e) { fxCapture = null; } }
      if (fxCapture) { fxCapture.render(source, sw, sh, w, h, false); ctx.drawImage(fxCapture.canvas, 0, 0, w, h); drawn = true; }
    }
    if (!drawn) ctx.drawImage(source, 0, 0, w, h);
    ctx.restore();
    if (!native) pixelFilter(ctx, w, h);
    ctx.filter = 'none';
    return canvas;
  }

  /** Warm/cool tint, light leak, grain, vignette, date stamp and (FREE) watermark. */
  function finishCanvas(canvas, fullRes) {
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    drawTemp(ctx, w, h, tempVal);
    if (leakOn) drawLeak(ctx, w, h, leakColor, leakAmt, leakSeed);
    drawPhotoEffects(ctx, w, h);
    if (dateOn) drawDate(ctx, w, h, dateColor);
    ctx.filter = 'none';
    if (!fullRes) {
      ctx.font = 'bold ' + Math.round(w * .035) + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('SpoolFilm', w * .03, h - h * .03);
    }
  }

  function blendDouble(first, second) {
    var out = document.createElement('canvas'); out.width = second.width; out.height = second.height;
    var ctx = out.getContext('2d');
    ctx.drawImage(first, 0, 0, out.width, out.height);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .62;
    ctx.drawImage(second, 0, 0);
    return out;
  }

  function showGhost() {
    var g = $('ghost');
    if (!pending) { g.style.display = 'none'; g.removeAttribute('src'); return; }
    var s = Math.min(1, 640 / Math.max(pending.width, pending.height)), c = document.createElement('canvas');
    c.width = Math.round(pending.width * s); c.height = Math.round(pending.height * s);
    c.getContext('2d').drawImage(pending, 0, 0, c.width, c.height);
    g.src = c.toDataURL('image/jpeg', .7); g.style.display = 'block';
  }

  function clearPending() { pending = null; showGhost(); syncControls(); }

  /** Ask the backend; returns { fullRes } when allowed, otherwise null. */
  async function authorizePhoto() {
    var proFeature = FILTERS[filterKey].pro || MODELS[modelKey].pro, fullRes = isPro();
    var auth = await SpoolAuth.api('authorize', {
      event: 'photo', filter: filterKey + (modelKey !== 'none' ? '/' + modelKey : ''),
      features: (proFeature ? ['pro_filter'] : []).concat(fullRes ? ['full_res'] : [])
    });
    if (!auth.ok || !auth.allowed) {
      if (auth.allowed === false) { await refreshPlan(); toast('PRO 權限已失效，請改用 FREE 功能。'); }
      else if (auth.error !== 'auth') toast('無法確認權限，請稍後再試。');
      return null;
    }
    return { fullRes: fullRes };
  }

  async function commitCanvas(canvas, fullRes, message) {
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', .92); });
    if (!blob) { toast('拍照失敗，請再試一次'); return; }
    var now = Date.now(), owner = SpoolAuth.user.email.toLowerCase();
    var photo = { id: owner + '-' + now + '-' + Math.random().toString(36).slice(2, 7), owner: owner, blob: blob,
      url: URL.createObjectURL(blob), time: new Date(now).toLocaleString('zh-TW'), timeValue: now, filter: filterKey, synced: false };
    var persisted = true;
    try { await savePhotoRecord(photo); } catch (storageError) { persisted = false; }
    photos.unshift(photo); renderGallery();
    leakSeed = Math.random(); updateOverlays();
    if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) {} }
    toast(persisted ? (message || '拍好了！照片已保存於這個裝置。') : '拍好了！但本機保存失敗，請記得立即下載。');
  }

  async function takePhoto() {
    if (busy) return;
    if (!stream) { toast('請先開啟相機'); return; }
    var video = $('video');
    if (!video.videoWidth) { toast('相機尚未就緒，請稍後再試'); return; }
    busy = true;
    showCaptureFlash();
    try {
      var fullRes = isPro(), mirror = facing === 'user', maxEdge = fullRes ? Infinity : FREE_MAX_EDGE;
      if (doubleOn && !pending) {
        pending = grabFrame(video, video.videoWidth, video.videoHeight, mirror, maxEdge);
        showGhost(); syncControls(); toast('第一張已疊好，再拍一張完成雙重曝光。');
        return;
      }
      var ok = await authorizePhoto();
      if (!ok) return;
      var canvas = grabFrame(video, video.videoWidth, video.videoHeight, mirror, maxEdge);
      if (doubleOn && pending) { canvas = blendDouble(pending, canvas); clearPending(); }
      finishCanvas(canvas, ok.fullRes);
      await commitCanvas(canvas, ok.fullRes);
    } catch (e) { toast('拍照時發生錯誤，請再試一次。'); }
    finally { busy = false; }
  }

  async function loadImageSource(file) {
    if (window.createImageBitmap) {
      try { var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { src: bmp, w: bmp.width, h: bmp.height }; } catch (e) { /* fall back */ }
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve({ src: img, w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  async function importPhoto(file) {
    if (busy || !file) return;
    if (!/^image\//.test(file.type)) { toast('請選擇圖片檔案。'); return; }
    busy = true;
    try {
      var ok = await authorizePhoto();
      if (!ok) return;
      var img = await loadImageSource(file);
      var canvas = grabFrame(img.src, img.w, img.h, false, ok.fullRes ? IMPORT_MAX_EDGE : FREE_MAX_EDGE);
      finishCanvas(canvas, ok.fullRes);
      await commitCanvas(canvas, ok.fullRes, '匯入完成！已套用目前的相機與濾鏡。');
      showPage('gallery');
    } catch (e) { toast('無法匯入這張照片，請換一張再試。'); }
    finally { busy = false; }
  }

  // Export ratios for social apps: centre-crop (cover) to the chosen aspect.
  var RATIOS = {
    original: { label: '原比例', r: 0 },
    ig_square: { label: 'IG 正方 1:1', r: 1 },
    ig_post: { label: 'IG 貼文 4:5', r: 4 / 5 },
    xhs: { label: '小紅書 3:4', r: 3 / 4 },
    story: { label: '限動／Reels 9:16', r: 9 / 16 }
  };
  var exportRatio = 'original';

  async function cropToRatio(blob, ratio) {
    if (!ratio) return blob;
    var img = await loadImageSource(blob), sw = img.w, sh = img.h, cw = sw, ch = sh;
    if (sw / sh > ratio) cw = Math.round(sh * ratio); else ch = Math.round(sw / ratio);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(img.src, Math.round((sw - cw) / 2), Math.round((sh - ch) / 2), cw, ch, 0, 0, cw, ch);
    return new Promise(function (resolve) { c.toBlob(function (b) { resolve(b || blob); }, 'image/jpeg', .92); });
  }

  async function downloadPhoto(p, i) {
    var res = await SpoolAuth.api('authorize', { event: 'download', filter: p.filter, features: [] });
    if (!res.ok || !res.allowed) { toast('無法確認下載權限，請稍後再試。'); return; }
    var ratio = RATIOS[exportRatio] ? RATIOS[exportRatio].r : 0, url = p.url, temp = false;
    if (ratio) {
      try { var cropped = await cropToRatio(p.blob, ratio); url = URL.createObjectURL(cropped); temp = true; }
      catch (e) { toast('裁切失敗，改下載原比例。'); }
    }
    var a = document.createElement('a'); a.href = url;
    a.download = 'spoolfilm-' + Date.now() + '-' + (photos.length - i) + (ratio ? '-' + exportRatio : '') + '.jpg';
    document.body.appendChild(a); a.click(); a.remove();
    if (temp) setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- Google Drive sync: uploads only to the signed-in user's own Drive. ---------- */
  var DRIVE_FOLDER = 'SpoolFilm', driveFolderId = null;
  function setCloud(msg) { $('cloudStatus').textContent = msg; }
  async function driveFetch(token, url, opts) {
    var o = opts || {};
    var r = await fetch(url, Object.assign({}, o, { headers: Object.assign({ Authorization: 'Bearer ' + token }, o.headers || {}) }));
    var data = null;
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) {
      var reason = data && data.error && (data.error.message || data.error.status);
      throw new Error('drive_' + r.status + (reason ? ':' + String(reason).slice(0, 180) : ''));
    }
    return data || {};
  }
  async function ensureFolder(token) {
    if (driveFolderId) return driveFolderId;
    var q = encodeURIComponent("name='" + DRIVE_FOLDER + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    var found = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)');
    if (found.files && found.files.length) { driveFolderId = found.files[0].id; return driveFolderId; }
    var folder = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' })
    });
    driveFolderId = folder.id; return driveFolderId;
  }
  async function uploadToDrive(token, folderId, p, n) {
    var boundary = 'spool_' + Math.random().toString(16).slice(2);
    var meta = { name: 'SpoolFilm-' + Date.now() + '-' + n + '.jpg', mimeType: 'image/jpeg', parents: [folderId] };
    var body = new Blob([
      '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
      '\r\n--' + boundary + '\r\nContent-Type: image/jpeg\r\n\r\n', p.blob, '\r\n--' + boundary + '--'
    ], { type: 'multipart/related; boundary=' + boundary });
    await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body
    });
  }
  async function syncAll() {
    var todo = photos.filter(function (p) { return !p.synced; });
    if (!todo.length) { toast(photos.length ? '所有照片都已同步' : '目前沒有照片可以同步'); return; }
    if (!confirm('要把 ' + todo.length + ' 張照片上傳到你自己的 Google Drive「' + DRIVE_FOLDER + '」資料夾嗎？照片不會傳給管理員。')) return;
    var btn = $('syncBtn'); btn.disabled = true;
    if (!(window.SPOOL_CONFIG && SPOOL_CONFIG.GOOGLE_CLIENT_ID)) { setCloud('尚未設定 Google Drive 同步（GOOGLE_CLIENT_ID），請見 README。'); btn.disabled = false; return; }
    try {
      setCloud('請在跳出的視窗允許存取…');
      var token = await SpoolAuth.driveToken();
      setCloud('正在準備資料夾…'); var folder = await ensureFolder(token), done = 0;
      for (var i = 0; i < todo.length; i++) {
        setCloud('正在同步 ' + (i + 1) + ' / ' + todo.length + '…');
        await uploadToDrive(token, folder, todo[i], i + 1); todo[i].synced = true; done++;
        try { await savePhotoRecord(todo[i]); } catch (e) {}
      }
      setCloud('同步完成：' + done + ' 張已存到你的 Google Drive「' + DRIVE_FOLDER + '」。');
      renderGallery(); SpoolAuth.api('authorize', { event: 'cloud_sync', features: [], count: done }).catch(function () {}); toast('雲端同步完成');
    } catch (e) {
      var m = String(e && e.message || e);
      var hint = '同步失敗（' + m + '）。請稍後再試。';
      if (/no_client_id/.test(m)) hint = '尚未設定 Google Drive 同步，請見 README。';
      else if (/denied|access_denied|popup/.test(m)) hint = '你取消或未完成 Google Drive 授權，照片沒有上傳。';
      else if (/drive_401/.test(m)) hint = 'Google Drive 授權已過期，請重新按同步並授權。';
      else if (/drive_403/.test(m)) hint = 'Google Drive 拒絕存取：請確認已啟用 Google Drive API，並在 OAuth 範圍加入 drive.file。';
      else if (/drive_404/.test(m)) hint = '找不到雲端資料夾，請再按一次同步重試。';
      else if (/Failed to fetch|NetworkError|Load failed/i.test(m)) hint = '網路連線失敗，請確認網路後重試。';
      setCloud(hint);
    } finally { btn.disabled = false; }
  }

  function renderGallery() {
    var grid = $('galleryGrid'); grid.textContent = '';
    $('photoCount').textContent = photos.length + ' 張';
    $('galleryEmpty').style.display = photos.length ? 'none' : '';
    photos.forEach(function (p, i) {
      var card = document.createElement('article'); card.className = 'photo-card';
      var img = document.createElement('img'); img.src = p.url; img.alt = '照片 ' + (photos.length - i);
      var meta = document.createElement('div'); meta.className = 'photo-meta';
      var time = document.createElement('span'); time.textContent = p.time + (p.synced ? ' · 已同步' : '');
      var row = document.createElement('div'); row.className = 'photo-actions';
      var dl = document.createElement('button'); dl.type = 'button'; dl.className = 'btn small'; dl.textContent = '下載';
      dl.addEventListener('click', function () { downloadPhoto(p, i); });
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn small danger'; del.textContent = '刪除';
      del.addEventListener('click', async function () {
        if (!confirm('確定要刪除這張照片嗎？')) return;
        try { await removePhotoRecord(p.id); } catch (e) { /* Also allow removal of photos held only in memory. */ }
        URL.revokeObjectURL(p.url); photos.splice(i, 1); renderGallery();
      });
      row.append(dl, del); meta.append(time, row); card.append(img, meta); grid.append(card);
    });
  }

  async function submitFeedback(event) {
    event.preventDefault();
    var btn = $('feedbackSubmit'), status = $('feedbackStatus');
    var message = $('feedbackMessage').value.trim();
    if (!message) { status.textContent = '請先描述遇到的問題。'; return; }
    btn.disabled = true; status.textContent = '正在送出…';
    try {
      var result = await SpoolAuth.api('submitFeedback', {
        category: $('feedbackType').value,
        message: message,
        page: 'account'
      });
      if (!result.ok) throw new Error(result.error || 'submit_failed');
      $('feedbackMessage').value = '';
      status.textContent = '回報已送出，謝謝你協助改善 SpoolFilm！';
      toast('問題回報已送出');
    } catch (e) {
      status.textContent = '送出失敗，請確認網路後再試。(' + String(e.message || e) + ')';
    } finally { btn.disabled = false; }
  }

  async function loadNotifications() {
    var wrap = $('notificationList');
    if (!wrap || !SpoolAuth.user) return;
    wrap.textContent = '載入中…';
    var result = await SpoolAuth.api('notifications');
    wrap.textContent = '';
    if (!result.ok) { wrap.textContent = '目前無法載入通知，請稍後再試。'; return; }
    if (!result.notifications.length) { wrap.textContent = '目前沒有新通知。'; return; }
    result.notifications.forEach(function(n) {
      var item = document.createElement('article'); item.className = 'notification-item' + (n.read ? '' : ' unread');
      var title = document.createElement('strong'); title.textContent = n.title;
      var date = document.createElement('small'); date.textContent = n.time ? new Date(n.time).toLocaleString('zh-TW') : '';
      var msg = document.createElement('p'); msg.textContent = n.message;
      item.append(title, date, msg);
      if (!n.read) {
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ghost small'; btn.textContent = '標記為已讀';
        btn.addEventListener('click', async function() {
          btn.disabled = true;
          var r = await SpoolAuth.api('markNotificationRead', { id: n.id });
          if (r.ok) { item.classList.remove('unread'); btn.remove(); } else { btn.disabled = false; toast('更新失敗，請稍後再試'); }
        });
        item.appendChild(btn);
      }
      wrap.appendChild(item);
    });
  }

  async function refreshPlan() {
    var d = await SpoolAuth.api('me');
    if (d.ok) { SpoolAuth.user.plan = d.plan; renderUser(); }
  }
  function showPage(name) {
    ['camera', 'gallery', 'account'].forEach(function (n) {
      var page = $('page-' + n);
      page.classList.toggle('active', n === name);
      if (n === name) page.scrollTop = 0;
    });
    document.querySelectorAll('.navbtn').forEach(function (b) { b.classList.toggle('active', b.dataset.page === name); });
    if (name === 'camera') updateOverlays();
    if (name === 'account') showAccountTab('general');
  }
  function showAccountTab(name) {
    document.querySelectorAll('[data-account-tab]').forEach(function (b) {
      var active = b.dataset.accountTab === name;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-account-panel]').forEach(function (panel) {
      var active = panel.dataset.accountPanel === name;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
      if (active) panel.scrollTop = 0;
    });
    if (name === 'notifications') loadNotifications();
  }
  function renderUser() {
    var u = SpoolAuth.user;
    $('planBadge').textContent = u ? u.plan : '';
    $('acctEmail').textContent = u ? u.email : '';
    if ($('acctEmailShort')) $('acctEmailShort').textContent = u ? u.email : '我的帳號';
    $('acctPlan').textContent = u ? (u.plan === 'PRO' ? 'PRO 進階版：16 款濾鏡、12 台原創相機、原始解析度、無浮水印' : 'FREE 免費版：9 款濾鏡、6 台原創相機、最長邊 1280px、含浮水印') : '';
    if ($('accountPlanTag')) $('accountPlanTag').textContent = u ? (u.plan === 'PRO' ? 'PRO MEMBER' : 'FREE MEMBER') : 'SPOOLFILM MEMBER';
    if ($('planStateLabel')) $('planStateLabel').textContent = u ? ('目前使用：' + u.plan) : '目前方案';
    $('adminLink').style.display = u && u.isAdmin ? '' : 'none';
    buildModelButtons(); buildFilterButtons();
  }
  function onAuthChange(user) {
    var cfgOk = SpoolAuth.configured();
    $('setupWarn').style.display = cfgOk ? 'none' : '';
    $('login').style.display = user ? 'none' : '';
    $('app').style.display = user ? '' : 'none';
    if (user) {
      renderUser();
      loadSavedPhotos(user.email.toLowerCase());
      loadNotifications();
    } else {
      loadingOwner = '';
      stopCamera(); photos.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
      photos = []; renderGallery();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('camToggle').addEventListener('click', function () { stream ? stopCamera() : startCamera('environment'); });
    $('camSwitch').addEventListener('click', function () { if (stream) startCamera(facing === 'environment' ? 'user' : 'environment'); });
    $('shutter').addEventListener('click', takePhoto);
    $('syncBtn').addEventListener('click', syncAll);
    $('exportRatio').addEventListener('change', function (e) { exportRatio = e.target.value; toast('下載比例：' + RATIOS[exportRatio].label); });
    $('feedbackForm').addEventListener('submit', submitFeedback);
    $('bright').addEventListener('input', function (e) {
      brightness = 1 + Number(e.target.value) / 100;
      $('brightVal').textContent = (e.target.value > 0 ? '+' : '') + e.target.value;
      applyPreview();
    });
    $('filterStrength').addEventListener('input', function (e) {
      filterStrength = Number(e.target.value); $('filterStrengthVal').textContent = filterStrength + '%'; applyPreview();
    });
    $('grain').addEventListener('input', function (e) {
      grain = Number(e.target.value); $('grainVal').textContent = String(grain); updatePreviewEffects();
    });
    $('vignette').addEventListener('input', function (e) {
      vignette = Number(e.target.value); $('vignetteVal').textContent = String(vignette); updatePreviewEffects();
    });
    $('temp').addEventListener('input', function (e) {
      tempVal = Number(e.target.value); $('tempVal').textContent = (tempVal > 0 ? '+' : '') + tempVal; updateOverlays();
    });
    $('leakAmt').addEventListener('input', function (e) {
      leakAmt = Number(e.target.value); $('leakAmtVal').textContent = String(leakAmt);
      if (leakAmt > 0 && !leakOn) { leakOn = true; syncControls(); } updateOverlays();
    });
    $('leakColor').addEventListener('change', function (e) { leakColor = e.target.value; leakSeed = Math.random(); updateOverlays(); });
    $('tgDate').addEventListener('click', function () { dateOn = !dateOn; syncControls(); updateOverlays(); });
    $('tgLeak').addEventListener('click', function () {
      leakOn = !leakOn; if (leakOn && !leakAmt) leakAmt = 40; leakSeed = Math.random(); syncControls(); updateOverlays();
    });
    $('tgFish').addEventListener('click', function () {
      if (!fxPreview && !fisheyeOn) {
        try { fxPreview = makeFisheye($('fxCanvas'), false); } catch (e) { fxPreview = null; }
        if (!fxPreview) { toast('這個瀏覽器不支援魚眼效果。'); return; }
      }
      fisheyeOn = !fisheyeOn; syncControls(); syncFisheyePreview();
    });
    $('tgDouble').addEventListener('click', function () { doubleOn = !doubleOn; if (!doubleOn) pending = null; showGhost(); syncControls(); });
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; importPhoto(f); });
    window.addEventListener('resize', function () { updateOverlays(); });
    document.querySelectorAll('.navbtn').forEach(function (b) { b.addEventListener('click', function () { showPage(b.dataset.page); }); });
    document.querySelectorAll('[data-account-tab]').forEach(function (b) {
      b.addEventListener('click', function () { showAccountTab(b.dataset.accountTab); });
    });
    if ($('refreshNotifications')) $('refreshNotifications').addEventListener('click', function () { loadNotifications(); });
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) { b.addEventListener('click', function () { SpoolTheme.set(b.dataset.themeChoice); }); });
    $('logout').addEventListener('click', function () { SpoolAuth.signOut(); });
    $('deleteAccount').addEventListener('click', async function () {
      if (!confirm('確定要刪除帳號嗎？帳號、方案與使用紀錄會永久刪除，無法復原。')) return;
      if (!confirm('再確認一次：真的要刪除這個帳號嗎？')) return;
      var btn = $('deleteAccount'); btn.disabled = true; $('deleteMsg').textContent = '刪除中…';
      var r = await SpoolAuth.deleteAccount();
      if (!r.ok) { $('deleteMsg').textContent = '刪除失敗：' + r.error; btn.disabled = false; }
      else toast('帳號已刪除');
    });
    $('refreshPlan').addEventListener('click', function () { refreshPlan().then(function () { toast('方案已更新'); }).catch(function () { toast('更新失敗，請稍後再試。'); }); });
    SpoolAuth.onChange(onAuthChange);
    onAuthChange(null);
    SpoolAuth.start($('authMount'));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  });
})();

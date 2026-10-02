/* ASBPlayer — مشغّل فيديو شامل بأدوات تحكم مصمّمة من الصفر
   يقبل أي رابط: YouTube / Vimeo / mp4 / webm / HLS (m3u8) / DASH (mpd) / Dropbox / Google Drive / Dailymotion / Facebook ...
   أي رابط غير معروف: بيجرّب كملف فيديو مباشر، ولو فشل بيفتحه كصفحة مضمّنة (iframe). */
(function (w) {
  'use strict';
  var LIB = {
    hls: 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js',
    dash: 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/4.7.4/dash.all.min.js',
    yt: 'https://www.youtube.com/iframe_api',
    vimeo: 'https://player.vimeo.com/api/player.js'
  }, cache = {};
  function lib(src) {
    return cache[src] || (cache[src] = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { delete cache[src]; no(new Error('load ' + src)); };
      document.head.appendChild(s);
    }));
  }
  function pt(s) {
    if (!s) return 0; if (/^\d+$/.test(s)) return +s;
    var m = String(s).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
  }
  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = ('0' + t % 60).slice(-2);
    return h ? h + ':' + ('0' + m).slice(-2) + ':' + s : m + ':' + s;
  }

  /* ===== 1) تحديد نوع الرابط ===== */
  function resolve(raw) {
    var u = String(raw || '').trim(); if (!u) return null;
    var fr = u.match(/<iframe[^>]+src=["']([^"']+)["']/i); if (fr) u = fr[1];      // لو لصق كود التضمين كامل
    if (/^\/\//.test(u)) u = 'https:' + u;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    if (location.protocol === 'https:') u = u.replace(/^http:/i, 'https:');
    var x; try { x = new URL(u); } catch (e) { return null; }
    if (!/^https?:$/.test(x.protocol)) return null;
    var h = x.hostname.toLowerCase().replace(/^(www|m)\./, ''), p = x.pathname, id, m;

    if (/(^|\.)youtube(-nocookie)?\.com$/.test(h) || h === 'youtu.be') {
      id = h === 'youtu.be' ? p.slice(1).split('/')[0] : (x.searchParams.get('v') || ((p.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1]));
      if (id && /^[\w-]{11}$/.test(id)) return { kind: 'youtube', id: id, start: pt(x.searchParams.get('t') || x.searchParams.get('start')), poster: 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' };
    }
    if (h === 'vimeo.com' || h === 'player.vimeo.com') {
      m = p.match(/(\d{6,})(?:\/([a-f0-9]{8,}))?/);
      if (m) return { kind: 'vimeo', id: m[1], hash: m[2] || x.searchParams.get('h') || '' };
    }
    if (h === 'drive.google.com' || h === 'docs.google.com') {
      m = p.match(/\/d\/([\w-]+)/); id = m ? m[1] : x.searchParams.get('id');
      if (id) return { kind: 'iframe', src: 'https://drive.google.com/file/d/' + id + '/preview' };
    }
    if (h === 'dailymotion.com' || h === 'dai.ly') {
      m = (h === 'dai.ly' ? p : p.replace(/^\/(?:embed\/)?video\//, '/')).match(/\/?(x[a-z0-9]+)/i);
      if (m) return { kind: 'iframe', src: 'https://www.dailymotion.com/embed/video/' + m[1] };
    }
    if (h === 'facebook.com' || h === 'fb.watch') return { kind: 'iframe', src: 'https://www.facebook.com/plugins/video.php?show_text=false&href=' + encodeURIComponent(u) };
    if (h === 'streamable.com' && (m = p.match(/\/(?:e\/)?(\w+)$/))) return { kind: 'iframe', src: 'https://streamable.com/e/' + m[1] };
    if (h === 'loom.com' && (m = p.match(/\/(?:share|embed)\/(\w+)/))) return { kind: 'iframe', src: 'https://www.loom.com/embed/' + m[1] };
    if (/(^|\.)dropbox\.com$/.test(h)) { x.hostname = 'dl.dropboxusercontent.com'; x.searchParams.set('dl', '1'); return { kind: 'file', src: x.toString() }; }

    if (/\.m3u8$/i.test(p) || /m3u8/i.test(x.search)) return { kind: 'hls', src: u };
    if (/\.mpd$/i.test(p)) return { kind: 'dash', src: u };
    if (/\.(mp4|m4v|webm|ogv|ogg|mov|mkv|3gp|mp3|m4a|wav|aac|opus)$/i.test(p)) return { kind: 'file', src: u };
    return { kind: 'auto', src: u };
  }

  /* ===== 2) المحرّكات: كل محرّك بيعرض نفس الواجهة =====
     play pause seek time dur setRate getRate setVol getVol setMuted isMuted buf levels level setLevel destroy */
  function eHtml(stage, S, H) {
    var v = document.createElement('video'), hls, dash, lv = [], cur = 'auto', tries = 0;
    v.className = 'vp-media'; v.preload = 'auto'; v.autoplay = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.setAttribute('controlsList', 'nodownload'); v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    stage.appendChild(v);
    v.addEventListener('playing', function () { H.state('playing'); });
    v.addEventListener('pause', function () { if (!v.ended) H.state('paused'); });
    v.addEventListener('ended', function () { H.state('ended'); });
    v.addEventListener('waiting', function () { H.state('buffering'); });
    v.addEventListener('loadedmetadata', H.ready);
    v.addEventListener('error', function () { if (!hls && !dash) H.fail('m' + (v.error ? v.error.code : 0)); });
    var label = function (h, b) { return h ? h + 'p' : Math.round(b / 1000) + 'k'; };
    if (S.kind === 'hls') {
      lib(LIB.hls).then(function () {
        if (!w.Hls || !Hls.isSupported()) { v.src = S.src; return; }
        hls = new Hls({ enableWorker: true });
        hls.on(Hls.Events.MANIFEST_PARSED, function (e, d) { lv = d.levels.map(function (l, i) { return { id: i, label: label(l.height, l.bitrate) }; }); });
        hls.on(Hls.Events.ERROR, function (e, d) {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR && tries++ < 3) hls.startLoad();
          else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && tries++ < 3) hls.recoverMediaError();
          else H.fail('hls');
        });
        hls.loadSource(S.src); hls.attachMedia(v);
      }).catch(function () { v.src = S.src; });
    } else if (S.kind === 'dash') {
      lib(LIB.dash).then(function () {
        dash = dashjs.MediaPlayer().create(); dash.initialize(v, S.src, false);
        dash.on('streamInitialized', function () { lv = dash.getBitrateInfoListFor('video').map(function (b) { return { id: b.qualityIndex, label: label(b.height, b.bitrate) }; }); });
        dash.on('error', function () { H.fail('dash'); });
      }).catch(function () { H.fail('dash'); });
    } else v.src = S.src;
    return {
      el: v,
      play: function () { var r = v.play(); if (r && r.catch) r.catch(function () { H.state('paused'); }); },
      pause: function () { v.pause(); }, seek: function (t) { v.currentTime = t; },
      time: function () { return v.currentTime || 0; }, dur: function () { return isFinite(v.duration) ? v.duration : 0; },
      setRate: function (r) { v.playbackRate = r; }, getRate: function () { return v.playbackRate; },
      setVol: function (f) { v.volume = f; }, getVol: function () { return v.volume; },
      setMuted: function (b) { v.muted = b; }, isMuted: function () { return v.muted; },
      buf: function () { var d = v.duration, b = v.buffered; if (!d || !b.length) return 0; for (var i = 0; i < b.length; i++) if (v.currentTime >= b.start(i) && v.currentTime <= b.end(i) + .5) return b.end(i) / d; return 0; },
      levels: function () { return lv; }, level: function () { return cur; },
      setLevel: function (id) {
        cur = id;
        if (hls) hls.currentLevel = id === 'auto' ? -1 : id;
        else if (dash) { dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: id === 'auto' } } } }); if (id !== 'auto') dash.setQualityFor('video', id); }
      },
      destroy: function () { try { hls && hls.destroy(); dash && dash.reset(); v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }
    };
  }

  function eYT(stage, S, H) {
    var host = document.createElement('div'), yt = null, ok = false; stage.appendChild(host);
    new Promise(function (res) {
      if (w.YT && YT.Player) return res();
      var prev = w.onYouTubeIframeAPIReady; w.onYouTubeIframeAPIReady = function () { if (prev) prev(); res(); };
      lib(LIB.yt).catch(function () { H.fail('net'); });
    }).then(function () {
      yt = new YT.Player(host, {
        videoId: S.id,
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, fs: 0, playsinline: 1, autoplay: 1, start: S.start || 0 },
        events: {
          onReady: function () { ok = true; H.ready(); yt.playVideo(); },
          onStateChange: function (e) { var Y = YT.PlayerState, s = e.data; H.state(s === Y.PLAYING ? 'playing' : s === Y.PAUSED ? 'paused' : s === Y.ENDED ? 'ended' : s === Y.BUFFERING ? 'buffering' : null); },
          onError: function (e) { H.fail('yt' + e.data); }
        }
      });
    });
    var g = function (f, d) { return ok ? (yt[f]() || d) : d; };
    return {
      play: function () { ok && yt.playVideo(); }, pause: function () { ok && yt.pauseVideo(); }, seek: function (t) { ok && yt.seekTo(t, true); },
      time: function () { return g('getCurrentTime', 0); }, dur: function () { return g('getDuration', 0); },
      setRate: function (r) { ok && yt.setPlaybackRate(r); }, getRate: function () { return g('getPlaybackRate', 1); },
      setVol: function (f) { ok && yt.setVolume(f * 100); }, getVol: function () { return g('getVolume', 100) / 100; },
      setMuted: function (b) { ok && (b ? yt.mute() : yt.unMute()); }, isMuted: function () { return ok ? yt.isMuted() : false; },
      buf: function () { return g('getVideoLoadedFraction', 0); },
      destroy: function () { try { yt && yt.destroy(); } catch (e) {} }
    };
  }

  function eVimeo(stage, S, H) {
    var host = document.createElement('div'), vm, t = 0, d = 0, lt = 0, rate = 1, vol = 1, mu = false, pl = false, b = 0, lv = [], cur = 'auto';
    stage.appendChild(host);
    lib(LIB.vimeo).then(function () {
      var o = { controls: false, autoplay: true, playsinline: true, title: false, byline: false, portrait: false, dnt: true, keyboard: false, pip: false };
      if (S.hash) o.url = 'https://vimeo.com/' + S.id + '/' + S.hash; else o.id = +S.id;
      vm = new Vimeo.Player(host, o);
      vm.on('timeupdate', function (e) { t = e.seconds; d = e.duration; lt = performance.now(); });
      vm.on('play', function () { pl = true; H.state('playing'); }); vm.on('playing', function () { pl = true; H.state('playing'); });
      vm.on('pause', function () { pl = false; H.state('paused'); }); vm.on('ended', function () { pl = false; H.state('ended'); });
      vm.on('bufferstart', function () { H.state('buffering'); }); vm.on('bufferend', function () { H.state(pl ? 'playing' : 'paused'); });
      vm.on('progress', function (e) { b = e.percent; }); vm.on('volumechange', function (e) { vol = e.volume; });
      vm.on('playbackratechange', function (e) { rate = e.playbackRate; });
      vm.on('error', function () { H.fail('vimeo'); });
      vm.ready().then(function () {
        H.ready(); vm.getDuration().then(function (x) { d = x; });
        vm.getQualities().then(function (q) { lv = q.filter(function (x) { return x.id !== 'auto'; }).map(function (x) { return { id: x.id, label: x.label }; }); }).catch(function () {});
      }).catch(function () { H.fail('vimeo'); });
    }).catch(function () { H.fail('net'); });
    return {
      play: function () { vm && vm.play().catch(function () {}); }, pause: function () { vm && vm.pause(); },
      seek: function (x) { t = x; lt = performance.now(); vm && vm.setCurrentTime(x); },
      time: function () { return pl ? Math.min(d || 1e9, t + (performance.now() - lt) / 1000 * rate) : t; }, dur: function () { return d; },
      setRate: function (r) { rate = r; vm && vm.setPlaybackRate(r); }, getRate: function () { return rate; },
      setVol: function (f) { vol = f; vm && vm.setVolume(f); }, getVol: function () { return vol; },
      setMuted: function (m) { mu = m; vm && vm.setMuted(m); }, isMuted: function () { return mu; },
      buf: function () { return b; }, levels: function () { return lv; }, level: function () { return cur; },
      setLevel: function (id) { cur = id; vm && vm.setQuality(id); },
      destroy: function () { try { vm && vm.destroy(); } catch (e) {} }
    };
  }

  /* مصادر مبتقدرش نتحكم فيها (Drive / Facebook / أي صفحة): بتظهر بأدواتها الأصلية */
  function eFrame(stage, S, H) {
    var f = document.createElement('iframe'); f.src = S.src; f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write'; stage.appendChild(f);
    setTimeout(H.ready, 300);
    return { frame: true, destroy: function () { f.remove(); } };
  }

  /* ===== 3) الواجهة (أدوات التحكم) ===== */
  var I = function (n) { return '<i class="fas fa-' + n + '"></i>'; };
  var TPL =
    '<div class="vp-stage"></div><div class="vp-catch"></div><div class="vp-spin"><i></i></div><div class="vp-boost">تسريع ×2</div>' +
    '<div class="vp-fail" hidden>' + I('triangle-exclamation') + '<p></p><button type="button" class="vp-retry">' + I('rotate-right') + ' إعادة المحاولة</button></div>' +
    '<div class="vp-ctrl"><div class="vp-seek"><div class="vp-seek-bar"><b class="vp-buf"></b><i class="vp-fill"></i></div><span class="vp-tip">0:00</span></div>' +
    '<div class="vp-row">' +
    '<button type="button" class="vp-b vp-pp" aria-label="تشغيل/إيقاف">' + I('play') + '</button>' +
    '<button type="button" class="vp-b vp-bk" aria-label="رجوع 10 ثوانٍ">' + I('rotate-left') + '<em>10</em></button>' +
    '<button type="button" class="vp-b vp-fw" aria-label="تقديم 10 ثوانٍ">' + I('rotate-right') + '<em>10</em></button>' +
    '<button type="button" class="vp-b vp-vb" aria-label="الصوت">' + I('volume-high') + '</button>' +
    '<input type="range" class="vp-vol" min="0" max="100" value="100" aria-label="مستوى الصوت">' +
    '<span class="vp-time">0:00 / 0:00</span><span class="vp-sp"></span>' +
    '<button type="button" class="vp-b vp-rate" aria-label="الإعدادات">1x</button>' +
    '<button type="button" class="vp-b vp-pip" aria-label="نافذة عائمة" hidden>' + I('clone') + '</button>' +
    '<button type="button" class="vp-b vp-fs" aria-label="ملء الشاشة">' + I('expand') + '</button></div>' +
    '<div class="vp-menu" hidden></div></div>';

  var MSG = { yt100: 'الفيديو غير متاح أو تم حذفه.', yt101: 'صاحب الفيديو منع تشغيله خارج يوتيوب.', yt150: 'صاحب الفيديو منع تشغيله خارج يوتيوب.', yt2: 'رابط الفيديو غير صحيح.', m2: 'في مشكلة في الاتصال بالإنترنت.', m3: 'الملف تالف أو غير مدعوم في متصفحك.', m4: 'الرابط لا يعمل أو صيغة الفيديو غير مدعومة.', net: 'تعذر تحميل مكتبة التشغيل، تأكد من الاتصال.' };

  function mount(wrap, src, hooks) {
    hooks = hooks || {};
    var S = typeof src === 'string' ? resolve(src) : src;
    if (!S) { if (hooks.onFail) hooks.onFail('bad'); return null; }
    wrap.classList.add('vp-player'); wrap.tabIndex = 0;
    wrap.insertAdjacentHTML('beforeend', TPL);
    var q = function (c) { return wrap.querySelector('.' + c); };
    var stage = q('vp-stage'), seek = q('vp-seek'), tip = q('vp-tip'), fill = q('vp-fill'), bufEl = q('vp-buf'), menu = q('vp-menu'),
      pp = q('vp-pp'), vb = q('vp-vb'), vr = q('vp-vol'), tm = q('vp-time'), rb = q('vp-rate'), fsb = q('vp-fs'), pipb = q('vp-pip'),
      fail = q('vp-fail'), catcher = q('vp-catch');
    var E = null, isPlay = false, ready = false, ht = null, dragging = false, menuOpen = false, lastVol = 1, engaged = false, curS = S, pseudo = false;

    var P = {
      tracked: true, src: S,
      play: function () { E && E.play && E.play(); }, pause: function () { E && E.pause && E.pause(); },
      toggle: function () { isPlay ? P.pause() : P.play(); },
      seek: function (t) { if (E && E.seek) E.seek(Math.max(0, Math.min(P.dur() || 1e9, t))); },
      by: function (d) { P.seek(P.time() + d); },
      time: function () { return E && E.time ? E.time() : 0; }, dur: function () { return E && E.dur ? E.dur() : 0; },
      playing: function () { return isPlay; }, rate: function () { return E && E.getRate ? E.getRate() : 1; },
      setRate: function (r) { E && E.setRate && E.setRate(r); rb.textContent = r + 'x'; }
    };

    function spin(on) { wrap.classList.toggle('is-buffering', !!on); }
    function showBar() {
      wrap.classList.remove('controls-hidden'); clearTimeout(ht);
      ht = setTimeout(function () { if (isPlay && !menuOpen && !dragging) wrap.classList.add('controls-hidden'); }, 3500);
    }
    function onState(s) {
      if (!s) return;
      if (s === 'buffering') { spin(true); return; }
      spin(false); isPlay = s === 'playing';
      pp.innerHTML = I(isPlay ? 'pause' : 'play');
      if (isPlay) { fail.hidden = true; showBar(); } else { wrap.classList.remove('controls-hidden'); clearTimeout(ht); }
      if (hooks.onState) hooks.onState(s);
    }
    function onReady() { ready = true; spin(false); if (hooks.onReady) hooks.onReady(); }
    function onFail(code) {
      if (curS.kind === 'auto') { boot({ kind: 'iframe', src: curS.src, auto: true }); return; }  // مش ملف فيديو: جرّبه كصفحة مضمّنة
      spin(false); isPlay = false; fail.querySelector('p').textContent = MSG[code] || 'تعذر تشغيل الفيديو. جرّب مرة تانية أو بلّغ المسؤول.';
      fail.hidden = false; wrap.classList.remove('controls-hidden'); if (hooks.onFail) hooks.onFail(code);
    }
    function boot(s) {
      curS = s; ready = false; fail.hidden = true; spin(true);
      if (E && E.destroy) E.destroy(); stage.innerHTML = '';
      var H = { state: onState, ready: onReady, fail: onFail }, k = s.kind;
      E = k === 'youtube' ? eYT(stage, s, H) : k === 'vimeo' ? eVimeo(stage, s, H) : k === 'iframe' ? eFrame(stage, s, H) : eHtml(stage, s, H);
      P.tracked = !E.frame; wrap.classList.toggle('vp-plain', !!E.frame);
      pipb.hidden = !(E.el && document.pictureInPictureEnabled);
    }

    /* القائمة: السرعة + الجودة */
    function renderMenu() {
      var rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], lv = E && E.levels ? E.levels() : [], r = P.rate(), h;
      h = '<div class="vp-mh">سرعة التشغيل</div><div class="vp-mg">' + rates.map(function (x) { return '<button type="button" data-r="' + x + '"' + (x === r ? ' class="on"' : '') + '>' + (x === 1 ? 'عادي' : x + 'x') + '</button>'; }).join('') + '</div>';
      if (lv.length) { var c = E.level(); h += '<div class="vp-mh">الجودة</div><div class="vp-mg"><button type="button" data-q="auto"' + (c === 'auto' ? ' class="on"' : '') + '>تلقائي</button>' + lv.slice().reverse().map(function (x) { return '<button type="button" data-q="' + x.id + '"' + (String(c) === String(x.id) ? ' class="on"' : '') + '>' + x.label + '</button>'; }).join('') + '</div>'; }
      menu.innerHTML = h;
    }
    function toggleMenu(open) {
      menuOpen = open === undefined ? !menuOpen : open; menu.hidden = !menuOpen;
      if (menuOpen) { renderMenu(); clearTimeout(ht); } else showBar();
    }
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.r) P.setRate(+b.dataset.r);
      if (b.dataset.q !== undefined) E.setLevel(b.dataset.q === 'auto' ? 'auto' : (isNaN(b.dataset.q) ? b.dataset.q : +b.dataset.q));
      renderMenu();
    });
    rb.onclick = function () { toggleMenu(); };

    /* أزرار */
    pp.onclick = function () { P.toggle(); showBar(); };
    q('vp-bk').onclick = function () { P.by(-10); flash('back'); showBar(); };
    q('vp-fw').onclick = function () { P.by(10); flash('fwd'); showBar(); };
    q('vp-retry').onclick = function () { boot(S); };
    function flash(side) {
      var el = document.createElement('div'); el.className = 'vp-flash ' + side;
      el.innerHTML = side === 'fwd' ? '10 ثوانٍ ' + I('forward') : I('backward') + ' 10 ثوانٍ'; wrap.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('show'); });
      setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 200); }, 550);
    }

    /* الصوت */
    function volUI() { var m = E && E.isMuted && E.isMuted(), v = E && E.getVol ? E.getVol() : 1; vb.innerHTML = I(m || !v ? 'volume-xmark' : v < .5 ? 'volume-low' : 'volume-high'); vr.value = m ? 0 : Math.round(v * 100); }
    vr.oninput = function () { var v = vr.value / 100; E.setVol(v); E.setMuted(!v); if (v) lastVol = v; volUI(); };
    vb.onclick = function () { if (E.isMuted() || !E.getVol()) { E.setMuted(false); E.setVol(lastVol || 1); } else { lastVol = E.getVol(); E.setMuted(true); } volUI(); };

    /* شريط التقدّم */
    function frac(e) { var r = seek.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); }
    function paintSeek(f) { fill.style.width = f * 100 + '%'; seek.querySelector('.vp-seek-bar').style.setProperty('--p', f * 100 + '%'); }
    seek.addEventListener('pointerdown', function (e) { dragging = true; seek.setPointerCapture(e.pointerId); wrap.classList.add('is-seeking'); paintSeek(frac(e)); });
    seek.addEventListener('pointermove', function (e) { var f = frac(e); tip.style.left = f * 100 + '%'; tip.textContent = fmt(f * P.dur()); if (dragging) paintSeek(f); });
    seek.addEventListener('pointerup', function (e) { if (!dragging) return; dragging = false; wrap.classList.remove('is-seeking'); P.seek(frac(e) * P.dur()); showBar(); });
    seek.addEventListener('pointercancel', function () { dragging = false; wrap.classList.remove('is-seeking'); });

    /* ملء الشاشة (وعلى الآيفون: وضع ملء شاشة بديل لأن iOS مبيدعمش عناصر غير video) */
    var isFs = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement) || pseudo; };
    function fsUI() { fsb.innerHTML = I(isFs() ? 'compress' : 'expand'); if (screen.orientation) { try { isFs() ? screen.orientation.lock('landscape').catch(function () {}) : screen.orientation.unlock(); } catch (e) {} } }
    function toggleFs() {
      if (pseudo) { pseudo = false; wrap.classList.remove('vp-pseudo-fs'); document.documentElement.classList.remove('vp-lock'); return fsUI(); }
      if (isFs()) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      var rq = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
      if (rq) { var r = rq.call(wrap); if (r && r.catch) r.catch(function () {}); }
      else { pseudo = true; wrap.classList.add('vp-pseudo-fs'); document.documentElement.classList.add('vp-lock'); fsUI(); }
    }
    fsb.onclick = toggleFs; document.addEventListener('fullscreenchange', fsUI); document.addEventListener('webkitfullscreenchange', fsUI);
    pipb.onclick = function () { if (document.pictureInPictureElement) document.exitPictureInPicture(); else if (E.el) E.el.requestPictureInPicture().catch(function () {}); };

    /* لمس وماوس: ضغطتين = ±10 ث، ضغط مطوّل = تسريع ×2، ماوس: نقرة = تشغيل/إيقاف ونقرتين = ملء الشاشة */
    (function () {
      var tapT = null, lastT = 0, lastSide = null, pressT = null, boost = false, prev = 1, sx = 0, sy = 0;
      var stopBoost = function () { clearTimeout(pressT); pressT = null; if (boost) { boost = false; wrap.classList.remove('speed-boost-active'); P.setRate(prev || 1); return true; } return false; };
      catcher.addEventListener('pointerdown', function (e) {
        sx = e.clientX; sy = e.clientY; boost = false; if (menuOpen) toggleMenu(false);
        if (e.pointerType === 'mouse') return;
        pressT = setTimeout(function () { boost = true; prev = P.rate(); P.setRate(2); wrap.classList.add('speed-boost-active'); }, 400);
      });
      catcher.addEventListener('pointermove', function (e) { if (pressT && (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12)) { clearTimeout(pressT); pressT = null; } });
      catcher.addEventListener('pointercancel', stopBoost);
      catcher.addEventListener('pointerup', function (e) {
        if (stopBoost()) return;
        if (e.pointerType === 'mouse') { P.toggle(); showBar(); return; }
        var r = catcher.getBoundingClientRect(), side = e.clientX - r.left > r.width / 2 ? 'right' : 'left', now = Date.now();
        if (now - lastT < 320 && side === lastSide) { clearTimeout(tapT); lastT = 0; lastSide = null; P.by(side === 'right' ? 10 : -10); flash(side === 'right' ? 'fwd' : 'back'); }
        else {
          lastT = now; lastSide = side; clearTimeout(tapT);
          tapT = setTimeout(function () { lastT = 0; lastSide = null; wrap.classList.contains('controls-hidden') ? showBar() : (isPlay && wrap.classList.add('controls-hidden')); }, 320);
        }
      });
      catcher.addEventListener('dblclick', function () { toggleFs(); });
    })();
    wrap.addEventListener('mousemove', showBar); q('vp-ctrl').addEventListener('pointerdown', showBar);

    /* اختصارات الكيبورد */
    document.addEventListener('pointerdown', function (e) { engaged = wrap.contains(e.target); if (menuOpen && !menu.contains(e.target) && e.target !== rb) toggleMenu(false); });
    document.addEventListener('keydown', function (e) {
      var t = e.target, k = e.key;
      if (!engaged || !ready || P.tracked === false || e.ctrlKey || e.metaKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range') || (t && t.isContentEditable)) return;
      var done = true, rs = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], i = rs.indexOf(P.rate());
      if (k === ' ' || k === 'k' || k === 'K') P.toggle();
      else if (k === 'ArrowLeft' || k === 'j' || k === 'J') { P.by(-10); flash('back'); }
      else if (k === 'ArrowRight' || k === 'l' || k === 'L') { P.by(10); flash('fwd'); }
      else if (k === 'ArrowUp') { E.setMuted(false); E.setVol(Math.min(1, E.getVol() + .1)); volUI(); }
      else if (k === 'ArrowDown') { E.setVol(Math.max(0, E.getVol() - .1)); volUI(); }
      else if (k === 'm' || k === 'M') vb.onclick();
      else if (k === 'f' || k === 'F') toggleFs();
      else if (k === 'Escape' && pseudo) toggleFs();
      else if (/^[0-9]$/.test(k)) P.seek(P.dur() * (+k) / 10);
      else if (k === '>' && i < rs.length - 1) P.setRate(rs[i + 1]);
      else if (k === '<' && i > 0) P.setRate(rs[i - 1]);
      else done = false;
      if (done) { e.preventDefault(); showBar(); }
    });

    /* تحديث دوري للواجهة */
    var timer = setInterval(function () {
      if (!wrap.isConnected) { clearInterval(timer); return; }
      if (!E || !ready || E.frame) { if (hooks.onTick) hooks.onTick(P); return; }
      var d = P.dur(), c = P.time();
      if (!dragging) { paintSeek(d ? c / d : 0); }
      bufEl.style.width = Math.min(100, E.buf() * 100) + '%';
      tm.textContent = fmt(c) + ' / ' + fmt(d);
      if (!menuOpen) rb.textContent = P.rate() + 'x';
      if (hooks.onTick) hooks.onTick(P);
    }, 250);

    P.destroy = function () { clearInterval(timer); E && E.destroy && E.destroy(); };
    boot(S); volUI();
    return P;
  }

  w.ASBPlayer = { resolve: resolve, mount: mount, fmt: fmt };
})(typeof window !== 'undefined' ? window : globalThis);

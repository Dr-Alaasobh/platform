/* ============================================================
   الاتصال بقاعدة بيانات Firebase (Realtime Database)
   - المشروع: alaa-41089
   - مفيش أي بيانات تجريبية: كل حاجة بتتقرا وبتتكتب على قاعدة البيانات مباشرة.
   - الطالب بيدخل بكود السنتر (الكود = uid)، مفيش Firebase Auth.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCz-c2GPbQ_k9PuOc9SZpKqzL124ZtB1Qc",
  authDomain: "alaa-41089.firebaseapp.com",
  databaseURL: "https://alaa-41089-default-rtdb.firebaseio.com",
  projectId: "alaa-41089",
  storageBucket: "alaa-41089.firebasestorage.app",
  messagingSenderId: "635819269157",
  appId: "1:635819269157:web:a52d203b659b7923e673cc",
  measurementId: "G-NJJSFYFTKB"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ===== "المصادقة": كود السنتر محفوظ في الجهاز، وهو نفسه uid الطالب ===== */
(function () {
  var SES = 'asb_session_v2', OK = /^[0-9A-Za-z_-]{4,40}$/;
  var cbs = [];
  /* الجلسة بتتخزن في 5 أماكن (localStorage + sessionStorage + كوكي سنة + IndexedDB + window.name) علشان لو المتصفح مسح واحد منهم
     (متصفحات فيسبوك/واتساب، سفاري بعد أسبوع، تنظيف الذاكرة) الطالب ما يتطردش لصفحة الدخول.
     أي مكان يتمسح بيتعالج تلقائيًا من الأماكن التانية، والجلسة بتتجدد كل ما الطالب يفتح صفحة أو يرجع للتطبيق. */
  function idb(op, v) {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open('asb_auth', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onerror = function () { res(null); };
        r.onsuccess = function () {
          try {
            var tx = r.result.transaction('kv', op === 'get' ? 'readonly' : 'readwrite'), s = tx.objectStore('kv');
            var q = op === 'get' ? s.get(SES) : op === 'set' ? s.put(v, SES) : s.delete(SES);
            q.onsuccess = function () { res(op === 'get' ? q.result : true); };
            q.onerror = function () { res(null); };
            tx.oncomplete = function () { r.result.close(); };
          } catch (e) { res(null); }
        };
      } catch (e) { res(null); }
    });
  }
  function wr(v) {
    try { localStorage.setItem(SES, v); } catch (e) {}
    try { sessionStorage.setItem(SES, v); } catch (e) {}
    try { document.cookie = 'asb_s=' + v + '; max-age=31536000; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch (e) {}
    try { if (!window.name || /^asb_s=/.test(window.name)) window.name = 'asb_s=' + v; } catch (e) {}
    idb('set', v);
  }
  function rd() {
    var v = null, m;
    try { v = localStorage.getItem(SES); } catch (e) {}
    if (!v) { try { v = sessionStorage.getItem(SES); } catch (e) {} }
    if (!v) { try { m = document.cookie.match(/(?:^|; )asb_s=([^;]+)/); v = m ? decodeURIComponent(m[1]) : null; } catch (e) {} }
    if (!v) { try { m = /^asb_s=(.+)$/.exec(window.name || ''); v = m ? m[1] : null; } catch (e) {} }
    if (v && OK.test(v)) { try { if (localStorage.getItem(SES) !== v) wr(v); } catch (e) {} return v; }
    return null;
  }
  function clr() {
    try { localStorage.removeItem(SES); } catch (e) {}
    try { sessionStorage.removeItem(SES); } catch (e) {}
    try { document.cookie = 'asb_s=; max-age=0; path=/'; } catch (e) {}
    try { if (/^asb_s=/.test(window.name)) window.name = ''; } catch (e) {}
    return idb('del');
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  /* لو كل الأماكن السريعة فاضية، بنقرا من IndexedDB قبل ما نقرر إن الطالب مش داخل */
  var ready = rd() ? Promise.resolve() : idb('get').then(function (v) { if (v && OK.test(v)) wr(v); });
  /* تجديد الجلسة (بيمدّ عمر الكوكي ويعالج أي مكان اتمسح) */
  function renew() { var v = rd(); if (v) wr(v); }
  ready.then(renew);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') renew(); });
  window.addEventListener('pageshow', renew); window.addEventListener('pagehide', renew);
  setInterval(renew, 300000);
  function currentUser() { var c = rd(); return c ? { uid: c, displayName: '', email: '' } : null; }
  window.auth = {
    get currentUser() { return currentUser(); },
    onAuthStateChanged: function (cb) { ready.then(function () { cb(currentUser()); }); return function () {}; },
    /* الخروج الصريح (أو الحظر) بيمنع الدخول الصامت من حفظ كلمات المرور، علشان الطالب ما يرجعش لوحده */
    signOut: function () {
      try { if (navigator.credentials && navigator.credentials.preventSilentAccess) navigator.credentials.preventSilentAccess(); } catch (e) {}
      return clr().then(function () {});
    }
  };

  window.CenterAuth = {
    session: function () { return rd(); },
    login: function (code) { wr(String(code)); },
    /* بيرجّع: هل الكود موجود؟ هل الطالب سجّل بياناته؟ واسم السنتر (من أول 4 أرقام) */
    lookup: function (code) {
      return Promise.all([
        db.ref('codes/' + code).once('value'),
        db.ref('users/' + code).once('value'),
        db.ref('centers/' + String(code).slice(0, 4)).once('value')
      ]).then(function (r) {
        var u = r[1].val();
        return { exists: r[0].exists(), registered: !!(u && u.name), centerName: r[2].val() || '', user: u };
      });
    },
    hash: function (pass, code) {
      var str = 'asb|' + code + '|' + pass;
      if (window.crypto && crypto.subtle) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
          return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
        });
      }
      var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
      return Promise.resolve('x' + h.toString(16));
    },
    register: function (code, data, centerName, password) {
      var self = this;
      return db.ref('phoneIndex/' + data.phone).once('value').then(function (ps) {
        if (ps.exists() && ps.val() !== code) { var e = new Error('phone-used'); e.phoneUsed = true; throw e; }
        return self.hash(password, code);
      }).then(function (h) {
        return db.ref('users/' + code).set(Object.assign({
          createdAt: firebase.database.ServerValue.TIMESTAMP, centerCode: code, centerName: centerName || '', passHash: h
        }, data));
      }).then(function () { return db.ref('phoneIndex/' + data.phone).set(code); });
    },
    setPassword: function (code, password) {
      return this.hash(password, code).then(function (h) { return db.ref('users/' + code + '/passHash').set(h); });
    },
    /* دخول برقم الهاتف وكلمة المرور */
    loginPhone: function (phone, password, preHash) {
      var self = this, intl = '+20' + phone.slice(1);
      /* 1) الفهرس السريع  2) لو الطالب مسجّل قبل كده بدون فهرس، نبحث عنه في users بالرقم */
      function findCode() {
        return db.ref('phoneIndex/' + phone).once('value').then(function (ps) {
          var c = ps.val(); if (c && /^[0-9]{12}$/.test(String(c))) return String(c);
          return searchUsers(phone).then(function (c2) { return c2 || searchUsers(intl); });
        });
      }
      function searchUsers(v) {
        return db.ref('users').orderByChild('phone').equalTo(v).limitToFirst(5).once('value').then(function (qs) {
          var found = null;
          qs.forEach(function (ch) { var u = ch.val(); if (!found && u && u.phone === v && /^[0-9]{12}$/.test(ch.key)) found = ch.key; });
          return found;
        });
      }
      return findCode().then(function (code) {
        if (!code) return { ok: false, reason: 'nophone' };
        return db.ref('users/' + code).once('value').then(function (us) {
          var u = us.val(); if (!u) return { ok: false, reason: 'nophone' };
          if (!u.passHash) { self.login(code); return { ok: false, reason: 'nopass', code: code }; }
          return (preHash ? Promise.resolve(preHash) : self.hash(password, code)).then(function (h) {
            if (h !== u.passHash) return { ok: false, reason: 'wrong' };
            db.ref('phoneIndex/' + phone).set(code).catch(function () {});
            self.login(code);
            return { ok: true, code: code, hash: h };
          });
        });
      });
    }
  };
})();

/* ===== الحظر التلقائي (كتاب الحضور والغياب) =====
   الغياب المتواصل والدفع بيتحسبوا في لوحة المسئول لحظة التسجيل.
   هنا بنتأكد من الاشتراك وقت دخول الطالب (علشان مرور الشهر مش محتاج المسئول يفتح اللوحة). */
window.AttGuard = (function () {
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function mk(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function overdue(u, pay, grace, now) {
    var out = [];
    if (!u || !u.attFrom) return out;
    var y = +u.attFrom.slice(0, 4), m = +u.attFrom.slice(5, 7);
    for (var i = 0; i < 120; i++) {
      if (now < new Date(y, m, 1).getTime() + grace * 864e5) break;
      var k = y + '-' + pad(m), p = pay && pay[k];
      if (!(p && (p.status === 'paid' || p.status === 'free'))) out.push(k);
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }
  function msg(u) {
    var r = (u && u.blockReason) || '';
    if (r === 'absence') return 'تم إيقاف حسابك بسبب الغياب عن حصتين متتاليتين. هيتفتح تلقائيًا أول ما تحضر الحصة الجاية، أو تواصل مع المسئول.';
    if (r === 'payment') return 'تم إيقاف حسابك لعدم دفع اشتراك الشهر. هيتفتح تلقائيًا أول ما يتسجل دفعك، أو تواصل مع المسئول.';
    if (r === 'absence+payment') return 'تم إيقاف حسابك بسبب الغياب المتواصل وعدم دفع الاشتراك. تواصل مع المسئول.';
    return 'تم إيقاف حسابك من المنصة. تواصل مع المسئول.';
  }
  function refresh(uid, u) {
    if (!u || u.blocked === true || !u.attFrom) return Promise.resolve(u);
    return Promise.all([db.ref('attSettings/graceDays').once('value'), db.ref('attPayments/' + uid).once('value')]).then(function (r) {
      var now = Date.now(), od = overdue(u, r[1].val(), +r[0].val() || 0, now), ov = u.attOverride;
      if (!od.length || (ov && ov.month === mk(now))) return u;
      var up = {};
      up['users/' + uid + '/blocked'] = true; up['users/' + uid + '/blockReason'] = 'payment'; up['users/' + uid + '/blockedAt'] = now;
      up['attLog/' + db.ref('attLog').push().key] = { code: uid, name: u.name || uid, type: 'block', reason: 'payment', by: 'auto', at: now };
      u.blocked = true; u.blockReason = 'payment'; u.blockedAt = now;
      return db.ref().update(up).catch(function () {}).then(function () { return u; });
    }).catch(function () { return u; });
  }
  /* بديل db.ref('users/'+uid).once('value') بيرجّع نفس الشكل بعد فحص الاشتراك */
  function userSnap(uid) {
    return db.ref('users/' + uid).once('value').then(function (s) {
      return refresh(uid, s.val()).then(function (x) { return { val: function () { return x; } }; });
    });
  }
  return { msg: msg, refresh: refresh, userSnap: userSnap };
})();

/* ===== رسالة الحظر العائمة (بديل alert) ===== */
(function () {
  var G = window.AttGuard; if (!G) return;
  var CSS = '.bkx{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,14,30,.62);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);font-family:"IBM Plex Sans Arabic","Cairo",sans-serif;direction:rtl;animation:bkf .25s ease}'
    + '.bkx *{box-sizing:border-box}'
    + '.bkc{--ac:#E5484D;--acb:#FDECEC;width:min(440px,100%);max-height:94vh;overflow:auto;background:var(--card-bg,#fff);color:var(--text,#0F1B33);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06);animation:bku .38s cubic-bezier(.2,.9,.3,1.15);text-align:center}'
    + '.bkc.abs{--ac:#D9822B;--acb:#FFF3DF}.bkc.pay{--ac:#E5484D;--acb:#FDECEC}.bkc.man{--ac:#2F5FD0;--acb:#EAF0FF}'
    + '[data-theme=dark] .bkc.abs{--acb:#33240F}[data-theme=dark] .bkc.pay{--acb:#34171A}[data-theme=dark] .bkc.man{--acb:#16264A}'
    + '.bkh{padding:30px 26px 18px;background:linear-gradient(180deg,var(--acb),transparent);border-radius:22px 22px 0 0}'
    + '.bki{width:84px;height:84px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;background:var(--card-bg,#fff);color:var(--ac);box-shadow:0 0 0 8px var(--acb),0 10px 26px rgba(0,0,0,.14);animation:bkp 2.4s ease-in-out infinite}'
    + '.bki svg{width:40px;height:40px}'
    + '.bkc h2{margin:0 0 6px;font:800 22px "Cairo","IBM Plex Sans Arabic",sans-serif;color:var(--text,#0F1B33)}'
    + '.bkn{margin:0;font-size:14px;color:var(--text-muted,#5B6B86)}.bkn b{color:var(--text,#0F1B33)}'
    + '.bkb{padding:4px 24px 24px}'
    + '.bkm{margin:12px 0 16px;font-size:14.5px;line-height:1.9;color:var(--text,#0F1B33)}'
    + '.bkr{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}.bkr span{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:99px;background:var(--acb);color:var(--ac);font-weight:700;font-size:12.5px}'
    + '.bks{text-align:start;background:var(--cream,#F0F4FA);border-radius:14px;padding:14px 16px;margin-bottom:18px}.bks h4{margin:0 0 8px;font:800 13.5px "Cairo",sans-serif;color:var(--text,#0F1B33)}'
    + '.bks div{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.7;color:var(--text,#0F1B33);margin-top:6px}.bks i{flex:0 0 22px;height:22px;border-radius:50%;background:var(--ac);color:#fff;display:grid;place-items:center;font:800 12px "Cairo",sans-serif;font-style:normal;margin-top:2px}'
    + '.bkt{min-height:20px;margin:-6px 0 12px;font-size:13px;font-weight:700;color:var(--ac)}.bkt.ok{color:#12A150}'
    + '.bka{display:flex;flex-direction:column;gap:9px}'
    + '.bkp1,.bkp2{font:700 15px "IBM Plex Sans Arabic","Cairo",sans-serif;border-radius:13px;padding:13px 18px;cursor:pointer;border:1.5px solid transparent;transition:.15s;min-height:48px}'
    + '.bkp1{background:linear-gradient(135deg,#2563EB,#1E40AF);color:#fff;box-shadow:0 8px 20px rgba(37,99,235,.32)}.bkp1:hover{transform:translateY(-1px)}.bkp1:disabled{opacity:.6;cursor:wait;transform:none}'
    + '.bkp2{background:transparent;color:var(--text-muted,#5B6B86);border-color:var(--border,#DFE5EF)}.bkp2:hover{background:var(--cream,#F0F4FA);color:var(--text,#0F1B33)}'
    + '.bkc.sh{animation:bks .4s}'
    + '@keyframes bkf{from{opacity:0}to{opacity:1}}@keyframes bku{from{opacity:0;transform:translateY(26px) scale(.94)}to{opacity:1;transform:none}}@keyframes bkp{0%,100%{box-shadow:0 0 0 8px var(--acb),0 10px 26px rgba(0,0,0,.14)}50%{box-shadow:0 0 0 14px var(--acb),0 10px 26px rgba(0,0,0,.14)}}@keyframes bks{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}'
    + '@media(max-width:480px){.bkx{align-items:flex-end;padding:0}.bkc{border-radius:22px 22px 0 0;width:100%}.bkh{padding-top:26px}}'
    + '@media(prefers-reduced-motion:reduce){.bkx,.bkc,.bki{animation:none!important}}';
  var IC = {
    absence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M9.5 13.5l5 5M14.5 13.5l-5 5"/></svg>',
    payment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/><circle cx="17" cy="15" r="1.2" fill="currentColor"/></svg>',
    manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/></svg>'
  };
  var T = {
    absence: { cls: 'abs', ic: 'absence', title: 'حسابك متوقف مؤقتًا', why: 'غياب حصتين متتاليتين', msg: 'اتوقف حسابك بسبب الغياب عن حصتين ورا بعض. مفيش حاجة تعملها غير إنك تحضر الحصة الجاية، وهيتفتح حسابك لوحده.', steps: ['احضر الحصة الجاية في ميعادها.', 'بمجرد تسجيل حضورك بيتفتح الحساب تلقائيًا.', 'اضغط «تحديث الحالة» وادخل على طول.'] },
    payment: { cls: 'pay', ic: 'payment', title: 'اشتراك الشهر لسه ما اتدفعش', why: 'عدم دفع الاشتراك الشهري', msg: 'اتوقف حسابك مؤقتًا لأن اشتراك الشهر ما اتسجلش. أول ما تدفع وبيتسجل الدفع، حسابك بيتفتح تلقائيًا.', steps: ['ادفع الاشتراك للمسئول في السنتر.', 'بعد تسجيل الدفع بيتفتح الحساب تلقائيًا.', 'اضغط «تحديث الحالة» وكمّل مذاكرتك.'] },
    both: { cls: 'pay', ic: 'payment', title: 'حسابك متوقف مؤقتًا', why: 'غياب متواصل + اشتراك غير مدفوع', msg: 'اتوقف حسابك بسبب الغياب المتواصل وعدم دفع الاشتراك. اتواصل مع المسئول علشان يتم فتح الحساب.', steps: ['ادفع الاشتراك للمسئول في السنتر.', 'احضر الحصة الجاية.', 'اضغط «تحديث الحالة» بعد ما يتسجل.'] },
    manual: { cls: 'man', ic: 'manual', title: 'تم إيقاف حسابك', why: 'إيقاف من المسئول', msg: 'تم إيقاف حسابك من المنصة بواسطة المسئول. اتواصل معاه علشان يتم فتح الحساب.', steps: ['اتواصل مع المسئول في السنتر.', 'بعد ما يفتح الحساب اضغط «تحديث الحالة».'] }
  };
  function pick(u) { var r = (u && u.blockReason) || ''; return r === 'absence' ? T.absence : r === 'payment' ? T.payment : r === 'absence+payment' ? T.both : T.manual; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  G.show = function (uid, u) {
    if (document.getElementById('bkx')) return;
    try { if (window.auth) auth.signOut(); } catch (e) {}
    var t = pick(u), st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var since = u && u.blockedAt ? new Date(u.blockedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    var first = ((u && u.name) || '').trim().split(' ').slice(0, 2).join(' ');
    var o = el('div', 'bkx'); o.id = 'bkx';
    var c = el('div', 'bkc ' + t.cls); c.setAttribute('role', 'alertdialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'bkT'); c.setAttribute('aria-describedby', 'bkM');
    c.innerHTML = '<div class="bkh"><div class="bki">' + IC[t.ic] + '</div><h2 id="bkT">' + t.title + '</h2>' + (first ? '<p class="bkn">يا <b>' + esc(first) + '</b></p>' : '') + '</div>'
      + '<div class="bkb"><p class="bkm" id="bkM">' + t.msg + '</p><div class="bkr"><span>' + t.why + '</span>' + (since ? '<span>من ' + since + '</span>' : '') + '</div>'
      + '<div class="bks"><h4>إزاي يتفتح حسابك؟</h4>' + t.steps.map(function (x, i) { return '<div><i>' + (i + 1) + '</i><span>' + x + '</span></div>'; }).join('') + '</div>'
      + '<div class="bkt" id="bkS" role="status" aria-live="polite"></div>'
      + '<div class="bka"><button class="bkp1" id="bkR">تحديث الحالة</button><button class="bkp2" id="bkO">رجوع لصفحة الدخول</button></div></div>';
    o.appendChild(c); document.body.appendChild(o);
    var prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    var R = c.querySelector('#bkR'), S = c.querySelector('#bkS');
    c.querySelector('#bkO').onclick = function () { document.body.style.overflow = prev; location.href = 'index.html'; };
    R.onclick = function () {
      R.disabled = true; R.textContent = 'جاري التحقق...'; S.className = 'bkt'; S.textContent = '';
      db.ref('users/' + uid).once('value').then(function (s) { return G.refresh(uid, s.val()); }).then(function (x) {
        if (x && x.blocked !== true) {
          S.className = 'bkt ok'; S.textContent = 'تم فتح حسابك — جاري الدخول...';
          try { CenterAuth.login(uid); } catch (e) {}
          setTimeout(function () { location.href = 'home.html'; }, 700);
        } else {
          R.disabled = false; R.textContent = 'تحديث الحالة'; S.textContent = 'الحساب لسه متوقف. تأكد إن المسئول سجّل حضورك أو دفعك.';
          c.classList.remove('sh'); void c.offsetWidth; c.classList.add('sh');
        }
      }).catch(function () { R.disabled = false; R.textContent = 'تحديث الحالة'; S.textContent = 'تعذر الاتصال، تأكد من الإنترنت وحاول تاني.'; });
    };
    setTimeout(function () { try { R.focus(); } catch (e) {} }, 60);
  };
})();

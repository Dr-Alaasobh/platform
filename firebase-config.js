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

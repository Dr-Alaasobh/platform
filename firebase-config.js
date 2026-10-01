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
  var SES = 'asb_session_v2';
  var cbs = [];
  function currentUser() { var c = localStorage.getItem(SES); return c ? { uid: c, displayName: '', email: '' } : null; }
  window.auth = {
    get currentUser() { return currentUser(); },
    onAuthStateChanged: function (cb) { setTimeout(function () { cb(currentUser()); }, 0); return function () {}; },
    signOut: function () { localStorage.removeItem(SES); return Promise.resolve(); }
  };

  window.CenterAuth = {
    session: function () { return localStorage.getItem(SES); },
    login: function (code) { localStorage.setItem(SES, code); },
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

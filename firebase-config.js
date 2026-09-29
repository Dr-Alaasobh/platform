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
    register: function (code, data, centerName) {
      return db.ref('users/' + code).set(Object.assign({
        createdAt: firebase.database.ServerValue.TIMESTAMP, centerCode: code, centerName: centerName || ''
      }, data));
    }
  };
})();

/* ============================================================
   app-shell.js — قشرة التطبيق المشتركة لموقع المستخدم
   ============================================================ */

/* (تم حذف نظام الإيميلات في النسخة التجريبية) */
function sendExamResultEmail() {}
function escapeHtmlEmail(s) { return s == null ? "" : String(s); }

function initBackToTop() {
  if (document.getElementById('backToTopBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'backToTopBtn';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'العودة لأعلى الصفحة');
  btn.innerHTML = icon('chevronUp', 'icon-md');
  document.body.appendChild(btn);

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', function () {
    btn.classList.toggle('show', window.scrollY > 420);
  }, { passive: true });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackToTop);
} else {
  initBackToTop();
}

/* ================= تأثير الموجة على الأزرار ================= */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn');
  if (!btn || btn.disabled) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement('span');
  span.className = 'btn-ripple';
  span.style.width = span.style.height = size + 'px';
  span.style.left = (e.clientX - rect.left - size / 2) + 'px';
  span.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(span);
  span.addEventListener('animationend', function () { span.remove(); });
});

/* ================= إشعارات Toast ================= */
function getToastStack() {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3800;
  const iconName = type === 'success' ? 'circleCheck' : type === 'error' ? 'circleXmark' : type === 'warning' ? 'circleInfo' : 'circleInfo';
  const stack = getToastStack();
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML =
    '<span class="toast-icon">' + icon(iconName, 'icon-sm') + '</span>' +
    '<span class="toast-text">' + escapeHtml(message) + '</span>' +
    '<button type="button" class="toast-close" aria-label="إغلاق">' + icon('xmark') + '</button>';
  stack.appendChild(el);
  function remove() {
    el.classList.add('hide');
    setTimeout(function () { el.remove(); }, 220);
  }
  el.querySelector('.toast-close').addEventListener('click', remove);
  const timer = setTimeout(remove, duration);
  el.addEventListener('mouseenter', function () { clearTimeout(timer); });
}
window.showToast = showToast;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
window.escapeHtml = escapeHtml;

function formatArabicDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
window.formatArabicDate = formatArabicDate;

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
window.extractYouTubeId = extractYouTubeId;

/* ================= نظام المستويات ================= */

const LEVEL_POINTS = 100;
const MAX_LEVEL = 1000;

const LEVEL_RANKS = [
  { key: 'bronze',   name: 'برونزي',  icon: 'medal', upTo: 50,   color: '#A9714A' },
  { key: 'silver',   name: 'فضي',     icon: 'medal', upTo: 150,  color: '#988AA6' },
  { key: 'gold',     name: 'ذهبي',    icon: 'award', upTo: 350,  color: '#C99A4A' },
  { key: 'platinum', name: 'بلاتيني', icon: 'gem',   upTo: 650,  color: '#AE845F' },
  { key: 'diamond',  name: 'الماسي',  icon: 'crown', upTo: 1000, color: '#C57CF8' }
];

function getLevelRank(level) {
  for (let i = 0; i < LEVEL_RANKS.length; i++) {
    if (level <= LEVEL_RANKS[i].upTo) return LEVEL_RANKS[i];
  }
  return LEVEL_RANKS[LEVEL_RANKS.length - 1];
}

function getUserTier(points) {
  points = Math.max(0, points || 0);
  let level = Math.floor(points / LEVEL_POINTS) + 1;
  if (level > MAX_LEVEL) level = MAX_LEVEL;

  const isMax = level >= MAX_LEVEL;
  const levelStartPoints = (level - 1) * LEVEL_POINTS;
  const pointsIntoLevel = isMax ? LEVEL_POINTS : Math.max(0, points - levelStartPoints);
  const pointsToNext = isMax ? 0 : Math.max(0, LEVEL_POINTS - pointsIntoLevel);
  const progress = isMax ? 100 : Math.max(0, Math.min(100, Math.round((pointsIntoLevel / LEVEL_POINTS) * 100)));
  const rank = getLevelRank(level);

  return {
    points: points,
    level: level,
    maxLevel: MAX_LEVEL,
    isMax: isMax,
    pointsToNext: pointsToNext,
    progress: progress,
    rank: rank,
    current: { name: 'المستوى ' + level, icon: rank.icon, color: rank.color },
    next: isMax ? null : { name: 'المستوى ' + (level + 1) }
  };
}
window.getUserTier = getUserTier;

/* ================= دوال المحاضرات والتقدم ================= */

function getSortedLessonIds(lessons) {
  const ids = Object.keys(lessons || {});
  return ids
    .map(function (id, i) { return { id: id, orderKey: (lessons[id].order !== undefined ? lessons[id].order : i) }; })
    .sort(function (a, b) { return a.orderKey - b.orderKey; })
    .map(function (x) { return x.id; });
}
window.getSortedLessonIds = getSortedLessonIds;

function getLessonAccessState(lessons, progressData, lessonId) {
  const ids = getSortedLessonIds(lessons);
  const now = Date.now();
  let previousDone = true;
  let result = null;

  ids.forEach(function (id) {
    const lesson = lessons[id];
    const done = !!(progressData[id] && progressData[id].completed);
    const releasePassed = !lesson.releaseAt || lesson.releaseAt <= now;
    const unlockedBySequence = previousDone;
    const allowed = releasePassed && unlockedBySequence;

    if (id === lessonId) {
      result = {
        allowed: allowed,
        releasePassed: releasePassed,
        unlockedBySequence: unlockedBySequence,
        reason: !releasePassed ? 'release' : (!unlockedBySequence ? 'sequence' : null)
      };
    }
    /* الأدمن بيحدد لكل اختبار: mustPass=true يعني لازم يتحل علشان تفتح المحاضرة اللي بعده، وغير كده الطالب يقدر يتخطاه */
    const exams = lesson.exams || {};
    const progExams = (progressData[id] && progressData[id].exams) || {};
    const blockedByRequiredExam = Object.keys(exams).some(function (eid) {
      const e = exams[eid];
      const releasedExam = !e.releaseAt || e.releaseAt <= now;
      return e.mustPass === true && releasedExam && !(progExams[eid] && progExams[eid].completed);
    });
    previousDone = releasePassed && !blockedByRequiredExam;
  });

  return result || { allowed: false, releasePassed: false, unlockedBySequence: false, reason: 'not_found' };
}
window.getLessonAccessState = getLessonAccessState;


/* ===== ترتيب محتوى المحاضرة (أقسام + فيديو/PDF/اختبار) وقفل ما بعد الاختبار الإجباري ===== */
function getLessonItems(lesson, lessonProgress) {
  lessonProgress = lessonProgress || {};
  const secs = lesson.sections || {};
  const secOrder = function (sid) { return sid && secs[sid] ? (secs[sid].order || 0) : -1; };
  const items = [];
  [['videos', 'video'], ['pdfs', 'pdf'], ['exams', 'exam']].forEach(function (p) {
    const o = lesson[p[0]] || {};
    Object.keys(o).forEach(function (k) { items.push({ kind: p[1], id: k, data: o[k], sectionId: o[k].sectionId || '', sOrd: secOrder(o[k].sectionId), ord: o[k].order || 0 }); });
  });
  items.sort(function (a, b) { return a.sOrd - b.sOrd || a.ord - b.ord; });
  const now = Date.now();
  let locked = false;
  items.forEach(function (it) {
    it.locked = locked;
    if (it.kind === 'exam') {
      const released = !it.data.releaseAt || it.data.releaseAt <= now;
      const done = !!(lessonProgress.exams && lessonProgress.exams[it.id] && lessonProgress.exams[it.id].completed);
      if (it.data.mustPass === true && released && !done) locked = true;
    }
  });
  return items;
}
window.getLessonItems = getLessonItems;

function isCourseVisibleForUser(comp, userData) {
  let cs = comp && comp.centers;
  if (cs && !Array.isArray(cs) && typeof cs === 'object') cs = Object.keys(cs).map(function (k) { return cs[k]; });
  if (!cs || !cs.length) return true;
  const code = String((userData && userData.centerCode) || '');
  return cs.some(function (c) { c = String(c); return c && code.indexOf(c) === 0; });
}
window.isCourseVisibleForUser = isCourseVisibleForUser;

function isItemLocked(lesson, lessonProgress, kind, id) {
  const it = getLessonItems(lesson, lessonProgress).filter(function (x) { return x.kind === kind && x.id === id; })[0];
  return !!(it && it.locked);
}
window.isItemLocked = isItemLocked;

function computeLessonCompletion(lesson, lessonProgress) {
  lessonProgress = lessonProgress || {};
  const exams = lesson.exams || {};
  const examIds = Object.keys(exams);
  const videos = lesson.videos || {};
  const videoIds = Object.keys(videos);
  const progExams = lessonProgress.exams || {};
  const progVideos = lessonProgress.videos || {};

  let earnedPoints = 0;
  Object.keys(progExams).forEach(function (examId) {
    if (progExams[examId] && progExams[examId].completed) {
      earnedPoints += progExams[examId].earnedPoints || 0;
    }
  });

  let completed;
  if (examIds.length > 0) {
    completed = examIds.every(function (id) { return progExams[id] && progExams[id].completed; });
  } else if (videoIds.length > 0) {
    completed = videoIds.some(function (id) { return progVideos[id] && progVideos[id].watched; });
  } else {
    completed = false;
  }

  return { completed: completed, earnedPoints: earnedPoints };
}
window.computeLessonCompletion = computeLessonCompletion;

function computeCourseProgress(lessons, progressData) {
  const ids = Object.keys(lessons || {});
  if (ids.length === 0) return 0;
  const doneCount = ids.filter(function (id) { return progressData[id] && progressData[id].completed; }).length;
  return Math.round((doneCount / ids.length) * 100);
}
window.computeCourseProgress = computeCourseProgress;

/* ================= دوال المصادقة والهيدر ================= */

/* اسم مكتوب بحروف إنجليزية؟ */
function hasEnglishName(name) { return false; }
window.hasEnglishName = hasEnglishName;

/* رسالة إجبارية تطلب من المستخدم اللي اسمه بالإنجليزي تغييره للعربية - إجبارية ومفيش تجاهل
   (بتظهر في كل صفحات المنصة ما عدا صفحة الحساب نفسها، لأنه هناك بيتفتحله نموذج التعديل مباشرة) */
function showArabicNameNotice() {
  if (document.getElementById('arabicNameModal')) return;

  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'arabicNameModal';
  overlay.style.zIndex = '99999';
  overlay.innerHTML =
    '<div class="modal" style="max-width:420px; text-align:center;">' +
      '<div style="width:56px; height:56px; margin:0 auto 12px; border-radius:50%; background:var(--teal-pale); color:var(--teal); display:flex; align-items:center; justify-content:center;">' + icon('pen', 'icon-md') + '</div>' +
      '<h3>من فضلك، غيّر اسمك إلى العربية</h3>' +
      '<p style="color:var(--text-muted); line-height:1.8; font-size:14.5px; margin:0 0 20px;">' +
        'لاحظنا أن اسمك المسجَّل مكتوب بحروف إنجليزية. اسم المنصة إجباري أن يكون باللغة العربية، ولازم تعدّله الآن قبل ما تقدر تكمل استخدام المنصة.' +
      '</p>' +
      '<div class="modal-actions" style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
        '<a href="account.html" class="btn btn-primary" style="width:auto; padding:11px 28px;">تعديل الاسم الآن</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  /* منع الإغلاق بالضغط خارج النافذة أو بمفتاح Esc */
  overlay.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('keydown', function blockEsc(e) {
    if (document.getElementById('arabicNameModal') && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
  }, true);
}
window.showArabicNameNotice = showArabicNameNotice;

/* رسالة اختيارية تطلب من المستخدم اللي معندوش رقم هاتف مسجّل إنه يضيفه
   (اختيارية تمامًا: فيها زرار "لاحقًا" ومفيش إجبار، وبتظهر مرة واحدة بس في كل جلسة تصفح) */
function showAddPhoneNotice(user, userData) {
  if (document.getElementById('addPhoneModal')) return;
  if (sessionStorage.getItem('phonePromptDismissed_' + user.uid)) return;
  if (localStorage.getItem('phonePromptDismissedForever_' + user.uid)) return;
  if (userData && userData.phonePromptDismissed) return;

  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'addPhoneModal';
  overlay.style.zIndex = '99999';
  overlay.innerHTML =
    '<div class="modal" style="max-width:420px; text-align:center;">' +
      '<div style="width:56px; height:56px; margin:0 auto 12px; border-radius:50%; background:var(--teal-pale); color:var(--teal); display:flex; align-items:center; justify-content:center;">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
      '</div>' +
      '<h3>هل تحب تضيف رقم هاتفك؟</h3>' +
      '<p style="color:var(--text-muted); line-height:1.8; font-size:14.5px; margin:0 0 18px;">' +
        'ده اختياري تمامًا، بس هيسهّل عليك تسجيل الدخول لاحقًا برقم هاتفك بدل البريد الإلكتروني. وتقدر تضيفه في أي وقت من صفحة "حسابي".' +
      '</p>' +
      '<div class="field" id="addPhoneField" style="text-align:right; margin-bottom:6px;">' +
        '<label for="addPhoneInput">رقم الهاتف</label>' +
        '<input type="tel" id="addPhoneInput" inputmode="numeric" maxlength="11" autocomplete="off" placeholder="مثال: 01012345678">' +
        '<span class="field-error">رقم هاتف مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015 (سيُحفظ بالصيغة الدولية +201XXXXXXXXX)</span>' +
      '</div>' +
      '<div class="modal-actions" style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:14px;">' +
        '<button type="button" class="btn btn-primary" id="addPhoneSaveBtn" style="width:auto; padding:11px 28px;">حفظ</button>' +
        '<button type="button" class="btn" id="addPhoneLaterBtn" style="width:auto; padding:11px 28px;">لاحقًا</button>' +
      '</div>' +
      '<button type="button" id="addPhoneNeverBtn" style="margin-top:14px; background:none; border:none; color:var(--text-muted); font-size:13px; text-decoration:underline; cursor:pointer; padding:4px;">عدم الظهور مرة أخرى</button>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) { e.stopPropagation(); });

  function closeModal() {
    document.body.style.overflow = '';
    overlay.remove();
  }

  document.getElementById('addPhoneLaterBtn').addEventListener('click', function () {
    sessionStorage.setItem('phonePromptDismissed_' + user.uid, '1');
    closeModal();
  });

  /* "عدم الظهور مرة أخرى": تجاهل دائم، مش مربوط بالجلسة بس - يتخزن محليًا وفي قاعدة البيانات
     عشان يفضل متجاهل حتى لو المستخدم دخل من جهاز/متصفح تاني */
  document.getElementById('addPhoneNeverBtn').addEventListener('click', function () {
    localStorage.setItem('phonePromptDismissedForever_' + user.uid, '1');
    sessionStorage.setItem('phonePromptDismissed_' + user.uid, '1');
    db.ref('users/' + user.uid + '/phonePromptDismissed').set(true).catch(function () {});
    closeModal();
  });

  document.getElementById('addPhoneSaveBtn').addEventListener('click', function () {
    const input = document.getElementById('addPhoneInput');
    const localPhone = input.value.trim();
    const field = document.getElementById('addPhoneField');
    const phoneOk = /^01[0125][0-9]{8}$/.test(localPhone);
    field.classList.toggle('has-error', !phoneOk);
    if (!phoneOk) return;

    /* يُخزَّن رقم الهاتف دائمًا بالصيغة الدولية +201XXXXXXXXX فقط */
    const phone = '+20' + localPhone.slice(1);

    const btn = this;
    btn.disabled = true;

    db.ref('phoneIndex/' + phone).once('value')
      .then(function (snap) {
        if (snap.exists() && snap.val() !== user.email) {
          throw { code: 'phone-taken' };
        }
        const updates = {};
        updates['users/' + user.uid + '/phone'] = phone;
        updates['phoneIndex/' + phone] = user.email;
        return db.ref().update(updates);
      })
      .then(function () {
        sessionStorage.setItem('phonePromptDismissed_' + user.uid, '1');
        closeModal();
      })
      .catch(function (err) {
        btn.disabled = false;
        if (err && err.code === 'phone-taken') {
          field.classList.add('has-error');
        }
      });
  });

  const addPhoneInputEl = document.getElementById('addPhoneInput');
  addPhoneInputEl.addEventListener('input', function () { addPhoneInputEl.value = addPhoneInputEl.value.replace(/\D/g, '').slice(0, 11); });
  setTimeout(function () { addPhoneInputEl.focus(); }, 100);
}
window.showAddPhoneNotice = showAddPhoneNotice;

function requireAuth(onReady) {
  auth.onAuthStateChanged(function (user) {
    if (!user) { window.location.href = 'index.html'; return; }
    db.ref('users/' + user.uid).once('value').then(function (snap) {
      const data = snap.val();
      if (!data || !data.name) { window.location.href = 'register.html'; return; }
      if (data.blocked === true) { alert('تم إيقاف حسابك من المنصة. تواصل مع المسئول.'); auth.signOut().then(function(){ window.location.href = 'index.html'; }); return; }
      user.displayName = data.name;
      onReady(user, data);
    }).catch(function (err) {
      console.error(err);
      alert('تعذر الاتصال بقاعدة البيانات، تأكد من الإنترنت وحاول مرة أخرى.');
    });
  });
}
window.requireAuth = requireAuth;

/* ===== كود العلامة المائية: رقم مكوّن من 12 رقمًا ثابت لكل مستخدم، يُنشأ أول مرة ويُخزّن في قاعدة البيانات ===== */
/* العلامة المائية = كود السنتر الخاص بالطالب (12 رقم) */
function getOrCreateWatermarkCode(uid, callback) { callback(uid); }
window.getOrCreateWatermarkCode = getOrCreateWatermarkCode;

/* ===== علامة مائية حمراء متحركة فوق الفيديو: تعرض كود المستخدم + اسمه وتتنقل بين أماكن عشوائية بالمشغّل ===== */
function startVideoWatermark(containerEl, code, name) {
  if (!containerEl || containerEl.querySelector('.video-watermark')) return;
  const wm = document.createElement('div');
  wm.className = 'video-watermark';
  wm.innerHTML = '<span class="video-watermark-code">' + code + '</span><span class="video-watermark-name">' + (name || '') + '</span>';
  containerEl.appendChild(wm);

  function reposition() {
    const maxX = 78, maxY = 82; // نسبة مئوية تقريبية تفادي خروج العلامة من حدود المشغّل
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    wm.style.left = x + '%';
    wm.style.top = y + '%';
  }
  reposition();
  const timer = setInterval(reposition, 4000);
  wm._wmTimer = timer;
  return wm;
}
window.startVideoWatermark = startVideoWatermark;

function getShortName(fullName, wordsCount) {
  const n = wordsCount || 3;
  const parts = (fullName || 'مستخدم').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, n).join(' ') || 'مستخدم';
}
window.getShortName = getShortName;

function renderAppHeader(user, userData, opts) {
  const header = document.getElementById('appHeader');
  if (!header) return;
  const cur = location.pathname.split('/').pop() || 'home.html';
  const activeMap = { 'competition.html': 'courses.html', 'video.html': 'courses.html', 'exam.html': 'courses.html', 'forum.html': 'courses.html' };
  const active = activeMap[cur] || cur;
  const links = [
    ['home.html', 'الرئيسية', 'mosque'],
    ['levels.html', 'المستوى', 'rankingStar'],
    ['courses.html', 'الكورسات', 'bookOpen'],
    ['account.html', 'حسابي', 'user']
  ];
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  header.innerHTML =
    '<div class="header-inner" id="headerInnerNormal">' +
      '<a class="brand-block" href="home.html" aria-label="الذهاب للرئيسية">' +
        '<span class="brand-mark">' + (window.brandLogo ? brandLogo(44) : '') + '</span><div class="brand-text"><h2>د.علاء صبح</h2><small>منصة طلاب السناتر</small></div>' +
      '</a>' +
      '<nav class="main-nav" aria-label="التنقل">' +
        links.map(function (l) {
          return '<a href="' + l[0] + '" class="' + (l[0] === active ? 'active' : '') + '">' + icon(l[2], 'icon-sm') + '<span>' + l[1] + '</span></a>';
        }).join('') +
      '</nav>' +
      '<div class="header-right">' +
        '<button type="button" class="theme-btn" id="themeBtn" aria-label="تبديل الوضع النهاري / الليلي">' + icon(isDark ? 'sun' : 'moon', 'icon-md') + '</button>' +
        '<button type="button" class="theme-btn logout-btn" id="logoutBtn" title="تسجيل الخروج" aria-label="تسجيل الخروج">' + icon('logout', 'icon-md') + '</button>' +
      '</div>' +
    '</div>';

  document.getElementById('logoutBtn').addEventListener('click', function () {
    if (!confirm('تأكيد تسجيل الخروج؟')) return;
    auth.signOut().catch(function () {}).then(function () { window.location.href = 'index.html'; });
  });

  document.getElementById('themeBtn').addEventListener('click', function () {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('asb_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    this.innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 'icon-md');
  });
}
window.renderAppHeader = renderAppHeader;

/* ================= دوال الإشعارات ================= */

/* يرجّع وقت نسبي مختصر بالعربي ("الآن"، "منذ 5 دقائق"، "أمس"...) لعرضه في قائمة الإشعارات،
   ويرجع التاريخ الكامل كـ tooltip منفصل عبر formatArabicDate */
function formatRelativeArabicTime(ts) {
  if (!ts) return '—';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 30) return 'الآن';
  if (diffSec < 60) return 'منذ لحظات';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return 'منذ ' + diffMin + (diffMin === 1 ? ' دقيقة' : diffMin === 2 ? ' دقيقتين' : diffMin <= 10 ? ' دقائق' : ' دقيقة');
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return 'منذ ' + diffHour + (diffHour === 1 ? ' ساعة' : diffHour === 2 ? ' ساعتين' : diffHour <= 10 ? ' ساعات' : ' ساعة');
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'أمس';
  if (diffDay < 7) return 'منذ ' + diffDay + ' أيام';
  return formatArabicDate(ts);
}
window.formatRelativeArabicTime = formatRelativeArabicTime;

function initNotifications(uid) {
  const notifRef = db.ref('notifications/' + uid);
  /* بدون أي حد أقصى: يجيب كل الإشعارات المسجّلة للمستخدم مهما كان عددها */
  notifRef.on('value', function (snap) {
    const data = snap.val() || {};
    const ids = Object.keys(data).sort(function (a, b) { return (data[b].createdAt || 0) - (data[a].createdAt || 0); });
    const unreadCount = ids.filter(function (id) { return !data[id].read; }).length;

    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (unreadCount > 0) { badge.style.display = 'flex'; badge.textContent = unreadCount > 9 ? '9+' : unreadCount; }
      else { badge.style.display = 'none'; }
    }

    const countEl = document.getElementById('notifHeadCount');
    if (countEl) countEl.textContent = unreadCount > 0 ? (unreadCount + ' غير مقروءة') : 'كل الإشعارات مقروءة';

    const markAllBtn = document.getElementById('notifMarkAllBtn');
    if (markAllBtn) markAllBtn.style.display = unreadCount > 0 ? 'flex' : 'none';

    const list = document.getElementById('notifList');
    if (!list) return;
    if (ids.length === 0) {
      list.innerHTML =
        '<div class="notif-empty">' +
          '<div class="notif-empty-icon">' + icon('bell', 'icon-md') + '</div>' +
          '<div class="notif-empty-title">لا توجد إشعارات بعد</div>' +
          '<div class="notif-empty-sub">هنعرض هنا أي رد على تعليقك أو محاضرة جديدة تتضاف لكورس مشترك فيه</div>' +
        '</div>';
      return;
    }

    const typeMeta = {
      reply: { icon: 'reply', cls: 'type-reply' },
      lesson: { icon: 'video', cls: 'type-lesson' },
      exam: { icon: 'listCheck', cls: 'type-exam' },
      announcement: { icon: 'bell', cls: 'type-announcement' }
    };

    list.innerHTML = ids.map(function (id) {
      const n = data[id];
      const meta = typeMeta[n.type] || { icon: 'circleInfo', cls: 'type-default' };
      return '<a class="notif-item ' + (n.read ? '' : 'unread') + '" href="' + (n.link || '#') + '" data-id="' + id + '">' +
        '<span class="notif-icon ' + meta.cls + '">' + icon(meta.icon, 'icon-sm') + '</span>' +
        '<span class="notif-body">' +
          '<span class="notif-title">' + escapeHtml(n.title || '') + '</span>' +
          (n.body ? '<span class="notif-sub">' + escapeHtml(n.body) + '</span>' : '') +
          '<span class="notif-time" title="' + formatArabicDate(n.createdAt) + '">' + formatRelativeArabicTime(n.createdAt) + '</span>' +
        '</span>' +
        (n.read ? '' : '<span class="notif-dot" aria-hidden="true"></span>') +
      '</a>';
    }).join('');

    list.querySelectorAll('.notif-item').forEach(function (item) {
      item.addEventListener('click', function () {
        notifRef.child(item.dataset.id).update({ read: true });
      });
    });
  });

  const markAllBtn = document.getElementById('notifMarkAllBtn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      notifRef.once('value').then(function (snap) {
        const data = snap.val() || {};
        const updates = {};
        Object.keys(data).forEach(function (id) {
          if (!data[id].read) updates[id + '/read'] = true;
        });
        if (Object.keys(updates).length > 0) notifRef.update(updates);
      });
    });
  }
}
window.initNotifications = initNotifications;

function checkAndNotifyReleasedLessons(uid, enrollments, competitionsData) {
  if (!uid || !enrollments || !competitionsData) return;
  const now = Date.now();
  Object.keys(enrollments).forEach(function (compId) {
    const comp = competitionsData[compId];
    if (!comp || !comp.lessons) return;
    const enrolledAt = enrollments[compId];
    Object.keys(comp.lessons).forEach(function (lessonId) {
      const lesson = comp.lessons[lessonId];
      if (!lesson || !lesson.releaseAt || lesson.releaseAt > now) return;
      const flagRef = db.ref('notifiedLessons/' + uid + '/' + compId + '_' + lessonId);
      flagRef.once('value').then(function (snap) {
        if (snap.exists()) return;
        const isOldContent = enrolledAt && lesson.releaseAt < enrolledAt;
        const markSeen = flagRef.set(true);
        if (isOldContent) return markSeen;
        return markSeen.then(function () {
          return db.ref('notifications/' + uid).push({
            type: 'lesson',
            title: 'اتفتحت محاضرة جديدة',
            body: 'محاضرة "' + (lesson.title || '') + '" بقت متاحة في "' + (comp.title || '') + '"',
            link: 'competition.html?id=' + compId,
            read: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP
          });
        });
      }).catch(function (err) { console.error('تعذر التحقق من إشعار المحاضرة:', err); });
    });
  });
}
window.checkAndNotifyReleasedLessons = checkAndNotifyReleasedLessons;

/* ================= دوال الفوتر والدعم الفني ================= */

function renderFooter() {
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  footer.innerHTML =
    '<div class="footer-inner footer-cols">' +
      '<div class="footer-col footer-col-brand">' +
        '<div class="footer-brand-text"><h4>د.علاء صبح</h4><p class="footer-tagline">منصة طلاب السناتر</p></div>' +
      '</div>' +
      '<div class="footer-col footer-col-pages">' +
        '<h4 class="footer-col-title">الصفحات</h4>' +
        '<div class="footer-list">' +
          '<a href="home.html">الرئيسية</a><a href="levels.html">المستوى</a><a href="courses.html">الكورسات</a><a href="account.html">حسابي</a>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom"><p class="footer-copyright">جميع الحقوق محفوظة لمنصة د.علاء صبح © 2026</p>' +
      '<p class="footer-copyright footer-dev" dir="ltr" style="margin-top:6px;">Developed by Khaled Mohamed</p></div>';
}
window.renderFooter = renderFooter;

function renderSupportFab() {
  if (document.getElementById('fabStack')) return;

  const stack = document.createElement('div');
  stack.id = 'fabStack';
  stack.className = 'fab-stack';

  const notesFab = document.createElement('a');
  notesFab.id = 'notesFab';
  notesFab.className = 'support-fab fab-notes';
  notesFab.href = '#';
  notesFab.innerHTML = '<span class="support-fab-icon"><span class="notes-fab-icon-wrap">' + icon('fileLines') + '<span class="notes-fab-badge">' + icon('pen') + '</span></span></span>';
  notesFab.setAttribute('aria-label', 'ملاحظات');
  notesFab.title = 'ملاحظات';
  notesFab.addEventListener('click', function (e) {
    e.preventDefault();
    openNotesModal();
  });

  const supportFab = document.createElement('a');
  supportFab.id = 'supportFab';
  supportFab.className = 'support-fab fab-help';
  supportFab.href = 'support.html';
  supportFab.innerHTML = '<span class="support-fab-icon">' + icon('headset') + '</span>';
  supportFab.setAttribute('aria-label', 'الدعم الفني');
  supportFab.title = 'الدعم الفني';

  stack.appendChild(notesFab);
  stack.appendChild(supportFab);
  document.body.appendChild(stack);
}
window.renderSupportFab = renderSupportFab;

/* ============================================================
   📝 مودال الملاحظات الشخصية (تفتح فوق الصفحة الحالية)
   البيانات محفوظة في Firebase تحت المسار notes/{uid}
   ============================================================ */
let _notesState = null;

function openNotesModal() {
  if (document.getElementById('notesModal')) return;

  const user = auth.currentUser;
  if (!user) { window.location.href = 'index.html'; return; }

  _notesState = { uid: user.uid, notes: {}, activeId: null, saveTimer: null };

  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'notesModal';
  overlay.style.zIndex = '99998';
  overlay.innerHTML =
    '<div class="modal modal-notes">' +
      '<button type="button" class="modal-close" id="notesCloseBtn">' + icon('xmark') + '</button>' +
      '<div class="notes-header"><h3>الملاحظات</h3></div>' +
      '<div class="notes-body">' +
        '<div class="notes-sidebar">' +
          '<div class="notes-sidebar-head">' +
            '<div class="notes-sidebar-icon">' + icon('fileLines') + '</div>' +
            '<div>' +
              '<div class="notes-sidebar-title">ملاحظاتي</div>' +
              '<div class="notes-sidebar-count" id="notesCount">0 ملاحظة</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary notes-new-btn" id="notesNewBtn">' + icon('plus') + ' ملاحظة جديدة</button>' +
          '<div class="notes-list" id="notesList"></div>' +
        '</div>' +
        '<div class="notes-main" id="notesMain">' +
          '<div class="notes-placeholder">' +
            '<div class="notes-placeholder-icon">' + icon('fileLines') + '</div>' +
            '<div class="notes-placeholder-text">اختر ملاحظة للبدء أو أنشئ ملاحظة جديدة</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  function closeNotesModal() {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onEsc);
    overlay.remove();
    _notesState = null;
  }
  function onEsc(e) { if (e.key === 'Escape') closeNotesModal(); }
  document.addEventListener('keydown', onEsc);

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeNotesModal(); });
  document.getElementById('notesCloseBtn').addEventListener('click', closeNotesModal);
  document.getElementById('notesNewBtn').addEventListener('click', createNewNote);

  const notesRef = db.ref('notes/' + user.uid);
  notesRef.once('value').then(function (snap) {
    _notesState.notes = snap.val() || {};
    renderNotesList();
  }).catch(function () {
    document.getElementById('notesList').innerHTML = '<div class="notes-empty">تعذّر تحميل الملاحظات</div>';
  });
}
window.openNotesModal = openNotesModal;

function renderNotesList() {
  if (!_notesState) return;
  const listEl = document.getElementById('notesList');
  const countEl = document.getElementById('notesCount');
  const ids = Object.keys(_notesState.notes).sort(function (a, b) {
    return (_notesState.notes[b].updatedAt || 0) - (_notesState.notes[a].updatedAt || 0);
  });

  countEl.textContent = ids.length + ' ملاحظة';

  if (!ids.length) {
    listEl.innerHTML = '<div class="notes-empty">لا توجد ملاحظات بعد</div>';
    return;
  }

  listEl.innerHTML = ids.map(function (id) {
    const n = _notesState.notes[id];
    const title = (n.title && n.title.trim()) || 'بدون عنوان';
    const preview = (n.content || '').trim().slice(0, 60);
    return '<button type="button" class="notes-item' + (id === _notesState.activeId ? ' active' : '') + '" data-id="' + id + '">' +
      '<span class="notes-item-title">' + escapeHtml(title) + '</span>' +
      (preview ? '<span class="notes-item-preview">' + escapeHtml(preview) + '</span>' : '') +
    '</button>';
  }).join('');

  Array.prototype.forEach.call(listEl.querySelectorAll('.notes-item'), function (btn) {
    btn.addEventListener('click', function () { selectNote(btn.getAttribute('data-id')); });
  });
}

function createNewNote() {
  if (!_notesState) return;
  const uid = _notesState.uid;
  const newRef = db.ref('notes/' + uid).push();
  const now = firebase.database.ServerValue.TIMESTAMP;
  const localNow = Date.now();
  const data = { title: '', content: '', createdAt: now, updatedAt: now };
  newRef.set(data).then(function () {
    _notesState.notes[newRef.key] = { title: '', content: '', createdAt: localNow, updatedAt: localNow };
    renderNotesList();
    selectNote(newRef.key);
  });
}

function selectNote(id) {
  if (!_notesState) return;
  _notesState.activeId = id;
  const n = _notesState.notes[id] || { title: '', content: '' };

  Array.prototype.forEach.call(document.querySelectorAll('.notes-item'), function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-id') === id);
  });

  const mainEl = document.getElementById('notesMain');
  mainEl.innerHTML =
    '<div class="notes-editor">' +
      '<div class="notes-editor-toolbar">' +
        '<input type="text" class="notes-editor-title" id="notesTitleInput" placeholder="بدون عنوان" value="' + escapeHtml(n.title || '') + '">' +
        '<button type="button" class="notes-delete-btn" id="notesDeleteBtn" aria-label="حذف الملاحظة" title="حذف">' + icon('trash') + '</button>' +
      '</div>' +
      '<textarea class="notes-editor-content" id="notesContentInput" placeholder="اكتب ملاحظتك هنا...">' + escapeHtml(n.content || '') + '</textarea>' +
      '<div class="notes-editor-status" id="notesSaveStatus">&nbsp;</div>' +
    '</div>';

  const titleInput = document.getElementById('notesTitleInput');
  const contentInput = document.getElementById('notesContentInput');
  titleInput.focus();

  function scheduleSave() {
    const statusEl = document.getElementById('notesSaveStatus');
    if (statusEl) statusEl.textContent = 'جارٍ الحفظ...';
    clearTimeout(_notesState.saveTimer);
    _notesState.saveTimer = setTimeout(function () {
      const title = titleInput.value;
      const content = contentInput.value;
      const now = firebase.database.ServerValue.TIMESTAMP;
      db.ref('notes/' + _notesState.uid + '/' + id).update({ title: title, content: content, updatedAt: now }).then(function () {
        if (_notesState.notes[id]) {
          _notesState.notes[id].title = title;
          _notesState.notes[id].content = content;
          _notesState.notes[id].updatedAt = Date.now();
        }
        renderNotesList();
        Array.prototype.forEach.call(document.querySelectorAll('.notes-item'), function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-id') === id);
        });
        const s = document.getElementById('notesSaveStatus');
        if (s) s.textContent = 'تم الحفظ';
      });
    }, 600);
  }

  titleInput.addEventListener('input', scheduleSave);
  contentInput.addEventListener('input', scheduleSave);

  document.getElementById('notesDeleteBtn').addEventListener('click', function () {
    if (!confirm('هل تريد حذف هذه الملاحظة؟')) return;
    db.ref('notes/' + _notesState.uid + '/' + id).remove().then(function () {
      delete _notesState.notes[id];
      if (_notesState.activeId === id) _notesState.activeId = null;
      renderNotesList();
      document.getElementById('notesMain').innerHTML =
        '<div class="notes-placeholder">' +
          '<div class="notes-placeholder-icon">' + icon('fileLines') + '</div>' +
          '<div class="notes-placeholder-text">اختر ملاحظة للبدء أو أنشئ ملاحظة جديدة</div>' +
        '</div>';
    });
  });
}

/* ============================================================
   ✅ دالة حذف حساب المستخدم
   ============================================================ */

function deleteUserAccountData(uid) {
  const updates = {};
  updates['users/' + uid] = null;
  updates['userProgress/' + uid] = null;
  updates['userEnrollments/' + uid] = null;
  updates['notifications/' + uid] = null;
  updates['notifiedLessons/' + uid] = null;
  updates['conversations/' + uid] = null;
  updates['messages/' + uid] = null;

  return db.ref('enrollments').once('value').then(function (snap) {
    const all = snap.val() || {};
    Object.keys(all).forEach(function (compId) {
      if (all[compId] && Object.prototype.hasOwnProperty.call(all[compId], uid)) {
        updates['enrollments/' + compId + '/' + uid] = null;
      }
    });
    return db.ref().update(updates);
  });
}
window.deleteUserAccountData = deleteUserAccountData;

/* ============================================================
   🔐 نظام الجلسات (Sessions)
   ============================================================ */

function startSession(user, deviceInfo) {
  const sessionId = user.uid + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const sessionData = {
    sessionId: sessionId,
    device: deviceInfo || navigator.userAgent || 'unknown',
    lastActive: firebase.database.ServerValue.TIMESTAMP,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  // ملاحظة: sessions/{uid} فيها جلسة واحدة بس، فمجرد الكتابة هنا بتلغي
  // أي جلسة سابقة تلقائيًا — الجهاز القديم هيكتشف ده فورًا عن طريق watchSessionKick
  return db.ref('sessions/' + user.uid).set(sessionData).then(function () {
    return sessionId; // مهم: لازم المستدعي يحفظه في localStorage
  });
}
window.startSession = startSession;

function checkSession(user) {
  return db.ref('sessions/' + user.uid).once('value').then(function(snap) {
    const data = snap.val();
    if (!data) return { valid: false, reason: 'no_session' };
    const localSessionId = localStorage.getItem('asb_session_id');
    if (!localSessionId || data.sessionId !== localSessionId) {
      return { valid: false, reason: 'session_mismatch' };
    }
    db.ref('sessions/' + user.uid + '/lastActive').set(firebase.database.ServerValue.TIMESTAMP);
    return { valid: true };
  });
}
window.checkSession = checkSession;

function endSession(user) {
  return db.ref('sessions/' + user.uid).remove();
}
window.endSession = endSession;

/* مراقبة فورية (Realtime) لجلسة المستخدم الحالية.
   لو حد سجّل دخول على نفس الحساب من جهاز/متصفح تاني، القيمة في
   sessions/{uid} بتتغيّر لحظيًا، فالجهاز الحالي (لو مش هو صاحب
   الجلسة الجديدة) بيتسجل خروج فورًا ويترمي على صفحة الدخول
   برسالة تحذير — من غير أي فرق وقت أو انتظار Polling. */
function watchSessionKick(user) {
  if (!user) return;
  const localSessionId = localStorage.getItem('asb_session_id');
  if (!localSessionId) return; // مفيش جلسة محفوظة على الجهاز ده أصلاً، معنديش حاجة أراقبها

  const sessionRef = db.ref('sessions/' + user.uid);
  sessionRef.on('value', function (snap) {
    const currentLocalId = localStorage.getItem('asb_session_id');
    if (!currentLocalId) { sessionRef.off('value'); return; } // خرج بنفسه

    const data = snap.val();
    if (!data || data.sessionId !== currentLocalId) {
      sessionRef.off('value');
      localStorage.removeItem('asb_session_id');
      auth.signOut().catch(function () {}).then(function () {
        window.location.href = 'index.html?session_killed=1';
      });
    }
  });
}
window.watchSessionKick = watchSessionKick;

/* ============================================================
   📝 تسجيل المخالفات
   ============================================================ */

function logViolation(uid, examRef, type, details) {
  const violationRef = db.ref('violations/' + uid).push();
  return violationRef.set({
    type: type,
    examRef: examRef,
    details: details || '',
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });
}
window.logViolation = logViolation;

function getViolationCount(compId, lessonId, examId, uid) {
  return db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid + '/violations').once('value')
    .then(function(snap) {
      return snap.val() || 0;
    });
}
window.getViolationCount = getViolationCount;

function incrementViolations(compId, lessonId, examId, uid) {
  const ref = db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid);
  return ref.child('violations').transaction(function(current) {
    return (current || 0) + 1;
  });
}
window.incrementViolations = incrementViolations;

/* ============================================================
   📚 بنك الأسئلة العشوائي — المعدل (يقرأ من competitions مباشرة)
   ============================================================ */

function getRandomQuestions(compId, lessonId, examId, count) {
  // نقرأ من competitions مباشرة لأن المسؤول يضيف الأسئلة هناك
  return db.ref('competitions/' + compId + '/lessons/' + lessonId + '/exams/' + examId + '/questions').once('value')
    .then(function(snap) {
      const bank = snap.val() || {};
      const keys = Object.keys(bank);
      if (keys.length === 0) {
        throw new Error('لا توجد أسئلة في هذا الاختبار. أضف أسئلة أولاً.');
      }
      const actualCount = Math.min(count, keys.length);
      const shuffledKeys = shuffleArray(keys);
      const selectedKeys = shuffledKeys.slice(0, actualCount);
      const questions = selectedKeys.map(function(key) {
        const q = bank[key];
        if (q.type === 'essay') {
          return { id: key, text: q.text, type: 'essay', options: [], correct: -1, points: q.points != null ? q.points : 2 };
        }
        const options = q.options || [];
        const shuffledOptions = shuffleArray(options);
        const correctIndex = shuffledOptions.indexOf(options[q.correct]);
        return {
          id: key,
          text: q.text,
          type: 'mcq',
          options: shuffledOptions,
          correct: correctIndex,
          points: q.points != null ? q.points : 1
        };
      });
      return shuffleArray(questions);
    });
}
window.getRandomQuestions = getRandomQuestions;

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
window.shuffleArray = shuffleArray;

/* ============================================================
   💾 حفظ الإجابات ومزامنتها
   ============================================================ */

function saveAnswer(compId, lessonId, examId, uid, questionId, selectedIndex) {
  const ref = db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid + '/answers/' + questionId);
  return ref.set(selectedIndex);
}
window.saveAnswer = saveAnswer;

function getSavedAnswers(compId, lessonId, examId, uid) {
  return db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid + '/answers').once('value')
    .then(function(snap) {
      return snap.val() || {};
    });
}
window.getSavedAnswers = getSavedAnswers;

function getExamAttempt(compId, lessonId, examId, uid) {
  return db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid).once('value')
    .then(function(snap) {
      return snap.val() || null;
    });
}
window.getExamAttempt = getExamAttempt;

function startExamAttempt(compId, lessonId, examId, uid, selectedQuestions) {
  const attemptData = {
    startedAt: firebase.database.ServerValue.TIMESTAMP,
    submitted: false,
    forceEnded: false,
    violations: 0,
    violationList: [],
    reloadCount: 0,
    answers: {},
    selectedQuestions: selectedQuestions.map(function(q) { return q.id; }),
    questions: selectedQuestions
  };
  return db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid).set(attemptData);
}
window.startExamAttempt = startExamAttempt;

function endExamAttempt(compId, lessonId, examId, uid, submitted, forceEnded) {
  const updates = {
    submitted: submitted || false,
    forceEnded: forceEnded || false,
    submittedAt: firebase.database.ServerValue.TIMESTAMP
  };
  return db.ref('examAttempts/' + compId + '/' + lessonId + '/' + examId + '/' + uid).update(updates);
}
window.endExamAttempt = endExamAttempt;

function isExamActive(compId, lessonId, examId, uid) {
  return getExamAttempt(compId, lessonId, examId, uid).then(function(attempt) {
    if (!attempt) return false;
    return !attempt.submitted && !attempt.forceEnded;
  });
}
window.isExamActive = isExamActive;

/* ============================================================
   زر الرجوع الذكي: يتصرف مثل زر الرجوع في المتصفح/الهاتف
   - لو فيه سجل تصفح داخل نفس الجلسة، يرجع خطوة زي history.back()
   - لو مفيش سجل (الصفحة اتفتحت مباشرة)، يروح لرابط الاحتياط المحدد في href
   ============================================================ */
(function initSmartBackLinks() {
  function bindBackLink(link) {
    if (!link || link.dataset.smartBackBound === '1') return;
    link.dataset.smartBackBound = '1';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const fallbackHref = link.getAttribute('href') || 'home.html';
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = fallbackHref;
      }
    });
  }
  document.querySelectorAll('.back-link').forEach(bindBackLink);
})();
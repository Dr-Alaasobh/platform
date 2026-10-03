/* mobile-app.js — ملء الشاشة (يفضل شغال بين الصفحات) + اسم المطور + زر العودة لأعلى + تسريع التنقل */
(function(){
var doc=document,de=doc.documentElement,mq=window.matchMedia('(max-width:600px) and (pointer:coarse)');
var IN='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
var OUT='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
var UP='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
/* ===== ملء الشاشة المستمر =====
   المتصفح بيلغي ملء الشاشة مع كل تحميل صفحة جديدة، فمفيش طريقة غير إن الصفحة الأم متتغيّرش.
   لما الطالب يدوس زر ملء الشاشة بنفتح الصفحة الحالية جوه إطار iframe بيغطي الشاشة، ونطلب ملء الشاشة على الصفحة الأم.
   التنقل بعد كده بيحصل جوه الإطار والصفحة الأم ثابتة، فملء الشاشة بيفضل شغال. */
window.__asbShell=window.__asbShell||{};
var P=null;try{if(window.parent!==window&&window.parent.__asbShell)P=window.parent}catch(e){P=null}
var FD=P?P.document:doc,FE=FD.documentElement;
var can=P?true:!!(de.requestFullscreen||de.webkitRequestFullscreen);
function isFs(){return !!(FD.fullscreenElement||FD.webkitFullscreenElement)}
function reqFs(){try{var f=FE.requestFullscreen||FE.webkitRequestFullscreen;var r=f.call(FE,{navigationUI:'hide'});if(r&&r.catch)r.catch(function(){})}catch(e){}}
function exitFs(){try{var f=FD.exitFullscreen||FD.webkitExitFullscreen;var r=f.call(FD);if(r&&r.catch)r.catch(function(){})}catch(e){}}
function enterShell(){
 var m=doc.querySelectorAll('video,audio'),i,f;
 for(i=0;i<m.length;i++){try{m[i].pause()}catch(e){}}
 f=doc.querySelectorAll('iframe');for(i=0;i<f.length;i++){try{f[i].src='about:blank'}catch(e){}}
 var fr=doc.createElement('iframe');fr.className='asb-shell';fr.src=location.href;fr.title='منصة د.علاء صبح';
 fr.allow='fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write';fr.setAttribute('allowfullscreen','');
 doc.body.appendChild(fr);de.classList.add('asb-shell-on');window.__asbShell.on=true;reqFs();
}
function toggle(){
 if(isFs()){exitFs();return}
 var pg=(location.pathname.split('/').pop()||'');
 /* الفيديو والامتحان فيهم حالة جارية (عدّاد/مشاهدة) فمنعيدش تحميلهم جوه إطار */
 if(!P&&!window.__asbShell.on&&!/^(exam|video)\.html$/.test(pg))enterShell();else reqFs();
}
function sync(){var l=doc.querySelectorAll('.fs-btn');for(var i=0;i<l.length;i++)l[i].innerHTML=isFs()?OUT:IN}
function meta(n,c){if(doc.querySelector('meta[name="'+n+'"]'))return;var m=doc.createElement('meta');m.name=n;m.content=c;doc.head.appendChild(m)}
meta('apple-mobile-web-app-capable','yes');meta('mobile-web-app-capable','yes');meta('apple-mobile-web-app-status-bar-style','black-translucent');meta('theme-color','#06142B');
/* صفحات الدخول والتسجيل: بدون اسم المطور (body[data-no-dev]) */
function noDev(){return !!(doc.body&&doc.body.hasAttribute('data-no-dev'))}
var upOn=false;
function onScroll(){var t=doc.querySelector('.to-top');if(!t)return;var s=(window.pageYOffset||de.scrollTop||0)>500;if(s!==upOn){upOn=s;t.classList.toggle('show',s)}}
function mount(){
 if(!mq.matches||!doc.body)return;
 var host=doc.querySelector('.nv-end')||doc.querySelector('.sb-foot'),b=doc.querySelector('.fs-btn');
 if(can){
  if(!b){b=doc.createElement('button');b.type='button';b.className='fs-btn';b.setAttribute('aria-label','ملء الشاشة');b.onclick=toggle;doc.body.appendChild(b);sync()}
  if(host&&b.parentNode!==host){b.classList.remove('fs-float');host.insertBefore(b,host.firstChild)}
  else if(!host)b.classList.add('fs-float');
 }
 var d=doc.querySelector('.dev-credit');
 if(noDev()){if(d&&d.parentNode)d.parentNode.removeChild(d)}
 else{
  if(!d){d=doc.createElement('div');d.className='dev-credit';d.innerHTML='<span>تطوير وبرمجة</span><b dir="ltr">Khaled Mohamed</b>'}
  if(d.parentNode!==doc.body||d.nextElementSibling)doc.body.appendChild(d);
 }
 /* اختصار: زر العودة لأعلى (مش في الدخول ولا الفيديو ولا الامتحان) */
 var p=(location.pathname.split('/').pop()||'');
 if(!noDev()&&!/^(video|exam)\.html$/.test(p)&&!doc.querySelector('.to-top')){
  var t=doc.createElement('button');t.type='button';t.className='to-top';t.setAttribute('aria-label','العودة لأعلى الصفحة');t.innerHTML=UP;
  t.onclick=function(){window.scrollTo({top:0,behavior:'smooth'})};
  doc.body.appendChild(t);window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 }
}
FD.addEventListener('fullscreenchange',sync);FD.addEventListener('webkitfullscreenchange',sync);
if(P){window.addEventListener('pagehide',function(){try{FD.removeEventListener('fullscreenchange',sync);FD.removeEventListener('webkitfullscreenchange',sync)}catch(e){}});
 try{P.history.replaceState(null,'',location.href);P.document.title=doc.title}catch(e){}}
function start(){mount();var t;var o=new MutationObserver(function(){clearTimeout(t);t=setTimeout(mount,60)});o.observe(doc.body,{childList:true});setTimeout(function(){o.disconnect()},8000)}
doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',start):start();
mq.addEventListener&&mq.addEventListener('change',mount);

/* ===== تسريع التنقل: تحميل مسبق للصفحات + Service Worker للكاش ===== */
(function(){
 var done={},sd=navigator.connection&&navigator.connection.saveData;
 function internal(a){return a&&a.href&&a.origin===location.origin&&/\.html$/.test(a.pathname)&&a.pathname!==location.pathname&&a.target!=='_blank'&&!a.hasAttribute('download')}
 function pf(u){if(sd||done[u])return;done[u]=1;var l=doc.createElement('link');l.rel='prefetch';l.href=u;l.as='document';doc.head.appendChild(l)}
 ['touchstart','mousedown'].forEach(function(ev){doc.addEventListener(ev,function(e){var a=e.target.closest&&e.target.closest('a');if(internal(a))pf(a.href)},{passive:true,capture:true})});
 function idle(){var l=doc.querySelectorAll('.nv-bn a'),i;for(i=0;i<l.length;i++)if(internal(l[i]))pf(l[i].href)}
 window.addEventListener('load',function(){setTimeout(function(){(window.requestIdleCallback||function(f){f()})(idle)},900)});
 if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',function(){try{navigator.serviceWorker.register('sw.js').catch(function(){})}catch(e){}});
 }
})();
})();

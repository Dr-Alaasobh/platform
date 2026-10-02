/* mobile-app.js — زر ملء الشاشة + اسم المطور (للهاتف فقط) */
(function(){
var doc=document,de=doc.documentElement,mq=window.matchMedia('(max-width:600px) and (pointer:coarse)');
var IN='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
var OUT='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
var can=!!(de.requestFullscreen||de.webkitRequestFullscreen);
function isFs(){return !!(doc.fullscreenElement||doc.webkitFullscreenElement)}
function toggle(){try{isFs()?(doc.exitFullscreen||doc.webkitExitFullscreen).call(doc):(de.requestFullscreen||de.webkitRequestFullscreen).call(de)}catch(e){}}
function sync(){var l=doc.querySelectorAll('.fs-btn');for(var i=0;i<l.length;i++)l[i].innerHTML=isFs()?OUT:IN}
function meta(n,c){if(doc.querySelector('meta[name="'+n+'"]'))return;var m=doc.createElement('meta');m.name=n;m.content=c;doc.head.appendChild(m)}
meta('apple-mobile-web-app-capable','yes');meta('mobile-web-app-capable','yes');meta('apple-mobile-web-app-status-bar-style','black-translucent');meta('theme-color','#06142B');
function mount(){
 if(!mq.matches||!doc.body)return;
 var host=doc.querySelector('.nv-end')||doc.querySelector('.sb-foot'),b=doc.querySelector('.fs-btn');
 if(can){
  if(!b){b=doc.createElement('button');b.type='button';b.className='fs-btn';b.setAttribute('aria-label','ملء الشاشة');b.onclick=toggle;doc.body.appendChild(b);sync()}
  if(host&&b.parentNode!==host){b.classList.remove('fs-float');host.insertBefore(b,host.firstChild)}
  else if(!host)b.classList.add('fs-float');
 }
 var d=doc.querySelector('.dev-credit');
 if(!d){d=doc.createElement('div');d.className='dev-credit';d.innerHTML='<span>تطوير وبرمجة</span><b dir="ltr">Khaled Mohamed</b>'}
 if(d.parentNode!==doc.body||d.nextElementSibling)doc.body.appendChild(d);
}
doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);
function start(){mount();var t;var o=new MutationObserver(function(){clearTimeout(t);t=setTimeout(mount,60)});o.observe(doc.body,{childList:true});setTimeout(function(){o.disconnect()},8000)}
doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',start):start();
mq.addEventListener&&mq.addEventListener('change',mount);
})();

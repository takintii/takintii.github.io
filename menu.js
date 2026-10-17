(function(){
"use strict";
/* Veri kaynağı: aynı klasördeki menu.json. Yönetim paneli (yonetim/) bu dosyayı GitHub üzerinden günceller. */
var TAGS={yeni:"Yeni",oneri:"Şefin önerisi",populer:"Popüler",aci:"Acı",vegan:"Vejetaryen"};
var TAG_ALIASES={"yeni":"yeni","sefin onerisi":"oneri","oneri":"oneri","onerilen":"oneri","populer":"populer","aci":"aci","vejetaryen":"vegan","vegan":"vegan"};
var FOOT_DEF="Afiyet olsun. Alerjen bilgisi için lütfen personelimize danışın.";
var CACHE="takintii-menu-cache-v1";
var ICON_IG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
var ICON_STAR='<svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';
var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmt(n){return Number(n||0).toLocaleString("tr-TR")}
function norm(s){return String(s||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ı/g,"i").trim()}
function hl(text,q){if(!q)return esc(text);var n=norm(text),i=n.indexOf(q);if(i<0)return esc(text);return esc(text.slice(0,i))+"<mark>"+esc(text.slice(i,i+q.length))+"</mark>"+esc(text.slice(i+q.length))}
function safeUrl(u){u=String(u||"").trim();return /^https?:\/\//i.test(u)?u:""}
function safeImg(u){u=String(u||"").trim();if(/^https:\/\/[^\s"<>]+$/i.test(u))return u;if(/^[a-z0-9_\-\/]+\.(jpe?g|png|webp|svg|gif)$/i.test(u)&&u.indexOf("..")<0)return u;return ""}
function safeColor(c){return /^#[0-9a-f]{6}$/i.test(String(c||"").trim())?String(c).trim():""}
function slug(s){return norm(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"kat"}

/* ---------- Render ---------- */
var V=null,query="",lockUntil=0,ticking=false,current="";
var root=document.getElementById("root");
root.innerHTML=
 '<div class="wrap"><header class="hero"><img id="logo" class="logo" alt="" hidden><span class="eyebrow" id="eyebrow"></span><h1 id="title"></h1><p id="note"></p><div class="links" id="links"></div></header><nav class="tiles" id="tiles" aria-label="Kategoriler"></nav></div>'+
 '<div class="bar"><div class="wrap"><label class="search" for="q"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'+
 '<input id="q" type="search" placeholder="Ürün ara: mojito, latte, köfte…" autocomplete="off" aria-label="Ürün ara"></label><nav class="rail" id="rail" aria-label="Kategoriler"></nav></div></div>'+
 '<div class="wrap"><main id="menu"><p class="loading">Menü yükleniyor…</p></main><div id="info"></div><div id="cta"></div><footer id="foot"></footer></div>';
var tiles=document.getElementById("tiles"),rail=document.getElementById("rail"),menu=document.getElementById("menu"),bar=document.querySelector(".bar"),qIn=document.getElementById("q");

function applyAccent(c){var a=safeColor(c),r=document.documentElement.style;if(a){r.setProperty("--brass",a);r.setProperty("--brass-soft",a+"22")}else{r.removeProperty("--brass");r.removeProperty("--brass-soft")}}
function visibleItems(g){return g.items.filter(function(it){return !it.off&&(!query||norm(it.n+" "+(it.d||"")).indexOf(query)>-1)})}
function tagHtml(it){return (it.tags||[]).filter(function(t){return TAGS[t]}).map(function(t){return '<span class="tag tag-'+t+'">'+TAGS[t]+"</span>"}).join("")}
function liveCats(){return V.cats.filter(function(c){return !c.off})}
function render(){
  if(!V)return;
  applyAccent(V.accent);
  if(V.title)document.title=V.title+" · Menü";
  var logo=document.getElementById("logo"),lg=safeImg(V.logo);if(lg){logo.src=lg;logo.hidden=false}else logo.hidden=true;
  document.getElementById("eyebrow").textContent=V.eyebrow||"Menü";
  document.getElementById("title").textContent=V.title||"";
  document.getElementById("note").textContent=V.note||"";
  var ig=safeUrl(V.instagram),rv=safeUrl(V.review),L="";
  if(ig)L+='<a class="lnk" href="'+esc(ig)+'" target="_blank" rel="noopener">'+ICON_IG+"Instagram</a>";
  if(rv)L+='<a class="lnk star" href="'+esc(rv)+'" target="_blank" rel="noopener">'+ICON_STAR+"Google yorumları</a>";
  var lk=document.getElementById("links");lk.innerHTML=L;lk.hidden=!L;
  var rows=[];
  if(V.hours)rows.push(["Çalışma saatleri",esc(V.hours)]);
  if(V.address)rows.push(["Adres",esc(V.address)]);
  if(V.phone)rows.push(["Telefon",'<a href="tel:'+esc(String(V.phone).replace(/[^\d+]/g,""))+'">'+esc(V.phone)+"</a>"]);
  if(V.wifiName||V.wifiPass)rows.push(["Wi‑Fi",esc(V.wifiName||"")+(V.wifiPass?' · <span class="wpass">'+esc(V.wifiPass)+'</span> <button class="copy" data-copy="'+esc(V.wifiPass)+'">Şifreyi kopyala</button>':"")]);
  document.getElementById("info").innerHTML=rows.length?'<div class="infocard"><h2>Bilgiler</h2><dl>'+rows.map(function(r){return "<div><dt>"+r[0]+"</dt><dd>"+r[1]+"</dd></div>"}).join("")+"</dl></div>":"";
  document.getElementById("cta").innerHTML=rv?'<div class="cta"><h2>Memnun kaldınız mı?</h2><p>Google\'da bizi değerlendirin, 30 saniye sürer. Yorumunuz bizim için çok değerli.</p><a class="lnk" href="'+esc(rv)+'" target="_blank" rel="noopener">'+ICON_STAR+"Yorum yaz</a></div>":"";
  document.getElementById("foot").textContent=V.footer||FOOT_DEF;
  var html="",chips="",any=false;
  liveCats().forEach(function(c){
    var body="",n=0,multi=c.groups.length>1;
    c.groups.forEach(function(g){
      var rs=visibleItems(g);if(!rs.length)return;n+=rs.length;
      if(g.sub&&multi)body+="<h3>"+esc(g.sub)+"</h3>";
      if(g.type==="pours"){
        body+='<div style="overflow-x:auto"><table class="pours"><thead><tr><th>Marka</th><th>Tek</th><th>Duble</th><th>Şişe</th></tr></thead><tbody>'+
          rs.map(function(r){return "<tr><td>"+hl(r.n,query)+tagHtml(r)+"</td><td>"+(r.t?fmt(r.t):"–")+"</td><td>"+(r.du?fmt(r.du):"–")+"</td><td>"+(r.s?fmt(r.s):"–")+"</td></tr>"}).join("")+"</tbody></table></div>";
      }else{
        body+=rs.map(function(it){var im=safeImg(it.img);return '<div class="item'+(im?" has-img":"")+'">'+(im?'<img class="thumb" src="'+esc(im)+'" alt="" loading="lazy">':"")+'<span class="name">'+hl(it.n,query)+tagHtml(it)+'</span><span class="price">'+fmt(it.p)+"<small>₺</small></span>"+(it.d?'<span class="desc">'+hl(it.d,query)+"</span>":"")+"</div>"}).join("");
      }
    });
    if(n){any=true;html+='<section id="c-'+esc(c.id)+'"><div class="sec-head"><h2>'+esc(c.title)+'</h2><span class="count">'+n+" ürün</span></div>"+(c.desc?'<p class="sec-desc">'+esc(c.desc)+"</p>":"")+body+"</section>";chips+='<button class="chip" data-id="'+esc(c.id)+'">'+esc(c.title)+"</button>"}
  });
  menu.innerHTML=any?html:'<p class="empty">Aradığınız ürün bulunamadı.</p>';
  tiles.innerHTML=liveCats().filter(function(c){return c.groups.some(function(g){return g.items.some(function(i){return !i.off})})}).map(function(c){var im=safeImg(c.img);return '<button class="tile" data-id="'+esc(c.id)+'"><span class="ph">'+(im?'<img src="'+esc(im)+'" alt="">':'<span class="mono">'+esc((c.title||"?").charAt(0))+"</span>")+"</span><span>"+esc(c.title)+"</span></button>"}).join("");
  tiles.hidden=!!query;
  rail.innerHTML=chips;current="";
  spy();
}
function setOn(id){
  var on=null;
  Array.prototype.forEach.call(rail.children,function(c){var a=c.dataset.id===id;c.classList.toggle("on",a);if(a)on=c});
  if(on){var left=on.offsetLeft-(rail.clientWidth-on.offsetWidth)/2;try{rail.scrollTo({left:left,behavior:reduce?"auto":"smooth"})}catch(e){rail.scrollLeft=left}}
}
function goTo(id){
  var el=document.getElementById("c-"+id);if(!el)return;
  var y=el.getBoundingClientRect().top+window.pageYOffset-bar.offsetHeight-8;
  lockUntil=Date.now()+1000;current=id;setOn(id);
  try{window.scrollTo({top:y,behavior:reduce?"auto":"smooth"})}catch(e){window.scrollTo(0,y)}
}
function spy(){
  if(Date.now()<lockUntil)return;
  var secs=menu.querySelectorAll("section"),line=bar.getBoundingClientRect().bottom+24,id="";
  for(var i=0;i<secs.length;i++){if(secs[i].getBoundingClientRect().top<=line)id=secs[i].id.slice(2);else break}
  if(!id&&secs[0])id=secs[0].id.slice(2);
  if(id&&id!==current){current=id;setOn(id)}
}
rail.addEventListener("click",function(e){var b=e.target.closest(".chip");if(b)goTo(b.dataset.id)});
tiles.addEventListener("click",function(e){var b=e.target.closest(".tile");if(b)goTo(b.dataset.id)});
document.getElementById("info").addEventListener("click",function(e){
  var b=e.target.closest(".copy");if(!b)return;
  function fallback(){var s=b.previousElementSibling;if(s){var r=document.createRange();r.selectNodeContents(s);var w=getSelection();w.removeAllRanges();w.addRange(r)}b.textContent="Seçildi, kopyalayın"}
  try{navigator.clipboard.writeText(b.dataset.copy).then(function(){b.textContent="Kopyalandı"},fallback)}catch(err){fallback()}
});
window.addEventListener("scroll",function(){if(!ticking){ticking=true;requestAnimationFrame(function(){ticking=false;spy()})}},{passive:true});
var t;qIn.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){query=norm(qIn.value);render()},120)});

/* ---------- Load ---------- */
function show(d){V=d;render()}
var cached=null;try{cached=JSON.parse(localStorage.getItem(CACHE)||"null")}catch(e){}
var pv=/[?&]onizleme=1/.test(location.search);
if(pv){
  var draft=null;try{draft=JSON.parse(localStorage.getItem("takintii-preview")||"null")}catch(e){}
  if(draft){show(draft);var b=document.createElement("div");b.className="pvbar";b.innerHTML='<div class="wrap"><span>Önizleme · henüz yayınlanmadı</span></div>';document.body.insertBefore(b,document.body.firstChild)}
}
if(!V){
  if(cached)show(cached);
  fetch("menu.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()})
  .then(function(d){if(!d||!d.cats)throw new Error("Geçersiz menü");try{localStorage.setItem(CACHE,JSON.stringify(d))}catch(e){}show(d)})
  .catch(function(){if(!V)menu.innerHTML='<p class="empty">Menü şu anda yüklenemedi. Lütfen sayfayı yenileyin.</p>'});
}
})();

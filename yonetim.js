(function(){
"use strict";
/* TAKINTII CAFE BİSTRO — Menü yönetim paneli.
   menu.json ve fotoğrafları GitHub API ile depoya kaydeder; GitHub Pages siteyi 1-2 dakikada günceller.
   Erişim anahtarı (token) yalnızca bu cihazın tarayıcısında saklanır. */
var API="https://api.github.com";
var KEY="takintii-admin";
var TAGS={yeni:"Yeni",oneri:"Şefin önerisi",populer:"Popüler",aci:"Acı",vegan:"Vejetaryen"};
var ACCENTS=[["#fbb91d","Takıntı sarısı"],["#c9a24a","Altın"],["#d08a5c","Bakır"],["#d7838f","Gül"],["#7cc4a0","Nane"],["#8fb3e0","Buz"],["#cfc8bb","Gümüş"]];
var FOOT_DEF="Afiyet olsun. Alerjen bilgisi için lütfen personelimize danışın.";
var app=document.getElementById("app");

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function norm(s){return String(s||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ı/g,"i")}
function slug(s){return norm(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"oge"}
function clone(o){return JSON.parse(JSON.stringify(o))}
function safeColor(c){return /^#[0-9a-f]{6}$/i.test(c||"")?c:""}
function getPath(obj,path){var k=path.split("."),o=obj;for(var i=0;i<k.length;i++){if(o==null)return undefined;o=o[k[i]]}return o}
function setPath(obj,path,val){var k=path.split("."),o=obj;for(var i=0;i<k.length-1;i++)o=o[k[i]];o[k[k.length-1]]=val}
function delPath(obj,path){var k=path.split("."),o=obj;for(var i=0;i<k.length-1;i++)o=o[k[i]];delete o[k[k.length-1]]}
function move(arr,i,d){var j=i+d;if(j<0||j>=arr.length)return false;var x=arr[i];arr[i]=arr[j];arr[j]=x;return true}
function b64encodeUtf8(str){var bytes=new TextEncoder().encode(str),bin="";for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin)}
function b64decodeUtf8(b64){var bin=atob(String(b64).replace(/\s/g,"")),bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder().decode(bytes)}
function blobToB64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1])};r.onerror=rej;r.readAsDataURL(blob)})}

/* ---------- Bağlantı ayarları ---------- */
function guessRepo(){
  var h=location.hostname,m=h.match(/^([a-z0-9-]+)\.github\.io$/i);if(!m)return {};
  var seg=location.pathname.split("/").filter(Boolean);
  var repo=(seg.length&&!/\.html$/.test(seg[0]))?seg[0]:m[1]+".github.io";
  return {owner:m[1],repo:repo};
}
function loadCfg(){var c={};try{c=JSON.parse(localStorage.getItem(KEY)||sessionStorage.getItem(KEY)||"{}")}catch(e){}var g=guessRepo();return {owner:c.owner||g.owner||"",repo:c.repo||g.repo||"takintii-menu",token:c.token||"",remember:c.remember!==false}}
function saveCfg(c){var s=JSON.stringify(c);try{if(c.remember){localStorage.setItem(KEY,s);sessionStorage.removeItem(KEY)}else{sessionStorage.setItem(KEY,s);localStorage.removeItem(KEY)}}catch(e){}}
function clearCfg(){try{localStorage.removeItem(KEY);sessionStorage.removeItem(KEY)}catch(e){}}
var cfg=loadCfg(),branch="main",sha=null;

function gh(method,path,body){
  return fetch(API+path,{method:method,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+cfg.token,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:body?JSON.stringify(body):undefined})
  .then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}if(!r.ok){var err=new Error((j&&j.message)||("HTTP "+r.status));err.status=r.status;throw err}return j})});
}
function contentsPath(p){return "/repos/"+encodeURIComponent(cfg.owner)+"/"+encodeURIComponent(cfg.repo)+"/contents/"+p.split("/").map(encodeURIComponent).join("/")}
function errText(e){
  if(!e)return "bilinmeyen hata";
  if(e.status===401)return "Erişim anahtarı geçersiz veya süresi dolmuş.";
  if(e.status===403)return "Erişim anahtarının bu depoya yazma izni yok (Contents: Read and write olmalı).";
  if(e.status===404)return "Depo bulunamadı. Kullanıcı adı ve depo adını kontrol edin.";
  if(e.status===409||e.status===422)return "Menü başka bir cihazdan değiştirilmiş. Sayfayı yenileyip tekrar deneyin.";
  if(e instanceof TypeError)return "GitHub’a ulaşılamadı. İnternet bağlantınızı ve erişim anahtarını kontrol edin.";
  return e.message||"bilinmeyen hata";
}

/* ---------- Giriş ---------- */
function renderLogin(msg,cls){
  app.innerHTML='<div class="wrap login"><span class="eyebrow">Yönetim</span><h1>Menü yönetimi</h1>'+
   '<div class="card"><label class="field"><span class="lbl">GitHub kullanıcı adı</span><input class="in" id="lo" value="'+esc(cfg.owner)+'" autocomplete="username" autocapitalize="none"></label>'+
   '<label class="field"><span class="lbl">Depo adı</span><input class="in" id="lr" value="'+esc(cfg.repo)+'" autocapitalize="none"></label>'+
   '<label class="field"><span class="lbl">Erişim anahtarı (token)</span><input class="in" id="lt" type="password" value="'+esc(cfg.token)+'" autocomplete="current-password" placeholder="github_pat_…"></label>'+
   '<label class="chk"><input type="checkbox" id="ls" onchange="document.getElementById(\'lt\').type=this.checked?\'text\':\'password\'"> Anahtarı göster</label>'+
   '<label class="chk"><input type="checkbox" id="lm" '+(cfg.remember?"checked":"")+'> Bu cihazda beni hatırla</label>'+
   '<div class="row"><button class="btn primary" id="lgo">Giriş yap</button></div>'+
   (msg?'<p class="hint '+(cls||"warn-t")+'">'+esc(msg)+"</p>":"")+"</div>"+
   '<div class="card"><span class="lbl">Erişim anahtarı nasıl alınır?</span><ol>'+
   '<li>GitHub’da sağ üstten <b>Settings › Developer settings › Personal access tokens › Fine-grained tokens</b> açın.</li>'+
   '<li><b>Generate new token</b> deyin. Süreyi “No expiration” veya 1 yıl seçin.</li>'+
   '<li><b>Only select repositories</b> ile sadece menü deposunu seçin.</li>'+
   '<li><b>Permissions › Contents</b> iznini <b>Read and write</b> yapın ve oluşturun.</li>'+
   '<li>Çıkan <b>github_pat_…</b> anahtarını buraya yapıştırın. Anahtarı kimseyle paylaşmayın.</li></ol></div></div>';
  document.getElementById("lgo").onclick=login;
  document.getElementById("lt").addEventListener("keydown",function(e){if(e.key==="Enter")login()});
}
function login(){
  cfg={owner:document.getElementById("lo").value.trim(),repo:document.getElementById("lr").value.trim(),token:document.getElementById("lt").value.trim(),remember:document.getElementById("lm").checked};
  if(!cfg.owner||!cfg.repo||!cfg.token){renderLogin("Üç alanı da doldurun.");return}
  if(!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(cfg.token)){renderLogin("Erişim anahtarı eksik ya da hatalı kopyalanmış. github_pat_ veya ghp_ ile başlamalı, arada boşluk olmamalı. GitHub’daki kopyala simgesiyle tekrar kopyalayın.");return}
  var b=document.getElementById("lgo");b.disabled=true;b.textContent="Bağlanıyor…";
  gh("GET","/repos/"+encodeURIComponent(cfg.owner)+"/"+encodeURIComponent(cfg.repo)).then(function(r){
    if(r&&r.permissions&&!r.permissions.push)throw {status:403};
    branch=(r&&r.default_branch)||"main";saveCfg(cfg);return loadMenu();
  }).catch(function(e){renderLogin(errText(e))});
}
function loadMenu(){
  return gh("GET",contentsPath("menu.json")+"?ref="+encodeURIComponent(branch)).then(function(f){
    sha=f.sha;draft=JSON.parse(b64decodeUtf8(f.content));if(!draft.cats)draft.cats=[];
    original=JSON.stringify(draft);undo=[];dirty=false;renderAdmin();
  });
}

/* ---------- Panel ---------- */
var draft=null,original="",sel=0,tab="urun",aq="",dirty=false,undo=[],bulkMsg="",delAsk=-1,snapFor=null,localImg={},saving=false;
function imgSrc(u){u=String(u||"").trim();if(!u)return "";if(localImg[u])return localImg[u];if(/^https:\/\//i.test(u))return u;if(/^[a-z0-9_\-\/]+\.(jpe?g|png|webp|svg|gif)$/i.test(u)&&u.indexOf("..")<0)return u;return ""}
function snap(){undo.push(JSON.stringify(draft));if(undo.length>40)undo.shift()}
function priceIn(path,val,label){return '<input class="in num" inputmode="numeric" data-k="'+path+'" value="'+esc(val==null?"":val)+'" aria-label="'+label+'">'}
function textIn(path,val,ph,label,extra){return '<input class="in" data-k="'+path+'" value="'+esc(val==null?"":val)+'" placeholder="'+esc(ph||"")+'" aria-label="'+esc(label||ph||"")+'"'+(extra||"")+">"}
function catOptions(cur){return draft.cats.map(function(x,i){return '<option value="'+i+'"'+(i===cur?" selected":"")+">"+esc(x.title||"Adsız")+"</option>"}).join("")}
function itemRow(p,it,type,ci,label){
  var tags=Object.keys(TAGS).map(function(k){var on=(it.tags||[]).indexOf(k)>-1;return '<button class="tg'+(on?" on":"")+'" data-act="tag" data-p="'+p+'" data-tag="'+k+'" aria-pressed="'+on+'">'+TAGS[k]+"</button>"}).join("");
  var im=imgSrc(it.img);
  var tools='<div class="tools">'+
    (type!=="pours"?(im?'<img class="ithumb" src="'+esc(im)+'" alt=""><button class="btn mini danger" data-act="photo-del" data-target="'+p+'.img" title="Fotoğrafı kaldır" aria-label="Fotoğrafı kaldır">⌫</button>':"")+'<button class="btn mini" data-act="photo" data-target="'+p+'.img" title="Fotoğraf ekle" aria-label="Fotoğraf ekle">📷</button>':"")+
    '<button class="btn mini" data-act="it-up" data-p="'+p+'" aria-label="Yukarı" title="Yukarı">↑</button><button class="btn mini" data-act="it-down" data-p="'+p+'" aria-label="Aşağı" title="Aşağı">↓</button>'+
    '<button class="btn mini" data-act="it-dup" data-p="'+p+'" aria-label="Kopyala" title="Kopyala">⧉</button>'+
    '<button class="btn toggle'+(it.off?" is-off":"")+'" data-act="it-off" data-p="'+p+'">'+(it.off?"Tükendi":"Satışta")+"</button>"+
    '<button class="btn mini danger" data-act="it-del" data-p="'+p+'" aria-label="Sil" title="Sil">✕</button></div>';
  var head=label?'<span class="where">'+esc(label)+"</span>":"";
  var extra='<div class="extra"><div class="tgs">'+tags+'</div><label class="mv">Taşı<select class="in" data-move="1" data-p="'+p+'">'+catOptions(ci)+"</select></label></div>";
  if(type==="pours")return '<div class="rowi pour'+(it.off?" off":"")+'"><div class="stack">'+head+textIn(p+".n",it.n,"Marka","Marka")+'<div class="pr3"><label>Tek'+priceIn(p+".t",it.t,"Tek fiyatı")+"</label><label>Duble"+priceIn(p+".du",it.du,"Duble fiyatı")+"</label><label>Şişe"+priceIn(p+".s",it.s,"Şişe fiyatı")+"</label></div></div>"+tools+extra+"</div>";
  return '<div class="rowi'+(it.off?" off":"")+'"><div class="stack">'+head+textIn(p+".n",it.n,"Ürün adı","Ürün adı")+textIn(p+".d",it.d,"İçerik / açıklama (isteğe bağlı)","Açıklama")+"</div>"+priceIn(p+".p",it.p,"Fiyat (₺)")+tools+extra+"</div>";
}
function photoBlock(target,url){
  var im=imgSrc(url);
  return '<div class="aphoto">'+(im?'<img src="'+esc(im)+'" alt="">':'<span class="noimg">Foto yok</span>')+'<button class="btn" data-act="photo" data-target="'+target+'">'+(im?"Değiştir":"Fotoğraf yükle")+"</button>"+(im?'<button class="btn danger" data-act="photo-del" data-target="'+target+'">Kaldır</button>':"")+"</div>";
}
function countItems(){var n=0,off=0;draft.cats.forEach(function(c){c.groups.forEach(function(g){g.items.forEach(function(i){n++;if(i.off)off++})})});return [n,off]}

function renderAdmin(status){
  if(sel>=draft.cats.length)sel=Math.max(0,draft.cats.length-1);
  var h='<div class="admin page"><div class="atop"><div class="wrap"><h2>Menü yönetimi<br><span class="who">'+esc(cfg.owner)+" / "+esc(cfg.repo)+'</span></h2><button class="btn ghost" data-act="preview">Önizle</button><a class="btn ghost" href="./" target="_blank" rel="noopener">Menüyü aç</a><button class="btn ghost" data-act="logout">Çıkış</button></div>'+
    '<div class="wrap"><div class="atabs" role="tablist">'+[["urun","Ürünler"],["kat","Kategoriler"],["fiyat","Toplu fiyat"],["bilgi","İşletme & görünüm"]].map(function(x){return '<button class="atab'+(tab===x[0]?" on":"")+'" role="tab" aria-selected="'+(tab===x[0])+'" data-act="tab" data-tab="'+x[0]+'">'+x[1]+"</button>"}).join("")+"</div></div></div>";
  h+='<div class="wrap abody">';
  if(tab==="urun")h+=tabUrun();else if(tab==="kat")h+=tabKat();else if(tab==="fiyat")h+=tabFiyat();else h+=tabBilgi();
  h+="</div>";
  h+='<div class="savebar"><div class="wrap"><button class="btn" data-act="undo" '+(undo.length?"":"disabled")+'>↶ Geri al</button><span class="status '+(status?status.cls:"")+'" id="ast">'+(status?esc(status.msg):(dirty?"Kaydedilmemiş değişiklikler var.":"Değişiklik yok."))+'</span><button class="btn primary" data-act="save" '+(dirty&&!saving?"":"disabled")+">Kaydet ve yayınla</button></div></div></div>";
  var y=window.pageYOffset,focusAq=document.activeElement&&document.activeElement.id==="aq";
  app.innerHTML=h;window.scrollTo(0,y);
  if(focusAq){var f=document.getElementById("aq");if(f){f.focus();var L=f.value.length;try{f.setSelectionRange(L,L)}catch(e){}}}
}
function tabUrun(){
  var cnt=countItems();
  var h='<div class="card"><input class="in" id="aq" type="search" placeholder="Tüm menüde ürün ara ve düzenle…" value="'+esc(aq)+'" aria-label="Ürün ara"><p class="hint">'+cnt[0]+" ürün · "+cnt[1]+" tükendi olarak işaretli</p></div>";
  if(aq){
    var q=norm(aq),res="",n=0;
    draft.cats.forEach(function(c,ci){c.groups.forEach(function(g,gi){g.items.forEach(function(it,ii){if(norm(it.n+" "+(it.d||"")).indexOf(q)>-1){n++;res+=itemRow("cats."+ci+".groups."+gi+".items."+ii,it,g.type,ci,c.title+(g.sub?" · "+g.sub:""))}})})});
    return h+'<div class="card"><span class="lbl">'+n+" sonuç</span>"+(res||'<p class="hint">Eşleşen ürün yok.</p>')+"</div>";
  }
  h+='<div class="card"><span class="lbl">Kategori seç</span><div class="cats">'+draft.cats.map(function(x,i){return '<button class="chip'+(i===sel?" on":"")+(x.off?" dim":"")+'" data-act="sel" data-i="'+i+'">'+esc(x.title||"Adsız")+"</button>"}).join("")+'<button class="chip add" data-act="cat-add">+ Yeni kategori</button></div></div>';
  var c=draft.cats[sel];if(!c)return h+'<div class="card"><p class="hint">Henüz kategori yok. “+ Yeni kategori” ile başlayın.</p></div>';
  h+='<div class="card"><label class="field"><span class="lbl">Kategori adı</span>'+textIn("cats."+sel+".title",c.title,"Kategori adı")+"</label>"+
     '<label class="field"><span class="lbl">Kategori açıklaması (isteğe bağlı)</span>'+textIn("cats."+sel+".desc",c.desc,"Örn. Her gün 17:00’den sonra")+"</label>"+
     '<div class="field"><span class="lbl">Kategori fotoğrafı</span>'+photoBlock("cats."+sel+".img",c.img)+"</div>"+
     (c.off?'<p class="hint warn-t">Bu kategori müşterilere gizli. “Kategoriler” sekmesinden açabilirsiniz.</p>':"");
  c.groups.forEach(function(g,gi){
    var gp="cats."+sel+".groups."+gi;
    h+='<div class="grp"><div class="grp-head">'+textIn(gp+".sub",g.sub,"Alt başlık (isteğe bağlı)","Alt başlık")+
       '<button class="btn mini" data-act="grp-up" data-g="'+gi+'" title="Bölümü yukarı" aria-label="Bölümü yukarı">↑</button><button class="btn mini" data-act="grp-down" data-g="'+gi+'" title="Bölümü aşağı" aria-label="Bölümü aşağı">↓</button>'+
       '<button class="btn mini danger" data-act="grp-del" data-g="'+gi+'" aria-label="Bölümü sil" title="Bölümü sil">✕</button></div>';
    if(g.type==="pours")h+='<span class="lbl">Tek / Duble / Şişe tablosu</span>';
    g.items.forEach(function(it,ii){h+=itemRow(gp+".items."+ii,it,g.type,sel)});
    h+='<div class="row"><button class="btn" data-act="it-add" data-g="'+gi+'">+ Ürün ekle</button></div></div>';
  });
  return h+'<div class="grp"><div class="row"><button class="btn" data-act="grp-add">+ Yeni bölüm (liste)</button><button class="btn" data-act="grp-add-pour">+ Tek/Duble/Şişe tablosu</button></div></div></div>';
}
function tabKat(){
  var h='<div class="card"><span class="lbl">Kategoriler ve sıralama</span><p class="hint">Sırayı oklarla değiştirin. Gizlenen kategori silinmez, sadece menüde görünmez.</p>';
  draft.cats.forEach(function(c,i){
    var im=imgSrc(c.img),n=c.groups.reduce(function(a,g){return a+g.items.length},0);
    h+='<div class="krow'+(c.off?" off":"")+'">'+(im?'<img src="'+esc(im)+'" alt="">':'<span class="kmono">'+esc((c.title||"?").charAt(0))+"</span>")+
       '<div class="stack">'+textIn("cats."+i+".title",c.title,"Kategori adı")+'<span class="hint">'+n+" ürün"+(c.off?" · gizli":"")+"</span></div>"+
       '<div class="tools"><button class="btn mini" data-act="cat-up" data-i="'+i+'" aria-label="Yukarı" title="Yukarı">↑</button><button class="btn mini" data-act="cat-down" data-i="'+i+'" aria-label="Aşağı" title="Aşağı">↓</button>'+
       '<button class="btn mini" data-act="photo" data-target="cats.'+i+'.img" title="Fotoğraf" aria-label="Fotoğraf">📷</button>'+
       '<button class="btn toggle'+(c.off?" is-off":"")+'" data-act="cat-off" data-i="'+i+'">'+(c.off?"Gizli":"Görünür")+"</button>"+
       '<button class="btn mini" data-act="cat-edit" data-i="'+i+'" title="Ürünleri düzenle" aria-label="Ürünleri düzenle">✎</button>'+
       '<button class="btn mini danger" data-act="cat-del" data-i="'+i+'" aria-label="Sil" title="Sil">✕</button></div></div>';
    if(delAsk===i)h+='<div class="confirm">“'+esc(c.title)+'” ve içindeki '+n+' ürün silinecek. <button class="btn danger" data-act="cat-del-yes" data-i="'+i+'">Evet, sil</button><button class="btn" data-act="cat-del-no">Vazgeç</button></div>';
  });
  return h+'<div class="row"><button class="btn" data-act="cat-add">+ Yeni kategori</button></div></div>';
}
function tabFiyat(){
  return '<div class="card"><span class="lbl">Toplu fiyat güncelleme</span><p class="hint">Seçtiğiniz bölümdeki tüm fiyatları yüzde ile artırın veya azaltın. Kaydetmeden önce kontrol edebilir, beğenmezseniz “Geri al” ile dönebilirsiniz.</p>'+
    '<label class="field"><span class="lbl">Hangi ürünler</span><select class="in" id="bscope"><option value="all">Tüm menü</option>'+draft.cats.map(function(c,i){return '<option value="'+i+'">'+esc(c.title)+"</option>"}).join("")+"</select></label>"+
    '<div class="row2"><label class="field"><span class="lbl">Değişim (%)</span><input class="in num" id="bpct" inputmode="decimal" placeholder="Örn. 10 veya -5"></label>'+
    '<label class="field"><span class="lbl">Yuvarla</span><select class="in" id="bround"><option value="1">Yuvarlama yok</option><option value="5">5 ₺</option><option value="10" selected>10 ₺</option><option value="25">25 ₺</option><option value="50">50 ₺</option></select></label></div>'+
    '<div class="row"><button class="btn primary" data-act="bulk">Fiyatları güncelle</button></div>'+(bulkMsg?'<p class="hint ok-t">'+esc(bulkMsg)+"</p>":"")+"</div>";
}
function tabBilgi(){
  var d=draft;
  return '<div class="card"><span class="lbl">İşletme</span>'+
    '<label class="field"><span class="lbl">İşletme adı</span>'+textIn("title",d.title,"İşletme adı")+"</label>"+
    '<label class="field"><span class="lbl">Üst etiket</span>'+textIn("eyebrow",d.eyebrow,"Menü")+"</label>"+
    '<label class="field"><span class="lbl">Başlık altı not</span>'+textIn("note",d.note,"Fiyatlar KDV dahildir")+"</label>"+
    '<div class="field"><span class="lbl">Logo</span>'+photoBlock("logo",d.logo)+"</div></div>"+
    '<div class="card"><span class="lbl">Bağlantılar</span>'+
    '<label class="field"><span class="lbl">Instagram linki</span>'+textIn("instagram",d.instagram,"https://instagram.com/…","Instagram linki",' inputmode="url"')+"</label>"+
    '<label class="field"><span class="lbl">Google yorum linki</span>'+textIn("review",d.review,"https://…","Google yorum linki",' inputmode="url"')+"</label></div>"+
    '<div class="card"><span class="lbl">Müşteri bilgileri (boş bırakılanlar görünmez)</span>'+
    '<label class="field"><span class="lbl">Çalışma saatleri</span>'+textIn("hours",d.hours,"Her gün 10:00 – 02:00")+"</label>"+
    '<label class="field"><span class="lbl">Adres</span>'+textIn("address",d.address,"Mahalle, sokak, ilçe")+"</label>"+
    '<label class="field"><span class="lbl">Telefon</span>'+textIn("phone",d.phone,"0 5xx xxx xx xx","Telefon",' inputmode="tel"')+"</label>"+
    '<div class="row2"><label class="field"><span class="lbl">Wi‑Fi adı</span>'+textIn("wifiName",d.wifiName,"Ağ adı")+"</label>"+
    '<label class="field"><span class="lbl">Wi‑Fi şifresi</span>'+textIn("wifiPass",d.wifiPass,"Şifre")+"</label></div>"+
    '<label class="field"><span class="lbl">Alt yazı</span>'+textIn("footer",d.footer!=null?d.footer:FOOT_DEF,"Alt yazı")+"</label></div>"+
    '<div class="card"><span class="lbl">Vurgu rengi</span><div class="swatches">'+ACCENTS.map(function(a){var on=(safeColor(d.accent)||ACCENTS[0][0]).toLowerCase()===a[0];return '<button class="sw'+(on?" on":"")+'" data-act="accent" data-c="'+a[0]+'" aria-pressed="'+on+'"><i style="background:'+a[0]+'"></i>'+a[1]+"</button>"}).join("")+"</div></div>";
}

function setStatus(msg,cls){var s=document.getElementById("ast");if(s){s.textContent=msg;s.className="status "+(cls||"")}}
function markDirty(){dirty=JSON.stringify(draft)!==original;var b=app.querySelector('[data-act="save"]');if(b)b.disabled=!dirty||saving;var u=app.querySelector('[data-act="undo"]');if(u)u.disabled=!undo.length;setStatus(dirty?"Kaydedilmemiş değişiklikler var.":"Değişiklik yok.")}
app.addEventListener("focusin",function(e){var k=e.target&&e.target.dataset&&e.target.dataset.k;if(k&&snapFor!==e.target){snapFor=e.target;snap()}});
app.addEventListener("input",function(e){
  var el=e.target;if(!draft)return;
  if(el.id==="aq"){aq=el.value;clearTimeout(app._t);app._t=setTimeout(function(){renderAdmin()},200);return}
  var k=el.dataset&&el.dataset.k;if(!k)return;
  var v=el.value;
  if(el.classList.contains("num")){var d=v.replace(/[^\d]/g,"");if(d!==v)el.value=d;v=d===""?0:parseInt(d,10)}
  setPath(draft,k,v);
  if(/^cats\.\d+\.title$/.test(k)){var ch=app.querySelector('.cats [data-i="'+k.split(".")[1]+'"]');if(ch)ch.textContent=v||"Adsız"}
  markDirty();
});
function itemPath(p){var m=String(p||"").match(/^cats\.(\d+)\.groups\.(\d+)\.items\.(\d+)$/);return m?{c:+m[1],g:+m[2],i:+m[3]}:null}
app.addEventListener("change",function(e){
  var el=e.target;if(!el.dataset||!el.dataset.move)return;
  var at=itemPath(el.dataset.p),to=+el.value;if(!at||to===at.c)return;
  snap();
  var src=draft.cats[at.c].groups[at.g],it=src.items.splice(at.i,1)[0],dst=draft.cats[to];
  var g=dst.groups.filter(function(x){return x.type===src.type})[0];
  if(!g){g={sub:src.sub||"",type:src.type,items:[]};dst.groups.push(g)}
  g.items.push(it);
  var msg="“"+(it.n||"Ürün")+"” "+dst.title+" kategorisine taşındı.";renderAdmin({cls:"ok",msg:msg});markDirty();setStatus(msg,"ok");
});
var STRUCT=["photo-del","cat-add","cat-up","cat-down","cat-off","cat-del-yes","grp-add","grp-add-pour","grp-del","grp-up","grp-down","it-add","it-up","it-down","it-dup","it-off","it-del","tag","accent","bulk"];
app.addEventListener("click",function(e){
  var b=e.target.closest("[data-act]");if(!b||b.disabled||!draft)return;
  var a=b.dataset.act,c=draft.cats[sel],gi=+b.dataset.g,ci=b.dataset.i!=null?+b.dataset.i:sel,p=b.dataset.p,at=p?itemPath(p):null,status=null;
  var changed=STRUCT.indexOf(a)>-1;if(changed)snap();
  switch(a){
    case "logout": if(dirty&&!b.dataset.sure){b.dataset.sure="1";b.textContent="Kaydetmeden çık?";return}clearCfg();cfg=loadCfg();cfg.token="";draft=null;renderLogin("Çıkış yapıldı.","hint");return;
    case "preview": preview();return;
    case "save": save();return;
    case "undo": if(undo.length){draft=JSON.parse(undo.pop());snapFor=null;renderAdmin();markDirty();setStatus("Son değişiklik geri alındı.")}return;
    case "tab": tab=b.dataset.tab;delAsk=-1;bulkMsg="";renderAdmin();window.scrollTo(0,0);return;
    case "photo": pickPhoto(b.dataset.target);return;
    case "photo-del": delPath(draft,b.dataset.target);break;
    case "sel": sel=+b.dataset.i;break;
    case "cat-edit": sel=ci;tab="urun";aq="";renderAdmin();window.scrollTo(0,0);return;
    case "cat-add": draft.cats.push({id:"k"+Date.now().toString(36),title:"Yeni kategori",groups:[{sub:"",type:"list",items:[{n:"",p:0}]}]});sel=draft.cats.length-1;if(tab!=="kat"){tab="urun";aq=""}status={cls:"ok",msg:"Yeni kategori eklendi. Adını ve ürünlerini girin."};break;
    case "cat-up": if(move(draft.cats,ci,-1)&&sel===ci)sel--;break;
    case "cat-down": if(move(draft.cats,ci,1)&&sel===ci)sel++;break;
    case "cat-off": var cc=draft.cats[ci];if(cc.off)delete cc.off;else cc.off=true;break;
    case "cat-del": tab="kat";delAsk=ci;renderAdmin();return;
    case "cat-del-yes": draft.cats.splice(ci,1);delAsk=-1;if(sel>=draft.cats.length)sel=Math.max(0,draft.cats.length-1);break;
    case "cat-del-no": delAsk=-1;break;
    case "grp-add": c.groups.push({sub:"",type:"list",items:[{n:"",p:0}]});break;
    case "grp-add-pour": c.groups.push({sub:"Tek · Duble · Şişe",type:"pours",items:[{n:"",t:0,du:0,s:0}]});break;
    case "grp-del": c.groups.splice(gi,1);break;
    case "grp-up": move(c.groups,gi,-1);break;
    case "grp-down": move(c.groups,gi,1);break;
    case "it-add": var g=c.groups[gi];g.items.push(g.type==="pours"?{n:"",t:0,du:0,s:0}:{n:"",p:0});
      renderAdmin();markDirty();
      var rows=app.querySelectorAll('[data-k^="cats.'+sel+".groups."+gi+'.items."][data-k$=".n"]'),last=rows[rows.length-1];if(last){last.focus();last.scrollIntoView({block:"center"})}return;
    case "it-up": if(at)move(draft.cats[at.c].groups[at.g].items,at.i,-1);break;
    case "it-down": if(at)move(draft.cats[at.c].groups[at.g].items,at.i,1);break;
    case "it-dup": if(at){var arr=draft.cats[at.c].groups[at.g].items,cp=clone(arr[at.i]);cp.n=(cp.n||"")+" (kopya)";arr.splice(at.i+1,0,cp)}break;
    case "it-off": if(at){var it=getPath(draft,p);if(it.off)delete it.off;else it.off=true}break;
    case "it-del": if(at){var removed=draft.cats[at.c].groups[at.g].items.splice(at.i,1)[0];status={cls:"",msg:"“"+(removed.n||"Ürün")+"” silindi. Geri almak için ↶ Geri al."}}break;
    case "tag": var ti=getPath(draft,p),tg=b.dataset.tag;ti.tags=ti.tags||[];var x=ti.tags.indexOf(tg);if(x>-1)ti.tags.splice(x,1);else ti.tags.push(tg);if(!ti.tags.length)delete ti.tags;break;
    case "accent": draft.accent=b.dataset.c;break;
    case "bulk": status=bulk();if(status.cls==="err"){undo.pop();changed=false}break;
    default: changed=false;
  }
  renderAdmin(status);if(changed)markDirty();if(status)setStatus(status.msg,status.cls);
});
function bulk(){
  var sc=document.getElementById("bscope").value,pct=parseFloat(String(document.getElementById("bpct").value).replace(",",".")),r=+document.getElementById("bround").value||1;
  if(!isFinite(pct)||pct===0||pct<=-100){bulkMsg="";return {cls:"err",msg:"Geçerli bir yüzde girin (örn. 10 veya -5)."}}
  var n=0,f=function(v){if(!v)return v;n++;return Math.max(r,Math.round(v*(1+pct/100)/r)*r)};
  draft.cats.forEach(function(c,i){if(sc!=="all"&&+sc!==i)return;c.groups.forEach(function(g){g.items.forEach(function(it){if(g.type==="pours"){it.t=f(it.t);it.du=f(it.du);it.s=f(it.s)}else it.p=f(it.p)})})});
  bulkMsg=n+" fiyat %"+(pct>0?"+":"")+pct+" güncellendi. Kontrol edip “Kaydet ve yayınla”ya basın.";
  return {cls:"ok",msg:bulkMsg};
}

/* ---------- Fotoğraf ---------- */
var fileIn=null,pending=null;
function pickPhoto(target){
  pending=target;
  if(!fileIn){fileIn=document.createElement("input");fileIn.type="file";fileIn.accept="image/*";fileIn.className="filein";document.body.appendChild(fileIn);
    fileIn.addEventListener("change",function(){var f=fileIn.files&&fileIn.files[0];fileIn.value="";if(f&&pending)uploadPhoto(f,pending)})}
  fileIn.click();
}
function shrink(file){return new Promise(function(res){
  var url=URL.createObjectURL(file),img=new Image();
  img.onload=function(){var m=1000,s=Math.min(1,m/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(function(b){res(b||file)},"image/jpeg",0.85)};
  img.onerror=function(){URL.revokeObjectURL(url);res(file)};img.src=url;
})}
function uploadPhoto(file,target){
  setStatus("Fotoğraf yükleniyor…");
  var base=slug(String(file.name||"foto").replace(/\.[^.]+$/,"")).slice(0,40),path="images/"+base+"-"+Date.now().toString(36)+".jpg",blob;
  shrink(file).then(function(b){blob=b;return blobToB64(b)}).then(function(b64){
    return gh("PUT",contentsPath(path),{message:"Fotoğraf eklendi: "+path,content:b64,branch:branch});
  }).then(function(){
    localImg[path]=URL.createObjectURL(blob);snap();setPath(draft,target,path);renderAdmin();markDirty();
    setStatus("Fotoğraf yüklendi. Menüye eklemek için “Kaydet ve yayınla”ya basın.","ok");
  }).catch(function(e){setStatus("Fotoğraf yüklenemedi: "+errText(e),"err")});
}

/* ---------- Kaydet ---------- */
function clean(d){
  d.cats.forEach(function(c){
    if(!c.id||!/^[a-z0-9-]+$/.test(c.id))c.id=slug(c.title);
    if(c.desc!=null){c.desc=String(c.desc).trim();if(!c.desc)delete c.desc}
    c.groups.forEach(function(g){g.items=g.items.filter(function(it){return String(it.n||"").trim()});g.items.forEach(function(it){it.n=String(it.n).trim();if(it.d!=null){it.d=String(it.d).trim();if(!it.d)delete it.d}})});
    c.groups=c.groups.filter(function(g){return g.items.length});
  });
  ["hours","address","phone","wifiName","wifiPass","instagram","review","note","eyebrow","logo"].forEach(function(k){if(d[k]!=null){d[k]=String(d[k]).trim();if(!d[k])delete d[k]}});
  if(d.accent&&!safeColor(d.accent))delete d.accent;
  var seen={};d.cats.forEach(function(c){var id=c.id,n=2;while(seen[id])id=c.id+"-"+(n++);c.id=id;seen[id]=1});
  return d;
}
function save(){
  if(saving||!dirty)return;saving=true;
  var btn=app.querySelector('[data-act="save"]');if(btn)btn.disabled=true;
  setStatus("Kaydediliyor…");
  var d=clean(clone(draft)),text=JSON.stringify(d,null,1)+"\n";
  gh("PUT",contentsPath("menu.json"),{message:"Menü güncellendi",content:b64encodeUtf8(text),sha:sha,branch:branch}).then(function(r){
    sha=r&&r.content&&r.content.sha;saving=false;draft=d;original=JSON.stringify(draft);dirty=false;
    renderAdmin({cls:"ok",msg:"Kaydedildi. Menü 1-2 dakika içinde güncellenir."});
  }).catch(function(e){saving=false;if(btn)btn.disabled=false;setStatus("Kaydedilemedi: "+errText(e),"err")});
}

/* ---------- Önizleme ---------- */
function preview(){
  try{localStorage.setItem("takintii-preview",JSON.stringify(clean(clone(draft))))}catch(e){setStatus("Önizleme açılamadı.","err");return}
  var w=document.createElement("div");w.className="pvwrap";
  w.innerHTML='<div class="bar2"><strong>Önizleme</strong><span class="hint">Yeni yüklenen fotoğraflar yayından sonra görünür.</span><button class="btn primary">Düzenlemeye dön</button></div><iframe src="./?onizleme=1" title="Menü önizleme"></iframe>';
  w.querySelector("button").onclick=function(){w.remove()};
  document.body.appendChild(w);
}
window.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue=""}});

/* ---------- Başlat ---------- */
if(cfg.owner&&cfg.repo&&cfg.token){
  app.innerHTML='<p class="loading">Bağlanıyor…</p>';
  gh("GET","/repos/"+encodeURIComponent(cfg.owner)+"/"+encodeURIComponent(cfg.repo)).then(function(r){branch=(r&&r.default_branch)||"main";return loadMenu()}).catch(function(e){renderLogin(errText(e))});
}else renderLogin();
})();

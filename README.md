# TAKINTII CAFE BİSTRO — QR Menü

Müşterilerin QR kodla açtığı menü sitesi ve fiyatları güncellemek için yönetim paneli.

- **Menü:** `https://KULLANICI-ADI.github.io/takintii-menu/`
- **Yönetim paneli:** `https://KULLANICI-ADI.github.io/takintii-menu/yonetim.html`

## Yayına alma (bir kez)

1. Depoda **Settings › Pages** bölümüne gidin.
2. **Source:** “Deploy from a branch”, **Branch:** `main` ve `/ (root)` seçip **Save** deyin.
3. 1-2 dakika sonra menü yukarıdaki adreste açılır. Bu adresi masa kartındaki QR koduna koyun.

## Yönetim paneline giriş

Panel, değişiklikleri doğrudan bu depoya kaydeder. Giriş için bir kez erişim anahtarı oluşturun:

1. GitHub’da **Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**.
2. **Repository access:** “Only select repositories” › `takintii-menu`.
3. **Permissions › Repository permissions › Contents:** “Read and write”.
4. Oluşan `github_pat_…` anahtarını paneldeki giriş ekranına yapıştırın. “Bu cihazda beni hatırla” seçiliyse bir daha sorulmaz.

Anahtar yalnızca girişi yaptığınız cihazın tarayıcısında saklanır. Kaybolursa veya biri ele geçirirse GitHub’dan silip yenisini oluşturun.

## Panelde neler yapılır

- Ürün ekleme, silme, kopyalama, sıralama, kategoriler arası taşıma
- Fiyat ve açıklama düzenleme, Tek / Duble / Şişe fiyat tabloları
- Ürün ve kategori fotoğrafı yükleme (telefondan çekilen fotoğraf otomatik küçültülür)
- “Tükendi” işaretleme ve kategori gizleme
- Etiketler: Yeni, Şefin önerisi, Popüler, Acı, Vejetaryen
- Toplu fiyat güncelleme (yüzde ile, yuvarlamalı)
- Logo, Instagram, Google yorum linki, çalışma saatleri, adres, telefon, Wi-Fi ve vurgu rengi
- Önizleme ve geri alma

Kaydettikten sonra menü 1-2 dakika içinde güncellenir.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `menu.js`, `stil.css` | Müşterinin gördüğü menü |
| `menu.json` | Tüm ürünler, fiyatlar ve ayarlar (panel bu dosyayı günceller) |
| `*.jpg`, `*.svg`, `images/` | Kategori ve ürün fotoğrafları |
| `yonetim.html`, `yonetim.js`, `yonetim.css` | Yönetim paneli |

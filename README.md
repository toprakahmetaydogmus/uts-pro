<div align="center">
  <img src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>" alt="UTS PRO Logo" width="80" height="80">
  <h1>UTS PRO v9.0 TURBO</h1>
  <p><b>Ultimate Medical RPA Automation Engine & Titan Secure Dashboard</b></p>
</div>

---

## 🚀 Proje Hakkında

**UTS PRO v9.0 TURBO**, medikal cihaz barkod doğrulama ve veri çıkarma süreçlerini optimize etmek için geliştirilmiş, yüksek performanslı bir otomasyon arayüzüdür. Bu depo (repository), sistemin **public yüzünü** ve siber güvenlik odaklı mimarisini barındırır.

Bu projenin en büyük özelliği, açık kaynaklı kod bloklarının içerisine yerleştirilmiş **sıfır-bağımlılıklı (zero-dependency)** güvenlik duvarlarıdır. Geliştirici kimlikleri ve veritabanı anahtarları asla istemci tarafında (tarayıcıda) ifşa edilmez.

## 🛡️ Siber Güvenlik Mimarisi

UTS PRO, kötü niyetli botlara ve otomatik scraping işlemlerine karşı çok katmanlı savunma sistemleri kullanır.

### 1. TITAN Secure Visit Logger (Supabase & Vercel)
Ziyaretçilerin IP adresi, konum bilgisi (Ülke/Şehir) ve erişim zamanları **%100 gizlilikle** kayıt altına alınır.
* **Serverless Backend (Zero-Dependency):** Loglama işlemi doğrudan tarayıcıdan Supabase'e **yapılmaz**. Tarayıcı, Vercel üzerinde çalışan güvenli `/api/log.js` endpoint'ine istek atar.
* **No Plain-text API Keys:** Supabase `URL` ve `SERVICE_ROLE_KEY` değerleri kod içerisinde yazmaz, Vercel çevre değişkenlerinden (Environment Variables) güvenle çekilir.
* **Mükerrer İstek Engeli (Session Locking):** Kullanıcı oturum bazlı (sessionStorage) izlenir. Sayfa yenileme veya spam saldırılarında veritabanına art arda istek atılması donanımsal olarak engellenir.

### 2. Tawk.to Obfuscation Engine
Canlı destek sistemi public bir widget olmasına rağmen, GitHub kod tarayıcılarının `Property ID` ve `Widget ID` gibi değerleri düz metin olarak çalmasını önlemek amacıyla **Base64** algoritmasıyla şifrelenmiştir.
* Şifreler yalnızca tarayıcı çalışma anında (runtime) `window.atob()` tarafından çözülür.
* **Domain Guard:** Tawk.to üzerinden "Domain Restriction" aktif edilerek, widget'ın başka bir web sitesinde çalışması imkansız hale getirilmiştir.

## 🛠️ Teknoloji Yığını

* **Frontend:** Vanilla HTML5, CSS3 (Glassmorphism UI), Vanilla JavaScript
* **Backend:** Vercel Serverless Functions (`Node.js Runtime`)
* **Veritabanı:** Supabase (PostgreSQL)
* **Animasyonlar:** GSAP (GreenSock), Three.js (2D Canvas Matrix Rain)

## 📂 Klasör Yapısı

```text
uts-pro/
├── api/
│   └── log.js          # Vercel Serverless Function (Güvenli Supabase API İletişimi)
├── index.html          # Ana Dashboard ve Güvenli Frontend İstekleri
└── README.md           # Proje Dokümantasyonu
```

## ⚙️ Kurulum ve Dağıtım (Deployment)

Projeyi kendi ortamınızda çalıştırmak veya klonlamak istiyorsanız:

1. **Vercel Entegrasyonu:**
   Projeyi Vercel'e aktarın. Vercel, `api/` klasörünü otomatik olarak birer backend uç noktası (endpoint) olarak algılayacaktır.
2. **Supabase Entegrasyonu:**
   Vercel Dashboard üzerinden `Integrations` menüsünden Supabase'i bağlayın.
3. **Veritabanı Tablosunun Kurulumu:**
   Supabase SQL editöründe aşağıdaki tabloyu oluşturun:
   
   ```sql
   create table visitor_logs (
     id uuid default gen_random_uuid() primary key,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null,
     ip_address text,
     action text,
     user_agent text,
     country text,
     city text
   );
   ```
4. Veritabanında **Row Level Security (RLS)** özelliğini aktif edin. Vercel backend'imiz RLS'yi atlayacak yetkiye sahip olduğu için dışarıdan hiçbir veri girişi yapılamayacaktır.

---
*Developed with ⚡ by the UTS PRO Development Team. 2026.*

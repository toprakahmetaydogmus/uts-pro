export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  // Vercel entegrasyonu sayesinde bu gizli anahtarlar otomatik gelir.
  // Asla GitHub'da veya tarayıcıda görünmez.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase anahtarları Vercel panelinde bulunamadı' });
  }

  try {
    // Ziyaretçinin IP, Ülke ve Şehir bilgilerini Vercel üzerinden güvenle al
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'Gizli IP';
    const userAgent = req.headers['user-agent'] || 'Bilinmiyor';
    const country = req.headers['x-vercel-ip-country'] || 'Bilinmiyor';
    const city = req.headers['x-vercel-ip-city'] || 'Bilinmiyor';
    
    const { action } = req.body;

    // Supabase API'sine Kütüphanesiz Doğrudan Güvenli İstek (Zero-dependency)
    const response = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        ip_address: ip, 
        action: action || 'Siteye Giriş Yapıldı', 
        user_agent: userAgent,
        country: country,
        city: city
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Supabase API Hatası:", errText);
      throw new Error("Supabase kayıt başarısız");
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Arka Plan Log Hatası:", err);
    return res.status(500).json({ error: 'İşlem tamamlanamadı' });
  }
}

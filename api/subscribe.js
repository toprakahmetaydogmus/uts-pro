export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase anahtarları Vercel panelinde bulunamadı' });
  }

  const { email, phone } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Geçersiz e-posta adresi' });
  }

  try {
    // Get visitor location and IP safely from Vercel headers
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'Gizli IP';
    const userAgent = req.headers['user-agent'] || 'Bilinmiyor';
    const country = req.headers['x-vercel-ip-country'] || 'Bilinmiyor';
    const city = req.headers['x-vercel-ip-city'] || 'Bilinmiyor';

    // 1. Attempt to save to 'subscribers' table first
    let response = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: email,
        phone: phone || null,
        ip_address: ip,
        user_agent: userAgent,
        country: country,
        city: city
      })
    });

    // 2. If 'subscribers' table doesn't exist (returns 404 or fails), fallback to 'visitor_logs'
    if (!response.ok) {
      console.log("'subscribers' tablosu bulunamadı veya yazma başarısız oldu, 'visitor_logs' tablosuna yedekleniyor...");
      
      const fallbackResponse = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({
          ip_address: ip,
          action: `Abone Olundu: ${email}${phone ? ' | Tel: ' + phone : ''}`,
          user_agent: userAgent,
          country: country,
          city: city
        })
      });

      if (!fallbackResponse.ok) {
        const errText = await fallbackResponse.text();
        console.error("Yedekleme log kaydı da başarısız oldu:", errText);
        throw new Error("Supabase kayıt başarısız");
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Abone Kayıt Hatası:", err);
    return res.status(500).json({ error: 'İşlem tamamlanamadı' });
  }
}

// ════════════════════════════════════════════════════════════════
//  UTS PRO — Subscribe API  |  Vercel Serverless Function
//  KVKK/GDPR Uyumlu · Zero-dependency · Supabase REST
// ════════════════════════════════════════════════════════════════

export default async function handler(req, res) {

  // ── 1. Yöntem Kontrolü ────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  // ── 2. E-posta Doğrulama ──────────────────────────────────────
  const { email, phone } = req.body || {};
  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Geçersiz e-posta adresi' });
  }

  // ── 3. Metadata ───────────────────────────────────────────────
  const ip        = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
  const userAgent = req.headers['user-agent']          || null;
  const country   = req.headers['x-vercel-ip-country'] || null;
  const city      = req.headers['x-vercel-ip-city']    || null;

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone?.trim() || null;

  // ── 4. Vercel Log (her zaman çalışır — Supabase olmasa bile) ──
  console.log(JSON.stringify({
    event     : 'subscribe',
    email     : cleanEmail,
    phone     : cleanPhone,
    ip, country, city,
    ts        : new Date().toISOString(),
  }));

  // ── 5. Supabase (opsiyonel — yoksa yine 200 döner) ───────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {

      // 5a. subscribers tablosuna yaz
      const subRes = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
        method  : 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'apikey'        : serviceKey,
          'Authorization' : `Bearer ${serviceKey}`,
          'Prefer'        : 'return=minimal',
        },
        body: JSON.stringify({
          email      : cleanEmail,
          phone      : cleanPhone,
          ip_address : ip,
          user_agent : userAgent,
          country,
          city,
        }),
      });

      if (subRes.ok) {
        // ✅ subscribers tablosuna yazıldı
        return res.status(200).json({ success: true });
      }

      // 5b. subscribers başarısız → visitor_logs'a yedekle
      console.warn('[subscribe] subscribers tablosu başarısız, visitor_logs\'a yedekleniyor...');

      const logRes = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
        method  : 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'apikey'        : serviceKey,
          'Authorization' : `Bearer ${serviceKey}`,
          'Prefer'        : 'return=minimal',
        },
        body: JSON.stringify({
          ip_address : ip,
          action     : `Abone: ${cleanEmail}${cleanPhone ? ' | Tel: ' + cleanPhone : ''}`,
          user_agent : userAgent,
          country,
          city,
        }),
      });

      if (!logRes.ok) {
        const errText = await logRes.text();
        console.error('[subscribe] visitor_logs yedek de başarısız:', errText);
        // Yine de kullanıcıya başarılı göster — veri Vercel loglarında
      }

    } catch (dbErr) {
      console.error('[subscribe] Supabase bağlantı hatası:', dbErr.message);
      // Supabase bağlanamadı ama veri Vercel loglarında (adım 4) zaten var
    }
  } else {
    console.warn('[subscribe] Supabase env değişkenleri tanımsız — sadece Vercel loguna yazıldı');
  }

  // Her durumda kullanıcıya başarılı mesajı ver
  return res.status(200).json({ success: true });
}

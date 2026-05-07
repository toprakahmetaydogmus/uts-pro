// ════════════════════════════════════════════════════════════════
//  UTS PRO — Visitor Log API  |  Vercel Serverless Function
//  Zero-dependency · KVKK/GDPR Uyumlu · Supabase REST
// ════════════════════════════════════════════════════════════════

// Basit in-memory rate limiter (Vercel'de her instance ayrı çalışır,
// production'da Redis kullanılabilir; bu demo için yeterli)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 saniye
const RATE_LIMIT_MAX       = 5;      // 10 saniyede max 5 istek

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { ts: now, count: 1 });
    return true;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return false;
  return true;
}

// Basit cihaz tipi tespiti
function detectDevice(ua = '') {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua))                       return 'Tablet';
  return 'Desktop';
}

export default async function handler(req, res) {

  // ── 1. Yöntem Kontrolü ────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  // ── 2. Ortam Değişkenleri ─────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[log.js] Supabase env değişkenleri eksik!');
    return res.status(500).json({ error: 'Sunucu yapılandırma hatası' });
  }

  try {

    // ── 3. İstek Metadata ───────────────────────────────────────
    const ip        = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
    const userAgent = req.headers['user-agent']                      || null;
    const country   = req.headers['x-vercel-ip-country']            || null;
    const city      = req.headers['x-vercel-ip-city']               || null;
    const region    = req.headers['x-vercel-ip-country-region']     || null;
    const timezone  = req.headers['x-vercel-ip-timezone']           || null;
    const lang      = req.headers['accept-language']?.split(',')[0] || null;
    const referer   = req.headers['referer']                        || null;

    const { action, page } = req.body;

    // ── 4. Rate Limiting ─────────────────────────────────────────
    if (!checkRateLimit(ip)) {
      console.warn(`[log.js] Rate limit aşıldı: ${ip}`);
      // Sessizce 200 dön — kullanıcıya hata gösterme, sadece logla
      return res.status(200).json({ success: true, note: 'throttled' });
    }

    // ── 5. Supabase'e Yaz ────────────────────────────────────────
    const payload = {
      ip_address : ip,
      action     : action || 'Siteye Giriş Yapıldı',
      user_agent : userAgent,
      country    : country,
      city       : city,
      region     : region,
      timezone   : timezone,
      language   : lang,
      referer    : referer,
      page       : page   || '/',
      device     : detectDevice(userAgent),
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'apikey'        : serviceKey,
        'Authorization' : `Bearer ${serviceKey}`,
        'Prefer'        : 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[log.js] Supabase API Hatası:', errText);
      throw new Error('Supabase kayıt başarısız');
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[log.js] İşlem hatası:', err.message);
    // Frontend'e genel hata ver — detay verme (güvenlik)
    return res.status(500).json({ error: 'İşlem tamamlanamadı' });
  }
}

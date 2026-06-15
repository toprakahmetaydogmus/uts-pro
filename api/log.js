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
  if (!ip) return true; // IP alınamadıysa rate limit engeli koyma
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
function detectDevice(ua) {
  const uaString = ua || '';
  if (/mobile|android|iphone|ipad|ipod/i.test(uaString)) return 'Mobile';
  if (/tablet|ipad/i.test(uaString))                     return 'Tablet';
  return 'Desktop';
}

export default async function handler(req, res) {

  // CORS ve Preflight Ayarları
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    const { action, page } = req.body || {};

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

    let response = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
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
      console.warn('[log.js] Supabase API Hatası, eski tablo formatıyla deneniyor...', errText);

      // Veritabanı tablosu güncellenmemişse yeni kolonları çıkarıp sadece eski temel kolonlarla yazmayı dene
      const fallbackPayload = {
        ip_address : payload.ip_address,
        action     : payload.action,
        user_agent : payload.user_agent,
        country    : payload.country,
        city       : payload.city
      };

      response = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
        method  : 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'apikey'        : serviceKey,
          'Authorization' : `Bearer ${serviceKey}`,
          'Prefer'        : 'return=minimal',
        },
        body: JSON.stringify(fallbackPayload),
      });

      if (!response.ok) {
        const fallbackErrText = await response.text();
        console.error('[log.js] Supabase Fallback API Hatası:', fallbackErrText);
        throw new Error('Supabase kayıt tamamen başarısız');
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[log.js] İşlem hatası:', err.message);
    // Veritabanı tamamen başarısız olsa bile Vercel loglarında veriyi yedekle
    console.log(JSON.stringify({
      event: 'visitor_log_fallback_console',
      ip: (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
      action: req.body?.action || 'Siteye Giriş Yapıldı',
      page: req.body?.page || '/',
      userAgent: req.headers['user-agent'] || null,
      ts: new Date().toISOString()
    }));
    // Kullanıcı deneyimini bozmamak adına sessizce başarılı dön
    return res.status(200).json({ success: true, note: 'logged_to_console_due_to_db_error' });
  }
}

export default function handler(req, res) {
  // CORS 
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vercel üzerinden Clerk Publishable Key'i güvenle ön yüze iletiyoruz
  res.status(200).json({
    clerkPubKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || null
  });
}

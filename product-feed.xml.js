// ============================================================
// ESSIMU UGANDA — LIVE GOOGLE MERCHANT CENTER PRODUCT FEED
// /api/product-feed.xml
//
// Why this exists: structured data on the product pages helps
// Google Search understand products, but Merchant Center's
// primary, most reliable ingestion path is a real submitted feed
// (Merchant Center → Products → Feeds → "Scheduled fetch"), not
// scraped structured data. This endpoint queries the live
// Supabase products table on every request, so product
// additions, price edits, stock changes, and removals made in
// the admin dashboard are reflected the next time Merchant
// Center fetches this URL — no manual re-export, ever.
//
// Setup (one-time, in Google Merchant Center):
//   Products → Feeds → + → Google Sheets/Scheduled fetch →
//   Scheduled fetch → URL: https://essimuuganda.site/api/product-feed.xml
//   Fetch frequency: daily (or as needed)
//
// Scope: only products from the 9 phone brands that actually
// have a live, Supabase-driven category page (Samsung, Apple,
// Google Pixel, Oppo, Redmi/Xiaomi/Poco, Tecno, Infinix, itel,
// Nokia). Laptops/TVs/audio/accessories/smartwatches still live
// on the old static pages, not the database — a feed entry for
// them would link to a page that doesn't actually show that
// product, which is a real Merchant Center policy problem
// (mismatched/broken landing page), not a small technicality.
// They're intentionally excluded until that migration is done.
// ============================================================

const SUPABASE_URL = 'https://ptlciktuhfmmbrgmowid.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lBRCkzGE-erx7XgD3NhPag_3znsuUju';
const SITE_URL = 'https://essimuuganda.site';

// Same brand → live category page mapping used across the site's own
// pages (samsung.html, iphone.html, etc.) — kept here rather than
// imported, since this runs in a separate serverless runtime, not the
// browser, and can't import the client-side assets/js modules directly.
const BRAND_PAGE = {
  'Samsung': 'samsung.html',
  'Apple': 'iphone.html',
  'Google Pixel': 'pixel.html',
  'Oppo': 'oppo.html',
  'Redmi': 'redmi.html',
  'Xiaomi': 'redmi.html',
  'Poco': 'redmi.html',
  'Tecno': 'tecno.html',
  'Infinix': 'infinix.html',
  'itel': 'itel.html',
  'Nokia': 'nokia.html',
};

// Google's official, stable taxonomy ID for "Electronics > Communications
// > Telephony > Mobile Phones". Every product reaching the feed is a
// phone from the brand list above, so this one real, public Google
// category ID is accurate for all of them — not invented.
const GOOGLE_PRODUCT_CATEGORY_MOBILE_PHONES = '267';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function conditionToFeedValue(condition) {
  return condition === 'Brand New' ? 'new' : 'used';
}

function specsLine(product) {
  const parts = [];
  if (product.storage) parts.push(product.storage);
  if (product.ram) parts.push(product.ram + ' RAM');
  if (product.colour) parts.push(product.colour);
  if (product.specs) parts.push(product.specs);
  return parts.join(' · ');
}

// Pure transformation: real Supabase rows in, valid Merchant feed XML out.
// Exported and unit-tested independently of the network/handler code below,
// since this sandbox has no route to the live Supabase API to test that
// part end-to-end — the transformation logic itself is fully verifiable
// without it.
function buildFeedXml(products) {
  const eligible = (products || []).filter(p => {
    if (!p || !p.image_url || p.price == null || p.stock === 0) return false;
    return Object.prototype.hasOwnProperty.call(BRAND_PAGE, p.brand);
  });

  const items = eligible.map(p => {
    const page = BRAND_PAGE[p.brand];
    const link = `${SITE_URL}/${page}#product-${p.id}`;
    const title = `${p.brand} ${p.model}`.trim();
    const description = specsLine(p) || `${p.brand} ${p.model} (${p.condition}) — available at Essimu Uganda, William Street, Kampala.`;

    return `  <item>
    <g:id>${escapeXml(p.id)}</g:id>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <g:image_link>${escapeXml(p.image_url)}</g:image_link>
    <g:availability>in stock</g:availability>
    <g:price>${p.price} UGX</g:price>
    <g:brand>${escapeXml(p.brand)}</g:brand>
    <g:condition>${conditionToFeedValue(p.condition)}</g:condition>
    <g:identifier_exists>no</g:identifier_exists>
    <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY_MOBILE_PHONES}</g:google_product_category>
  </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Essimu Uganda Product Feed</title>
  <link>${SITE_URL}/</link>
  <description>Live product feed for Essimu Uganda — Samsung, iPhone, Google Pixel, Oppo, Redmi, Tecno, Infinix, itel and Nokia phones, Brand New and UK Used.</description>
${items}
</channel>
</rss>
`;
}

// Node serverless handler (Vercel's default runtime for files under /api —
// no framework, no extra dependencies, just the standard req/res shape).
export default async function handler(req, res) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/products?select=*&active=eq.true`;
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    });

    if (!resp.ok) {
      // Deliberately NOT returning 200 with an empty feed here — that would
      // look to Merchant Center like "the catalog is now empty" and could
      // remove every already-approved listing during a transient outage.
      // A non-200 tells Merchant Center's fetcher to treat this run as
      // failed and keep whatever it last successfully ingested.
      res.status(502).send('Upstream product data temporarily unavailable.');
      return;
    }

    const products = await resp.json();
    const xml = buildFeedXml(products);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
    res.status(200).send(xml);
  } catch (err) {
    console.error('product-feed.xml generation failed:', err);
    res.status(502).send('Feed generation failed.');
  }
}

// Exported for the standalone test suite (not used by Vercel itself).
export { buildFeedXml, escapeXml, conditionToFeedValue, BRAND_PAGE };

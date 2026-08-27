// ============================================================
// ESSIMU UGANDA — SHARED PRODUCT RENDERING
// assets/js/products.js
//
// Renders product cards from Supabase rows into the exact same
// markup/classes your pages already style (prod-card, prod-body,
// prod-price, etc.) — no CSS changes needed to start using this.
//
// Usage on a page like samsung.html:
//
//   import { fetchProducts } from './assets/js/supabase.js';
//   import { renderProductGrid } from './assets/js/products.js';
//
//   const products = await fetchProducts({ brand: 'Samsung' });
//   renderProductGrid(document.getElementById('productsGrid'), products);
// ============================================================

const WHATSAPP_NUMBER = '256756922058';

const BRAND_EMOJI = {
  Samsung: '📱', Apple: '🍎', 'Google Pixel': '🔵', Oppo: '🟢',
  Redmi: '🟠', Xiaomi: '🟠', Poco: '🟠', Tecno: '🟡', Infinix: '🟣',
  itel: '⚪', Nokia: '🔷'
};
const CATEGORY_EMOJI = {
  Phone: '📱', Laptop: '💻', TV: '📺', Smartwatch: '⌚',
  Audio: '🎧', Accessory: '🔌', Tablet: '📱'
};

function fmtUGX(n) {
  return 'UGX ' + Number(n).toLocaleString('en-US');
}

// Turns a price + optional price_max into the display string
// your existing pages use, e.g. "UGX 2,800,000 – 3,700,000"
function fmtPriceRange(product) {
  if (product.price_max && product.price_max > product.price) {
    return `${fmtUGX(product.price)} – ${fmtUGX(product.price_max)}`;
  }
  return fmtUGX(product.price);
}

// Dynamically builds the WhatsApp message at click time instead of
// reading a stored waMsg string (per migration spec: don't store
// pre-written messages, generate them from live product data).
function buildWhatsAppLink(product) {
  const priceText = fmtPriceRange(product);
  const message = `Hello, I want to buy: ${product.model} ${product.brand} ${product.condition} - ${priceText}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Whole-number discount % computed from original_price -> price.
// Returns null (never a fake number) when there's no reliable
// original_price to compare against, or it isn't actually higher.
function discountPercent(product) {
  if (!product.original_price || product.original_price <= product.price) return null;
  return Math.round((1 - product.price / product.original_price) * 100);
}

function specsLine(product) {
  const parts = [];
  if (product.storage) parts.push(product.storage);
  if (product.ram) parts.push(product.ram + ' RAM');
  if (product.colour) parts.push(product.colour);
  if (product.specs) parts.push(product.specs);
  return parts.join(' · ');
}

const WA_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

// Renders one product's card HTML. image_url falls back to an
// emoji placeholder until real product photos are sourced.
function renderProductCard(product) {
  const badgeClass = product.condition === 'Brand New' ? 'badge-new' : 'badge-used';
  const emoji = CATEGORY_EMOJI[product.category] || BRAND_EMOJI[product.brand] || '📦';
  const imageHtml = product.image_url
    ? `<img src="${product.image_url}" alt="${product.brand} ${product.model}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
    : `<span class="prod-img-placeholder">${emoji}</span>`;
  const outOfStock = product.stock === 0;

  return `
    <div class="prod-card">
      <span class="prod-card-badge ${badgeClass}">${product.condition}${outOfStock ? ' · Sold Out' : ''}</span>
      <div class="prod-img-wrap">${imageHtml}</div>
      <div class="prod-body">
        <div class="prod-series">${product.brand}</div>
        <div class="prod-name">${product.model}</div>
        <div class="prod-specs">${specsLine(product)}</div>
        <div class="prod-price">${fmtPriceRange(product)}</div>
        <a class="prod-btn-wa" target="_blank" href="${buildWhatsAppLink(product)}" ${outOfStock ? 'style="opacity:.5;pointer-events:none;"' : ''}>
          ${WA_SVG}
          ${outOfStock ? 'Sold Out' : 'Ask on WhatsApp'}
        </a>
      </div>
    </div>
  `;
}

// Renders a full grid into the given container element.
export function renderProductGrid(containerEl, products) {
  if (!containerEl) return;
  if (!products || products.length === 0) {
    containerEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3,#888);">No products found. Check back soon or ask us on WhatsApp.</div>`;
    return;
  }
  containerEl.innerHTML = products.map(renderProductCard).join('');
}

export { fmtUGX, fmtPriceRange, buildWhatsAppLink, discountPercent, specsLine, BRAND_EMOJI, CATEGORY_EMOJI };

// ============================================================
// PRODUCT STRUCTURED DATA (Schema.org Product + Offer)
//
// Why this exists: Google Search Console's "Merchant Opportunities"
// check requires Product/Offer structured data before it will treat
// any page as Shopping-tab eligible. This generates it from the
// exact same live Supabase rows already being rendered into cards —
// no separate data source, so it can never drift from what's on
// the page or what the admin dashboard shows.
//
// Deliberately conservative: a product is only included if it has
// ALL of — a real photo (image_url), a real price, and is in stock.
// Google requires `image` on every Product node; inventing a stock
// photo or using the site logo as a placeholder is against Google's
// Merchant policies and would risk a suspension, not just a warning.
// Products still missing real photos are silently skipped rather
// than shipped with a fake image.
// ============================================================
function conditionSchemaUrl(condition) {
  return condition === 'Brand New'
    ? 'https://schema.org/NewCondition'
    : 'https://schema.org/UsedCondition';
}

function productToSchema(product, pageUrl) {
  const node = {
    '@type': 'Product',
    name: `${product.brand} ${product.model}`.trim(),
    image: product.image_url,
    description: specsLine(product) || `${product.brand} ${product.model} (${product.condition}) — available at Essimu Uganda, William Street, Kampala.`,
    brand: { '@type': 'Brand', name: product.brand },
    itemCondition: conditionSchemaUrl(product.condition),
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'UGX',
      price: String(product.price),
      itemCondition: conditionSchemaUrl(product.condition),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Essimu Uganda' },
    },
  };
  if (product.id !== undefined && product.id !== null) {
    node.sku = String(product.id);
  }
  return node;
}

// Call once per page, after fetchProducts() resolves, with the same
// array that got rendered into cards. Injects a single <script
// type="application/ld+json"> into <head> — it does not touch the
// existing static Store/BreadcrumbList block already in the page.
export function injectProductSchema(products, pageUrl) {
  if (!Array.isArray(products) || !products.length) return;

  const url = pageUrl || document.querySelector('link[rel="canonical"]')?.href || location.href;

  const eligible = products.filter(p =>
    p && p.image_url && p.price != null && p.stock !== 0
  );
  if (!eligible.length) return;

  const graph = eligible.map(p => productToSchema(p, url));

  // Guard against double-injection if a page ever calls this twice.
  const existing = document.getElementById('product-schema-jsonld');
  if (existing) existing.remove();

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'product-schema-jsonld';
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  document.head.appendChild(script);

  return { total: products.length, eligible: eligible.length, skipped: products.length - eligible.length };
}
// ============================================================
// ESSIMU UGANDA — SHARED SUPABASE CONNECTION
// assets/js/supabase.js
//
// Every page that needs product data should load this file
// (as a module) BEFORE any page-specific script that uses it.
//
// This file only ever uses the PUBLISHABLE key. Never put the
// secret key in this file or anywhere else in the frontend —
// it would let anyone who views page source edit your database.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ptlciktuhfmmbrgmowid.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lBRCkzGE-erx7XgD3NhPag_3znsuUju';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ------------------------------------------------------------
// Lightweight client-side query cache.
//
// Every brand/category page calls fetchProducts() on load, so
// without a cache each page view is a fresh round-trip to
// Supabase even if the last visitor loaded the exact same
// filtered list seconds ago. sessionStorage keeps this cache
// scoped to the current browser tab/session only — it never
// persists across days the way localStorage would, and it's
// automatically cleared when the tab closes.
//
// TTL is short (3 minutes) on purpose: Ivan edits prices, stock,
// and Hot Deal flags through the admin dashboard and expects
// those changes to show up quickly on the live site. This cache
// exists to absorb repeat page loads within a short browsing
// session, not to serve stale data for hours.
// ------------------------------------------------------------
const CACHE_PREFIX = 'essimu_products_';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!Array.isArray(data) || typeof ts !== 'number') return null;
    if (Date.now() - ts >= CACHE_TTL_MS) return null;
    return data;
  } catch (e) {
    // Corrupted entry or sessionStorage unavailable (private browsing, etc.) — just skip the cache.
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    // Storage full or unavailable — non-fatal, the page still works without caching.
  }
}

// ------------------------------------------------------------
// Small helper used by every brand/category page.
// Fetches active products, optionally filtered by brand/category/condition.
// Example: fetchProducts({ brand: 'Samsung' })
//          fetchProducts({ category: 'Phone', condition: 'UK Used' })
//
// Results are cached per unique filter combination for CACHE_TTL_MS.
// Pass { skipCache: true } to force a fresh network request (e.g. a
// manual "refresh" action), which also refreshes the cached copy.
// ------------------------------------------------------------
export async function fetchProducts(filters = {}) {
  const { skipCache, ...queryFilters } = filters;
  const cacheKey = CACHE_PREFIX + JSON.stringify(queryFilters);

  if (!skipCache) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }

  let query = supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (queryFilters.brand)     query = query.eq('brand', queryFilters.brand);
  if (queryFilters.brands)    query = query.in('brand', queryFilters.brands);
  if (queryFilters.category)  query = query.eq('category', queryFilters.category);
  if (queryFilters.condition) query = query.eq('condition', queryFilters.condition);
  if (queryFilters.featured)  query = query.eq('featured', true);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  writeCache(cacheKey, data);
  return data;
}
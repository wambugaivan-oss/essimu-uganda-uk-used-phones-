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
// Small helper used by every brand/category page.
// Fetches active products, optionally filtered by brand/category/condition.
// Example: fetchProducts({ brand: 'Samsung' })
//          fetchProducts({ category: 'Phone', condition: 'UK Used' })
// ------------------------------------------------------------
export async function fetchProducts(filters = {}) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (filters.brand)     query = query.eq('brand', filters.brand);
  if (filters.brands)    query = query.in('brand', filters.brands);
  if (filters.category)  query = query.eq('category', filters.category);
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.featured)  query = query.eq('featured', true);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data;
}

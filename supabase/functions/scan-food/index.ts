import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://127.0.0.1:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
type ScanBody = { scanType?: 'food_label'; householdId?: string; catId?: string; barcode?: string; imageBase64?: string };
type Draft = { brand: string; product_name: string; variant: string | null; food_type: 'dry' | 'wet' | 'treat' | 'supplement' | 'other'; barcode: string | null; source: 'barcode' | 'ocr' };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return response('ok');
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return response({ error: 'Unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return response({ error: 'Unauthorized' }, 401);
    const body = await request.json() as ScanBody;
    if (body.scanType !== 'food_label') return response({ error: 'Jenis scan tidak didukung.' }, 400);
    if (!body.householdId) return response({ error: 'Household wajib dipilih.' }, 400);
    const { data: access, error: accessError } = await client.rpc('household_access', { requested_household_id: body.householdId });
    if (accessError || !access?.length) return response({ error: 'Akses household ditolak.' }, 403);
    if (body.barcode) {
      const barcode = body.barcode.replace(/[^0-9]/g, '');
      if (barcode.length < 8) return response({ error: 'Barcode tidak valid.' }, 422);
      const lookup = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, { headers: { Accept: 'application/json' } });
      if (!lookup.ok) return response({ error: 'Katalog barcode sedang tidak tersedia.' }, 502);
      const product = await lookup.json() as { status?: number; product?: { brands?: string; product_name?: string; product_name_en?: string; generic_name?: string; categories_tags?: string[] } };
      const name = product.product?.product_name || product.product?.product_name_en;
      if (product.status !== 1 || !name) return response({ error: 'Produk tidak ditemukan. Gunakan foto label atau isi manual.' }, 404);
      const categories = (product.product?.categories_tags ?? []).join(' ').toLowerCase();
      const food_type = categories.includes('treat') || categories.includes('snack') ? 'treat' : categories.includes('wet') || categories.includes('canned') ? 'wet' : 'dry';
      const draft: Draft = { brand: product.product?.brands?.split(',')[0]?.trim() || '', product_name: name.trim(), variant: product.product?.generic_name?.trim() || null, food_type, barcode, source: 'barcode' };
      return response({ draft, status: 'draft' });
    }
    if (body.imageBase64) {
      if (body.imageBase64.length > 14_000_000 || !/^[A-Za-z0-9+/=]+$/.test(body.imageBase64)) return response({ error: 'Foto label terlalu besar atau tidak valid.' }, 413);
      const ocrUrl = Deno.env.get('OCR_API_URL');
      const ocrKey = Deno.env.get('OCR_API_KEY');
      if (!ocrUrl || !ocrKey) return response({ error: 'OCR belum dikonfigurasi. Isi data produk manual atau gunakan barcode.' }, 503);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const ocrResponse = await fetch(ocrUrl, { method: 'POST', headers: { Authorization: `Bearer ${ocrKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: body.imageBase64 }), signal: controller.signal }).finally(() => clearTimeout(timeout));
      if (!ocrResponse.ok) return response({ error: 'Label belum berhasil dibaca. Coba foto lebih dekat dan terang.' }, 422);
      const result = await ocrResponse.json() as Partial<Draft>;
      if (!result.brand || !result.product_name) return response({ error: 'Brand atau nama produk belum terbaca. Lengkapi manual.' }, 422);
      return response({ status: 'draft', draft: { brand: result.brand.trim(), product_name: result.product_name.trim(), variant: result.variant?.trim() || null, food_type: result.food_type ?? 'other', barcode: result.barcode ?? null, source: 'ocr' } satisfies Draft });
    }
    return response({ error: 'Barcode atau foto label wajib diisi.' }, 422);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Scan gagal.' }, 400);
  }
});

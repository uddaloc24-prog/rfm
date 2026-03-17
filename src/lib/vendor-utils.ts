import { Vendor } from './types';

/**
 * If a vendor came from OpenStreetMap (_source === 'osm'), create it in Supabase first
 * and return the real DB vendor. Otherwise, return as-is.
 */
export async function ensureVendorInDb(vendor: Vendor): Promise<Vendor> {
  if (vendor._source !== 'osm') return vendor;
  try {
    const res = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: vendor.name,
        category: vendor.category,
        neighbourhood: vendor.neighbourhood,
        city: vendor.city,
        lat: vendor.lat,
        lng: vendor.lng,
        address_text: vendor.address_text,
      }),
    });
    const data = await res.json();
    // res.ok = 201 created, res.status 409 = duplicate (returns existing vendor)
    if ((res.ok || res.status === 409) && data.vendor) {
      return data.vendor as Vendor;
    }
  } catch { /* non-fatal */ }
  return vendor;
}

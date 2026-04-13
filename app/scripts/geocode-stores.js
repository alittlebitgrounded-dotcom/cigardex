/**
 * CigarDex — Bulk Geocode Stores
 * 
 * Run this ONCE to geocode all stores that have null lat/lng.
 * Uses the free US Census Bureau geocoder — no API key needed.
 * Safe to re-run: only touches rows where latitude IS NULL.
 * 
 * Usage:
 *   cd "D:\Projects\Cigar Review\cigar-app"
 *   node scripts/geocode-stores.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://exdordwwwgrjecqmghcr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'
)

// Rate limit — Census API is free but don't hammer it
const DELAY_MS = 300

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocodeAddress(address, city, state) {
  // Build the best query we can from available data
  const params = new URLSearchParams({
    benchmark: 'Public_AR_Current',
    format: 'json',
  })

  if (address && city && state) {
    params.set('street', address)
    params.set('city', city)
    params.set('state', state)
  } else if (city && state) {
    // No address — geocode to city center
    // Use zip geocoder instead
    return geocodeCityState(city, state)
  } else {
    return null
  }

  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/address?${params}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const match = data?.result?.addressMatches?.[0]
    if (!match) {
      // Fall back to city-level geocode
      return geocodeCityState(city, state)
    }
    return {
      lat: match.coordinates.y,
      lng: match.coordinates.x,
      matched: 'address'
    }
  } catch {
    return null
  }
}

async function geocodeCityState(city, state) {
  if (!city || !state) return null
  try {
    // Use nominatim as city-level fallback (free, no key)
    const query = encodeURIComponent(`${city}, ${state}, USA`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CigarDex/1.0 (development)' }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.length === 0) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      matched: 'city'
    }
  } catch {
    return null
  }
}

async function main() {
  console.log('🍂 CigarDex Store Geocoder\n')

  // Fetch all stores missing coordinates
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, address, city, state')
    .is('latitude', null)
    .order('name')

  if (error) {
    console.error('Failed to fetch stores:', error.message)
    process.exit(1)
  }

  console.log(`Found ${stores.length} stores needing geocoding\n`)

  let success = 0
  let failed = 0
  let cityLevel = 0

  for (const store of stores) {
    process.stdout.write(`  ${store.name} (${store.city}, ${store.state})... `)

    const result = await geocodeAddress(store.address, store.city, store.state)

    if (result) {
      const { error: updateError } = await supabase
        .from('stores')
        .update({ latitude: result.lat, longitude: result.lng })
        .eq('id', store.id)

      if (updateError) {
        console.log(`❌ DB error: ${updateError.message}`)
        failed++
      } else {
        const tag = result.matched === 'city' ? ' (city-level)' : ''
        console.log(`✓ ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}${tag}`)
        success++
        if (result.matched === 'city') cityLevel++
      }
    } else {
      console.log('⚠ Could not geocode — skipped')
      failed++
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n✅ Done`)
  console.log(`   Geocoded: ${success} stores (${cityLevel} city-level only)`)
  console.log(`   Skipped:  ${failed} stores`)
  console.log(`\nCity-level coordinates are approximate (city center).`)
  console.log(`Distance sorting will work but may be off by a mile or two for those stores.`)
}

main()
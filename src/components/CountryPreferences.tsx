'use client'

// src/components/CountryPreferences.tsx
// Lets users set which countries to include/exclude from their front page.
// Used in profile settings. Default = all on (no preferences saved = show all).

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Canonical country list — add to this as new countries appear in DB
export const CIGAR_COUNTRIES = [
  { code: 'NI', name: 'Nicaragua',            flag: '🇳🇮' },
  { code: 'DO', name: 'Dominican Republic',   flag: '🇩🇴' },
  { code: 'HN', name: 'Honduras',             flag: '🇭🇳' },
  { code: 'CU', name: 'Cuba',                 flag: '🇨🇺' },
  { code: 'US', name: 'United States',        flag: '🇺🇸' },
  { code: 'EC', name: 'Ecuador',              flag: '🇪🇨' },
  { code: 'MX', name: 'Mexico',               flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil',               flag: '🇧🇷' },
  { code: 'PE', name: 'Peru',                 flag: '🇵🇪' },
  { code: 'CM', name: 'Cameroon',             flag: '🇨🇲' },
  { code: 'ID', name: 'Indonesia',            flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines',          flag: '🇵🇭' },
  { code: 'JM', name: 'Jamaica',              flag: '🇯🇲' },
  { code: 'ES', name: 'Canary Islands',       flag: '🇮🇨' },
  { code: 'PA', name: 'Panama',               flag: '🇵🇦' },
]

interface Props {
  userId: string
}

type Pref = { country: string; preference: 'include' | 'exclude' }

export default function CountryPreferences({ userId }: Props) {
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadPrefs()
  }, [userId])

  async function loadPrefs() {
    const { data } = await supabase
      .from('user_country_preferences')
      .select('country, preference')
      .eq('user_id', userId)
    setPrefs((data as Pref[]) ?? [])
    setLoading(false)
  }

  function getState(countryName: string): 'include' | 'exclude' | 'default' {
    const pref = prefs.find(p => p.country === countryName)
    return pref?.preference ?? 'default'
  }

  async function toggleCountry(countryName: string, isCuban: boolean) {
    setSaving(countryName)
    const current = getState(countryName)

    // Cycle: default → exclude → default
    // (include is the same as default — no row needed)
    if (current === 'default' || current === 'include') {
      // Exclude it
      await supabase.from('user_country_preferences').upsert({
        user_id: userId,
        country: countryName,
        preference: 'exclude',
      }, { onConflict: 'user_id,country' })
      setPrefs(p => {
        const filtered = p.filter(x => x.country !== countryName)
        return [...filtered, { country: countryName, preference: 'exclude' }]
      })
      setMessage(`${countryName} cigars hidden from your front page.`)
    } else {
      // Remove the exclude = show again
      await supabase.from('user_country_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('country', countryName)
      setPrefs(p => p.filter(x => x.country !== countryName))
      setMessage(`${countryName} cigars restored to your front page.`)
    }

    setSaving(null)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <p style={{ color: '#aaa', fontSize: 13 }}>Loading preferences...</p>

  const excludedCount = prefs.filter(p => p.preference === 'exclude').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
            Country Preferences
          </h3>
          <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0 }}>
            {excludedCount === 0
              ? 'All countries shown — click any flag to hide it from your front page'
              : `${excludedCount} countr${excludedCount === 1 ? 'y' : 'ies'} hidden from your front page`}
          </p>
        </div>
        {excludedCount > 0 && (
          <button
            onClick={async () => {
              await supabase.from('user_country_preferences').delete().eq('user_id', userId)
              setPrefs([])
              setMessage('All countries restored.')
              setTimeout(() => setMessage(''), 3000)
            }}
            style={{ fontSize: 12, color: '#8b5e2a', background: 'none', border: '1px solid #d4b896', borderRadius: 5, padding: '4px 10px', cursor: 'pointer' }}
          >
            Reset all
          </button>
        )}
      </div>

      {message && (
        <p style={{ fontSize: 13, color: '#2e7d32', background: '#e8f5e9', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
          {message}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {CIGAR_COUNTRIES.map(country => {
          const state = getState(country.name)
          const isExcluded = state === 'exclude'
          const isCuban = country.code === 'CU'

          return (
            <button
              key={country.code}
              onClick={() => toggleCountry(country.name, isCuban)}
              disabled={saving === country.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                border: isExcluded ? '1px solid #ffcdd2' : '1px solid #e8ddd0',
                background: isExcluded ? '#fff8f8' : '#faf8f5',
                cursor: 'pointer',
                textAlign: 'left',
                opacity: saving === country.name ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{country.flag}</span>
              <div style={{ minWidth: 0 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isExcluded ? '#c62828' : '#1a0a00',
                  display: 'block',
                  textDecoration: isExcluded ? 'line-through' : 'none',
                }}>
                  {country.name}
                </span>
                {isCuban && (
                  <span style={{ fontSize: 10, color: '#f9a825', display: 'block' }}>
                    ⚠ Legal notice applies
                  </span>
                )}
              </div>
              <span style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: isExcluded ? '#c62828' : '#aaa',
                flexShrink: 0,
              }}>
                {isExcluded ? 'Hidden' : 'Shown'}
              </span>
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: '#bbb', margin: '12px 0 0' }}>
        These preferences only affect your front page view. All cigars remain searchable.
      </p>
    </div>
  )
}

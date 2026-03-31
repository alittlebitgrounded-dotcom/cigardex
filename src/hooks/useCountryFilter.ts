// src/hooks/useCountryFilter.ts
// Hook that loads a user's country preferences and returns
// a filter function to apply to any cigar array.
// Returns { filterCigars, excludedCountries, loading }

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseCountryFilterOptions {
  userId: string | null
}

export function useCountryFilter({ userId }: UseCountryFilterOptions) {
  const [excludedCountries, setExcludedCountries] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setExcludedCountries([])
      return
    }
    loadPrefs(userId)
  }, [userId])

  async function loadPrefs(uid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('user_country_preferences')
      .select('country, preference')
      .eq('user_id', uid)
      .eq('preference', 'exclude')
    setExcludedCountries(data?.map(d => d.country) ?? [])
    setLoading(false)
  }

  // Apply to any array of objects that have a country_of_origin field
  function filterCigars<T extends { country_of_origin?: string | null; is_cuban?: boolean }>(
    cigars: T[]
  ): T[] {
    if (excludedCountries.length === 0) return cigars
    return cigars.filter(c => {
      const country = c.country_of_origin
      if (!country) return true // no country set = always show
      return !excludedCountries.includes(country)
    })
  }

  return { filterCigars, excludedCountries, loading }
}
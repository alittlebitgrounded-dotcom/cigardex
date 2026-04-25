'use client'

import { supabase } from '@/lib/supabase'

export type ReviewerPublicationProfile = {
  membershipId: string
  publicationId: string
  publicationName: string | null
  publicationUrl: string | null
  socialUrls: Record<string, string> | null
}

type ReviewerPublicationRow = {
  id: string
  status: string
  publication_id: string
  reviewer_publications: {
    id: string
    name: string | null
    website_url: string | null
    social_urls: Record<string, string> | null
  } | null
}

type ReviewerPublicationBatchRow = {
  user_id: string
  id: string
  status: string
  publication_id: string
  reviewer_publications: {
    id: string
    name: string | null
    website_url: string | null
    social_urls: Record<string, string> | null
  }[] | {
    id: string
    name: string | null
    website_url: string | null
    social_urls: Record<string, string> | null
  } | null
}

function isMissingReviewerTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? error.code : null
  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : ''

  return code === '42P01'
    || message.includes('reviewer_publication_members')
    || message.includes('reviewer_publications')
}

export async function getReviewerPublicationProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('reviewer_publication_members')
      .select('id, status, publication_id, reviewer_publications(id, name, website_url, social_urls)')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle()

    if (error) {
      if (isMissingReviewerTableError(error)) return null
      throw error
    }

    const membership = data as unknown as ReviewerPublicationRow | null
    if (!membership?.reviewer_publications) return null

    return {
      membershipId: membership.id,
      publicationId: membership.publication_id,
      publicationName: membership.reviewer_publications.name,
      publicationUrl: membership.reviewer_publications.website_url,
      socialUrls: membership.reviewer_publications.social_urls || null,
    } as ReviewerPublicationProfile
  } catch (error) {
    if (isMissingReviewerTableError(error)) return null
    throw error
  }
}

export async function getReviewerPublicationProfilesForUsers(userIds: string[]) {
  if (userIds.length === 0) return {}

  try {
    const { data, error } = await supabase
      .from('reviewer_publication_members')
      .select('user_id, status, publication_id, reviewer_publications(id, name, website_url, social_urls)')
      .in('user_id', userIds)
      .eq('status', 'approved')

    if (error) {
      if (isMissingReviewerTableError(error)) return {}
      throw error
    }

    return ((data || []) as unknown as ReviewerPublicationBatchRow[]).reduce<Record<string, ReviewerPublicationProfile>>((acc, membership) => {
      const publication = Array.isArray(membership.reviewer_publications)
        ? membership.reviewer_publications[0] || null
        : membership.reviewer_publications

      if (!publication) return acc

      acc[membership.user_id] = {
        membershipId: membership.id,
        publicationId: membership.publication_id,
        publicationName: publication.name,
        publicationUrl: publication.website_url,
        socialUrls: publication.social_urls || null,
      }

      return acc
    }, {})
  } catch (error) {
    if (isMissingReviewerTableError(error)) return {}
    throw error
  }
}

export async function saveReviewerPublicationProfile(
  userId: string,
  input: {
    publicationName: string | null
    publicationUrl: string | null
    socialUrls: Record<string, string> | null
  },
  existingPublicationId?: string | null,
) {
  try {
    let publicationId = existingPublicationId || null

    if (publicationId) {
      const { error } = await supabase
        .from('reviewer_publications')
        .update({
          name: input.publicationName,
          website_url: input.publicationUrl,
          social_urls: input.socialUrls,
        })
        .eq('id', publicationId)

      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('reviewer_publications')
        .insert({
          name: input.publicationName,
          website_url: input.publicationUrl,
          social_urls: input.socialUrls,
          created_by: userId,
        })
        .select('id')
        .single()

      if (error) throw error
      publicationId = data.id
    }

    const { error: membershipError } = await supabase
      .from('reviewer_publication_members')
      .upsert(
        {
          user_id: userId,
          publication_id: publicationId,
          status: 'approved',
        },
        { onConflict: 'user_id,publication_id' },
      )

    if (membershipError) throw membershipError

    return publicationId
  } catch (error) {
    if (isMissingReviewerTableError(error)) return null
    throw error
  }
}

export async function resolveIndustryType(userId: string, role: string | null) {
  const reviewerPublication = await getReviewerPublicationProfile(userId)

  const [{ data: storeAccount }, { data: approvedBrandAssociations }] = await Promise.all([
    supabase.from('store_accounts').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('brand_rep_brands').select('id').eq('user_id', userId).eq('status', 'approved').limit(1),
  ])

  const industryType = role === 'store' || role === 'brand' || role === 'reviewer'
    ? role
    : storeAccount
      ? 'store'
      : (approvedBrandAssociations || []).length > 0
        ? 'brand'
        : reviewerPublication
          ? 'reviewer'
          : null

  return {
    industryType,
    reviewerPublication,
    hasStoreMembership: !!storeAccount,
    hasApprovedBrandAssociation: (approvedBrandAssociations || []).length > 0,
  }
}

import type { Metadata } from 'next'
import SharedWishlistPageClient from './page-client'

export const metadata: Metadata = {
  title: 'Shared Wishlist',
  description: 'Browse a shared cigar wishlist on CigarDex.',
}

export default function SharedWishlistPage() {
  return <SharedWishlistPageClient />
}

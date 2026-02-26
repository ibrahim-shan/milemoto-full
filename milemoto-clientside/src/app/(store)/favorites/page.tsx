import type { Metadata } from 'next';
import { FavoritesClient } from '@/features/wishlist/FavoritesClient';

export const metadata: Metadata = {
  title: 'Favorites',
  description: 'Your saved favorite products.',
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}

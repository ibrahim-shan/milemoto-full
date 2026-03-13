import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ProductClient } from '@/features/product/components/ProductClient';
import { serverFetchProductBySlug } from '@/lib/storefront';

type Props = { params: Promise<{ slug: string }> };

// Generate rich <head> metadata for crawlers from the server-fetched product
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await serverFetchProductBySlug(slug);
    const price = product.variants[0]?.price;
    return {
      title: product.name,
      description: product.shortDescription ?? `Buy ${product.name} at Milemoto`,
      openGraph: {
        title: product.name,
        description: product.shortDescription ?? `Buy ${product.name} at Milemoto`,
        ...(product.images[0] ? { images: [{ url: product.images[0] }] } : {}),
      },
      ...(price != null
        ? {
            other: {
              'product:price:amount': String(price),
              'product:price:currency': 'USD',
            },
          }
        : {}),
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

// Async server component — fetches data on the server, renders HTML for crawlers
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    // Product detail includes live variant availability, so avoid ISR cache here.
    product = await serverFetchProductBySlug(slug, 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('[serverGet] 410')) {
      redirect('/shop');
    }
    if (message.includes('[serverGet] 404')) {
      notFound();
    }
    throw error;
  }

  return <ProductClient product={product} />;
}

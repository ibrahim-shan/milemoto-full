// src/app/account/orders/page.tsx
import type { Metadata } from 'next';

import OrdersListClient from '@/features/account/orders/OrdersListClient';

export const metadata: Metadata = {
  title: 'My Orders',
};

export default function OrdersPage() {
  return <OrdersListClient />;
}

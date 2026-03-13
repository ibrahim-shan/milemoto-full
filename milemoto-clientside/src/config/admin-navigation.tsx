import {
  Barcode,
  Box,
  Boxes,
  ClipboardList,
  Cookie,
  File,
  FileText,
  Grip,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  MapPin,
  Megaphone,
  Network,
  Package,
  Paintbrush,
  Percent,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

export type NavItemConfig = {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: string;
};

export type NavGroupConfig = {
  title: string;
  icon: LucideIcon;
  items: NavItemConfig[];
};

export type NavConfigItem = NavItemConfig | NavGroupConfig;

export const adminNavigation: NavConfigItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    perm: 'dashboard.read',
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    items: [
      {
        href: '/admin/orders',
        label: 'Orders',
        icon: ShoppingCart,
        perm: 'orders.read',
      },
      {
        href: '/admin/order-requests',
        label: 'Order Requests',
        icon: ClipboardList,
        perm: 'orders.read',
      },
      {
        href: '/admin/invoices',
        label: 'Invoices',
        icon: FileText,
        perm: 'invoices.read',
      },
    ],
  },
  {
    title: 'Products',
    icon: Package,
    items: [
      {
        href: '/admin/products',
        label: 'Products',
        icon: Box,
        perm: 'products.read',
      },
      {
        href: '/admin/categories',
        label: 'Categories',
        icon: Warehouse,
        perm: 'categories.read',
      },
      {
        href: '/admin/brands',
        label: 'Brands',
        icon: Tags,
        perm: 'brands.read',
      },
      {
        href: '/admin/variants',
        label: 'Variants',
        icon: Network,
        perm: 'variants.read',
      },
      {
        href: '/admin/collections',
        label: 'Collections',
        icon: Grip,
        perm: 'collections.read',
      },
      {
        href: '/admin/reviews',
        label: 'Reviews',
        icon: Star,
        perm: 'reviews.read',
      },
      {
        href: '/admin/grades',
        label: 'Grades',
        icon: ClipboardList,
        perm: 'grades.read',
      },
      {
        href: '/admin/warranties',
        label: 'Warranties',
        icon: ShieldCheck,
        perm: 'warranties.read',
      },
    ],
  },
  {
    title: 'Purchases',
    icon: ShoppingBag,
    items: [
      {
        href: '/admin/vendors',
        label: 'Vendors',
        icon: Store,
        perm: 'vendors.read',
      },
      {
        href: '/admin/purchase-orders',
        label: 'Purchase Orders',
        icon: FileText,
        perm: 'purchase_orders.read',
      },
      {
        href: '/admin/goods-receipts',
        label: 'Goods Receipts',
        icon: ClipboardList,
        perm: 'goods_receipts.read',
      },
    ],
  },
  {
    title: 'Inventory',
    icon: Boxes,
    items: [
      {
        href: '/admin/stock',
        label: 'Stock',
        icon: ClipboardList,
        perm: 'stock.read',
      },
      {
        href: '/admin/stock/movements',
        label: 'Stock Movements',
        icon: FileText,
        perm: 'stock_movements.read',
      },
      {
        href: '/admin/locations',
        label: 'Locations',
        icon: MapPin,
        perm: 'locations.read',
      },
      {
        href: '/admin/barcodes',
        label: 'Barcodes',
        icon: Barcode,
        perm: 'barcodes.read',
      },
    ],
  },
  {
    title: 'Customers',
    icon: Users,
    items: [
      {
        href: '/admin/customers',
        label: 'Customers',
        icon: Users,
        perm: 'customers.read',
      },
      {
        href: '/admin/tickets',
        label: 'Support Tickets',
        icon: LifeBuoy,
        perm: 'support_tickets.read',
      },
    ],
  },
  {
    title: 'Marketing',
    icon: Megaphone,
    items: [
      {
        href: '/admin/discounts',
        label: 'Discounts',
        icon: Percent,
        perm: 'discounts.read',
      },
      {
        href: '/admin/social-media',
        label: 'Social Media',
        icon: Share2,
        perm: 'social_media.read',
      },
    ],
  },
  {
    title: 'Storefront',
    icon: Store,
    items: [
      {
        href: '/admin/pages',
        label: 'Pages',
        icon: File,
        perm: 'pages.read',
      },
      {
        href: '/admin/settings/theme',
        label: 'Theme',
        icon: Paintbrush,
        perm: 'theme.read',
      },
      {
        href: '/admin/cookie-banner',
        label: 'Cookie Banner',
        icon: Cookie,
        perm: 'cookie_banner.read',
      },
    ],
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: LineChart,
    perm: 'analytics.read',
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    perm: 'settings.read',
  },
];

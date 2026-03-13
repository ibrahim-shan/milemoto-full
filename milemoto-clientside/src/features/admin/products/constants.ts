export type ProductColumn = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

export const PRODUCT_COLUMNS: ProductColumn[] = [
  { id: 'id', label: 'ID', alwaysVisible: true },
  { id: 'name', label: 'Name' },
  { id: 'brand', label: 'Brand' },
  { id: 'category', label: 'Category' },
  { id: 'subCategory', label: 'Sub Category' },
  { id: 'grade', label: 'Grade' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'featured', label: 'Featured' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
];

export type ProductFilters = Record<string, string | number | boolean | string[] | undefined>;

export const createDefaultProductFilters = (): ProductFilters => ({
  filterMode: 'all',
  sku: '',
  priceMin: '',
  priceMax: '',
  brandId: [],
  vendorId: [],
  categoryId: [],
  subCategoryId: [],
  gradeId: [],
  warrantyId: [],
  specValueId: [],
  status: '',
  isFeatured: '',
});

export const DEFAULT_PRODUCT_COLUMN_VISIBILITY: Record<string, boolean> = {
  warranty: false,
  featured: false,
};

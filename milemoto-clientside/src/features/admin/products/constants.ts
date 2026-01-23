export type ProductColumn = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

export const PRODUCT_COLUMNS: ProductColumn[] = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'brand', label: 'Brand' },
  { id: 'category', label: 'Category' },
  { id: 'subCategory', label: 'Sub Category' },
  { id: 'grade', label: 'Grade' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
];

export type ProductFilters = Record<string, string | number | string[] | undefined>;

export const createDefaultProductFilters = (): ProductFilters => ({
  brandId: [],
  categoryId: [],
  subCategoryId: [],
  gradeId: [],
  warrantyId: [],
  specValueId: [],
  status: '',
});

export const DEFAULT_PRODUCT_COLUMN_VISIBILITY: Record<string, boolean> = {
  warranty: false,
};

'use client';

import { useMemo, useState } from 'react';

import type { CreateProductDto } from '@milemoto/types';
import { Edit, Eye, Layers, Package, Trash } from 'lucide-react';

import { useGetBrands } from '@/hooks/useBrandQueries';
import { useGetAllCategories } from '@/hooks/useCategoryQueries';
import { useGetGrades } from '@/hooks/useGradeQueries';
import {
  useCreateProduct,
  useDeleteProduct,
  useGetProducts,
  useUpdateProduct,
  type Product,
} from '@/hooks/useProductQueries';
import { useGetUnitGroups } from '@/hooks/useUnitQueries';
import { useGetWarranties } from '@/hooks/useWarrantyQueries';
import type { FilterConfig } from '@/ui/generic-filter';
import type { StatItem } from '@/ui/stats-cards';
import type { TableActionItem } from '@/ui/table-actions-menu';

import {
  createDefaultProductFilters,
  DEFAULT_PRODUCT_COLUMN_VISIBILITY,
  PRODUCT_COLUMNS,
  type ProductFilters,
} from '../constants';

export function useProductsPage() {
  const columns = PRODUCT_COLUMNS;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProductFilters>(() => createDefaultProductFilters());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(columns.map(column => [column.id, true])),
    ...DEFAULT_PRODUCT_COLUMN_VISIBILITY,
  }));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { data: brands } = useGetBrands({ page: 1, limit: 100 });
  const { data: categories } = useGetAllCategories(true);
  const { data: grades } = useGetGrades({ page: 1, limit: 100 });
  const { data: warranties } = useGetWarranties({ page: 1, limit: 100 });
  const { data: unitGroups } = useGetUnitGroups({ page: 1, limit: 100, search: '' });

  const rootCategories = useMemo(
    () => categories?.items.filter(c => !c.parentId) || [],
    [categories],
  );
  const subCategories = useMemo(
    () => categories?.items.filter(c => c.parentId) || [],
    [categories],
  );

  const filteredSubCategories = useMemo(() => {
    const selectedCategoryIds = Array.isArray(filters['categoryId'])
      ? (filters['categoryId'] as string[])
      : [];
    const selectedCategoryIdSet = new Set(selectedCategoryIds.map(id => Number(id)));

    if (selectedCategoryIdSet.size === 0) return subCategories;

    return subCategories.filter(c => c.parentId && selectedCategoryIdSet.has(c.parentId));
  }, [filters, subCategories]);

  const specOptions = useMemo(
    () =>
      unitGroups?.items.flatMap(group =>
        (group.values || []).map(val => ({
          label: `${group.name}: ${val.name}`,
          value: val.id.toString(),
        })),
      ) || [],
    [unitGroups],
  );

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        key: 'brandId',
        label: 'Brand',
        type: 'multiselect',
        options: brands?.items.map(b => ({ label: b.name, value: b.id.toString() })) || [],
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'multiselect',
        options: rootCategories.map(c => ({ label: c.name, value: c.id.toString() })),
      },
      {
        key: 'subCategoryId',
        label: 'Sub Category',
        type: 'multiselect',
        options: filteredSubCategories.map(c => ({ label: c.name, value: c.id.toString() })),
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
      },
      {
        key: 'gradeId',
        label: 'Grade',
        type: 'multiselect',
        options: grades?.items.map(g => ({ label: g.name, value: g.id.toString() })) || [],
      },
      {
        key: 'warrantyId',
        label: 'Warranty',
        type: 'multiselect',
        options: warranties?.items.map(w => ({ label: w.name, value: w.id.toString() })) || [],
      },
      {
        key: 'specValueId',
        label: 'Specs',
        type: 'multiselect',
        options: specOptions,
      },
    ],
    [brands, rootCategories, filteredSubCategories, grades, warranties, specOptions],
  );

  const { data, isLoading, isError, refetch } = useGetProducts({
    page,
    limit: pageSize,
    search,
    ...filters,
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteMutation.mutateAsync(productToDelete.id);
    } finally {
      setProductToDelete(null);
    }
  };

  const handleSubmit = async (payload: CreateProductDto) => {
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const isColumnVisible = (id: string) => {
    const column = columns.find(item => item.id === id);
    if (column?.alwaysVisible) return true;
    return columnVisibility[id] !== false;
  };
  const visibleColumnCount = columns.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );

  const statItems = useMemo<StatItem[]>(
    () => [
      {
        label: 'Total Products',
        value: data?.total || 0,
        icon: Package,
      },
      {
        label: 'Total Variants',
        value: data?.totalVariants || 0,
        icon: Layers,
      },
    ],
    [data],
  );

  const getActionItems = (product: Product): TableActionItem[] => [
    {
      label: 'View',
      icon: <Eye className="mr-2 h-4 w-4" />,
      href: `/admin/products/${product.id}`,
    },
    {
      label: 'Edit',
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => handleOpenEdit(product),
    },
    {
      label: 'Delete',
      icon: <Trash className="mr-2 h-4 w-4" />,
      onClick: () => handleDeleteClick(product),
      destructive: true,
    },
  ];

  const confirmTitle = 'Are you sure?';
  const confirmDescription = productToDelete
    ? `This will delete the product "${productToDelete.name}". If it has related stock or receipt records, it will be archived (set to inactive) instead.`
    : '';

  return {
    columns,
    filters,
    filterConfig,
    onFiltersChange: setFilters,
    search,
    onSearchChange: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    columnVisibility,
    onToggleColumn: (columnId: string, visible: boolean) =>
      setColumnVisibility(prev => ({ ...prev, [columnId]: visible })),
    onAdd: handleOpenAdd,
    items: data?.items ?? [],
    isLoading,
    isError,
    refetch,
    visibleColumnCount,
    isColumnVisible,
    expandedRows,
    onToggleRow: toggleRowExpansion,
    getActionItems,
    stats: statItems,
    page,
    pageSize,
    totalCount,
    totalPages,
    onPageChange: setPage,
    onPageSizeChange: (next: number) => {
      setPageSize(next);
      setPage(1);
    },
    dialogOpen: isDialogOpen,
    onDialogOpenChange: setIsDialogOpen,
    editingProduct,
    onSubmitProduct: handleSubmit,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    confirmOpen: !!productToDelete,
    confirmTitle,
    confirmDescription,
    onConfirmOpenChange: (open: boolean) => !open && setProductToDelete(null),
    onConfirmAction: handleConfirmDelete,
    isDeleting: deleteMutation.isPending,
  };
}

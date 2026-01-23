'use client';

import React, { useState } from 'react';

import { Edit, FolderTree, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { CategoryDialog } from '@/features/admin/categories/category-dialog';
import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { Skeleton } from '@/features/feedback/Skeleton';
import {
  Category,
  useDeleteCategory,
  useGetCategories,
  useGetCategoryTree,
} from '@/hooks/useCategoryQueries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

type CategoryNode = Category & { children?: CategoryNode[] };

export default function CategoriesPage() {
  const columns = [
    { id: 'name', label: 'Name', alwaysVisible: true },
    { id: 'slug', label: 'Slug' },
    { id: 'parent', label: 'Parent' },
    { id: 'description', label: 'Description' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', alwaysVisible: true },
  ];

  // State
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number | string[] | undefined>>({
    status: '',
    parentIds: [],
  });
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map(column => [column.id, true])),
  );

  // Also fetch the full tree to look up parent names and populate filter options
  const { data: categoryTree } = useGetCategoryTree();

  // Flatten tree for parent filter options
  const parentOptions = React.useMemo(() => {
    if (!categoryTree) return [];
    // Only show top-level categories as options for the parent filter
    return categoryTree.map((node: CategoryNode) => ({
      label: node.name,
      value: node.id.toString(),
    }));
  }, [categoryTree]);

  const filterConfig: FilterConfig[] = [
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
      key: 'parentIds',
      label: 'Parent Category',
      type: 'multiselect',
      options: parentOptions,
    },
  ];
  const { data, isLoading, isError, refetch } = useGetCategories({
    page: 1,
    limit: 100, // Fetch all categories (backend max is 100)
    search,
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
  });

  const deleteMutation = useDeleteCategory();

  // Handlers
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await deleteMutation.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  const nameVisible = columnVisibility['name'] !== false;
  const isColumnVisible = (id: string) => {
    const column = columns.find(item => item.id === id);
    if (column?.alwaysVisible) return true;
    if (id === 'parent') return nameVisible && columnVisibility[id] !== false;
    return columnVisibility[id] !== false;
  };

  const visibleColumnCount = columns.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );

  const filteredItems = React.useMemo(() => {
    let items = data?.items ?? [];
    const selectedParents = (filters.parentIds as string[]) || [];
    if (selectedParents.length > 0) {
      const parentIdSet = new Set(selectedParents.map(id => Number(id)));
      items = items.filter(
        item =>
          parentIdSet.has(item.id) || (item.parentId !== null && parentIdSet.has(item.parentId)),
      );
    }
    return items;
  }, [data?.items, filters.parentIds]);

  // Helper to get parent category name from the full tree
  const getParentNameFromTree = (parentId: number | null): string => {
    if (!parentId || !categoryTree) return '—';

    const flattenTree = (cats: CategoryNode[]): CategoryNode[] => {
      return cats.reduce<CategoryNode[]>((acc, cat) => {
        acc.push(cat);
        if (cat.children && cat.children.length > 0) {
          acc.push(...flattenTree(cat.children));
        }
        return acc;
      }, []);
    };

    const allCategories = flattenTree(categoryTree);
    const parent = allCategories.find(c => c.id === parentId);
    return parent ? parent.name : `ID: ${parentId}`;
  };

  return (
    <PermissionGuard requiredPermission="categories.read">
      <Card>
        <CardHeader>
          <CardTitle>Product Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6">
            <GenericFilter
              config={filterConfig}
              filters={filters}
              onFilterChange={setFilters}
              search={
                <div className="relative max-w-sm">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search categories..."
                    className="pl-9"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                    }}
                  />
                </div>
              }
              actions={
                <div className="flex items-center gap-2">
                  <ColumnVisibilityMenu
                    columns={columns}
                    visibility={columnVisibility}
                    onToggle={(columnId, visible) =>
                      setColumnVisibility(prev => {
                        const next = { ...prev, [columnId]: visible };
                        if (columnId === 'name' && !visible) {
                          next.parent = false;
                        }
                        return next;
                      })
                    }
                  />
                  <Button
                    variant="solid"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenAdd}
                  >
                    Add Category
                  </Button>
                </div>
              }
            />
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('name') && <TableHead>Name</TableHead>}
                {isColumnVisible('slug') && <TableHead>Slug</TableHead>}
                {isColumnVisible('parent') && <TableHead>Parent</TableHead>}
                {isColumnVisible('description') && <TableHead>Description</TableHead>}
                {isColumnVisible('status') && <TableHead>Status</TableHead>}
                {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {isColumnVisible('name') && (
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                    )}
                    {isColumnVisible('slug') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('parent') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('description') && (
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load categories. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No categories found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  // Organize categories hierarchically
                  const allParents = filteredItems.filter(c => c.parentId === null);
                  const allChildren = filteredItems.filter(c => c.parentId !== null);
                  // For display purposes, show all parents that either match the search OR have matching children
                  const parentsToShow = allParents;

                  // If no parents match but children do, show those children with a note about their parent
                  if (parentsToShow.length === 0 && allChildren.length > 0) {
                    // Just show the matching children without hierarchy
                    return allChildren.map(child => (
                      <TableRow key={child.id}>
                        {isColumnVisible('name') && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FolderTree className="text-muted-foreground h-4 w-4" />
                              {child.name}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible('slug') && (
                          <TableCell>
                            <code className="bg-muted rounded px-2 py-1 text-xs">{child.slug}</code>
                          </TableCell>
                        )}
                        {isColumnVisible('parent') && (
                          <TableCell className="text-muted-foreground">
                            {getParentNameFromTree(child.parentId)}
                          </TableCell>
                        )}
                        {isColumnVisible('description') && (
                          <TableCell className="text-muted-foreground max-w-md truncate">
                            {child.description}
                          </TableCell>
                        )}
                        {isColumnVisible('status') && (
                          <TableCell>
                            <StatusBadge
                              variant={child.status === 'active' ? 'success' : 'neutral'}
                            >
                              {child.status === 'active' ? 'Active' : 'Inactive'}
                            </StatusBadge>
                          </TableCell>
                        )}
                        {isColumnVisible('actions') && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  justify="center"
                                  className="h-8 w-8 p-0"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(child)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(child)}
                                  className="text-destructive"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ));
                  }

                  return parentsToShow.map(parent => {
                    // Get ALL children of this parent from the category tree, not just search results
                    let subCategories = allChildren.filter(c => c.parentId === parent.id);

                    // If searching and parent matched, include ALL its children from the tree
                    // If searching and parent matched, include ALL its children from the tree
                    if (search && categoryTree) {
                      const flattenTree = (cats: CategoryNode[]): CategoryNode[] => {
                        return cats.reduce<CategoryNode[]>((acc, cat) => {
                          acc.push(cat);
                          if (cat.children && cat.children.length > 0) {
                            acc.push(...flattenTree(cat.children));
                          }
                          return acc;
                        }, []);
                      };

                      // Cast categoryTree if needed, or if strictly typed, pass directly
                      const allCategoriesFromTree = flattenTree(categoryTree as CategoryNode[]);

                      const allChildrenOfParent = allCategoriesFromTree.filter(
                        c => c.parentId === parent.id,
                      );

                      // Use all children from tree if we have them
                      if (allChildrenOfParent.length > 0) {
                        subCategories = allChildrenOfParent;
                      }
                    }

                    return (
                      <React.Fragment key={parent.id}>
                        {/* Parent Category Row */}
                        <TableRow className="bg-muted/30">
                          {isColumnVisible('name') && (
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-2">{parent.name}</div>
                            </TableCell>
                          )}
                          {isColumnVisible('slug') && (
                            <TableCell>
                              <code className="bg-muted rounded px-2 py-1 text-xs">
                                {parent.slug}
                              </code>
                            </TableCell>
                          )}
                          {isColumnVisible('parent') && (
                            <TableCell className="text-muted-foreground">-</TableCell>
                          )}
                          {isColumnVisible('description') && (
                            <TableCell className="text-muted-foreground max-w-md truncate">
                              {parent.description}
                            </TableCell>
                          )}
                          {isColumnVisible('status') && (
                            <TableCell>
                              <StatusBadge
                                variant={parent.status === 'active' ? 'success' : 'neutral'}
                              >
                                {parent.status === 'active' ? 'Active' : 'Inactive'}
                              </StatusBadge>
                            </TableCell>
                          )}
                          {isColumnVisible('actions') && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    justify="center"
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(parent)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(parent)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>

                        {/* Sub-Category Rows */}
                        {subCategories.map(subCat => (
                          <TableRow key={subCat.id}>
                            {isColumnVisible('name') && (
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 pl-8">
                                  <FolderTree className="text-muted-foreground h-4 w-4" />
                                  {subCat.name}
                                </div>
                              </TableCell>
                            )}
                            {isColumnVisible('slug') && (
                              <TableCell>
                                <code className="bg-muted rounded px-2 py-1 text-xs">
                                  {subCat.slug}
                                </code>
                              </TableCell>
                            )}
                            {isColumnVisible('parent') && (
                              <TableCell className="text-muted-foreground">{parent.name}</TableCell>
                            )}
                            {isColumnVisible('description') && (
                              <TableCell className="text-muted-foreground max-w-md truncate">
                                {subCat.description}
                              </TableCell>
                            )}
                            {isColumnVisible('status') && (
                              <TableCell>
                                <StatusBadge
                                  variant={subCat.status === 'active' ? 'success' : 'neutral'}
                                >
                                  {subCat.status === 'active' ? 'Active' : 'Inactive'}
                                </StatusBadge>
                              </TableCell>
                            )}
                            {isColumnVisible('actions') && (
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      justify="center"
                                      className="h-8 w-8 p-0"
                                    >
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenEdit(subCat)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteClick(subCat)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <CategoryDialog
        key={editingCategory?.id ?? 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        category={editingCategory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={open => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category &quot;{categoryToDelete?.name}&quot;. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGuard>
  );
}

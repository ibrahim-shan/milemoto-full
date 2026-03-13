import { CreateProductDto } from '@milemoto/types';
import { useFormContext } from 'react-hook-form';

import { useGetBrands } from '@/hooks/useBrandQueries';
import { useGetCategories } from '@/hooks/useCategoryQueries';
import { GeneralCombobox } from '@/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Switch } from '@/ui/switch';
import { Textarea } from '@/ui/textarea';

export function GeneralTab() {
  const { control, watch, setValue } = useFormContext<CreateProductDto>();
  const { data: brands } = useGetBrands({ page: 1, limit: 100, status: 'active' });
  const { data: parentCategories } = useGetCategories({
    page: 1,
    limit: 100,
    status: 'active',
  });

  const selectedCategoryId = watch('categoryId');

  const { data: subCategories, isLoading: isLoadingSub } = useGetCategories({
    page: 1,
    limit: 100,
    status: 'active',
    ...(selectedCategoryId ? { parentId: Number(selectedCategoryId) } : {}),
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel required={true}>Product Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Brembo Brake Pads"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="shortDescription"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel required={true}>Short Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Brief summary of the product"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="longDescription"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel required={true}>Long Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Detailed product description"
                className="min-h-25"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="brandId"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={true}>Brand</FormLabel>
            <FormControl>
              <GeneralCombobox
                data={brands?.items.map(brand => ({ label: brand.name, value: brand.id })) || []}
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Select brand"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={true}>Category</FormLabel>
            <FormControl>
              <GeneralCombobox
                // Filter for root categories (parentId is null) client-side for now to be safe
                data={
                  parentCategories?.items
                    .filter(cat => cat.parentId === null)
                    .map(cat => ({ label: cat.name, value: cat.id })) || []
                }
                value={field.value ?? ''}
                onChange={val => {
                  field.onChange(val);
                  setValue('subCategoryId', undefined as unknown as number); // Reset sub-category
                }}
                placeholder="Select category"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="subCategoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={true}>Sub Category</FormLabel>
            <FormControl>
              <GeneralCombobox
                data={subCategories?.items.map(cat => ({ label: cat.name, value: cat.id })) || []}
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Select sub category"
                emptyMessage={
                  selectedCategoryId ? 'No subcategories found' : 'Select a category first'
                }
                disabled={!selectedCategoryId || isLoadingSub}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={true}>Status</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="isFeatured"
        render={({ field }) => (
          <FormItem className="col-span-1">
            <div className="border-border/60 bg-card/40 flex min-h-10 items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <FormLabel className="mb-0">Featured Product</FormLabel>
                <p className="text-muted-foreground text-xs">
                  Show this product in featured storefront sections.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  aria-label="Featured Product"
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

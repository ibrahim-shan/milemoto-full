import { useCallback, useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProductVariantDto, ProductVariantSchema } from '@milemoto/types';
import { Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Resolver, useForm, useFormContext, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { useGetBrands } from '@/hooks/useBrandQueries';
import { useGetVariants } from '@/hooks/useVariantQueries';
import { supabase } from '@/lib/supabase';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import SortableImageUpload from '@/ui/sortable-upload';

interface VariantFormProps {
  productId?: number | undefined;
  parentStatus?: 'active' | 'inactive';
  defaultValues?: ProductVariantDto | undefined;
  existingSkus?: string[];
  onSubmit: (data: ProductVariantDto) => void;
  onCancel: () => void;
  open?: boolean;
}

export function VariantForm({
  productId,
  parentStatus,
  defaultValues,
  existingSkus = [],
  onSubmit,
  onCancel,
  open,
}: VariantFormProps) {
  // Access parent form to get brand/category for SKU generation
  const { watch: watchParent } = useFormContext();
  const brandId = watchParent('brandId');

  const { data: brands } = useGetBrands({ page: 1, limit: 100, status: 'active' });
  const { data: variantsData } = useGetVariants({ page: 1, limit: 100, status: 'active' });

  const [selectedAttributes, setSelectedAttributes] = useState<
    Array<{ id: string; variantId: string; valueId: string }>
  >([]);
  const [isSkuEditable, setIsSkuEditable] = useState(false);
  const hasInitializedAttributes = useRef(false);
  const skipInitialSkuUpdate = useRef(Boolean(defaultValues));

  // Cleanup refs
  const [isSaved, setIsSaved] = useState(false);
  const isSavedRef = useRef(false);
  const imagePathRef = useRef<string | undefined>(undefined);
  const initialImageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    isSavedRef.current = isSaved;
  }, [isSaved]);

  const form = useForm<ProductVariantDto>({
    resolver: zodResolver(ProductVariantSchema) as Resolver<ProductVariantDto>,
    defaultValues: defaultValues
      ? {
          ...defaultValues,
          price: Number(defaultValues.price),
          costPrice: defaultValues.costPrice ? Number(defaultValues.costPrice) : 0,
          lowStockThreshold: defaultValues.lowStockThreshold || 5,
          idealStockQuantity: defaultValues.idealStockQuantity ?? 0,
          status: defaultValues.status || 'active',
          barcode: defaultValues.barcode || '',
          imagePath: defaultValues.imagePath || '',
        }
      : ({
          name: '',
          sku: '',
          barcode: '',
          price: undefined,
          costPrice: undefined,
          lowStockThreshold: undefined,
          idealStockQuantity: 0,
          status: 'active',
          imagePath: '',
        } as unknown as ProductVariantDto),
  });

  const { control, handleSubmit, setValue, reset } = form;
  const sku = useWatch({ control, name: 'sku' });
  const imagePath = useWatch({ control, name: 'imagePath' });

  useEffect(() => {
    imagePathRef.current = imagePath;
  }, [imagePath]);

  useEffect(() => {
    initialImageRef.current = defaultValues?.imagePath;
  }, [defaultValues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!isSavedRef.current) {
        const currentImage = imagePathRef.current;
        const initialImage = initialImageRef.current;

        // If we have a current image, it's different from initial, and it's a new upload
        if (currentImage && currentImage !== initialImage && currentImage.includes('uploads/')) {
          try {
            const url = new URL(currentImage);
            const pathParts = url.pathname.split('/products/');
            if (pathParts.length > 1) {
              const path = pathParts[1];
              if (path) {
                supabase.storage.from('products').remove([path]);
              }
            }
          } catch (e) {
            console.error('Error cleaning up variant image:', e);
          }
        }
      }
    };
  }, []);

  // Render Barcode and Sync Barcode Value
  useEffect(() => {
    try {
      if (sku) {
        // Sync barcode with SKU for form validation
        setValue('barcode', sku, { shouldDirty: true });
      }
    } catch {
      // console.error(e);
    }
  }, [sku, setValue]);

  // Reset form when defaultValues change or when dialog opens
  useEffect(() => {
    if (open === false) return; // Don't reset when closing (to avoid flicker)

    if (defaultValues) {
      skipInitialSkuUpdate.current = true;
      reset({
        ...defaultValues,
        price: Number(defaultValues.price),
        costPrice: defaultValues.costPrice ? Number(defaultValues.costPrice) : 0,
        lowStockThreshold: defaultValues.lowStockThreshold || 5,
        idealStockQuantity: defaultValues.idealStockQuantity ?? 0,
        status: defaultValues.status || 'active',
        barcode: defaultValues.barcode || '',
        imagePath: defaultValues.imagePath || '',
      });
    } else {
      skipInitialSkuUpdate.current = false;
      reset({
        name: '',
        sku: '',
        barcode: '',
        price: 0,
        costPrice: 0,
        lowStockThreshold: 5,
        idealStockQuantity: 0,
        status: 'active',
        imagePath: '',
      });
    }
  }, [defaultValues, reset, open]);

  // Helper to generate SKU (moved out to be reusable)
  const generateSkuValue = useCallback(() => {
    const brand = brands?.items.find(b => b.id === brandId);
    // const category = categories?.items.find(c => c.id === categoryId);

    const brandCode = brand?.name.substring(0, 3).toUpperCase() || 'GEN';

    const varCodes: string[] = [];
    const validAttributes = selectedAttributes.filter(a => a.variantId && a.valueId);

    for (const attr of validAttributes) {
      const variant = variantsData?.items.find(v => v.id === Number(attr.variantId));
      const value = variant?.values?.find(val => val.id === Number(attr.valueId));
      if (value) {
        varCodes.push(value.value.substring(0, 2).toUpperCase());
      }
    }
    const varPart = varCodes.length > 0 ? varCodes.join('-') : 'DEF';
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `${brandCode}-${varPart}-${randomPart}`;
  }, [brands, brandId, selectedAttributes, variantsData]);

  // Initialize selection from defaultValues
  useEffect(() => {
    if (hasInitializedAttributes.current) return;

    if (defaultValues?.attributes && variantsData) {
      const initialAttributes: Array<{ id: string; variantId: string; valueId: string }> = [];

      for (const attr of defaultValues.attributes) {
        const valueId = attr.variantValueId;
        // Find the variant and value
        for (const variant of variantsData.items) {
          const value = variant.values?.find(v => v.id === valueId);
          if (value) {
            initialAttributes.push({
              id: Math.random().toString(36).substr(2, 9),
              variantId: variant.id.toString(),
              valueId: value.id.toString(),
            });
            break;
          }
        }
      }

      setTimeout(() => {
        if (initialAttributes.length > 0) {
          setSelectedAttributes(initialAttributes);
        } else {
          // Add one empty row by default if new or no attributes found
          setSelectedAttributes([
            { id: Math.random().toString(36).substr(2, 9), variantId: '', valueId: '' },
          ]);
        }
        hasInitializedAttributes.current = true;
      }, 0);
    } else if (!defaultValues) {
      setTimeout(() => {
        // Add one empty row by default for new variant
        setSelectedAttributes([
          { id: Math.random().toString(36).substr(2, 9), variantId: '', valueId: '' },
        ]);
        hasInitializedAttributes.current = true;
      }, 0);
    }
  }, [defaultValues, variantsData]);

  // Handle attributes change: Sync to form, auto-generate name, and auto-generate SKU
  useEffect(() => {
    if (!variantsData) return;

    const validAttributes = selectedAttributes.filter(a => a.variantId && a.valueId);

    // 1. Sync attributes to form
    const formAttributes = validAttributes.map(a => ({
      variantValueId: Number(a.valueId),
    }));
    setValue('attributes', formAttributes, { shouldDirty: true });

    // 2. Auto-generate name
    const nameParts: string[] = [];
    for (const attr of validAttributes) {
      const variant = variantsData.items.find(v => v.id === Number(attr.variantId));
      const value = variant?.values?.find(val => val.id === Number(attr.valueId));
      if (value) {
        nameParts.push(value.value);
      }
    }

    if (nameParts.length > 0) {
      setValue('name', nameParts.join(' / '), { shouldDirty: true });
    }

    // 3. Auto-generate SKU (if not manually edited/locked)
    if (!isSkuEditable) {
      if (skipInitialSkuUpdate.current) {
        skipInitialSkuUpdate.current = false;
      } else {
        setValue('sku', generateSkuValue(), { shouldDirty: true });
      }
    }
  }, [
    selectedAttributes,
    generateSkuValue,
    variantsData,
    setValue,
    isSkuEditable,
    defaultValues,
    brandId,
    productId,
  ]);

  const addAttribute = () => {
    setSelectedAttributes([
      ...selectedAttributes,
      { id: Math.random().toString(36).substr(2, 9), variantId: '', valueId: '' },
    ]);
  };

  const removeAttribute = (id: string) => {
    setSelectedAttributes(selectedAttributes.filter(a => a.id !== id));
  };

  const updateAttribute = (id: string, field: 'variantId' | 'valueId', value: string) => {
    setSelectedAttributes(
      selectedAttributes.map(a => {
        if (a.id === id) {
          if (field === 'variantId') {
            return { ...a, variantId: value, valueId: '' }; // Reset value when type changes
          }
          return { ...a, [field]: value };
        }
        return a;
      }),
    );
  };

  const onFormSubmit = (data: ProductVariantDto) => {
    // Check for duplicate SKU
    const normalizedSku = data.sku.trim();
    const isDuplicate = existingSkus.some(s => s.trim() === normalizedSku);
    const isSelf = defaultValues && defaultValues.sku === data.sku;

    if (isDuplicate && !isSelf) {
      const errorMsg = 'This SKU already exists in the current product.';
      form.setError('sku', {
        type: 'manual',
        message: errorMsg,
      });
      toast.error(errorMsg);
      return;
    }

    // Transform flat form data back to nested structure expected by parent

    const formattedData = {
      ...data,
      barcode: data.sku, // Auto-use SKU as barcode
      // Inventory is now handled via purchase orders, so we don't create initial inventory here.
      inventory: [],
    };
    isSavedRef.current = true;
    setIsSaved(true);
    onSubmit(formattedData);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={e => {
          e.stopPropagation();
          handleSubmit(onFormSubmit, errors => {
            console.log('Form errors:', errors); // Keep for debugging if needed, or remove

            // Generic message
            toast.error('Please fix the errors in the form.');

            // Specific field errors
            if (errors.name) {
              toast.error('Variant name is missing. Please select attributes to generate a name.');
            }
            if (errors.attributes) {
              toast.error('Please select at least one attribute.');
            }
            if (errors.sku) {
              toast.error(errors.sku.message as string);
            }

            // Handle required number fields that might return "Expected number, received undefined"
            if (errors.price) {
              toast.error('Selling Price is required');
            }
            if (errors.costPrice) {
              toast.error('Cost Price is required');
            }
            if (errors.lowStockThreshold) {
              toast.error('Low Stock Warning is required');
            }
          })(e);
        }}
        className="space-y-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Variant Attributes</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAttribute}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Attribute
            </Button>
          </div>

          <div className="mb-4">
            <Label>Variant Image</Label>
            <SortableImageUpload
              maxFiles={1}
              value={imagePath ? [imagePath] : []}
              onChange={urls => setValue('imagePath', urls[0] || '', { shouldDirty: true })}
              className="mt-2"
            />
          </div>

          {selectedAttributes.map(attr => {
            const availableValues = attr.variantId
              ? variantsData?.items.find(v => v.id === Number(attr.variantId))?.values || []
              : [];

            return (
              <div
                key={attr.id}
                className="flex items-end gap-4"
              >
                <div className="flex-1 space-y-2">
                  <Label required={true}>Type</Label>
                  <GeneralCombobox
                    value={attr.variantId}
                    onChange={value => updateAttribute(attr.id, 'variantId', String(value))}
                    placeholder="Select Type"
                    data={
                      variantsData?.items.map(variant => ({
                        label: variant.name,
                        value: variant.id.toString(),
                        disabled: selectedAttributes.some(
                          a => a.id !== attr.id && a.variantId === variant.id.toString(),
                        ),
                      })) || []
                    }
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <Label required={true}>Value</Label>
                  <GeneralCombobox
                    value={attr.valueId}
                    onChange={value => updateAttribute(attr.id, 'valueId', String(value))}
                    disabled={!attr.variantId}
                    placeholder="Select Value"
                    data={availableValues.map(val => ({
                      label: val.value,
                      value: val.id.toString(),
                    }))}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  justify="center"
                  className="text-destructive mb-1"
                  onClick={() => removeAttribute(attr.id)}
                  disabled={selectedAttributes.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Hidden Name Field (Auto-generated) */}
        <input
          type="hidden"
          {...form.register('name')}
        />

        <div>
          <FormField
            control={control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={true}>SKU</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="SKU"
                      {...field}
                      onChange={e => {
                        const value = e.target.value.replace(/\s/g, '');
                        field.onChange(value);
                      }}
                      readOnly={!isSkuEditable}
                      className={!isSkuEditable ? 'bg-muted' : ''}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant={isSkuEditable ? 'solid' : 'outline'}
                    justify="center"
                    size="icon"
                    onClick={() => setIsSkuEditable(!isSkuEditable)}
                    title={isSkuEditable ? 'Save SKU' : 'Edit SKU'}
                  >
                    {isSkuEditable ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={true}>Cost Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={true}>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={true}>Low Stock Warning</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="idealStockQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ideal Stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value || ''}
                    onChange={e =>
                      field.onChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={true}>Status</FormLabel>
                <Select
                  onValueChange={val => {
                    if (val === 'active' && parentStatus === 'inactive') {
                      toast.error('Activate the base product first');
                      return;
                    }
                    field.onChange(val);
                  }}
                  value={field.value}
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
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={defaultValues && !form.formState.isDirty}
          >
            Save Variant
          </Button>
        </div>
      </form>
    </Form>
  );
}

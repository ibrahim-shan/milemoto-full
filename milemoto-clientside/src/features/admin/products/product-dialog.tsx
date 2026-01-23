'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProduct, CreateProductDto } from '@milemoto/types';
import {
  FieldErrors,
  FormProvider,
  Resolver,
  SubmitHandler,
  useForm,
  useWatch,
} from 'react-hook-form';
import { toast } from 'sonner';

import { useGetProduct, type Product } from '@/hooks/useProductQueries';
import { useGetUnitGroups } from '@/hooks/useUnitQueries';
import { supabase } from '@/lib/supabase';
import { Button } from '@/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Form } from '@/ui/form';
import SortableImageUpload from '@/ui/sortable-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';

import { DetailedSpecificationsTab } from './components/DetailedSpecificationsTab';
import { GeneralTab } from './components/GeneralTab';
import { TechnicianDetailsTab } from './components/TechnicianDetailsTab';
import { VariantsTab } from './components/VariantsTab';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: CreateProductDto) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  isSubmitting,
}: ProductDialogProps) {
  const isEdit = !!product;
  const [activeTab, setActiveTab] = useState('general');
  const [isSaved, setIsSaved] = useState(false);

  const { data: fullProduct } = useGetProduct(product?.id ?? null);
  const { data: unitGroups } = useGetUnitGroups({
    page: 1,
    limit: 100,
    search: '',
    status: 'active',
  });

  // Form Setup
  const methods = useForm<CreateProductDto>({
    resolver: zodResolver(CreateProduct) as unknown as Resolver<CreateProductDto>,
    defaultValues: {
      name: '',
      shortDescription: '',
      longDescription: '',
      brandId: 0,
      categoryId: 0,
      subCategoryId: 0,
      gradeId: 0,
      images: [],
      variants: [],
      specifications: [],
    } as unknown as import('react-hook-form').DefaultValues<CreateProductDto>,
  });

  const { reset, handleSubmit, setValue, getValues, control } = methods;

  // Manually manage images array for now (or move to a component if complex)
  const images = useWatch({ control, name: 'images' }) || [];

  // Reset form on open/edit
  useEffect(() => {
    if (open) {
      if (product) {
        // Use fullProduct if available, otherwise fall back to passed product (though likely incomplete for specs)
        const productData = fullProduct || product;

        reset({
          name: productData.name,
          shortDescription: productData.shortDescription,
          longDescription: productData.longDescription,
          brandId: productData.brandId || 0,
          categoryId: productData.categoryId || 0,
          subCategoryId: productData.subCategoryId || 0,
          warrantyId: productData.warrantyId || undefined,
          gradeId: productData.gradeId || 0,
          status: (productData.status || 'active') as 'active' | 'inactive',

          specifications:
            productData.specifications?.map(spec => ({
              unitGroupId: spec.unitGroupId,
              unitValueId: spec.unitValueId,
              fields: spec.fields?.map(f => ({
                unitFieldId: f.unitFieldId,
                value: f.value || undefined,
              })),
            })) || [],

          images: productData.images || [],
          variants:
            productData.variants?.map(v => ({
              id: v.id,
              sku: v.sku,
              barcode: v.barcode || '',
              price: Number(v.price),
              costPrice: v.costPrice ? Number(v.costPrice) : 0,
              lowStockThreshold: v.lowStockThreshold ?? 0,
              idealStockQuantity: v.idealStockQuantity || 0,
              name: v.name,
              status: v.status || 'active',
              imagePath: v.imagePath,
              attributes: v.attributes?.map(attr => ({
                variantValueId: attr.variantValueId,
              })),
            })) || [],
        });
      } else {
        reset({
          name: '',
          shortDescription: '',
          longDescription: '',
          brandId: 0,
          categoryId: 0,
          subCategoryId: 0,
          gradeId: 0,
          status: 'active',
          images: [],
          variants: [],
          specifications: [],
        });
      }
      setTimeout(() => setActiveTab('general'), 0);
    }
  }, [open, product, fullProduct, reset]);

  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && !isSaved) {
      // Cleanup new images that were uploaded but not saved
      const currentImages = getValues('images') || [];
      const originalImages = product?.images || [];
      const newImages = currentImages.filter(url => !originalImages.includes(url));

      if (newImages.length > 0) {
        // Fire and forget cleanup
        Promise.allSettled(
          newImages.map(async url => {
            if (url.includes('/products/uploads/')) {
              try {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/products/');
                if (pathParts.length > 1) {
                  const path = pathParts[1];
                  if (path) {
                    await supabase.storage.from('products').remove([path]);
                  }
                }
              } catch (e) {
                console.error('Error cleaning up image:', e);
              }
            }
          }),
        );
      }
    }
    onOpenChange(newOpen);
  };

  const onFormSubmit: SubmitHandler<CreateProductDto> = async data => {
    // Validate required specification fields
    if (data.specifications && unitGroups?.items) {
      for (const spec of data.specifications) {
        const group = unitGroups.items.find(g => g.id === spec.unitGroupId);
        if (group && group.fields) {
          for (const field of group.fields) {
            if (field.required) {
              const submittedField = spec.fields?.find(f => f.unitFieldId === field.id);
              if (!submittedField || !submittedField.value || submittedField.value.trim() === '') {
                toast.error(`Missing required field: ${field.name} in ${group.name}`);
                return; // Stop submission
              }
            }
          }
        }
      }
    }

    try {
      await onSubmit(data);
      setIsSaved(true);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  const onFormError = (errors: FieldErrors<CreateProductDto>) => {
    console.log('Form errors:', errors);
    Object.keys(errors).forEach(key => {
      const fieldError = errors[key as keyof CreateProductDto];
      if (fieldError) {
        if (key === 'variants') {
          toast.error('Please check variant details (SKU, Price, etc.)');
        } else {
          toast.error(fieldError.message as string);
        }
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update product details.' : 'Fill in the details to create a new product.'}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <Form {...methods}>
            <form
              onSubmit={handleSubmit(onFormSubmit, onFormError)}
              className="space-y-6"
            >
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="technician">Technician</TabsTrigger>
                  <TabsTrigger value="specs">Specs</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>

                <TabsContent
                  value="general"
                  className="mt-4 space-y-4"
                >
                  <GeneralTab />
                </TabsContent>

                <TabsContent
                  value="technician"
                  className="mt-4 space-y-4"
                >
                  <TechnicianDetailsTab />
                </TabsContent>

                <TabsContent
                  value="specs"
                  className="mt-4 space-y-4"
                >
                  <DetailedSpecificationsTab />
                </TabsContent>

                <TabsContent
                  value="variants"
                  className="mt-4 space-y-4"
                >
                  <VariantsTab
                    productId={product?.id}
                    parentStatus={useWatch({ control, name: 'status' })}
                  />
                </TabsContent>

                <TabsContent
                  value="images"
                  className="mt-4 space-y-4"
                >
                  <SortableImageUpload
                    value={images}
                    onChange={newImages => setValue('images', newImages, { shouldDirty: true })}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

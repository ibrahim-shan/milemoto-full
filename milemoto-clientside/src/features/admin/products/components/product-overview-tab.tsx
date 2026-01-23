import Image from 'next/image';

import type { Product } from '@/hooks/useProductQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { TabsContent } from '@/ui/Tabs';

type ProductOverviewTabProps = {
  product: Product;
};

export function ProductOverviewTab({ product }: ProductOverviewTabProps) {
  return (
    <TabsContent
      value="overview"
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="wrap-break-word">
                <h3 className="font-medium">Short Description</h3>
                <p className="text-muted-foreground text-sm">
                  {product.shortDescription || 'No short description provided.'}
                </p>
              </div>
              <div className="wrap-break-word">
                <h3 className="font-medium">Long Description</h3>
                <div className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {product.longDescription || 'No detailed description provided.'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <dl>
                  <dt className="text-muted-foreground mb-1 font-semibold">Brand</dt>
                  <dd className="font-medium">{product.brandName || '-'}</dd>
                </dl>
                <div className="grid grid-cols-2 gap-4">
                  <dl>
                    <dt className="text-muted-foreground mb-1 font-semibold">Category</dt>
                    <dd className="font-medium">{product.categoryName || '-'}</dd>
                  </dl>
                  <dl>
                    <dt className="text-muted-foreground mb-1 font-semibold">Sub Category</dt>
                    <dd className="font-medium">{product.subCategoryName || '-'}</dd>
                  </dl>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <dl>
                    <dt className="text-muted-foreground mb-1 font-semibold">Grade</dt>
                    <dd className="font-medium">
                      {product.gradeName || (product.gradeId ? product.gradeId.toString() : '-')}
                    </dd>
                  </dl>
                  <dl>
                    <dt className="text-muted-foreground mb-1 font-semibold">Warranty</dt>
                    <dd className="font-medium">{product.warrantyName || '-'}</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          {product.specifications && product.specifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {product.specifications.map((spec, specIndex) => (
                    <div
                      key={spec.id ?? `spec-${specIndex}`}
                      className="bg-muted/30 rounded-lg border p-4"
                    >
                      <div className="mb-3 flex items-center justify-between border-b pb-2">
                        <span className="font-medium">
                          {spec.groupName || `Group #${spec.unitGroupId}`}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {spec.valueName}
                          {spec.valueCode ? ` (${spec.valueCode})` : ''}
                        </span>
                      </div>
                      {spec.fields && spec.fields.length > 0 ? (
                        <dl className="space-y-2 text-sm">
                          {spec.fields.map((field, fieldIndex) => (
                            <div
                              key={
                                field.unitFieldId ?? `field-${spec.id ?? specIndex}-${fieldIndex}`
                              }
                              className="flex justify-between"
                            >
                              <dt className="text-muted-foreground">
                                {field.fieldName || `Field #${field.unitFieldId}`}
                              </dt>
                              <dd className="font-medium">
                                {field.value} {spec.valueCode || ''}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">No specific fields</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {product.images.map((img, index) => (
                    <div
                      key={`${img}-${index}`}
                      className="border-border relative aspect-square overflow-hidden rounded-md border"
                    >
                      <Image
                        src={img}
                        alt={`${product.name} - ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 20vw"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No images available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>
  );
}

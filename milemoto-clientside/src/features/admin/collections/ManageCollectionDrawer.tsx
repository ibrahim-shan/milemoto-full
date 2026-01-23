import { useState } from 'react';

import {
  useAddProductsToCollection,
  useGetCollectionProducts,
  useRemoveProductFromCollection,
  type Collection,
} from '@/hooks/useCollectionQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetAllProductVariants } from '@/hooks/useProductQueries';
import { Button } from '@/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/ui/drawer';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { StatusBadge } from '@/ui/status-badge';

export function ManageCollectionDrawer({
  collection,
  onClose,
}: {
  collection: Collection | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const addProducts = useAddProductsToCollection();
  const removeProduct = useRemoveProductFromCollection();

  const { data, isLoading } = useGetCollectionProducts(collection?.id ?? null);
  const existingVariantIds = new Set(data?.items?.map(item => item.variantId) ?? []);

  const productSearch = useGetAllProductVariants(
    debouncedSearch
      ? {
          page: 1,
          limit: 8,
          search: debouncedSearch,
        }
      : { page: 1, limit: 8 },
  );
  const searchResults = productSearch.data?.items
    ? productSearch.data.items.filter(v => !existingVariantIds.has(v.id))
    : [];

  const handleAdd = async (variantId: number) => {
    if (!collection) return;
    await addProducts.mutateAsync({ id: collection.id, variantIds: [variantId] });
  };

  const handleRemove = async (variantId: number) => {
    if (!collection) return;
    await removeProduct.mutateAsync({ id: collection.id, variantId });
  };

  return (
    <Drawer
      open={!!collection}
      onOpenChange={open => !open && onClose()}
      direction="right"
    >
      <DrawerContent className="ml-auto flex h-full w-full max-w-xl flex-col">
        <DrawerHeader className="items-start p-6 text-left">
          <p className="text-muted-foreground text-xs uppercase">Collection</p>
          <DrawerTitle>{collection?.name ?? ''}</DrawerTitle>
          <DrawerDescription className="flex gap-2">
            {collection ? (
              <>
                <StatusBadge variant="info">{collection.type}</StatusBadge>
                <StatusBadge variant="info">{collection.status}</StatusBadge>
              </>
            ) : null}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {collection?.type === 'manual' ? (
            <div className="space-y-4 p-6 pt-0">
              <div className="space-y-2">
                <Label>Search variants</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by product name, variant name, SKU, or barcode"
                  />
                  <div className="rounded-lg border">
                    <div className="border-b px-4 py-2 text-sm font-medium">Results</div>
                    <div className="divide-y">
                      {productSearch.isLoading ? (
                        <div className="text-muted-foreground p-4 text-sm">Searching...</div>
                      ) : searchResults.length ? (
                        searchResults.map(v => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div>
                              <p className="font-medium">{v.productName}</p>
                              <p className="text-muted-foreground text-sm">{v.variantName}</p>
                              <p className="text-muted-foreground text-xs">
                                SKU: {v.sku} {v.barcode ? `• Barcode: ${v.barcode}` : ''}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdd(v.id)}
                              isLoading={addProducts.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground p-4 text-sm">No products found.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-3">
                  <p className="font-medium">Products</p>
                </div>
                <div className="divide-y">
                  {isLoading ? (
                    <div className="text-muted-foreground p-4 text-sm">Loading...</div>
                  ) : data?.items.length ? (
                    data.items.map(item => (
                      <div
                        key={item.variantId}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-muted-foreground text-sm">{item.variantName}</p>
                          <p className="text-muted-foreground text-xs">
                            SKU: {item.sku} {item.barcode ? `• Barcode: ${item.barcode}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(item.variantId)}
                            isLoading={removeProduct.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground p-4 text-sm">No products yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-muted-foreground text-sm">
                Automatic collections are populated by rules. Use edit to adjust rules; membership
                updates automatically.
              </p>
            </div>
          )}
        </div>

        <div className="p-4">
          <DrawerClose asChild>
            <Button
              variant="outline"
              justify="center"
              className="w-full"
            >
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

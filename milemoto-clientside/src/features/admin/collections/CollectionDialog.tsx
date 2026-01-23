import { useMemo, useState } from 'react';

import type { CollectionRule } from '@milemoto/types';
import { X } from 'lucide-react';

import { useGetBrands } from '@/hooks/useBrandQueries';
import { useGetAllCategories } from '@/hooks/useCategoryQueries';
import {
  useCreateCollection,
  usePreviewCollection,
  useUpdateCollection,
  type Collection,
} from '@/hooks/useCollectionQueries';
import { useGetGrades } from '@/hooks/useGradeQueries';
import { useGetVariants } from '@/hooks/useVariantQueries';
import { useGetWarranties } from '@/hooks/useWarrantyQueries';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

type RuleForm = {
  field: string;
  operator: CollectionRule['operator'];
  value: string;
};

type FormState = {
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  type: 'manual' | 'automatic';
  matchType: 'all' | 'any';
  rules: RuleForm[];
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  status: 'active',
  type: 'manual',
  matchType: 'all',
  rules: [],
};

type CollectionDialogProps = {
  collection: Collection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PreviewItem = {
  productId: number;
  productName: string;
  matched: boolean;
};

type PreviewResult = {
  sampleCount: number;
  matchedCount: number;
  results: PreviewItem[];
};

export function CollectionDialog({ open, onOpenChange, collection }: CollectionDialogProps) {
  const isEdit = !!collection;
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const previewMutation = usePreviewCollection();

  // Reference data for rule value selects
  const { data: categoriesData } = useGetAllCategories();
  const { data: brandsData } = useGetBrands({ page: 1, limit: 100, status: 'active' });
  const { data: gradesData } = useGetGrades({ page: 1, limit: 100, status: 'active' });
  const { data: warrantiesData } = useGetWarranties({ page: 1, limit: 100, status: 'active' });
  const { data: variantsData } = useGetVariants({ page: 1, limit: 100, status: 'active' });

  const parentCategories = useMemo(
    () => categoriesData?.items?.filter(cat => cat.parentId == null) ?? [],
    [categoriesData],
  );
  const subCategories = useMemo(
    () => categoriesData?.items?.filter(cat => cat.parentId != null) ?? [],
    [categoriesData],
  );

  const variantAttributeSlugOptions = useMemo(
    () =>
      variantsData?.items
        ?.flatMap(v => (v.values ?? []).map(val => ({ variantName: v.name, ...val })))
        .map(val => ({
          value: val.slug,
          label: `${val.variantName}: ${val.value} (${val.slug})`,
        })) ?? [],
    [variantsData],
  );

  const variantAttributeValueOptions = useMemo(
    () =>
      variantsData?.items
        ?.flatMap(v => (v.values ?? []).map(val => ({ variantName: v.name, ...val })))
        .map(val => ({
          value: val.value,
          label: `${val.variantName}: ${val.value}`,
        })) ?? [],
    [variantsData],
  );

  const initialForm = useMemo(() => {
    if (!collection) return EMPTY_FORM;

    const rules: RuleForm[] =
      collection.rules?.map(rule => ({
        field: rule.field,
        operator: rule.operator,
        value: String(rule.value ?? ''),
      })) ?? [];

    return {
      name: collection.name,
      slug: collection.slug,
      status: collection.status,
      type: collection.type,
      matchType: collection.matchType,
      rules,
    };
  }, [collection]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<{ productId: number; productName: string }[]>(
    [],
  );

  // Effect to reset form removed to avoid set-state-in-effect warning.
  // Instead, rely on key={collection.id} on the Dialog component to force re-initialization.

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isPreviewing = previewMutation.isPending;

  const getAllowedOperators = (field: string): CollectionRule['operator'][] => {
    switch (field) {
      case 'categoryId':
      case 'subCategoryId':
      case 'brandId':
      case 'gradeId':
      case 'warrantyId':
      case 'status':
        return ['equals', 'not_equals'];
      case 'variant.attribute.slug':
      case 'variant.attribute.value':
        return ['equals', 'not_equals', 'contains'];
      default:
        return ['equals', 'not_equals', 'contains', 'lt', 'gt'];
    }
  };

  // Auto-generate slug from name (only if slug hasn't been manually edited)
  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setForm(prev => {
      const prevAutoSlug = prev.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const isSlugAutoGenerated = prev.slug === prevAutoSlug || prev.slug === '';

      return {
        ...prev,
        name,
        slug: isSlugAutoGenerated ? autoSlug : prev.slug,
      };
    });
  };

  const buildRulesOrError = (): { rules: CollectionRule[] | null; error?: string } => {
    if (form.type !== 'automatic') return { rules: [] };

    if (!form.rules.length) {
      return { rules: null, error: 'Automatic collections require at least one rule.' };
    }

    const hasInvalid = form.rules.some(r => !r.field || !r.operator || r.value.trim() === '');
    if (hasInvalid) {
      return { rules: null, error: 'All rules must have field, operator, and value.' };
    }

    const rules = form.rules.map<CollectionRule>(r => {
      const raw = r.value.trim();
      // Best-effort type coercion: number > boolean > string
      const asNumber = Number(raw);
      let value: string | number | boolean = raw;
      if (!Number.isNaN(asNumber) && raw !== '') {
        value = asNumber;
      } else if (raw.toLowerCase() === 'true' || raw.toLowerCase() === 'false') {
        value = raw.toLowerCase() === 'true';
      }
      return {
        field: r.field,
        operator: r.operator,
        value,
      };
    });

    return { rules };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { rules, error: rulesError } = buildRulesOrError();
    if (rulesError) {
      setError(rulesError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      status: form.status,
      type: form.type,
      matchType: form.matchType,
      rules: form.type === 'automatic' ? (rules ?? []) : [],
    };

    if (isEdit && collection) {
      await updateMutation.mutateAsync({ id: collection.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      key={collection?.id ?? 'create'}
    >
      <DialogContent className="w-full max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Collection' : 'Add Collection'}</DialogTitle>
            <DialogDescription>
              {form.type === 'manual'
                ? 'Manual collections are curated by selecting products.'
                : 'Automatic collections are powered by rules.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={e => {
                  const sanitized = e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                  setForm(prev => ({ ...prev, slug: sanitized }));
                }}
                required
              />
              <p className="text-muted-foreground text-xs">
                URL-friendly identifier (lowercase, no spaces)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={value =>
                  setForm(prev => ({ ...prev, status: value as 'active' | 'inactive' }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={value =>
                  setForm(prev => ({
                    ...prev,
                    type: value as 'manual' | 'automatic',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'automatic' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Match Logic</Label>
                <Select
                  value={form.matchType}
                  onValueChange={value =>
                    setForm(prev => ({
                      ...prev,
                      matchType: value as 'all' | 'any',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose match logic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rules (AND)</SelectItem>
                    <SelectItem value="any">Any rule (OR)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Using {form.matchType === 'all' ? 'ALL rules (AND)' : 'ANY rule (OR)'} to decide
                  which products match.
                </p>
              </div>
            )}
          </div>

          {form.type === 'automatic' && (
            <div className="space-y-3">
              <Label>Rules</Label>
              <p className="text-muted-foreground text-xs">
                Rules are evaluated per product; all <span className="font-medium">active</span>{' '}
                variants of matching products are added to the collection. <br />
                <span className="font-medium">categoryId</span> uses root categories, and{' '}
                <span className="font-medium">subCategoryId</span> uses sub-categories.
              </p>
              <div className="space-y-2 rounded-md border p-3">
                {form.rules.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No rules yet. Add one below.</p>
                ) : (
                  form.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 md:flex-row"
                    >
                      <Select
                        aria-label="Rule field"
                        value={rule.field}
                        onValueChange={value =>
                          setForm(prev => ({
                            ...prev,
                            rules: prev.rules.map((r, i) =>
                              i === idx ? { ...r, field: value, value: '' } : r,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger className="md:w-48">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="categoryId">Category</SelectItem>
                          <SelectItem value="subCategoryId">Sub-category</SelectItem>
                          <SelectItem value="brandId">Brand</SelectItem>
                          <SelectItem value="gradeId">Grade</SelectItem>
                          <SelectItem value="warrantyId">Warranty</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="variant.attribute.slug">
                            Variant Attribute Slug
                          </SelectItem>
                          <SelectItem value="variant.attribute.value">
                            Variant Attribute Value
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        aria-label="Rule operator"
                        value={rule.operator}
                        onValueChange={value =>
                          setForm(prev => ({
                            ...prev,
                            rules: prev.rules.map((r, i) =>
                              i === idx ? { ...r, operator: value as RuleForm['operator'] } : r,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger className="md:w-40">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllowedOperators(rule.field).map(op => (
                            <SelectItem
                              key={op}
                              value={op}
                            >
                              {op === 'equals'
                                ? 'equals'
                                : op === 'not_equals'
                                  ? 'not equals'
                                  : op === 'contains'
                                    ? 'contains'
                                    : op === 'lt'
                                      ? 'less than'
                                      : 'greater than'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value control: select for known fields, input otherwise */}
                      {rule.field === 'categoryId' || rule.field === 'subCategoryId' ? (
                        <GeneralCombobox
                          className="md:w-56"
                          placeholder={
                            rule.field === 'categoryId' ? 'Select category' : 'Select sub-category'
                          }
                          value={rule.value}
                          onChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: String(value) } : r,
                              ),
                            }))
                          }
                          data={(rule.field === 'categoryId'
                            ? parentCategories
                            : subCategories
                          ).map(cat => ({
                            value: String(cat.id),
                            label: cat.name,
                          }))}
                        />
                      ) : rule.field === 'brandId' ? (
                        <GeneralCombobox
                          className="md:w-56"
                          placeholder="Select brand"
                          value={rule.value}
                          onChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: String(value) } : r,
                              ),
                            }))
                          }
                          data={
                            brandsData?.items?.map(brand => ({
                              value: String(brand.id),
                              label: brand.name,
                            })) ?? []
                          }
                        />
                      ) : rule.field === 'gradeId' ? (
                        <GeneralCombobox
                          className="md:w-56"
                          placeholder="Select grade"
                          value={rule.value}
                          onChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: String(value) } : r,
                              ),
                            }))
                          }
                          data={
                            gradesData?.items?.map(grade => ({
                              value: String(grade.id),
                              label: grade.name,
                            })) ?? []
                          }
                        />
                      ) : rule.field === 'warrantyId' ? (
                        <GeneralCombobox
                          className="md:w-56"
                          placeholder="Select warranty"
                          value={rule.value}
                          onChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: String(value) } : r,
                              ),
                            }))
                          }
                          data={
                            warrantiesData?.items?.map(w => ({
                              value: String(w.id),
                              label: w.name,
                            })) ?? []
                          }
                        />
                      ) : rule.field === 'status' ? (
                        <Select
                          value={rule.value}
                          onValueChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) => (i === idx ? { ...r, value } : r)),
                            }))
                          }
                        >
                          <SelectTrigger className="md:w-40">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : rule.field === 'variant.attribute.slug' &&
                        variantAttributeSlugOptions.length ? (
                        <GeneralCombobox
                          className="md:w-56"
                          placeholder="Select variant attribute (slug)"
                          value={rule.value}
                          onChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: String(value) } : r,
                              ),
                            }))
                          }
                          data={variantAttributeSlugOptions}
                        />
                      ) : rule.field === 'variant.attribute.value' &&
                        variantAttributeValueOptions.length ? (
                        <GeneralCombobox
                          className="md:w-56"
                          placeholder="Select variant attribute (value)"
                          value={rule.value}
                          onChange={value =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: String(value) } : r,
                              ),
                            }))
                          }
                          data={variantAttributeValueOptions}
                        />
                      ) : (
                        <Input
                          placeholder="Value"
                          aria-label="Rule value"
                          value={rule.value}
                          onChange={e =>
                            setForm(prev => ({
                              ...prev,
                              rules: prev.rules.map((r, i) =>
                                i === idx ? { ...r, value: e.target.value } : r,
                              ),
                            }))
                          }
                        />
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        justify="center"
                        size="icon"
                        aria-label="Remove rule"
                        onClick={() =>
                          setForm(prev => ({
                            ...prev,
                            rules: prev.rules.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Add rule"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      rules: [...prev.rules, { field: '', operator: 'equals', value: '' }],
                    }))
                  }
                >
                  Add rule
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Example: categoryId equals 10 AND variant.attribute.slug contains
                &quot;color_red&quot;.
              </p>

              {isEdit && form.type === 'automatic' && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setError(null);
                        setPreviewSummary(null);
                        setPreviewItems([]);
                        const { rules, error: rulesError } = buildRulesOrError();
                        if (rulesError) {
                          setError(rulesError);
                          return;
                        }
                        if (!collection) return;
                        try {
                          const result = await previewMutation.mutateAsync({
                            id: collection.id,
                            body: {
                              rules: rules ?? [],
                              matchType: form.matchType,
                              limit: 50,
                            },
                          });
                          const sampleCount = result.sampleCount ?? 0;
                          const matchedCount = result.matchedCount ?? 0;
                          const matchedResults =
                            (result as unknown as PreviewResult).results?.filter(r => r.matched) ??
                            [];
                          setPreviewItems(
                            matchedResults.slice(0, 5).map(r => ({
                              productId: r.productId,
                              productName: r.productName || `#${r.productId}`,
                            })),
                          );

                          let summary = `Preview: ${matchedCount} of ${sampleCount} sample products matched.`;
                          if (sampleCount > 0 && matchedCount === 0) {
                            summary += ' No products match these rules.';
                          } else if (sampleCount >= 10 && matchedCount / sampleCount >= 0.8) {
                            summary += ' These rules are very broad and match most products.';
                          }
                          setPreviewSummary(summary);
                        } catch {
                          setPreviewSummary('Preview failed. Please try again.');
                        }
                      }}
                      disabled={isPreviewing}
                    >
                      {isPreviewing ? 'Previewing…' : 'Preview rules'}
                    </Button>
                    {previewSummary && (
                      <span className="text-muted-foreground text-xs">{previewSummary}</span>
                    )}
                    {previewItems.length > 0 && (
                      <div className="bg-muted/40 rounded-md border p-2">
                        <p className="text-muted-foreground mb-1 text-xs">
                          Sample matched products:
                        </p>
                        <ul className="text-muted-foreground text-xs">
                          {previewItems.map(item => (
                            <li key={item.productId}>
                              #{item.productId} &mdash; {item.productName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              aria-label="Close Dialog"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

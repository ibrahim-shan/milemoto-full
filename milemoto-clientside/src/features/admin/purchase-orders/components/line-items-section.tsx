import { SectionCard } from './section-card';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

import type { LineDraft } from '../types';

type VariantOption = {
  id: number;
  sku: string;
  productName: string;
  variantName: string;
};

type TaxOption = {
  id: number;
  name: string;
  rate: string | number;
  type: 'fixed' | 'percentage';
};

type LineItemsSectionProps = {
  title: string;
  lines: LineDraft[];
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  onUpdateLine: (
    id: string,
    patch: Partial<Pick<LineDraft, 'productVariantId' | 'orderedQty' | 'unitCost' | 'taxId'>>,
  ) => void;
  onLineVariantChange: (id: string, value: string | number) => void;
  onLineTaxChange: (id: string, value: string | number) => void;
  variantItems: VariantOption[];
  taxes: TaxOption[];
  variantSearch: string;
  onVariantSearchChange: (value: string) => void;
  taxSearch: string;
  onTaxSearchChange: (value: string) => void;
};

export function LineItemsSection({
  title,
  lines,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  onLineVariantChange,
  onLineTaxChange,
  variantItems,
  taxes,
  variantSearch,
  onVariantSearchChange,
  taxSearch,
  onTaxSearchChange,
}: LineItemsSectionProps) {
  return (
    <SectionCard
      title={title}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <Label>Lines</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onAddLine}
        >
          Add Line
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variant</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Cost</TableHead>
            <TableHead>Tax</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground text-center"
              >
                No lines added yet.
              </TableCell>
            </TableRow>
          ) : (
            lines.map(line => (
              <TableRow key={line.id}>
                <TableCell className="max-w-xs">
                  <GeneralCombobox
                    placeholder="Select variant"
                    value={line.productVariantId ? String(line.productVariantId) : ''}
                    onChange={val => onLineVariantChange(line.id, val)}
                    searchValue={variantSearch}
                    onSearchChange={onVariantSearchChange}
                    className="w-full"
                    data={variantItems.map(v => ({
                      value: String(v.id),
                      label: `${v.sku} - ${v.productName} / ${v.variantName}`,
                      searchValue: `${v.sku} ${v.productName} ${v.variantName}`,
                    }))}
                  />
                </TableCell>

                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={line.orderedQty}
                    onChange={e =>
                      onUpdateLine(line.id, {
                        orderedQty: Number.parseInt(e.target.value || '0', 10),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitCost}
                    onChange={e =>
                      onUpdateLine(line.id, {
                        unitCost: Number.parseFloat(e.target.value || '0'),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <GeneralCombobox
                    placeholder="Select tax"
                    value={line.taxId ? String(line.taxId) : 'none'}
                    onChange={val => onLineTaxChange(line.id, val)}
                    searchValue={taxSearch}
                    onSearchChange={onTaxSearchChange}
                    className="w-full"
                    data={[
                      {
                        value: 'none',
                        label: 'No tax',
                        searchValue: 'No tax',
                      },
                      ...taxes.map(tax => ({
                        value: String(tax.id),
                        label: `${tax.name} (${tax.rate}${tax.type === 'percentage' ? '%' : ''})`,
                        searchValue: `${tax.name} ${tax.rate}`,
                      })),
                    ]}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    justify="center"
                    size="icon"
                    onClick={() => onRemoveLine(line.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

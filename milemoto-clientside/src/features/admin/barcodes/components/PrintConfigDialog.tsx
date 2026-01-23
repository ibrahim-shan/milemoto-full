import { useMemo, useRef, useState } from 'react';

import { BarcodeConfig, BarcodeLabel } from './BarcodeLabel';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { ProductVariantItem } from '@/hooks/useProductQueries';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
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
import { Separator } from '@/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';

interface PrintConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVariants: ProductVariantItem[];
}

const PRESET_SIZES = [
  { value: '50x30', label: 'Standard (50x30mm)' },
  { value: '40x25', label: 'Medium (40x25mm)' },
  { value: '30x20', label: 'Small (30x20mm)' },
];

export function PrintConfigDialog({
  open,
  onOpenChange,
  selectedVariants,
}: PrintConfigDialogProps) {
  const [config, setConfig] = useState<BarcodeConfig>({
    showProductName: true,
    showVariantName: true,
    showPrice: true,
    showSKU: true,
    labelSize: '50x30',
  });

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [globalQuantity, setGlobalQuantity] = useState(1);
  const [printLayout, setPrintLayout] = useState<'sheet' | 'thermal'>('sheet');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customDimensions, setCustomDimensions] = useState({
    width: 50,
    height: 30,
  });

  const resetState = useMemo(
    () => ({
      config: {
        showProductName: true,
        showVariantName: true,
        showPrice: true,
        showSKU: true,
        labelSize: '50x30' as BarcodeConfig['labelSize'],
      },
      quantities: {} as Record<number, number>,
      globalQuantity: 1,
      printLayout: 'sheet' as 'sheet' | 'thermal',
      customDimensions: {
        width: 50,
        height: 30,
      },
    }),
    [],
  );

  const selectValue = isCustomMode ? 'custom' : config.labelSize;

  const handleSizeChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomMode(true);
      setConfig(p => ({
        ...p,
        labelSize: `${customDimensions.width}x${customDimensions.height}`,
      }));
    } else {
      setIsCustomMode(false);
      setConfig(p => ({ ...p, labelSize: val }));
    }
  };

  const handleCustomDimensionChange = (dim: 'width' | 'height', val: string) => {
    const num = parseInt(val) || 0;
    const newDims = { ...customDimensions, [dim]: num };
    setCustomDimensions(newDims);
    if (isCustomMode) {
      setConfig(p => ({
        ...p,
        labelSize: `${newDims.width}x${newDims.height}`,
      }));
    }
  };

  const getPageStyle = () => {
    if (printLayout === 'sheet') {
      return `
        @page { size: auto; margin: 0mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      `;
    }
    const [width, height] = config.labelSize.split('x');
    return `
      @page { size: ${width}mm ${height}mm; margin: 0mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        html, body { height: 100vh; margin: 0 !important; padding: 0 !important; overflow: hidden; }
      }
    `;
  };

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Barcodes',
    pageStyle: getPageStyle(),
  });

  const getQuantity = (id: number) => quantities[id] ?? globalQuantity;

  const handleQuantityChange = (id: number, val: string) => {
    const qty = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [id]: qty }));
  };

  const handleGlobalQuantityChange = (val: string) => {
    const qty = parseInt(val) || 1;
    setGlobalQuantity(qty);
    setQuantities({}); // Reset individual overrides when global changes
  };

  const totalLabels = selectedVariants.reduce((sum, v) => sum + getQuantity(v.id), 0);

  // Generate the list of labels to print
  const labelsToPrint = selectedVariants.flatMap(variant => {
    const qty = getQuantity(variant.id);
    return Array(qty).fill(variant);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) {
          // reset state when closing
          setConfig(resetState.config);
          setQuantities(resetState.quantities);
          setGlobalQuantity(resetState.globalQuantity);
          setPrintLayout(resetState.printLayout);
          setIsCustomMode(false);
          setCustomDimensions(resetState.customDimensions);
        }
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Barcodes</DialogTitle>
          <DialogDescription>
            Configure label settings and quantities for {selectedVariants.length} variants.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
          {/* Settings Column */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Label Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showProductName"
                    checked={config.showProductName}
                    onCheckedChange={c => setConfig(p => ({ ...p, showProductName: !!c }))}
                  />
                  <Label htmlFor="showProductName">Product Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showVariantName"
                    checked={config.showVariantName}
                    onCheckedChange={c => setConfig(p => ({ ...p, showVariantName: !!c }))}
                  />
                  <Label htmlFor="showVariantName">Variant Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPrice"
                    checked={config.showPrice}
                    onCheckedChange={c => setConfig(p => ({ ...p, showPrice: !!c }))}
                  />
                  <Label htmlFor="showPrice">Price</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showSKU"
                    checked={config.showSKU}
                    onCheckedChange={c => setConfig(p => ({ ...p, showSKU: !!c }))}
                  />
                  <Label htmlFor="showSKU">SKU / Code</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label Size</Label>
                  <Select
                    value={selectValue}
                    onValueChange={handleSizeChange}
                  >
                    <SelectTrigger aria-label="Select label size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_SIZES.map(size => (
                        <SelectItem
                          key={size.value}
                          value={size.value}
                        >
                          {size.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Size</SelectItem>
                    </SelectContent>
                  </Select>

                  {isCustomMode && (
                    <div className="col-span-2 mt-2 flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Width (mm)</Label>
                        <Input
                          type="number"
                          value={customDimensions.width}
                          onChange={e => handleCustomDimensionChange('width', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <span className="text-muted-foreground pt-4">x</span>
                      <div className="flex-1">
                        <Label className="text-xs">Height (mm)</Label>
                        <Input
                          type="number"
                          value={customDimensions.height}
                          onChange={e => handleCustomDimensionChange('height', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Print Layout</Label>
                  <Select
                    value={printLayout}
                    onValueChange={(v: 'sheet' | 'thermal') => setPrintLayout(v)}
                  >
                    <SelectTrigger aria-label="Select print layout">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sheet">Sheet (Multiple)</SelectItem>
                      <SelectItem value="thermal">Thermal (Single)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Quantities</h4>
              <Tabs defaultValue="global">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="global">Global</TabsTrigger>
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="global"
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <Label htmlFor="globalQuantity">Copies per variant:</Label>
                    <Input
                      id="globalQuantity"
                      type="number"
                      min={1}
                      className="w-24"
                      value={globalQuantity}
                      onChange={e => handleGlobalQuantityChange(e.target.value)}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">Total labels: {totalLabels}</p>
                </TabsContent>
                <TabsContent value="individual">
                  <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-md border p-2">
                    {selectedVariants.map(v => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="max-w-[200px] truncate">
                          {v.productName} - {v.variantName}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-20"
                          value={getQuantity(v.id)}
                          onChange={e => handleQuantityChange(v.id, e.target.value)}
                          aria-label={`Quantity for ${v.productName} - ${v.variantName}`}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Preview Column */}
          <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-4 text-sm font-medium">Live Preview</h4>
            {selectedVariants.length > 0 && selectedVariants[0] && (
              <div className="shadow-lg">
                <BarcodeLabel
                  sku={selectedVariants[0].sku}
                  productName={selectedVariants[0].productName}
                  variantName={selectedVariants[0].variantName}
                  price={selectedVariants[0].price}
                  config={config}
                />
              </div>
            )}
            <p className="text-muted-foreground mt-4 text-center text-xs">
              * Preview shows the first selected item.
              <br />
              Actual print layout depends on your printer settings.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => handlePrint && handlePrint()}>
            <Printer className="mr-2 h-4 w-4" />
            Print {labelsToPrint.length} Labels
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Hidden Print Area */}
      <div style={{ display: 'none' }}>
        <div
          ref={printRef}
          className="print-container p-4"
        >
          <style
            type="text/css"
            media="print"
          >
            {printLayout === 'sheet'
              ? `
              .print-item { 
                break-inside: avoid; 
                display: inline-block;
                margin: 2mm;
              }
            `
              : `
              html, body { margin: 0; padding: 0; }
              .print-container { padding: 0 !important; }
              .print-item { 
                page-break-after: always; 
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                margin: 0;
              }
              .print-item:last-child { page-break-after: auto; }
            `}
          </style>
          <div className="flex flex-wrap gap-4">
            {labelsToPrint.map((variant, idx) => (
              <div
                key={`${variant.id}-${idx}`}
                className="print-item"
              >
                <BarcodeLabel
                  sku={variant.sku}
                  productName={variant.productName}
                  variantName={variant.variantName}
                  price={variant.price}
                  config={config}
                  className="border-none" // Remove border for actual print if desired, or keep it as a cutting guide
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

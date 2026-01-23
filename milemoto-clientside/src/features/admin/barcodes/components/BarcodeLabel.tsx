import React, { useEffect, useRef } from 'react';

import bwipjs from 'bwip-js';

import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { cn } from '@/lib/utils';

export interface BarcodeConfig {
  showProductName: boolean;
  showVariantName: boolean;
  showPrice: boolean;
  showSKU: boolean;
  labelSize: string; // "WxH" in mm
}

interface BarcodeLabelProps {
  sku: string;
  productName: string;
  variantName: string;
  price: number;
  config: BarcodeConfig;
  className?: string;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  sku,
  productName,
  variantName,
  price,
  config,
  className,
}) => {
  const { formatCurrency } = useDefaultCurrency();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128', // Barcode type
          text: sku, // Text to encode
          scale: 2, // 3x scaling factor
          height: 10, // Bar height, in millimeters
          includetext: config.showSKU, // Show human-readable text
          textxalign: 'center', // Always good to set this
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [sku, config.showSKU]);

  // Dimensions based on label size (approximate conversion to pixels for display)
  // 1mm ~ 3.78px
  const getDimensions = () => {
    const [w, h] = config.labelSize.split('x').map(Number);
    if (!w || !h) return { width: '189px', height: '113px' }; // Default 50x30

    return {
      width: `${w * 3.78}px`,
      height: `${h * 3.78}px`,
    };
  };

  const dims = getDimensions();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center overflow-hidden border border-gray-200 bg-white p-1 text-center',
        className,
      )}
      style={{
        width: dims.width,
        height: dims.height,
        pageBreakInside: 'avoid',
      }}
    >
      {config.showProductName && (
        <div className="w-full truncate px-1 text-[10px] font-bold leading-tight">
          {productName}
        </div>
      )}
      {config.showVariantName && (
        <div className="mb-1 w-full truncate px-1 text-[9px] leading-tight">{variantName}</div>
      )}

      <canvas
        ref={canvasRef}
        className="max-w-full"
      />

      {config.showPrice && (
        <div className="mt-1 text-[10px] font-bold">{formatCurrency(price)}</div>
      )}
    </div>
  );
};

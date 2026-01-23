'use client';

import BarcodeTable from '@/features/admin/barcodes/components/BarcodeTable';
import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function BarcodesPage() {
  return (
    <PermissionGuard requiredPermission="barcodes.read">
      <div className="space-y-6">
        <BarcodeTable />
      </div>
    </PermissionGuard>
  );
}

import { PaginationControls } from '@/features/pagination/pagination-controls';

type TablePaginationFooterProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  summaryText?: string;
};

export function TablePaginationFooter({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  summaryText,
}: TablePaginationFooterProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-muted-foreground text-sm">
        {summaryText ?? `Page ${page} of ${totalPages} (Total ${totalCount} items)`}
      </div>
      <PaginationControls
        totalCount={totalCount}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

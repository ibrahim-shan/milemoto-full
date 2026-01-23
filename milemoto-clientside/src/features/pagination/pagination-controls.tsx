'use client';

import { usePagination } from '@/hooks/use-pagination';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPageSize,
  PaginationPrevious,
} from '@/ui/pagination';

interface PaginationControlsProps {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  pageSizeLabel?: string;
  pageSizeDisabled?: boolean;
}

export function PaginationControls({
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
  siblingCount = 1,
  onPageSizeChange,
  pageSizeOptions,
  pageSizeLabel,
  pageSizeDisabled,
}: PaginationControlsProps) {
  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
  });

  // If there are less than 2 times in pagination range we shall not render the component
  if (currentPage === 0 || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    onPageChange(currentPage - 1);
  };

  // Last item in range is the total page count
  const lastPage = paginationRange[paginationRange.length - 1];

  return (
    <div className="flex items-center gap-4">
      {onPageSizeChange ? (
        <PaginationPageSize
          value={pageSize}
          onValueChange={next => {
            if (next !== pageSize) onPageSizeChange(next);
          }}
          {...(pageSizeOptions ? { options: pageSizeOptions } : {})}
          {...(pageSizeLabel ? { label: pageSizeLabel } : {})}
          {...(pageSizeDisabled !== undefined ? { disabled: pageSizeDisabled } : {})}
        />
      ) : null}
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          {/* Previous Button */}
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={e => {
                e.preventDefault();
                if (currentPage > 1) onPrevious();
              }}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>

          {/* Page Numbers */}
          {paginationRange.map((pageNumber, index) => {
            if (pageNumber === '...') {
              return (
                <PaginationItem key={`dots-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href="#"
                  isActive={pageNumber === currentPage}
                  onClick={e => {
                    e.preventDefault();
                    onPageChange(pageNumber as number);
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* Next Button */}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={e => {
                e.preventDefault();
                if (currentPage < Number(lastPage)) onNext();
              }}
              aria-disabled={currentPage === Number(lastPage)}
              className={
                currentPage === Number(lastPage) ? 'pointer-events-none opacity-50' : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

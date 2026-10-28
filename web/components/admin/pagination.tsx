'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/admin/format';

function pageWindow(current: number, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
}

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  disabled = false,
  limitOptions = [10, 20, 50],
  itemLabel = 'items',
  itemLabelSingular,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  disabled?: boolean;
  limitOptions?: number[];
  itemLabel?: string;
  itemLabelSingular?: string;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  const pages = pageWindow(page, safeTotalPages);
  const noun = total === 1 ? (itemLabelSingular ?? itemLabel) : itemLabel;

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-description text-xs text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{startItem}</span>
        {'–'}
        <span className="font-semibold text-on-surface">{endItem}</span>
        {' of '}
        <span className="font-semibold text-on-surface">{total}</span>
        {' '}
        {noun}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onLimitChange ? (
          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="sr-only">Items per page</span>
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              disabled={disabled}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>

          <div className="hidden items-center gap-1 sm:flex">
            {pages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-label={`Page ${pageNumber}`}
                aria-current={pageNumber === page ? 'page' : undefined}
                disabled={disabled}
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
                  pageNumber === page
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline-variant text-on-surface hover:bg-surface-container',
                )}
              >
                {pageNumber}
              </button>
            ))}
          </div>

          <span className="px-1 text-xs text-on-surface-variant sm:hidden">
            {page} / {safeTotalPages}
          </span>

          <button
            type="button"
            aria-label="Next page"
            disabled={disabled || page >= safeTotalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

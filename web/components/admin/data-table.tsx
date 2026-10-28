import type { ReactNode } from 'react';
import { cn } from '@/lib/admin/format';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyState,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low/70">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-label-caps text-[10px] font-semibold uppercase tracking-[0.12em] text-secondary',
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-outline-variant/70 transition-colors last:border-b-0 hover:bg-surface-container-low/60"
            >
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3 text-sm', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

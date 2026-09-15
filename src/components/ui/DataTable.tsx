import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { TableSkeleton } from './Primitives'
import { cn, formatNumber } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Ancho fijo en clases de utilidad; útil para columnas de acciones. */
  className?: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  className?: string
}

const alignment = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading && !rows) {
    return (
      <div className={cn('surface-card overflow-hidden', className)}>
        <TableSkeleton columns={columns.length} />
      </div>
    )
  }

  if (!rows?.length) {
    return <div className={cn('surface-card overflow-hidden', className)}>{empty}</div>
  }

  return (
    <div className={cn('surface-card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-inset/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 text-[0.7188rem] font-semibold tracking-wide text-ink-muted uppercase',
                    alignment[column.align ?? 'left'],
                    column.className,
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
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter') onRowClick(row)
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-line/70 transition-colors last:border-b-0',
                  onRowClick && 'cursor-pointer hover:bg-inset/70 focus:bg-inset focus:outline-none',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-middle text-ink-soft',
                      alignment[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
}: {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalCount === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-[0.8125rem] text-ink-muted tabular">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(totalCount)}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronLeft className="size-4" />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>

        <span className="px-2 text-[0.8125rem] text-ink-muted tabular">
          {page} / {Math.max(totalPages, 1)}
        </span>

        <Button
          size="sm"
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

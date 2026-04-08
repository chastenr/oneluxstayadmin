import { CloseIcon } from './icons.jsx'
import { cx } from './utils.js'

export function Card({ className = '', children }) {
  return (
    <section
      className={cx(
        'rounded-[28px] border border-stone-200/80 bg-white/90 shadow-panel backdrop-blur-sm',
        className
      )}
    >
      {children}
    </section>
  )
}

export function IconButton({ className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:text-stone-950',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-stone-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h2 className="text-2xl font-medium tracking-tight text-stone-950">{title}</h2>
          {description ? <p className="max-w-3xl text-sm text-stone-500">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

const badgeToneClasses = {
  neutral: 'bg-stone-100 text-stone-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
  accent: 'bg-[#efe5d8] text-stone-700',
}

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        badgeToneClasses[tone] || badgeToneClasses.neutral,
        className
      )}
    >
      {children}
    </span>
  )
}

export function MetricCard({ label, value, hint, trend, tone = 'neutral' }) {
  const accentClass =
    tone === 'accent'
      ? 'bg-stone-950 text-white border-stone-950'
      : 'bg-white text-stone-950 border-stone-200/80'

  const hintClass = tone === 'accent' ? 'text-stone-300' : 'text-stone-500'

  return (
    <Card className={cx('p-6', accentClass)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className={cx('text-sm font-medium', hintClass)}>{label}</p>
          <div className="space-y-2">
            <h3 className="text-3xl font-medium tracking-tight">{value}</h3>
            <p className={cx('text-sm', hintClass)}>{hint}</p>
          </div>
        </div>
        {trend ? <Badge tone={tone === 'accent' ? 'accent' : 'neutral'}>{trend}</Badge> : null}
      </div>
    </Card>
  )
}

export function DataTable({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = 'Nothing to show yet.',
  emptyDescription,
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-stone-200/80">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200/80">
          <thead className="bg-stone-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cx(
                    'px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.2em] text-stone-400',
                    column.headerClassName
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row) : row.id || index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    onRowClick
                      ? 'cursor-pointer transition duration-200 hover:bg-stone-50/80'
                      : 'transition duration-200'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        'px-4 py-4 align-top text-sm text-stone-600',
                        column.className
                      )}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-12 text-center" colSpan={columns.length}>
                  <p className="text-sm font-medium text-stone-700">{emptyTitle}</p>
                  {emptyDescription ? (
                    <p className="mt-2 text-sm text-stone-500">{emptyDescription}</p>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        <h3 className="text-base font-medium text-stone-900">{title}</h3>
        <p className="text-sm text-stone-500">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  )
}

export function SlideOver({ open, title, description, onClose, children, footer }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/30 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close panel"
        className="flex-1 cursor-default"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-xl border-l border-stone-200/80 bg-[#fcfbf8] shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200/80 px-6 py-5">
          <div className="space-y-1 pr-6">
            <h3 className="text-xl font-medium text-stone-950">{title}</h3>
            {description ? <p className="text-sm text-stone-500">{description}</p> : null}
          </div>
          <IconButton onClick={onClose}>
            <CloseIcon className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="h-[calc(100%-132px)] overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="border-t border-stone-200/80 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

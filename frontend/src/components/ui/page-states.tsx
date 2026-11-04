import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border bg-card overflow-hidden">
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-3">
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, children }: {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center rounded-xl border border-dashed py-14 px-6">
      <Icon className="w-10 h-10 text-muted-foreground mb-4" />
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

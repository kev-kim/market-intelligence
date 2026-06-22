import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <Skeleton className="h-7 w-36 mb-1.5" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mb-2.5" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[220, 220].map((h, i) => (
          <Card key={i}>
            <CardContent className="p-4 pt-4">
              <Skeleton className="h-4 w-44 mb-4" />
              <Skeleton style={{ height: h }} className="w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* feeds */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[6, 4].map((count, col) => (
          <div key={col} className="space-y-2">
            <Skeleton className="h-4 w-40 mb-3" />
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

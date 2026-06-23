import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <Skeleton className="h-7 w-36 mb-1.5" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* attention band */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-28 mb-2.5" />
              <Skeleton className="h-9 w-14 mb-1.5" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
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

      {/* watchlist activity + top raises */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44 mb-3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
          ))}
        </div>
        <div>
          <Skeleton className="h-4 w-44 mb-3" />
          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[220, 220].map((h, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton style={{ height: h }} className="w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* recent events feed */}
      <div>
        <Skeleton className="h-4 w-52 mb-3" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

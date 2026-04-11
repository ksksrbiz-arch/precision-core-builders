/**
 * Loading Skeletons — Smooth placeholder UI while data loads
 */

export function SkeletonLine({
  className = "",
  width = "w-full",
}: {
  className?: string;
  width?: string;
}) {
  return (
    <div className={`h-4 bg-muted/40 animate-pulse ${width} ${className}`} />
  );
}

export function SkeletonBox({
  width = "w-full",
  height = "h-20",
  className = "",
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-muted/40 animate-pulse ${width} ${height} ${className}`}
    />
  );
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border/40 p-4 space-y-3">
          <SkeletonLine width="w-2/3" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} width="flex-1" className="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "h-10 w-10" }: { size?: string }) {
  return <SkeletonBox width={size} height={size} className="rounded-full" />;
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return (
    <SkeletonBox
      width="w-full"
      height="h-10"
      className={`rounded ${className}`}
    />
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-4">
      <div>
        <SkeletonLine width="w-24" className="h-3 mb-2" />
        <SkeletonBox height="h-10" />
      </div>
      <div>
        <SkeletonLine width="w-32" className="h-3 mb-2" />
        <SkeletonBox height="h-24" />
      </div>
      <SkeletonButton />
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <SkeletonAvatar size="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="w-32" />
            <SkeletonLine width="w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGantt() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-2 items-center">
          <SkeletonLine width="w-20" className="h-3" />
          <SkeletonBox width="flex-1" height="h-6" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonLine width="w-40" className="h-8" />
        <SkeletonLine width="w-32" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border/40 p-4 space-y-2">
            <SkeletonLine width="w-16" className="h-3" />
            <SkeletonLine width="w-full" className="h-6" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border/40 p-4">
        <SkeletonTable rows={6} cols={4} />
      </div>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="프로필 로딩 중">
      <div className="bg-muted h-9 w-40 animate-pulse rounded-md" />
      <div className="border-border bg-card text-card-foreground rounded-xl border shadow-sm">
        <div className="p-6 pb-2">
          <div className="bg-muted h-10 w-full animate-pulse rounded-md" />
        </div>
        <div className="space-y-8 p-6 pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="bg-muted size-28 shrink-0 animate-pulse rounded-full" />
            <div className="space-y-2">
              <div className="bg-muted h-4 w-48 animate-pulse rounded" />
              <div className="bg-muted h-9 w-36 animate-pulse rounded-md" />
            </div>
          </div>
          <div className="bg-border h-px w-full" />
          <div className="space-y-4">
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
            <div className="bg-muted h-9 w-24 animate-pulse rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

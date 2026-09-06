import { cn } from '@/lib/utils'

type FullPageLoadingProps = {
  className?: string
  text?: string
}

export function FullPageLoading({
  className,
  text = 'Loading...',
}: FullPageLoadingProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-background p-4',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

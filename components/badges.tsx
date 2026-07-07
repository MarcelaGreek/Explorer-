import { cn } from "@/lib/utils"

type Tone = "success" | "danger" | "warning" | "muted" | "primary" | "info"

const toneClasses: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/15 text-primary border-primary/30",
  info: "bg-chart-4/15 text-chart-4 border-chart-4/30",
}

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-tight whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function safetyTone(outcome: string | null): Tone {
  switch (outcome) {
    case "success":
      return "success"
    case "fail":
      return "danger"
    case "review":
      return "warning"
    default:
      return "muted"
  }
}

export function outcomeLabel(outcome: string | null): string {
  switch (outcome) {
    case "success":
      return "Pass"
    case "fail":
      return "Fail"
    case "review":
      return "Review"
    default:
      return outcome ?? "—"
  }
}

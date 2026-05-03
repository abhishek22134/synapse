import clsx from "clsx"

type Status = "not_connected" | "queued" | "indexing" | "ready" | "error"

const config: Record<Status, { label: string; dot: string; text: string }> = {
  not_connected: { label: "Not connected", dot: "bg-gray-300",          text: "text-gray-400" },
  queued:        { label: "Queued",         dot: "bg-amber-400",         text: "text-amber-600" },
  indexing:      { label: "Indexing…",      dot: "bg-blue-400 animate-pulse", text: "text-blue-600" },
  ready:         { label: "Ready",          dot: "bg-green-500",         text: "text-green-600" },
  error:         { label: "Error",          dot: "bg-red-400",           text: "text-red-500" },
}

export function StatusBadge({ status }: { status: string }) {
  const s = (config[status as Status] ?? config.not_connected)
  return (
    <span className={clsx("flex items-center gap-1.5 text-xs font-medium", s.text)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full inline-block", s.dot)} />
      {s.label}
    </span>
  )
}

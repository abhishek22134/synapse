import { HardDrive, Hash, ExternalLink } from "lucide-react"
import { Source } from "@/lib/api"
import clsx from "clsx"

const sourceConfig = {
  google_drive: { icon: HardDrive, color: "bg-blue-50 text-blue-700 border-blue-100" },
  slack:        { icon: Hash,      color: "bg-purple-50 text-purple-700 border-purple-100" },
}

export function SourcePill({ source }: { source: Source }) {
  const cfg = sourceConfig[source.source as keyof typeof sourceConfig] ?? {
    icon: ExternalLink,
    color: "bg-gray-50 text-gray-600 border-gray-100",
  }
  const Icon = cfg.icon

  const inner = (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-opacity",
        cfg.color,
        source.url && "hover:opacity-80 cursor-pointer"
      )}
    >
      <Icon size={11} />
      {source.title}
    </span>
  )

  if (source.url) {
    return (
      <a href={source.url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    )
  }
  return inner
}

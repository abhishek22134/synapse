"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, Zap } from "lucide-react"
import clsx from "clsx"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const links = [
    { href: "/connect", label: "Connect" },
    { href: "/ask",     label: "Ask"     },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-medium tracking-tight">Synapse</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-sm transition-colors",
                pathname === l.href
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        {session ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              {session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/connect" })}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="w-24" />
        )}
      </div>
    </header>
  )
}

"use client"

import { useEffect, useState, useCallback } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { StatusBadge } from "@/components/StatusBadge"
import { connectGoogle, connectSlack, getStatus, IndexingStatus } from "@/lib/api"
import {
  HardDrive,
  Hash,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react"

type SourceKey = "google_drive" | "slack"

export default function ConnectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [indexStatus, setIndexStatus] = useState<IndexingStatus | null>(null)
  const [connecting, setConnecting] = useState<SourceKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState<Set<SourceKey>>(new Set())

  // Poll indexing status every 3s while anything is indexing
  const pollStatus = useCallback(async () => {
    try {
      const s = await getStatus()
      setIndexStatus(s)
    } catch { /* ignore network blips */ }
  }, [])

  useEffect(() => {
    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [pollStatus])

  // After OAuth redirect back, fire the connect API if we have tokens
  useEffect(() => {
    if (!session) return

    const provider = session.provider as SourceKey | undefined
    if (!provider || triggered.has(provider)) return

    setTriggered((prev) => new Set(prev).add(provider))
    setConnecting(provider)
    setError(null)

    const run = async () => {
      try {
        if (provider === "google_drive" || session.provider === "google") {
          await connectGoogle(session.accessToken, session.refreshToken)
        } else if (provider === "slack") {
          await connectSlack(session.accessToken)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setConnecting(null)
      }
    }

    run()
  }, [session, triggered])

  const handleConnect = (provider: "google" | "slack") => {
    signIn(provider, { callbackUrl: "/connect" })
  }

  const bothReady =
    indexStatus?.google_drive?.status === "ready" &&
    indexStatus?.slack?.status === "ready"

  const googleStatus = indexStatus?.google_drive?.status ?? "not_connected"
  const slackStatus  = indexStatus?.slack?.status  ?? "not_connected"

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-14 bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md animate-fade-up">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-1 text-xs text-gray-500 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Step 1 of 2 — Connect your sources
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">
              Connect your knowledge
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Synapse reads your Google Drive and Slack, indexes everything, then answers any question in seconds.
            </p>
          </div>

          {/* Cards */}
          <div className="space-y-3 mb-6">

            {/* Google Drive */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-content-center flex items-center justify-center">
                    <HardDrive size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Google Drive</p>
                    <p className="text-xs text-gray-400">Docs, Sheets, Slides, PDFs</p>
                  </div>
                </div>
                <StatusBadge status={googleStatus} />
              </div>

              {/* Stats when ready */}
              {googleStatus === "ready" && indexStatus?.google_drive && (
                <div className="flex gap-4 mb-4 text-xs text-gray-500">
                  <span>
                    <span className="font-medium text-gray-800">
                      {indexStatus.google_drive.files_indexed ?? 0}
                    </span>{" "}files indexed
                  </span>
                  <span>
                    <span className="font-medium text-gray-800">
                      {indexStatus.google_drive.chunks_stored ?? 0}
                    </span>{" "}chunks stored
                  </span>
                </div>
              )}

              {googleStatus === "error" && (
                <div className="flex items-center gap-2 text-xs text-red-500 mb-3">
                  <AlertCircle size={13} />
                  {indexStatus?.google_drive?.error ?? "Something went wrong"}
                </div>
              )}

              <button
                onClick={() => handleConnect("google")}
                disabled={googleStatus === "indexing" || googleStatus === "queued" || connecting === "google_drive"}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  bg-gray-900 text-white hover:bg-gray-700"
              >
                {(googleStatus === "indexing" || googleStatus === "queued") ? (
                  <><Loader2 size={14} className="animate-spin" /> Indexing Drive…</>
                ) : googleStatus === "ready" ? (
                  <><CheckCircle2 size={14} className="text-green-400" /> Drive connected — reconnect</>
                ) : (
                  <><HardDrive size={14} /> Connect Google Drive</>
                )}
              </button>
            </div>

            {/* Slack */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Hash size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Slack</p>
                    <p className="text-xs text-gray-400">Public channels & messages</p>
                  </div>
                </div>
                <StatusBadge status={slackStatus} />
              </div>

              {slackStatus === "ready" && indexStatus?.slack && (
                <div className="flex gap-4 mb-4 text-xs text-gray-500">
                  <span>
                    <span className="font-medium text-gray-800">
                      {indexStatus.slack.channels_indexed ?? 0}
                    </span>{" "}channels indexed
                  </span>
                  <span>
                    <span className="font-medium text-gray-800">
                      {indexStatus.slack.chunks_stored ?? 0}
                    </span>{" "}chunks stored
                  </span>
                </div>
              )}

              {slackStatus === "error" && (
                <div className="flex items-center gap-2 text-xs text-red-500 mb-3">
                  <AlertCircle size={13} />
                  {indexStatus?.slack?.error ?? "Something went wrong"}
                </div>
              )}

              <button
                onClick={() => handleConnect("slack")}
                disabled={slackStatus === "indexing" || slackStatus === "queued" || connecting === "slack"}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  bg-gray-900 text-white hover:bg-gray-700"
              >
                {(slackStatus === "indexing" || slackStatus === "queued") ? (
                  <><Loader2 size={14} className="animate-spin" /> Indexing Slack…</>
                ) : slackStatus === "ready" ? (
                  <><CheckCircle2 size={14} className="text-green-400" /> Slack connected — reconnect</>
                ) : (
                  <><Hash size={14} /> Connect Slack</>
                )}
              </button>
            </div>
          </div>

          {/* Global error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => router.push("/ask")}
            disabled={googleStatus !== "ready" && slackStatus !== "ready"}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all
              bg-green-500 text-white hover:bg-green-600
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bothReady ? "Start asking questions" : "Continue to Ask"}
            <ArrowRight size={15} />
          </button>

          {(googleStatus === "ready" || slackStatus === "ready") && !bothReady && (
            <p className="text-center text-xs text-gray-400 mt-3">
              You can ask questions now — connect the second source for better answers.
            </p>
          )}

          {/* Privacy note */}
          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            Synapse reads your data read-only. Nothing is shared outside your workspace.
            <br/>SOC 2 compliant · Data never leaves your org.
          </p>
        </div>
      </main>
    </>
  )
}

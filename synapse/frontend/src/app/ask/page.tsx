"use client"

import { useState, useRef, useEffect, FormEvent } from "react"
import { Navbar } from "@/components/Navbar"
import { SourcePill } from "@/components/SourcePill"
import { askQuestion, AskResponse } from "@/lib/api"
import { Send, Zap, AlertCircle, ChevronRight, Copy } from "lucide-react"
import clsx from "clsx"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: AskResponse["sources"]
  chunks_used?: number
  error?: boolean
}

const SUGGESTED = [
  "What is our parental leave policy?",
  "What was decided in the last board meeting?",
  "Who is responsible for AWS infrastructure?",
  "What is the status of our latest product launch?",
  "How do I submit a vendor invoice?",
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}

function AssistantMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex gap-3 animate-fade-up">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm">
        ⚡
      </div>

      <div className="flex flex-col gap-2 max-w-[85%]">
        {/* Message */}
        <div
          className={clsx(
            "rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed",
            msg.error
              ? "bg-red-50 border border-red-100 text-red-700"
              : "bg-white border border-gray-200 text-gray-800"
          )}
        >
          {msg.error && (
            <AlertCircle size={13} className="inline mr-1.5 mb-0.5 text-red-400" />
          )}

          <div className="prose prose-sm max-w-none">
  <ReactMarkdown>
    {msg.content}
  </ReactMarkdown>
</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 text-xs text-gray-400 pl-1">
          <button
            onClick={() => navigator.clipboard.writeText(msg.content)}
            className="hover:text-gray-600 flex items-center gap-1"
          >
            <Copy size={12} /> Copy
          </button>

          {msg.sources && (
            <span className="flex items-center gap-1">
              <Zap size={10} />
              {msg.chunks_used} chunks searched
            </span>
          )}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.sources.map((s, i) => (
              <SourcePill key={i} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end gap-2 animate-fade-up">
      <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%]">
        {content}
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-300" />
    </div>
  )
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const result = await askQuestion(question.trim())

      let partial = ""

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        sources: result.sources,
        chunks_used: result.chunks_used,
      }

      setMessages((prev) => [...prev, assistantMsg])

      // Fake streaming effect
      const words = result.answer.split(" ")

      for (let w of words) {
        partial += w + " "

        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...assistantMsg,
            content: partial,
          }
          return updated
        })

        await new Promise((r) => setTimeout(r, 15))
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Something went wrong reaching the API. Make sure the backend is running.",
          error: true,
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-14 flex flex-col bg-gradient-to-b from-white to-gray-100">
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">

          {/* Empty state */}
          {isEmpty && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4">
                  <Zap size={22} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold">Ask your company anything</h2>
              </div>

              <div className="w-full max-w-md space-y-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full px-4 py-3 bg-white border rounded-xl text-sm hover:scale-[1.02] transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {!isEmpty && (
            <div className="flex-1 flex flex-col gap-5 pb-4">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} content={msg.content} />
                ) : (
                  <AssistantMessage key={msg.id} msg={msg} />
                )
              )}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                    ⚡
                  </div>
                  <div className="bg-white border px-4 py-3 rounded-2xl">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="sticky bottom-4 mt-4">
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 bg-white border rounded-2xl p-2 shadow-sm"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none px-2 py-1.5"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
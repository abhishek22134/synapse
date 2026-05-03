const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface Source {
  title: string
  url: string
  source: string
  score: number
}

export interface AskResponse {
  answer: string
  sources: Source[]
  chunks_used: number
}

export interface IndexingStatus {
  google_drive: { status: string; files_indexed?: number; chunks_stored?: number; error?: string }
  slack: { status: string; channels_indexed?: number; chunks_stored?: number; error?: string }
}

export async function connectGoogle(accessToken: string, refreshToken: string, orgId = "default") {
  const res = await fetch(`${API_URL}/connect/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, org_id: orgId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function connectSlack(botToken: string, orgId = "default") {
  const res = await fetch(`${API_URL}/connect/slack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_token: botToken, org_id: orgId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStatus(): Promise<IndexingStatus> {
  const res = await fetch(`${API_URL}/connect/status`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function askQuestion(question: string, orgId = "default"): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, org_id: orgId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

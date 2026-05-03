import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]/route"

export default async function Home() {
  const session = await getServerSession(authOptions)
  // Redirect authenticated users straight to the ask page
  if (session) redirect("/ask")
  redirect("/connect")
}

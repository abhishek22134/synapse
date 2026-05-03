import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import SlackProvider from "next-auth/providers/slack"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request Drive read access + offline access for refresh token
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request bot scopes for reading channels + messages
          scope: [
            "channels:history",
            "channels:read",
            "groups:history",
            "groups:read",
            "users:read",
          ].join(","),
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // Persist provider tokens in the JWT
      if (account) {
        token.provider = account.provider
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      // Expose tokens to the frontend session
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.provider = token.provider as string
      return session
    },
  },

  pages: {
    signIn: "/connect",
  },

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

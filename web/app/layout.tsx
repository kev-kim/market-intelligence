import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { AppShell } from "@/components/app-shell"

export const metadata: Metadata = {
  title: "KCI · Korean Company Intelligence",
  description:
    "Source-traceable intelligence on Korean private, VC-backed, and growth-stage companies. Every number carries its provenance and a computed confidence.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}

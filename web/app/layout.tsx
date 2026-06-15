import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Market Intelligence",
  description: "Korean Company Intelligence Platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}

// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'  // ← Pastikan ini ada

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OneRoom - Social Media Platform',
  description: 'Platform media sosial untuk komunitas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

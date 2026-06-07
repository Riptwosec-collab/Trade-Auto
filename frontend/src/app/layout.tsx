import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'APEX TRADE — Professional Trading Platform',
  description: 'Multi-broker trading platform: Stocks, Crypto, Forex',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

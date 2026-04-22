import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { AnimatedBackground } from '@/components/animated-background'

export const metadata: Metadata = {
  title: 'CookieLearn - Геймификация обучения',
  description: 'Зарабатывайте печеньки за активность в учебе и обменивайте их на привилегии',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>
          <AnimatedBackground />
          <div className="app-shell">{children}</div>
        </Providers>
      </body>
    </html>
  )
}

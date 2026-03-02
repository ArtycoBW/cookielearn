"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  BarChart3,
  ClipboardList,
  Gift,
  History,
  Home,
  LogOut,
  Menu,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useProfile } from '@/lib/queries'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const studentNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Дашборд', icon: Home },
  { href: '/shop', label: 'Магазин', icon: ShoppingBag },
  { href: '/my-certificates', label: 'Сертификаты', icon: Award },
  { href: '/history', label: 'История', icon: History },
  { href: '/leaderboard', label: 'Лидерборд', icon: Trophy },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/stats', label: 'Статистика', icon: BarChart3 },
  { href: '/admin/students', label: 'Студенты', icon: Users },
  { href: '/admin/award', label: 'Начисления', icon: Gift },
  { href: '/admin/certificates', label: 'Сертификаты', icon: Shield },
  { href: '/admin/tasks', label: 'Задания', icon: ClipboardList },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: profile } = useProfile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const navItems = useMemo(() => (isAdmin ? adminNavItems : studentNavItems), [isAdmin])
  const logoHref = isAdmin ? '/admin/stats' : '/dashboard'

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Вы успешно вышли из системы')
      router.push('/login')
    } catch {
      toast.error('Ошибка при выходе')
      setIsLoggingOut(false)
    }
  }

  const isActiveItem = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <nav className="sticky top-0 z-50 hidden border-b border-blue-400/20 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-lg md:block">
        <div className="mx-auto h-16 w-full max-w-7xl px-6">
          <div className="flex h-full items-center justify-between gap-4">
            <Link href={logoHref} className="group flex shrink-0 items-center gap-2">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="text-2xl">
                🍪
              </motion.div>
              <span className="text-xl font-bold text-white transition-colors group-hover:text-blue-100">CookieLearn</span>
            </Link>

            <div className="flex flex-1 items-center justify-center gap-1">
              {navItems.map((item) => {
                const isActive = isActiveItem(item.href)
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                      <div
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all xl:px-4 ${
                          isActive ? 'bg-white text-blue-600 shadow-lg' : 'text-blue-50 hover:bg-blue-500/50 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium whitespace-nowrap">{item.label}</span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute -bottom-3 left-0 right-0 h-1 rounded-t-full bg-white"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm"
              >
                <span className="text-sm font-medium text-white/80">Баланс:</span>
                <span className="text-2xl font-bold text-white">{profile?.balance ?? 0}</span>
                <span className="text-2xl">🍪</span>
              </motion.div>

              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white hover:text-blue-600"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? 'Выход...' : 'Выйти'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <nav className="sticky top-0 z-50 border-b border-blue-400/20 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-lg md:hidden">
        <div className="px-4">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link href={logoHref} className="flex min-w-0 items-center gap-2">
              <span className="text-2xl">🍪</span>
              <span className="truncate text-lg font-bold text-white">CookieLearn</span>
            </Link>

            <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-lg font-bold text-white">{profile?.balance ?? 0}</span>
              <span className="text-lg">🍪</span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="shrink-0 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-blue-400/20 bg-blue-600"
            >
              <div className="space-y-2 px-4 py-4">
                {navItems.map((item) => {
                  const isActive = isActiveItem(item.href)
                  const Icon = item.icon

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                          isActive ? 'bg-white text-blue-600 shadow-lg' : 'text-blue-50 hover:bg-blue-500/50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  )
                })}

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-50 transition-all hover:bg-red-500/50"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">{isLoggingOut ? 'Выход...' : 'Выйти'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  )
}

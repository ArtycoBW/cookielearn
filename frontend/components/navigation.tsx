'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  BarChart3,
  ClipboardList,
  FileText,
  Gift,
  History,
  Home,
  LogOut,
  Menu,
  Palette,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  UserCircle2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useProfile } from '@/lib/queries'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme, type AppTheme } from '@/components/theme-provider'
import { toast } from 'sonner'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const studentNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Дашборд', icon: Home },
  { href: '/profile', label: 'Профиль', icon: UserCircle2 },
  { href: '/shop', label: 'Магазин', icon: ShoppingBag },
  { href: '/my-certificates', label: 'Сертификаты', icon: Award },
  { href: '/tasks', label: 'Задания', icon: ClipboardList },
  { href: '/history', label: 'История', icon: History },
  { href: '/leaderboard', label: 'Лидерборд', icon: Trophy },
  { href: '/survey', label: 'Анкета', icon: FileText },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/stats', label: 'Статистика', icon: BarChart3 },
  { href: '/admin/leaderboard', label: 'Лидерборд', icon: Trophy },
  { href: '/shop', label: 'Магазин', icon: ShoppingBag },
  { href: '/admin/students', label: 'Студенты', icon: Users },
  { href: '/admin/award', label: 'Начисления', icon: Gift },
  { href: '/admin/certificates', label: 'Сертификаты', icon: Shield },
  { href: '/admin/tasks', label: 'Задания', icon: ClipboardList },
  { href: '/admin/surveys', label: 'Анкеты', icon: FileText },
]

const themeLabels: Record<AppTheme, string> = {
  ocean: 'Океан',
  mint: 'Мята',
  midnight: 'Ночь',
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: profile } = useProfile()
  const { theme, setTheme } = useTheme()

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
      toast.success('Вы вышли из системы')
      router.push('/login')
    } catch {
      toast.error('Не удалось выполнить выход')
      setIsLoggingOut(false)
    }
  }

  const isActiveItem = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <nav className="theme-nav sticky top-0 z-50 hidden border-b shadow-lg md:block">
        <div className="mx-auto grid min-h-[82px] w-full max-w-[1780px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 xl:px-6">
          <Link href={logoHref} className="group flex shrink-0 items-center gap-3">
            <motion.span whileHover={{ rotate: 18, scale: 1.08 }} className="text-3xl">
              🍪
            </motion.span>
            <span className="text-xl font-bold text-white transition-colors group-hover:text-white/90">CookieLearn</span>
          </Link>

          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveItem(item.href)

              return (
                <Link key={item.href} href={item.href} className="shrink-0">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <div
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all xl:px-4 ${
                        isActive ? 'nav-item-active shadow-lg' : 'nav-item-idle'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="whitespace-nowrap font-medium">{item.label}</span>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-stretch">
            <div className="w-[152px] self-center">
              <Select value={theme} onValueChange={(value: AppTheme) => setTheme(value)}>
                <SelectTrigger className="nav-theme-trigger h-11">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <SelectValue>{themeLabels[theme]}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocean">Океан</SelectItem>
                  <SelectItem value="mint">Мята</SelectItem>
                  <SelectItem value="midnight">Ночь</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="nav-balance-chip flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">Баланс:</span>
              <span className="text-2xl font-bold text-white">{profile?.balance ?? 0}</span>
              <span className="text-2xl">🍪</span>
            </div>

            <Button onClick={handleLogout} disabled={isLoggingOut} variant="outline" className="nav-logout-btn shrink-0 gap-2 px-4">
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Выход...' : 'Выйти'}
            </Button>
          </div>
        </div>
      </nav>

      <nav className="theme-nav sticky top-0 z-50 border-b shadow-lg md:hidden">
        <div className="px-4">
          <div className="flex h-[72px] items-center justify-between gap-2">
            <Link href={logoHref} className="flex min-w-0 items-center gap-2">
              <span className="text-2xl">🍪</span>
              <span className="truncate text-lg font-bold text-white">CookieLearn</span>
            </Link>

            <div className="nav-balance-chip flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="text-lg font-bold text-white">{profile?.balance ?? 0}</span>
              <span className="text-lg">🍪</span>
            </div>

            <button
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="shrink-0 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Открыть меню"
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
              className="nav-mobile-panel"
            >
              <div className="space-y-2 px-4 py-4">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm text-white/90">
                    <Palette className="h-4 w-4" />
                    Тема: {themeLabels[theme]}
                  </div>
                  <Select value={theme} onValueChange={(value: AppTheme) => setTheme(value)}>
                    <SelectTrigger className="nav-theme-trigger h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocean">Океан</SelectItem>
                      <SelectItem value="mint">Мята</SelectItem>
                      <SelectItem value="midnight">Ночь</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isActiveItem(item.href)

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                          isActive ? 'nav-item-active shadow-lg' : 'nav-item-idle'
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
                  className="nav-mobile-logout flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all"
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

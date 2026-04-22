'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  Gift,
  Home,
  LogOut,
  Menu,
  Palette,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme, type AppTheme } from '@/components/theme-provider'
import { useProfile } from '@/lib/queries'
import { studentHubRouteAliases } from '@/lib/student-hub'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

type NavLinkItem = {
  type: 'link'
  href: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
}

type NavGroupItem = {
  type: 'group'
  label: string
  icon: LucideIcon
  items: NavLinkItem[]
}

type NavItem = NavLinkItem | NavGroupItem

const studentNavItems: NavItem[] = [
  { type: 'link', href: '/dashboard', label: 'Кабинет', icon: Home, matchPaths: studentHubRouteAliases },
  { type: 'link', href: '/shop', label: 'Магазин', icon: ShoppingBag },
  { type: 'link', href: '/materials', label: 'Материалы', icon: BookOpen },
  { type: 'link', href: '/tasks', label: 'Задания', icon: ClipboardList },
  { type: 'link', href: '/quiz', label: 'Викторина', icon: Sparkles },
  { type: 'link', href: '/leaderboard', label: 'Лидерборд', icon: Trophy },
  { type: 'link', href: '/survey', label: 'Анкета', icon: FileText },
]

const adminNavItems: NavItem[] = [
  { type: 'link', href: '/admin/stats', label: 'Статистика', icon: BarChart3 },
  { type: 'link', href: '/admin/leaderboard', label: 'Лидерборд', icon: Trophy },
  { type: 'link', href: '/shop', label: 'Магазин', icon: ShoppingBag },
  {
    type: 'group',
    label: 'Студенты',
    icon: Users,
    items: [
      { type: 'link', href: '/admin/students', label: 'База студентов', icon: Users },
      { type: 'link', href: '/admin/award', label: 'Начисления', icon: Gift },
    ],
  },
  {
    type: 'group',
    label: 'Контент',
    icon: BookOpen,
    items: [
      { type: 'link', href: '/admin/certificates', label: 'Сертификаты', icon: Shield },
      { type: 'link', href: '/admin/tasks', label: 'Задания', icon: ClipboardList },
      { type: 'link', href: '/admin/materials', label: 'Материалы', icon: BookOpen },
    ],
  },
  { type: 'link', href: '/admin/self-belief', label: 'Викторина', icon: Sparkles },
  { type: 'link', href: '/admin/surveys', label: 'Анкеты', icon: FileText },
]

const themeLabels: Record<AppTheme, string> = {
  ocean: 'Океан',
  mint: 'Мята',
  midnight: 'Ночь',
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
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

  const isActiveItem = (item: NavItem): boolean => {
    if (item.type === 'group') {
      return item.items.some((child) => isActiveItem(child))
    }

    const pathsToMatch = item.matchPaths?.length ? item.matchPaths : [item.href]
    return pathsToMatch.some((href) => isPathActive(pathname, href))
  }

  const renderLinkItem = (item: NavLinkItem) => {
    const Icon = item.icon
    const isActive = isActiveItem(item)

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
  }

  const renderGroupItem = (item: NavGroupItem) => {
    const Icon = item.icon
    const isActive = isActiveItem(item)

    return (
      <Popover key={item.label}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all xl:px-4 ${
              isActive ? 'nav-item-active shadow-lg' : 'nav-item-idle'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="whitespace-nowrap font-medium">{item.label}</span>
            <ChevronDown className="h-4 w-4 opacity-75" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={12}
          className="w-[280px] rounded-[1.4rem] border border-border/70 bg-popover/95 p-2 shadow-[0_30px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl"
        >
          <div className="px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
          </div>
          <div className="space-y-1">
            {item.items.map((child) => {
              const ChildIcon = child.icon
              const isChildActive = isActiveItem(child)

              return (
                <Link key={child.href} href={child.href}>
                  <div
                    className={`flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm transition-all ${
                      isChildActive ? 'bg-primary/10 text-card-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-card-foreground'
                    }`}
                  >
                    <ChildIcon className="h-4 w-4" />
                    <span className="font-medium">{child.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

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
            {navItems.map((item) => (item.type === 'group' ? renderGroupItem(item) : renderLinkItem(item)))}
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
          {mobileMenuOpen ? (
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
                  if (item.type === 'group') {
                    const GroupIcon = item.icon
                    const isGroupActive = isActiveItem(item)

                    return (
                      <div
                        key={item.label}
                        className={`rounded-xl p-2 transition-all ${isGroupActive ? 'bg-white/10' : 'bg-white/[0.04]'}`}
                      >
                        <div className="flex items-center gap-3 px-2 py-2 text-sm font-semibold text-white/85">
                          <GroupIcon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </div>
                        <div className="space-y-1">
                          {item.items.map((child) => {
                            const ChildIcon = child.icon
                            const isChildActive = isActiveItem(child)

                            return (
                              <Link key={child.href} href={child.href}>
                                <motion.div
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                                    isChildActive ? 'nav-item-active shadow-lg' : 'nav-item-idle'
                                  }`}
                                >
                                  <ChildIcon className="h-5 w-5" />
                                  <span className="font-medium">{child.label}</span>
                                </motion.div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  const Icon = item.icon
                  const isActive = isActiveItem(item)

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
          ) : null}
        </AnimatePresence>
      </nav>
    </>
  )
}

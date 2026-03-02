"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ShoppingBag, Award, History, Trophy, LogOut, Menu, X } from 'lucide-react'
import { useProfile } from '@/lib/queries'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/shop', label: 'Магазин', icon: ShoppingBag },
  { href: '/my-certificates', label: 'Сертификаты', icon: Award },
  { href: '/history', label: 'История', icon: History },
  { href: '/leaderboard', label: 'Лидерборд', icon: Trophy },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: profile } = useProfile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Закрываем мобильное меню при смене маршрута
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
    } catch (error) {
      toast.error('Ошибка при выходе')
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-lg border-b border-blue-400/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="text-3xl"
              >
                🍪
              </motion.div>
              <span className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors">
                CookieLearn
              </span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                      <div
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-blue-50 hover:bg-blue-500/50 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute -bottom-3 left-0 right-0 h-1 bg-white rounded-t-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              {/* Balance Display */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20"
              >
                <span className="text-white/80 text-sm font-medium">Баланс:</span>
                <span className="text-2xl font-bold text-white">{profile?.balance || 0}</span>
                <span className="text-2xl">🍪</span>
              </motion.div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white hover:text-blue-600 transition-all"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Выход...' : 'Выйти'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-lg border-b border-blue-400/20">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🍪</span>
              <span className="text-lg font-bold text-white">CookieLearn</span>
            </Link>

            {/* Balance */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <span className="text-lg font-bold text-white">{profile?.balance || 0}</span>
              <span className="text-lg">🍪</span>
            </div>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-blue-400/20 bg-blue-600"
            >
              <div className="px-4 py-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-blue-50 hover:bg-blue-500/50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  )
                })}

                {/* Mobile Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-50 hover:bg-red-500/50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
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

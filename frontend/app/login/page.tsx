'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, KeyRound, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { studentLoginToEmail } from '@/lib/student-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const email = studentLoginToEmail(login)
      if (!email) {
        throw new Error('Введите логин или email')
      }

      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw error
      }

      const fullName = data.user?.user_metadata?.full_name || data.user?.email || 'Пользователь'
      const role = data.user?.user_metadata?.role || 'student'
      const groupName = data.user?.user_metadata?.group_name

      await api.post('/api/auth/sync', {
        full_name: fullName,
        role,
        group_name: groupName,
      })

      toast.success('Добро пожаловать!')
      router.push(role === 'admin' ? '/admin/stats' : '/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden page-theme-gradient p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.22),transparent_30%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 p-8 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-3xl shadow-inner">🍪</div>
            <h1 className="text-3xl font-bold text-card-foreground">CookieLearn</h1>
            <p className="mt-2 text-sm text-muted-foreground">Войдите по логину и паролю, которые выдал преподаватель, чтобы продолжить работу</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login"
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  placeholder="Введите логин"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Введите пароль"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Войти
            </Button>
          </form>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-5 text-center text-sm text-muted-foreground"
        >
          CookieLearn © 2026
        </motion.p>
      </motion.div>
    </div>
  )
}

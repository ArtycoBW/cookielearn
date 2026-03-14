"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
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

      toast.success('Добро пожаловать! 🍪')
      if (role === 'admin') {
        router.push('/admin/stats')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center page-theme-gradient p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-8 text-center"
          >
            <div className="mb-4 text-6xl">🍪</div>
            <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-3xl font-bold text-transparent">CookieLearn</h1>
            <p className="mt-2 text-blue-600/70">Вход в систему</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="student@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Войти
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-blue-600/60">
            <p>Тестовый аккаунт:</p>
            <p className="mt-1 font-mono">student@test.com / password123</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-sm text-blue-600/50"
        >
          CookieLearn © 2026
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
            className="absolute text-4xl opacity-10"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 15}%`,
            }}
          >
            🍪
          </motion.div>
        ))}
      </div>
    </div>
  )
}


"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Добро пожаловать! 🍪')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">🍪</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              CookieLearn
            </h1>
            <p className="text-blue-600/70 mt-2">Вход в систему</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-blue-100 rounded-lg focus:border-blue-500 focus:outline-none transition-smooth"
                placeholder="student@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-blue-100 rounded-lg focus:border-blue-500 focus:outline-none transition-smooth"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Войти
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-blue-600/60">
            <p>Тестовый аккаунт:</p>
            <p className="font-mono mt-1">student@test.com / password123</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-sm text-blue-600/50"
        >
          CookieLearn © 2026 - Геймификация обучения
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

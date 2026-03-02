"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-6 text-8xl"
        >
          🍪
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-6xl font-bold text-transparent"
        >
          CookieLearn
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-2 text-2xl text-blue-600/80"
        >
          Геймификация обучения
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 max-w-md text-lg text-blue-900/60"
        >
          Зарабатывайте виртуальные печеньки за активность в учебе и обменивайте их на привилегии.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 flex justify-center gap-4"
        >
          <Link
            href="/login"
            className="hover-lift rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-smooth hover:bg-blue-700"
          >
            Войти
          </Link>

          <Dialog>
            <DialogTrigger asChild>
              <button className="rounded-lg border-2 border-blue-600 px-6 py-3 font-medium text-blue-600 transition-smooth hover:bg-blue-50">
                Узнать больше
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>О платформе CookieLearn</DialogTitle>
                <DialogDescription>
                  Небольшой обзор возможностей для студентов и преподавателей.
                </DialogDescription>
              </DialogHeader>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-3"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08, duration: 0.25 }}
                  className="rounded-lg bg-blue-50 p-3 text-blue-900/80"
                >
                  Получайте печеньки за активность, задания и ежедневные бонусы.
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.16, duration: 0.25 }}
                  className="rounded-lg bg-blue-50 p-3 text-blue-900/80"
                >
                  Обменивайте награды в магазине и отслеживайте операции в истории.
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.24, duration: 0.25 }}
                  className="rounded-lg bg-blue-50 p-3 text-blue-900/80"
                >
                  Соревнуйтесь в лидерборде и повышайте личный рейтинг.
                </motion.div>
              </motion.div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-20 top-20 text-6xl opacity-20"
        >
          🍪
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-20 text-6xl opacity-20"
        >
          🍪
        </motion.div>
      </div>
    </main>
  )
}

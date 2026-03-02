"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-8xl mb-6"
        >
          🍪
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
        >
          CookieLearn
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl text-blue-600/80 mb-2"
        >
          Геймификация обучения
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-lg text-blue-900/60 max-w-md"
        >
          Зарабатывайте виртуальные печеньки за активность в учёбе
          и обменивайте их на привилегии!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 flex gap-4 justify-center"
        >
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-smooth hover-lift"
          >
            Войти
          </Link>

          <Dialog>
            <DialogTrigger asChild>
              <button className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-smooth">
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
                  Обменивайте награды в магазине и отслеживайте покупки в истории.
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

      {/* Декоративные элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-20 text-6xl opacity-20"
        >
          🍪
        </motion.div>
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-20 right-20 text-6xl opacity-20"
        >
          🍪
        </motion.div>
      </div>
    </main>
  );
}

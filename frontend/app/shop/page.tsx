"use client"

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Lock, X } from 'lucide-react'
import { useBuyCertificate, useBuyRandomBonus, useCertificateBackground, useProfile, useShopCertificates } from '@/lib/queries'
import type { Certificate, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { toast } from 'sonner'

const RANDOM_BONUS_COST = 3
const WHEEL_PRIZES = [1, 2, 3, 4, 5]
const SEGMENT_ANGLE = 360 / WHEEL_PRIZES.length

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type ShopCertificateCardProps = {
  cert: Certificate
  index: number
  profile?: Profile
  isBuying: boolean
  onBuy: (certId: string, title: string, price: number) => void
}

function ShopCertificateCard({ cert, index, profile, isBuying, onBuy }: ShopCertificateCardProps) {
  const { data: backgroundData } = useCertificateBackground(cert.id, Boolean(cert.has_background))

  const backgroundImage = backgroundData?.background_image ?? cert.background_image ?? null
  const totalQuantity = cert.total_quantity ?? cert.remaining_quantity ?? null
  const remainingQuantity = totalQuantity == null ? null : cert.remaining_quantity ?? totalQuantity

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.06 }}>
      <Card className="relative flex h-full flex-col overflow-hidden">
        {backgroundImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={backgroundImage}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-card/70 backdrop-blur-[1.5px]" />
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col">
          <CardHeader>
            <div className="mb-2 flex items-start justify-between gap-2">
              <CardTitle className="text-lg">{cert.title}</CardTitle>
              {cert.remaining_quantity != null && cert.remaining_quantity < 5 && (
                <Badge variant="warning" className="shrink-0 whitespace-nowrap">
                  Осталось: {cert.remaining_quantity}
                </Badge>
              )}
            </div>
            <CardDescription>{cert.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex-grow">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600/70">Цена</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-900">{cert.current_price}</span>
                  <span className="text-2xl">🍪</span>
                </div>
              </div>

              {cert.inflation_step > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600/70">Рост цены</span>
                  <span className="font-medium text-blue-900">+{cert.inflation_step} 🍪</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600/70">Всего</span>
                <span className="font-medium text-blue-900">{totalQuantity == null ? 'Без лимита' : totalQuantity}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600/70">Осталось</span>
                <span className="font-medium text-blue-900">{remainingQuantity == null ? 'Без лимита' : remainingQuantity}</span>
              </div>

              {cert.expires_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600/70">Действует до</span>
                  <span className="font-medium text-blue-900">{new Date(cert.expires_at).toLocaleDateString('ru-RU')}</span>
                </div>
              )}

              {cert.validity_days && !cert.expires_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600/70">Срок действия</span>
                  <span className="font-medium text-blue-900">{cert.validity_days} дней</span>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={() => onBuy(cert.id, cert.title, cert.current_price)}
              isLoading={isBuying}
              disabled={!profile || profile.balance < cert.current_price}
              className="w-full"
            >
              {!profile || profile.balance < cert.current_price ? 'Недостаточно печенек' : 'Купить'}
            </Button>
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  )
}

export default function ShopPage() {
  const { data: certificates, isLoading } = useShopCertificates()
  const { data: profile } = useProfile()
  const buyCertificate = useBuyCertificate()
  const buyRandomBonus = useBuyRandomBonus()

  const [wheelRotation, setWheelRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isWheelOverlayOpen, setIsWheelOverlayOpen] = useState(false)
  const [lastReward, setLastReward] = useState<number | null>(null)
  const [lastCost, setLastCost] = useState<number | null>(null)
  const [wheelError, setWheelError] = useState<string | null>(null)

  const wheelGradient = useMemo(
    () =>
      'conic-gradient(from -90deg, #2563eb 0deg 72deg, #3b82f6 72deg 144deg, #60a5fa 144deg 216deg, #93c5fd 216deg 288deg, #1d4ed8 288deg 360deg)',
    [],
  )

  const handleBuy = async (certId: string, title: string, price: number) => {
    if (!profile || profile.balance < price) {
      toast.error('Недостаточно печенек!')
      return
    }

    try {
      await buyCertificate.mutateAsync(certId)

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
      })

      toast.success(`Сертификат "${title}" успешно куплен! 🎉`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const runWheelSpin = async () => {
    if (!profile || profile.balance < RANDOM_BONUS_COST) {
      toast.error('Недостаточно печенек для случайного бонуса')
      return
    }

    if (isSpinning) {
      return
    }

    setIsSpinning(true)
    setWheelError(null)

    try {
      const result = (await buyRandomBonus.mutateAsync(RANDOM_BONUS_COST)) as { reward: number; cost: number }
      const rewardIndex = WHEEL_PRIZES.findIndex((value) => value === result.reward)

      if (rewardIndex < 0) {
        throw new Error('Некорректный результат бонуса')
      }

      const targetAngle = 360 - (rewardIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)
      const currentAngle = ((wheelRotation % 360) + 360) % 360
      let delta = targetAngle - currentAngle
      if (delta < 0) {
        delta += 360
      }

      setWheelRotation((prev) => prev + 360 * 6 + delta)
      setLastReward(result.reward)
      setLastCost(result.cost)

      await sleep(4300)

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
      })

      toast.success(`Вы потратили ${result.cost} 🍪 и получили ${result.reward} 🍪`)
    } catch (error: any) {
      const message = error?.message || 'Ошибка вращения колеса'
      setWheelError(message)
      toast.error(message)
    } finally {
      setIsSpinning(false)
    }
  }

  const renderWheel = (size: number) => {
    const labelDistance = size * 0.36
    const labelFontSize = Math.max(20, Math.floor(size * 0.075))
    const pointerSide = Math.max(14, Math.floor(size * 0.05))
    const pointerHeight = Math.max(20, Math.floor(size * 0.08))
    const pointerOffset = Math.max(12, Math.floor(size * 0.04))
    const centerSize = Math.max(50, Math.floor(size * 0.2))

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute left-1/2 z-20 h-0 w-0 -translate-x-1/2"
          style={{
            top: -pointerOffset,
            borderLeft: `${pointerSide}px solid transparent`,
            borderRight: `${pointerSide}px solid transparent`,
            borderTop: `${pointerHeight}px solid white`,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
          }}
        />

        <div
          className="relative h-full w-full rounded-full border-4 border-white/70 shadow-2xl"
          style={{
            background: wheelGradient,
            transform: `rotate(${wheelRotation}deg)`,
            transition: isSpinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 1)' : undefined,
          }}
        >
          {WHEEL_PRIZES.map((prize, index) => {
            const angle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
            return (
              <div
                key={prize}
                className="absolute left-1/2 top-1/2 font-bold text-white"
                style={{
                  fontSize: labelFontSize,
                  transform: `rotate(${angle}deg) translateY(-${labelDistance}px) rotate(${-angle}deg)`,
                  transformOrigin: 'center',
                }}
              >
                {prize}
              </div>
            )
          })}

          <div
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 bg-blue-700/90"
            style={{ width: centerSize, height: centerSize }}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Магазин сертификатов</h1>
            <p className="text-blue-600/70">Обменивайте свои печеньки на привилегии</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white/95">
              <CardContent className="flex items-center gap-6 pt-6">
                <Lock className="h-8 w-8 shrink-0 text-white/60" />
                <div>
                  <p className="text-lg font-bold">Ежедневный бонус</p>
                  <p className="text-sm text-blue-100">Скоро будет доступно! Следите за обновлениями.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
            <Card hover={false} className="border border-border/60 bg-card/80">
              <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Как работает рост цены</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Если у сертификата указан рост цены, после каждой покупки его стоимость увеличивается на указанное число печенек.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Сколько сертификатов доступно</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    В карточке видно общий лимит и текущий остаток. Если лимит не задан, сертификат считается безлимитным.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl border border-blue-100 bg-white" />
              ))}
            </div>
          ) : certificates && certificates.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert, i) => (
                <ShopCertificateCard
                  key={cert.id}
                  cert={cert}
                  index={i}
                  profile={profile}
                  isBuying={buyCertificate.isPending && buyCertificate.variables === cert.id}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="mb-4 text-6xl">🛍️</div>
              <p className="text-xl text-blue-600/70">Сертификаты пока недоступны</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isWheelOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-blue-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.28 }}
              className="relative flex h-full w-full items-center justify-center p-6"
            >
              <div className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center rounded-3xl border border-white/20 bg-gradient-to-br from-blue-600 to-blue-500 p-6 text-white shadow-2xl">
                <button
                  className="absolute right-5 top-5 rounded-full bg-white/20 p-2 transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setIsWheelOverlayOpen(false)}
                  disabled={isSpinning}
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-center text-2xl font-bold md:text-4xl">Колесо случайного бонуса</h2>
                <p className="mt-2 text-center text-sm text-blue-100 md:text-lg">Заплатите {RANDOM_BONUS_COST} 🍪 и получите от 1 до 5 🍪</p>

                <div className="mt-8">{renderWheel(430)}</div>

                <div className="mt-8 flex flex-col items-center gap-4">
                  <div className="text-lg font-semibold md:text-2xl">
                    {isSpinning
                      ? 'Колесо крутится...'
                      : wheelError
                        ? `Ошибка: ${wheelError}`
                        : lastReward == null
                          ? 'Готово к запуску'
                          : `Выигрыш: +${lastReward} 🍪`}
                  </div>

                  {!isSpinning && lastReward != null && lastCost != null && (
                    <p className="text-blue-100">Потрачено: {lastCost} 🍪</p>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      onClick={runWheelSpin}
                      disabled={!profile || profile.balance < RANDOM_BONUS_COST || isSpinning}
                      className="bg-white text-blue-700 hover:bg-blue-50"
                    >
                      {isSpinning ? 'Крутится...' : 'Крутить еще раз'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsWheelOverlayOpen(false)}
                      disabled={isSpinning}
                      className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

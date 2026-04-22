'use client'

import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Info } from 'lucide-react'
import NextImage from 'next/image'
import { useBuyCertificate, useCertificateBackground, useProfile, useShopCertificates } from '@/lib/queries'
import type { Certificate, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { toast } from 'sonner'

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
            <NextImage
              src={backgroundImage}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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

      toast.success(`Сертификат "${title}" успешно куплен!`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Магазин сертификатов</h1>
            <p className="text-blue-600/70">Обменивайте свои печеньки на привилегии и полезные бонусы курса.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
            <Card hover={false} className="border border-border/60 bg-card/80">
              <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    Как работает рост цены
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Если у сертификата указан рост цены, после каждой покупки его стоимость увеличивается на указанное число печенек.
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    Сколько сертификатов доступно
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    В карточке видно общий лимит и текущий остаток. Если лимит не задан, сертификат считается безлимитным.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-xl border border-blue-100 bg-white" />
              ))}
            </div>
          ) : certificates && certificates.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert, index) => (
                <ShopCertificateCard
                  key={cert.id}
                  cert={cert}
                  index={index}
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
    </>
  )
}

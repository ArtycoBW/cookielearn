"use client"

import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useShopCertificates, useBuyCertificate, useProfile } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { toast } from 'sonner'

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
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe']
      })
      
      toast.success(`Сертификат "${title}" успешно куплен! 🎉`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-7xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-blue-900 mb-2">
              Магазин сертификатов 🛍️
            </h1>
            <p className="text-blue-600/70">
              Обменяйте свои печеньки на привилегии
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-white rounded-xl border border-blue-100 animate-pulse" />
              ))}
            </div>
          ) : certificates && certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert, i) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg">{cert.title}</CardTitle>
                        {cert.remaining_quantity !== null && cert.remaining_quantity < 5 && (
                          <Badge variant="warning">
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
                            <span className="text-blue-900 font-medium">+{cert.inflation_step} 🍪</span>
                          </div>
                        )}

                        {cert.validity_days && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-600/70">Срок действия</span>
                            <span className="text-blue-900 font-medium">{cert.validity_days} дней</span>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        onClick={() => handleBuy(cert.id, cert.title, cert.current_price)}
                        isLoading={buyCertificate.isPending}
                        disabled={!profile || profile.balance < cert.current_price}
                        className="w-full"
                      >
                        {!profile || profile.balance < cert.current_price ? 
                          'Недостаточно печенек' : 
                          'Купить'
                        }
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛍️</div>
              <p className="text-xl text-blue-600/70">Сертификаты пока недоступны</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

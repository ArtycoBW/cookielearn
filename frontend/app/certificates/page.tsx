'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMyCertificates, useUseCertificate } from '@/lib/queries'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

export default function CertificatesPage() {
  const { data: certificates, isLoading } = useMyCertificates()
  const useCertificate = useUseCertificate()
  const [usingId, setUsingId] = useState<string | null>(null)

  const handleUse = async (purchaseId: string) => {
    setUsingId(purchaseId)

    try {
      await useCertificate.mutateAsync(purchaseId)

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#3b82f6', '#60a5fa'],
      })

      toast.success('Сертификат отмечен как использованный')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось использовать сертификат')
    } finally {
      setUsingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="border-green-500/30 bg-green-500/20 text-green-700">Активен</Badge>
      case 'used':
        return <Badge className="border-gray-500/30 bg-gray-500/20 text-gray-700">Использован</Badge>
      case 'expired':
        return <Badge className="border-red-500/30 bg-red-500/20 text-red-700">Истек</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-5 w-5 text-green-600" />
      case 'used':
        return <CheckCircle2 className="h-5 w-5 text-gray-600" />
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-blue-900">Мои сертификаты</h1>
            <p className="mt-2 text-blue-600/70">Покупки, сроки действия и текущие статусы</p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl border border-blue-100 bg-white" />
              ))}
            </div>
          ) : !certificates || certificates.length === 0 ? (
            <Card className="bg-white p-12 text-center">
              <div className="mb-4 text-6xl">🎫</div>
              <h2 className="mb-2 text-2xl font-semibold text-blue-900">У вас пока нет сертификатов</h2>
              <p className="mb-6 text-blue-600/70">Посетите магазин, чтобы приобрести сертификаты</p>
              <Link href="/shop">
                <Button>Перейти в магазин</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Card className="h-full bg-white p-6">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(cert.status)}
                        <h3 className="text-xl font-bold text-blue-900">{cert.certificate?.title}</h3>
                      </div>
                      {getStatusBadge(cert.status)}
                    </div>

                    <p className="mb-4 line-clamp-2 text-blue-600/70">{cert.certificate?.description}</p>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-blue-600/70">
                        <Calendar className="h-4 w-4" />
                        <span>Куплен: {formatDate(cert.purchased_at)}</span>
                      </div>
                      {cert.expires_at && (
                        <div className="flex items-center gap-2 text-sm text-blue-600/70">
                          <Clock className="h-4 w-4" />
                          <span>Действителен до: {formatDate(cert.expires_at)}</span>
                        </div>
                      )}
                      {cert.used_at && (
                        <div className="flex items-center gap-2 text-sm text-blue-600/70">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Использован: {formatDate(cert.used_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-blue-100 pt-4">
                      <div className="mb-3 text-sm text-blue-600/70">
                        Стоимость: <span className="font-semibold text-blue-600">{cert.price_paid} 🍪</span>
                      </div>
                      {cert.status === 'active' && (
                        <Button onClick={() => handleUse(cert.id)} disabled={usingId === cert.id} className="w-full">
                          {usingId === cert.id ? 'Использование...' : 'Использовать'}
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-green-200 bg-green-50 p-6">
              <div className="text-3xl font-bold text-green-600">{certificates?.filter((c) => c.status === 'active').length || 0}</div>
              <div className="text-blue-900">Активных</div>
            </Card>
            <Card className="border-gray-200 bg-gray-50 p-6">
              <div className="text-3xl font-bold text-gray-600">{certificates?.filter((c) => c.status === 'used').length || 0}</div>
              <div className="text-blue-900">Использовано</div>
            </Card>
            <Card className="border-red-200 bg-red-50 p-6">
              <div className="text-3xl font-bold text-red-600">{certificates?.filter((c) => c.status === 'expired').length || 0}</div>
              <div className="text-blue-900">Истекло</div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}


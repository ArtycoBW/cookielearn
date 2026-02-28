'use client'

import { useState } from 'react'
import { useMyCertificates, useUseCertificate } from '@/lib/queries'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'

export default function CertificatesPage() {
  const { data: certificates, isLoading } = useMyCertificates()
  const useCertificate = useUseCertificate()
  const [usingId, setUsingId] = useState<string | null>(null)

  const handleUse = async (purchaseId: string) => {
    setUsingId(purchaseId)
    try {
      await useCertificate.mutateAsync(purchaseId)
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      })
    } finally {
      setUsingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Активен</Badge>
      case 'used':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">Использован</Badge>
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Истёк</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-5 h-5 text-green-600" />
      case 'used':
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
          <div className="text-blue-900 text-xl">Загрузка сертификатов...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-blue-900">Мои сертификаты</h1>
          </div>

          {!certificates || certificates.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <div className="text-6xl mb-4">🎫</div>
              <h2 className="text-2xl font-semibold text-blue-900 mb-2">
                У вас пока нет сертификатов
              </h2>
              <p className="text-blue-600/70 mb-6">
                Посетите магазин, чтобы приобрести сертификаты
              </p>
              <Link href="/shop">
                <Button>Перейти в магазин</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert, index) => (
                <Card
                  key={cert.id}
                  className="p-6 hover:scale-[1.02] transition-all duration-300 bg-white"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fade-in 0.5s ease-out forwards'
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(cert.status)}
                      <h3 className="text-xl font-bold text-blue-900">
                        {cert.certificate?.title}
                      </h3>
                    </div>
                    {getStatusBadge(cert.status)}
                  </div>

                  <p className="text-blue-600/70 mb-4 line-clamp-2">
                    {cert.certificate?.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-blue-600/70">
                      <Calendar className="w-4 h-4" />
                      <span>Куплен: {formatDate(cert.purchased_at)}</span>
                    </div>
                    {cert.expires_at && (
                      <div className="flex items-center gap-2 text-sm text-blue-600/70">
                        <Clock className="w-4 h-4" />
                        <span>Действителен до: {formatDate(cert.expires_at)}</span>
                      </div>
                    )}
                    {cert.used_at && (
                      <div className="flex items-center gap-2 text-sm text-blue-600/70">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Использован: {formatDate(cert.used_at)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <div className="text-sm text-blue-600/70 mb-3">
                      Стоимость: <span className="text-blue-600 font-semibold">{cert.price_paid} 🍪</span>
                    </div>
                    {cert.status === 'active' && (
                      <Button
                        onClick={() => handleUse(cert.id)}
                        disabled={usingId === cert.id}
                        className="w-full"
                      >
                        {usingId === cert.id ? 'Использование...' : 'Использовать'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-green-50 border-green-200">
              <div className="text-3xl font-bold text-green-600">
                {certificates?.filter(c => c.status === 'active').length || 0}
              </div>
              <div className="text-blue-900">Активных</div>
            </Card>
            <Card className="p-6 bg-gray-50 border-gray-200">
              <div className="text-3xl font-bold text-gray-600">
                {certificates?.filter(c => c.status === 'used').length || 0}
              </div>
              <div className="text-blue-900">Использовано</div>
            </Card>
            <Card className="p-6 bg-red-50 border-red-200">
              <div className="text-3xl font-bold text-red-600">
                {certificates?.filter(c => c.status === 'expired').length || 0}
              </div>
              <div className="text-blue-900">Истекло</div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

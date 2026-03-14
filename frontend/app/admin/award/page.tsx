"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminStudents, useAwardCookies } from '@/lib/queries'
import { toast } from 'sonner'

export default function AdminAwardPage() {
  const { data: students, isLoading } = useAdminStudents()
  const awardCookies = useAwardCookies()

  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState(1)
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('manual')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await awardCookies.mutateAsync({ user_id: userId, amount, reason, category })
      toast.success('Начисление выполнено')
      setReason('')
      setAmount(1)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Начисления и списания</h1>
            <p className="text-blue-600/70">Ручные операции с балансом студентов</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader>
                <CardTitle>Создать транзакцию</CardTitle>
                <CardDescription>
                  Укажите студента, тип операции и количество печенек. Для списания используйте отрицательное значение в поле суммы.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="student">Студент</Label>
                      <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
                        <SelectTrigger id="student">
                          <SelectValue placeholder="Выберите студента" />
                        </SelectTrigger>
                        <SelectContent>
                          {students?.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.full_name} ({student.balance} 🍪)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Категория</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Ручное начисление</SelectItem>
                          <SelectItem value="task_reward">Награда за задание</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Сумма (в печеньках)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="Например: 5 или -3"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Причина операции</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Например: бонус за активность на семинаре"
                        className="min-h-[44px]"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" isLoading={awardCookies.isPending} disabled={!userId}>
                    Применить
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}


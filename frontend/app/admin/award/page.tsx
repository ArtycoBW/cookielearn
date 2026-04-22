'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminPurchaseHistory,
  useAdminStudents,
  useAdminTransactionHistory,
  useAwardCookies,
} from '@/lib/queries'
import { badgeIconOptions } from '@/lib/player-progress'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

function categoryLabel(category?: string | null) {
  switch (category) {
    case 'daily_bonus':
      return 'Ежедневный бонус'
    case 'purchase':
      return 'Покупка сертификата'
    case 'random_bonus':
      return 'Случайный бонус'
    case 'survey_reward':
      return 'Награда за анкету'
    case 'task_reward':
      return 'Награда за задание'
    case 'self_belief_quiz':
      return 'Верю в себя'
    case 'manual':
    default:
      return 'Ручная операция'
  }
}

export default function AdminAwardPage() {
  const { data: students, isLoading: studentsLoading } = useAdminStudents()
  const { data: transactionHistory, isLoading: historyLoading } = useAdminTransactionHistory()
  const { data: purchaseHistory, isLoading: purchaseLoading } = useAdminPurchaseHistory()
  const awardCookies = useAwardCookies()

  const [selectedGroup, setSelectedGroup] = useState('')
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState(1)
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('manual')
  const [badgeIcon, setBadgeIcon] = useState('')
  const [badgeTitle, setBadgeTitle] = useState('')

  const [historySearch, setHistorySearch] = useState('')
  const [historyMode, setHistoryMode] = useState<'all' | 'income' | 'expense'>('all')
  const [historyGroup, setHistoryGroup] = useState('all')

  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [purchaseGroup, setPurchaseGroup] = useState('all')

  const studentList = useMemo(() => students ?? [], [students])
  const groupOptions = useMemo(
    () =>
      Array.from(new Set(studentList.map((student) => (student.group_name || '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'ru'),
      ),
    [studentList],
  )

  const studentsInGroup = useMemo(
    () =>
      studentList
        .filter((student) => (student.group_name || '').trim() === selectedGroup)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru')),
    [selectedGroup, studentList],
  )

  const filteredHistory = useMemo(() => {
    const items = transactionHistory ?? []
    const query = historySearch.trim().toLowerCase()

    return items.filter((item) => {
      const matchesGroup = historyGroup === 'all' || (item.user_group_name || '').trim() === historyGroup
      const matchesMode =
        historyMode === 'all' ||
        (historyMode === 'income' && item.amount > 0) ||
        (historyMode === 'expense' && item.amount < 0)
      const matchesSearch =
        query.length === 0 ||
        item.user_full_name.toLowerCase().includes(query) ||
        (item.user_login || '').toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query)

      return matchesGroup && matchesMode && matchesSearch
    })
  }, [transactionHistory, historySearch, historyMode, historyGroup])

  const filteredPurchases = useMemo(() => {
    const items = purchaseHistory ?? []
    const query = purchaseSearch.trim().toLowerCase()

    return items.filter((item) => {
      const matchesGroup = purchaseGroup === 'all' || (item.user_group_name || '').trim() === purchaseGroup
      const matchesSearch =
        query.length === 0 ||
        item.user_full_name.toLowerCase().includes(query) ||
        (item.user_login || '').toLowerCase().includes(query) ||
        item.certificate_title.toLowerCase().includes(query)

      return matchesGroup && matchesSearch
    })
  }, [purchaseHistory, purchaseSearch, purchaseGroup])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await awardCookies.mutateAsync({
        user_id: userId,
        amount,
        reason,
        category,
        badge_icon: badgeIcon || undefined,
        badge_title: badgeTitle.trim() || undefined,
      })
      toast.success('Операция сохранена')
      setReason('')
      setAmount(1)
      setUserId('')
      setBadgeIcon('')
      setBadgeTitle('')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать операцию')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-4xl font-bold text-blue-900">Начисления и история операций</h1>
            <p className="max-w-3xl text-blue-600/80">
              Здесь видно, кому и когда были начислены печеньки, кто что купил в магазине и когда студент заходил в систему в последний раз.
            </p>
          </motion.div>

          <Tabs defaultValue="operate" className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-3 md:gap-0">
              <TabsTrigger value="operate">Ручная операция</TabsTrigger>
              <TabsTrigger value="history">История печенек</TabsTrigger>
              <TabsTrigger value="purchases">Покупки сертификатов</TabsTrigger>
            </TabsList>

            <TabsContent value="operate">
              <Card>
                <CardHeader>
                  <CardTitle>Создать транзакцию</CardTitle>
                  <CardDescription>
                    Сначала выберите группу, затем студента. Для списания используйте отрицательное значение суммы.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="group">Группа</Label>
                        <Select
                          value={selectedGroup}
                          onValueChange={(value) => {
                            setSelectedGroup(value)
                            setUserId('')
                          }}
                          disabled={studentsLoading}
                        >
                          <SelectTrigger id="group">
                            <SelectValue placeholder="Сначала выберите группу" />
                          </SelectTrigger>
                          <SelectContent>
                            {groupOptions.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student">Студент</Label>
                        <Select value={userId} onValueChange={setUserId} disabled={studentsLoading || !selectedGroup}>
                          <SelectTrigger id="student">
                            <SelectValue placeholder={selectedGroup ? 'Выберите студента' : 'Сначала выберите группу'} />
                          </SelectTrigger>
                          <SelectContent>
                            {studentsInGroup.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name} ({student.balance} 🍪)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="category">Категория</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Ручное начисление</SelectItem>
                            <SelectItem value="task_reward">Награда за задание</SelectItem>
                            <SelectItem value="survey_reward">Награда за анкету</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Сумма</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={amount}
                          onChange={(event) => setAmount(Number(event.target.value))}
                          placeholder="Например: 5 или -3"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Причина</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Например: бонус за активность на занятии"
                        className="min-h-[96px]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="badge-icon">Иконка бейджа</Label>
                        <Select value={badgeIcon || 'none'} onValueChange={(value) => setBadgeIcon(value === 'none' ? '' : value)}>
                          <SelectTrigger id="badge-icon">
                            <SelectValue placeholder="Без бейджа" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без бейджа</SelectItem>
                            {badgeIconOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.value} {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="badge-title">Название бейджа</Label>
                        <Input
                          id="badge-title"
                          value={badgeTitle}
                          onChange={(event) => setBadgeTitle(event.target.value)}
                          placeholder="Например: За активность"
                          disabled={!badgeIcon}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      isLoading={awardCookies.isPending}
                      disabled={!userId || !selectedGroup || (Boolean(badgeIcon) && badgeTitle.trim().length === 0)}
                    >
                      Сохранить операцию
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>История начислений и списаний</CardTitle>
                  <CardDescription>Здесь видны все движения по печенькам, включая ручные начисления, награды и траты.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={historySearch}
                        onChange={(event) => setHistorySearch(event.target.value)}
                        placeholder="Поиск по студенту, логину или причине"
                        className="pl-10"
                      />
                    </div>

                    <Select value={historyGroup} onValueChange={setHistoryGroup}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все группы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все группы</SelectItem>
                        {groupOptions.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={historyMode} onValueChange={(value) => setHistoryMode(value as typeof historyMode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все операции" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все операции</SelectItem>
                        <SelectItem value="income">Только начисления</SelectItem>
                        <SelectItem value="expense">Только списания</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {historyLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl bg-secondary/70" />
                      ))}
                    </div>
                  ) : filteredHistory.length > 0 ? (
                    <div className="space-y-3">
                      {filteredHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-card-foreground">{item.user_full_name}</span>
                                {item.user_login && (
                                  <Badge variant="default" className="font-mono">
                                    {item.user_login}
                                  </Badge>
                                )}
                                {item.user_group_name && <Badge>{item.user_group_name}</Badge>}
                                {item.badge_icon && item.badge_title && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/75 px-2.5 py-1 text-xs text-card-foreground">
                                    <span>{item.badge_icon}</span>
                                    <span>{item.badge_title}</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-card-foreground">{item.reason}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{formatDateTime(item.created_at)}</span>
                                <span>{categoryLabel(item.category)}</span>
                                {item.created_by_name && <span>Администратор: {item.created_by_name}</span>}
                              </div>
                            </div>

                            <div
                              className={`inline-flex min-w-[110px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                                item.amount >= 0
                                  ? 'bg-emerald-500/10 text-emerald-700'
                                  : 'bg-rose-500/10 text-rose-700'
                              }`}
                            >
                              {item.amount > 0 ? '+' : ''}
                              {item.amount} 🍪
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-12 text-center text-muted-foreground">
                      История по текущим фильтрам не найдена.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="purchases">
              <Card>
                <CardHeader>
                  <CardTitle>Кто и что купил в магазине</CardTitle>
                  <CardDescription>Отдельный журнал покупок сертификатов с датой, стоимостью и текущим статусом.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={purchaseSearch}
                        onChange={(event) => setPurchaseSearch(event.target.value)}
                        placeholder="Поиск по студенту, логину или сертификату"
                        className="pl-10"
                      />
                    </div>

                    <Select value={purchaseGroup} onValueChange={setPurchaseGroup}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все группы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все группы</SelectItem>
                        {groupOptions.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {purchaseLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl bg-secondary/70" />
                      ))}
                    </div>
                  ) : filteredPurchases.length > 0 ? (
                    <div className="space-y-3">
                      {filteredPurchases.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-card-foreground">{item.user_full_name}</span>
                                {item.user_login && (
                                  <Badge variant="default" className="font-mono">
                                    {item.user_login}
                                  </Badge>
                                )}
                                {item.user_group_name && <Badge>{item.user_group_name}</Badge>}
                              </div>

                              <p className="text-sm text-card-foreground">{item.certificate_title}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{formatDateTime(item.purchased_at)}</span>
                                <span>Статус: {item.status === 'used' ? 'использован' : item.status === 'expired' ? 'истёк' : 'активен'}</span>
                                {item.expires_at && <span>До {formatDateTime(item.expires_at)}</span>}
                              </div>
                            </div>

                            <div className="inline-flex min-w-[130px] items-center justify-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                              -{item.price_paid} 🍪
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-12 text-center text-muted-foreground">
                      Покупки по текущим фильтрам не найдены.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

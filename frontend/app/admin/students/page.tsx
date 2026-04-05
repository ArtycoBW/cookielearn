'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import { Copy, FileSpreadsheet, FileText, KeyRound, Search, Sparkles, UserPlus, Users2 } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminAccounts,
  useAdminStudents,
  useBulkImportStudents,
  useCreateStudent,
  useDeleteStudent,
  useRegisterStudent,
  useUpdateStudent,
} from '@/lib/queries'
import { generateLoginFromFullName } from '@/lib/student-auth'
import type { AccountCredential, Profile, StudentAccount } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

function generatePassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

type ParsedStudent = {
  last_name: string
  first_name: string
  middle_name?: string
}

type StudentSortKey = 'full_name' | 'login' | 'group_name' | 'last_login_at' | 'balance'
type SortDirection = 'asc' | 'desc'
type StudentSort = {
  key: StudentSortKey
  direction: SortDirection
}

function formatStudentName(student: ParsedStudent) {
  return [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' ')
}

function normalizeImportedLine(line: string) {
  return line
    .replace(/\t+/g, ' ')
    .replace(/^\s*\d+\s*[.)-]?\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTextList(text: string): ParsedStudent[] {
  const lines = text.split('\n').map(normalizeImportedLine).filter(Boolean)
  const parsed: ParsedStudent[] = []

  for (const line of lines) {
    const abbreviatedMatch = line.match(/^([\p{L}-]+)\s+([\p{L}])\.?\s*([\p{L}])?\.?$/u)
    if (abbreviatedMatch) {
      parsed.push({
        last_name: abbreviatedMatch[1],
        first_name: `${abbreviatedMatch[2]}.`,
        middle_name: abbreviatedMatch[3] ? `${abbreviatedMatch[3]}.` : undefined,
      })
      continue
    }

    const parts = line.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      parsed.push({
        last_name: parts[0],
        first_name: parts[1],
        middle_name: parts.slice(2).join(' ') || undefined,
      })
    }
  }

  return parsed
}

function exportRowsToXlsx(rows: (string | number)[][], fileName: string, sheetName: string) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, fileName)
}

function exportRowsToCsv(rows: (string | number)[][], fileName: string) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

async function copyText(value: string, successMessage: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    toast.success(successMessage)
  } catch {
    toast.error('Не удалось скопировать данные')
  }
}

export default function AdminStudentsPage() {
  const { data: accountCredentials, isLoading: isAccountsLoading } = useAdminAccounts()
  const { data: students, isLoading } = useAdminStudents()
  const createStudent = useCreateStudent()
  const registerStudent = useRegisterStudent()
  const bulkImportStudents = useBulkImportStudents()
  const updateStudent = useUpdateStudent()
  const deleteStudent = useDeleteStudent()

  const [newId, setNewId] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')

  const [registerLogin, setRegisterLogin] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerFullName, setRegisterFullName] = useState('')
  const [registerGroupName, setRegisterGroupName] = useState('')
  const [isLoginTouched, setIsLoginTouched] = useState(false)

  const [bulkGroupName, setBulkGroupName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([])
  const [importedAccounts, setImportedAccounts] = useState<StudentAccount[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [studentSort, setStudentSort] = useState<StudentSort>({ key: 'full_name', direction: 'asc' })
  const [editing, setEditing] = useState<Record<string, { full_name: string; group_name: string }>>({})
  const [activeEditId, setActiveEditId] = useState<string | null>(null)

  const studentList = useMemo(() => students ?? [], [students])
  const studentCount = studentList.length

  const groupOptions = useMemo(() => {
    return Array.from(new Set(studentList.map((student) => (student.group_name || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ru'),
    )
  }, [studentList])

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = studentList.filter((student) => {
      const matchesSearch =
        query.length === 0 ||
        student.full_name.toLowerCase().includes(query) ||
        (student.group_name || '').toLowerCase().includes(query) ||
        (student.login || '').toLowerCase().includes(query)

      const matchesGroup = groupFilter === 'all' || (student.group_name || '').trim() === groupFilter

      return matchesSearch && matchesGroup
    })

    const direction = studentSort.direction === 'asc' ? 1 : -1

    return [...filtered].sort((left, right) => {
      switch (studentSort.key) {
        case 'login':
          return ((left.login || '').localeCompare(right.login || '', 'ru') || left.full_name.localeCompare(right.full_name, 'ru')) * direction
        case 'group_name':
          return ((left.group_name || '').localeCompare(right.group_name || '', 'ru') || left.full_name.localeCompare(right.full_name, 'ru')) * direction
        case 'last_login_at': {
          const leftTime = left.last_login_at ? new Date(left.last_login_at).getTime() : 0
          const rightTime = right.last_login_at ? new Date(right.last_login_at).getTime() : 0
          return ((leftTime - rightTime) || left.full_name.localeCompare(right.full_name, 'ru')) * direction
        }
        case 'balance':
          return ((left.balance - right.balance) || left.full_name.localeCompare(right.full_name, 'ru')) * direction
        case 'full_name':
        default:
          return left.full_name.localeCompare(right.full_name, 'ru') * direction
      }
    })
  }, [studentList, searchQuery, groupFilter, studentSort])

  const previewLogins = parsedStudents.slice(0, 5).map((student) => ({
    name: formatStudentName(student),
    login: generateLoginFromFullName(formatStudentName(student)),
  }))

  const importedAccountRows = useMemo<(string | number)[][]>(
    () => [
      ['ФИО', 'Логин', 'Email', 'Пароль'],
      ...importedAccounts.map((account) => [account.full_name, account.login, account.email, account.password]),
    ],
    [importedAccounts],
  )

  const credentialRows = useMemo<(string | number)[][]>(
    () => [
      ['Роль', 'ФИО', 'Группа', 'Логин', 'Email', 'Пароль'],
      ...(accountCredentials ?? []).map((account) => [
        account.role,
        account.full_name,
        account.group_name || '',
        account.login || '',
        account.email,
        account.password,
      ]),
    ],
    [accountCredentials],
  )

  const handleRegisterNameChange = (value: string) => {
    setRegisterFullName(value)
    if (!isLoginTouched) {
      setRegisterLogin(generateLoginFromFullName(value))
    }
  }

  const handleGeneratePassword = () => {
    setRegisterPassword(generatePassword())
  }

  const handleCreateByID = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createStudent.mutateAsync({
        id: newId.trim(),
        full_name: newFullName.trim(),
        group_name: newGroupName.trim() || undefined,
      })

      toast.success('Студент добавлен по UUID')
      setNewId('')
      setNewFullName('')
      setNewGroupName('')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать профиль')
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await registerStudent.mutateAsync({
        login: registerLogin.trim(),
        password: registerPassword.trim(),
        full_name: registerFullName.trim(),
        group_name: registerGroupName.trim() || undefined,
      })

      setImportedAccounts([result.account])
      setRegisterLogin('')
      setRegisterPassword('')
      setRegisterFullName('')
      setRegisterGroupName('')
      setIsLoginTouched(false)
      toast.success('Аккаунт студента создан')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать аккаунт')
    }
  }

  const handleBulkTextChange = (text: string) => {
    setBulkText(text)
    setParsedStudents(parseTextList(text))
  }

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!parsedStudents.length) {
      toast.error('Сначала вставьте список студентов')
      return
    }

    try {
      const result = await bulkImportStudents.mutateAsync({
        group_name: bulkGroupName.trim() || undefined,
        students: parsedStudents,
      })

      setImportedAccounts(result.accounts)
      setBulkText('')
      setParsedStudents([])
      toast.success(`Импортировано студентов: ${result.created_count}`)
    } catch (error: any) {
      toast.error(error.message || 'Ошибка импорта')
    }
  }

  const handleExportAccounts = (format: 'csv' | 'xlsx') => {
    if (!importedAccounts.length) {
      return
    }

    if (format === 'csv') {
      exportRowsToCsv(importedAccountRows, 'student_accounts.csv')
      toast.success('CSV с логинами выгружен')
      return
    }

    exportRowsToXlsx(importedAccountRows, 'student_accounts.xlsx', 'Аккаунты')
    toast.success('XLSX с логинами выгружен')
  }

  const handleExportCredentialTable = (format: 'csv' | 'xlsx') => {
    if (!accountCredentials?.length) {
      return
    }

    if (format === 'csv') {
      exportRowsToCsv(credentialRows, 'account_credentials.csv')
      toast.success('CSV с учётными данными выгружен')
      return
    }

    exportRowsToXlsx(credentialRows, 'account_credentials.xlsx', 'Учётные данные')
    toast.success('XLSX с учётными данными выгружен')
  }

  const handleStartEdit = (student: Profile) => {
    setEditing((prev) => ({
      ...prev,
      [student.id]: {
        full_name: student.full_name,
        group_name: student.group_name || '',
      },
    }))
    setActiveEditId(student.id)
  }

  const handleCancelEdit = (id: string) => {
    setEditing((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setActiveEditId((current) => (current === id ? null : current))
  }

  const handleSave = async (id: string) => {
    const row = editing[id]
    if (!row) {
      return
    }

    try {
      await updateStudent.mutateAsync({
        id,
        full_name: row.full_name.trim(),
        group_name: row.group_name.trim() || undefined,
      })

      toast.success('Профиль обновлён')
      handleCancelEdit(id)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось сохранить изменения')
    }
  }

  const handleDelete = async (student: Profile) => {
    const confirmed = window.confirm(`Удалить студента ${student.full_name} и его пользователя из Supabase Auth?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteStudent.mutateAsync(student.id)
      if (activeEditId === student.id) {
        handleCancelEdit(student.id)
      }
      toast.success('Студент удалён вместе с учётной записью')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить студента')
    }
  }

  const toggleStudentSort = (key: StudentSortKey) => {
    setStudentSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return {
        key,
        direction: key === 'last_login_at' || key === 'balance' ? 'desc' : 'asc',
      }
    })
  }

  const getSortLabel = (key: StudentSortKey) => {
    if (studentSort.key !== key) {
      return 'Сортировать'
    }

    return studentSort.direction === 'asc' ? 'По возрастанию' : 'По убыванию'
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <Badge variant="default" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Admin Panel
            </Badge>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-blue-900">Управление студентами</h1>
                <p className="mt-2 max-w-2xl text-blue-600/80">
                  Создавайте рабочие логины, импортируйте группы списком и управляйте профилями без ручной возни с почтами.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Студентов</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{studentCount}</div>
                </Card>
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Групп</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{groupOptions.length}</div>
                </Card>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Card>
              <CardContent>
                <Tabs defaultValue="create" className="w-full space-y-4">
                  <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-3 md:gap-0">
                    <TabsTrigger value="create">Добавление</TabsTrigger>
                    <TabsTrigger value="students">Студенты</TabsTrigger>
                    <TabsTrigger value="accounts">Учётные данные</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xl font-bold text-card-foreground">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Добавление студентов
                      </div>
                      <p className="max-w-3xl text-sm text-muted-foreground">
                        Для логина используем короткую форму вроде `ivanov.ii`. Формат списка из Excel тоже поддерживается, включая строки
                        вида `Ацатрян А. С.` и нумерацию в начале.
                      </p>
                    </div>

                    <Tabs defaultValue="register" className="w-full">
                      <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-3 md:gap-0">
                        <TabsTrigger value="register">Создать аккаунт</TabsTrigger>
                        <TabsTrigger value="uuid">Привязать UUID</TabsTrigger>
                        <TabsTrigger value="bulk">Импорт списком</TabsTrigger>
                      </TabsList>

                      <TabsContent value="register">
                        <form onSubmit={handleCreateAccount} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="register-name">ФИО</Label>
                            <Input
                              id="register-name"
                              value={registerFullName}
                              onChange={(e) => handleRegisterNameChange(e.target.value)}
                              placeholder="Иванов Иван Иванович"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-login">Логин</Label>
                            <Input
                              id="register-login"
                              value={registerLogin}
                              onChange={(e) => {
                                setRegisterLogin(e.target.value)
                                setIsLoginTouched(true)
                              }}
                              placeholder="ivanov.ii"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-password">Пароль</Label>
                            <div className="flex gap-2">
                              <Input
                                id="register-password"
                                type="text"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                placeholder="Минимум 6 символов"
                                required
                              />
                              <Button type="button" variant="outline" onClick={handleGeneratePassword} className="shrink-0 px-3">
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-group">Группа</Label>
                            <Input
                              id="register-group"
                              value={registerGroupName}
                              onChange={(e) => setRegisterGroupName(e.target.value)}
                              placeholder="ИВТ-401"
                            />
                          </div>

                          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                            <Button type="submit" isLoading={registerStudent.isPending}>
                              <UserPlus className="h-4 w-4" />
                              Создать аккаунт
                            </Button>
                            <p className="text-sm text-muted-foreground">
                              Если логин не трогать, он будет сгенерирован автоматически. Точки и инициалы в ФИО сохраняются как введены.
                            </p>
                          </div>
                        </form>
                      </TabsContent>

                      <TabsContent value="uuid">
                        <form onSubmit={handleCreateByID} className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="uuid-id">UUID пользователя</Label>
                            <Input
                              id="uuid-id"
                              value={newId}
                              onChange={(e) => setNewId(e.target.value)}
                              placeholder="ID из auth.users"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="uuid-name">ФИО</Label>
                            <Input
                              id="uuid-name"
                              value={newFullName}
                              onChange={(e) => setNewFullName(e.target.value)}
                              placeholder="Иванов И. И."
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="uuid-group">Группа</Label>
                            <Input
                              id="uuid-group"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              placeholder="ИВТ-401"
                            />
                          </div>

                          <div className="md:col-span-4">
                            <Button type="submit" isLoading={createStudent.isPending}>
                              Добавить профиль
                            </Button>
                          </div>
                        </form>
                      </TabsContent>

                      <TabsContent value="bulk">
                        <form onSubmit={handleBulkImport} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="bulk-text">Список студентов</Label>
                            <Textarea
                              id="bulk-text"
                              value={bulkText}
                              onChange={(e) => handleBulkTextChange(e.target.value)}
                              placeholder={'Ацатрян А. С.\nБезмолитвенный В. В.\n12 Гончаров Д. Р.\nПетров Пётр Петрович'}
                              className="min-h-[180px] font-mono"
                            />
                            <p className="text-sm text-muted-foreground">
                              Поддерживаются форматы `Фамилия И. О.`, `Фамилия И.О.`, `Фамилия Имя Отчество` и строки с номером в начале.
                            </p>
                          </div>

                          {parsedStudents.length > 0 && (
                            <div className="rounded-2xl border border-border/60 bg-secondary/45 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="font-semibold text-card-foreground">Распознано: {parsedStudents.length}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {previewLogins.map((item) => `${item.name} → ${item.login}`).join(' · ')}
                                    {parsedStudents.length > previewLogins.length ? ' · …' : ''}
                                  </p>
                                </div>
                                <Badge variant="default">Точки в инициалах будут сохранены</Badge>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 md:max-w-sm">
                            <Label htmlFor="bulk-group">Группа для всего списка</Label>
                            <Input
                              id="bulk-group"
                              value={bulkGroupName}
                              onChange={(e) => setBulkGroupName(e.target.value)}
                              placeholder="ИВТ-401"
                            />
                          </div>

                          <Button type="submit" isLoading={bulkImportStudents.isPending} disabled={!parsedStudents.length}>
                            <Users2 className="h-4 w-4" />
                            Импортировать список
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>

                    {importedAccounts.length > 0 && (
                      <div className="space-y-4 rounded-3xl border border-border/60 bg-secondary/35 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-card-foreground">Созданные аккаунты</p>
                            <p className="text-sm text-muted-foreground">Логины уже готовы для входа студентов.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => handleExportAccounts('csv')} variant="outline" size="sm">
                              <FileText className="h-4 w-4" />
                              CSV
                            </Button>
                            <Button onClick={() => handleExportAccounts('xlsx')} variant="outline" size="sm">
                              <FileSpreadsheet className="h-4 w-4" />
                              XLSX
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {importedAccounts.map((account) => (
                            <div key={account.id} className="rounded-2xl bg-card/70 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="font-semibold text-card-foreground">{account.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{account.email}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <Badge variant="default">Логин: {account.login || '—'}</Badge>
                                  <Badge variant="success">Пароль: {account.password}</Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => copyText(`Логин: ${account.login || '—'}\nПароль: ${account.password}`, 'Логин и пароль скопированы')}
                                  >
                                    <Copy className="h-4 w-4" />
                                    Скопировать
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="students" className="space-y-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div>
                        <p className="text-xl font-bold text-card-foreground">Список студентов</p>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                          Отдельный компактный список с логином, балансом, сортировкой и редактированием только там, где это нужно.
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground">Найдено: {filteredStudents.length}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:min-w-[760px]">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по ФИО, логину или группе"
                            className="pl-10"
                          />
                        </div>

                        <Select value={groupFilter} onValueChange={setGroupFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Фильтр по группе" />
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
                    </div>

                    {isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={index} className="h-16 animate-pulse rounded-2xl bg-secondary/65" />
                        ))}
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card/55">
                        <div className="min-w-[1120px]">
                          <div className="grid grid-cols-[minmax(240px,2fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_minmax(190px,1.15fr)_minmax(130px,0.8fr)_minmax(170px,0.95fr)] gap-4 border-b border-border/40 px-5 py-3">
                            {[
                              ['full_name', 'ФИО'],
                              ['login', 'Логин'],
                              ['group_name', 'Группа'],
                              ['last_login_at', 'Последний вход'],
                              ['balance', 'Печеньки'],
                            ].map(([key, label]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleStudentSort(key as StudentSortKey)}
                                className={`inline-flex items-center justify-start rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  studentSort.key === key
                                    ? 'border-primary/30 bg-primary/10 text-primary'
                                    : 'border-border/60 bg-card/70 text-muted-foreground hover:bg-secondary/40'
                                }`}
                                title={getSortLabel(key as StudentSortKey)}
                              >
                                {label}
                                <span className="ml-2 text-[11px]">
                                  {studentSort.key === key ? (studentSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                                </span>
                              </button>
                            ))}
                            <div className="flex items-center justify-end">
                              <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                Без сортировки
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-[minmax(240px,2fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_minmax(190px,1.15fr)_minmax(130px,0.8fr)_minmax(170px,0.95fr)] gap-4 border-b border-border/40 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <div>ФИО</div>
                            <div>Логин</div>
                            <div>Группа</div>
                            <div>Последний вход</div>
                            <div>Печеньки</div>
                            <div className="text-right">Действия</div>
                          </div>

                          <div className="divide-y divide-border/35">
                            {filteredStudents.map((student) => {
                              const row = editing[student.id] ?? {
                                full_name: student.full_name,
                                group_name: student.group_name || '',
                              }
                              const isEditing = activeEditId === student.id

                              return (
                                <div
                                  key={student.id}
                                  className="grid grid-cols-[minmax(240px,2fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_minmax(190px,1.15fr)_minmax(130px,0.8fr)_minmax(170px,0.95fr)] items-center gap-4 px-5 py-3 transition-colors hover:bg-secondary/20"
                                >
                                  <div className="min-w-0">
                                    {isEditing ? (
                                      <Input
                                        value={row.full_name}
                                        onChange={(e) =>
                                          setEditing((prev) => ({
                                            ...prev,
                                            [student.id]: { ...row, full_name: e.target.value },
                                          }))
                                        }
                                        className="h-9 border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                      />
                                    ) : (
                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-card-foreground" title={student.full_name}>
                                          {student.full_name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                          {student.level_name && <Badge variant="default">{student.level_name}</Badge>}
                                          {student.badges?.slice(0, 2).map((badge) => (
                                            <span
                                              key={badge.id}
                                              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/75 px-2.5 py-1 text-xs text-card-foreground"
                                              title={badge.reason}
                                            >
                                              <span>{badge.icon}</span>
                                              <span>{badge.title}</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 font-mono text-sm text-card-foreground/90" title={student.login || '—'}>
                                    <span className="block truncate">{student.login || '—'}</span>
                                  </div>

                                  <div className="min-w-0">
                                    {isEditing ? (
                                      <Input
                                        value={row.group_name}
                                        onChange={(e) =>
                                          setEditing((prev) => ({
                                            ...prev,
                                            [student.id]: { ...row, group_name: e.target.value },
                                          }))
                                        }
                                        placeholder="ИВТ-401"
                                        className="h-9 border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                      />
                                    ) : (
                                      <p className="truncate text-sm text-muted-foreground" title={student.group_name || '—'}>
                                        {student.group_name || '—'}
                                      </p>
                                    )}
                                  </div>

                                  <div className="min-w-0 text-sm text-muted-foreground">
                                    {student.last_login_at ? (
                                      <span className="block truncate" title={formatDateTime(student.last_login_at)}>
                                        {formatDateTime(student.last_login_at)}
                                      </span>
                                    ) : (
                                      <span>Не заходил</span>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="inline-flex min-w-[86px] items-center justify-center rounded-full bg-secondary/55 px-3 py-1.5 text-sm font-semibold text-card-foreground">
                                      {student.balance} 🍪
                                    </div>
                                    <div className="text-xs text-muted-foreground">Всего: {student.total_earned ?? 0} 🍪</div>
                                  </div>

                                  <div className="ml-auto grid w-full max-w-[170px] grid-cols-2 gap-2">
                                    {isEditing ? (
                                      <>
                                        <Button size="sm" onClick={() => handleSave(student.id)} isLoading={updateStudent.isPending} className="w-full">
                                          Сохранить
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(student.id)} className="w-full">
                                          Отмена
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit(student)} className="w-full">
                                          Изменить
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDelete(student)}
                                          disabled={deleteStudent.isPending}
                                          className="w-full"
                                        >
                                          Удалить
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-14 text-center text-muted-foreground">
                        По текущим фильтрам студенты не найдены.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="accounts" className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xl font-bold text-card-foreground">Таблица профилей с логином и паролем</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Здесь лежат сохранённые учётные данные всех аккаунтов, созданных через админку.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCredentialTable('csv')}
                          disabled={!accountCredentials?.length}
                        >
                          <FileText className="h-4 w-4" />
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCredentialTable('xlsx')}
                          disabled={!accountCredentials?.length}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          XLSX
                        </Button>
                      </div>
                    </div>

                    {isAccountsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="h-16 animate-pulse rounded-2xl bg-secondary/80" />
                        ))}
                      </div>
                    ) : accountCredentials && accountCredentials.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl border border-border/70">
                        <div className="min-w-[1080px]">
                          <div className="grid grid-cols-6 gap-px bg-border/60 text-sm">
                            <div className="bg-card px-4 py-3 font-semibold text-card-foreground">Роль</div>
                            <div className="bg-card px-4 py-3 font-semibold text-card-foreground">ФИО</div>
                            <div className="bg-card px-4 py-3 font-semibold text-card-foreground">Группа</div>
                            <div className="bg-card px-4 py-3 font-semibold text-card-foreground">Логин</div>
                            <div className="bg-card px-4 py-3 font-semibold text-card-foreground">Email</div>
                            <div className="bg-card px-4 py-3 font-semibold text-card-foreground">Пароль</div>
                          </div>

                          {accountCredentials.map((account: AccountCredential) => (
                            <div key={account.user_id} className="grid grid-cols-6 gap-px border-t border-border/70 bg-border/40 text-sm">
                              <div className="min-w-0 bg-card px-4 py-3">
                                <Badge variant={account.role === 'admin' ? 'warning' : 'default'}>
                                  {account.role === 'admin' ? 'admin' : 'student'}
                                </Badge>
                              </div>
                              <div className="min-w-0 bg-card px-4 py-3 text-card-foreground" title={account.full_name}>
                                <span className="block truncate">{account.full_name}</span>
                              </div>
                              <div className="min-w-0 bg-card px-4 py-3 text-muted-foreground" title={account.group_name || '—'}>
                                <span className="block truncate">{account.group_name || '—'}</span>
                              </div>
                              <div className="min-w-0 bg-card px-4 py-3 font-mono text-card-foreground" title={account.login || '—'}>
                                <span className="block truncate">{account.login || '—'}</span>
                              </div>
                              <div className="min-w-0 bg-card px-4 py-3 font-mono text-muted-foreground" title={account.email}>
                                <span className="block truncate">{account.email}</span>
                              </div>
                              <div className="min-w-0 bg-card px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 truncate font-mono text-card-foreground" title={account.password}>
                                    {account.password}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 shrink-0 px-2"
                                    title="Скопировать логин и пароль"
                                    onClick={() =>
                                      copyText(`Логин: ${account.login || '—'}\nПароль: ${account.password}`, 'Логин и пароль скопированы')
                                    }
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/35 px-6 py-10 text-center text-muted-foreground">
                        Учётных данных пока нет.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}


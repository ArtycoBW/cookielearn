"use client"

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Search, UploadCloud } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useAdminStudents,
  useBulkImportStudents,
  useCreateStudent,
  useDeleteStudent,
  useRegisterStudent,
  useUpdateStudent,
} from '@/lib/queries'
import type { StudentAccount } from '@/lib/types'
import { toast } from 'sonner'

type ParsedStudent = {
  last_name: string
  first_name: string
  middle_name?: string
}

export default function AdminStudentsPage() {
  const { data: students, isLoading } = useAdminStudents()
  const createStudent = useCreateStudent()
  const registerStudent = useRegisterStudent()
  const bulkImportStudents = useBulkImportStudents()
  const updateStudent = useUpdateStudent()
  const deleteStudent = useDeleteStudent()

  const [newId, setNewId] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')

  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerFullName, setRegisterFullName] = useState('')
  const [registerGroupName, setRegisterGroupName] = useState('')

  const [bulkGroupName, setBulkGroupName] = useState('')
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('')
  const [bulkFileName, setBulkFileName] = useState('')
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([])
  const [importedAccounts, setImportedAccounts] = useState<StudentAccount[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [editing, setEditing] = useState<Record<string, { full_name: string; group_name: string }>>({})

  const studentCount = useMemo(() => students?.length ?? 0, [students])

  const groupOptions = useMemo(() => {
    if (!students) {
      return []
    }

    return Array.from(new Set(students.map((student) => (student.group_name || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ru'),
    )
  }, [students])

  const filteredStudents = useMemo(() => {
    if (!students) {
      return []
    }

    const q = searchQuery.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        q.length === 0 ||
        student.full_name.toLowerCase().includes(q) ||
        (student.group_name || '').toLowerCase().includes(q)

      const studentGroup = (student.group_name || '').trim()
      const matchesGroup = groupFilter === 'all' || studentGroup === groupFilter

      return matchesSearch && matchesGroup
    })
  }, [students, searchQuery, groupFilter])

  const handleCreateByID = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createStudent.mutateAsync({
        id: newId.trim(),
        full_name: newFullName.trim(),
        group_name: newGroupName.trim() || undefined,
      })

      toast.success('Студент добавлен')
      setNewId('')
      setNewFullName('')
      setNewGroupName('')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleCreateFromSite = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await registerStudent.mutateAsync({
        email: registerEmail.trim(),
        password: registerPassword,
        full_name: registerFullName.trim(),
        group_name: registerGroupName.trim() || undefined,
      })

      toast.success('Аккаунт студента создан')
      setImportedAccounts([result.account])
      setRegisterEmail('')
      setRegisterPassword('')
      setRegisterFullName('')
      setRegisterGroupName('')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const parseXlsxFile = async (file: File) => {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const rows = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
    })

    const parsed: ParsedStudent[] = []
    rows.forEach((row, index) => {
      const lastName = String(row[0] ?? '').trim()
      const firstName = String(row[1] ?? '').trim()
      const middleName = String(row[2] ?? '').trim()

      if (!lastName && !firstName && !middleName) {
        return
      }

      const firstRowLooksLikeHeader =
        index === 0 &&
        (lastName.toLowerCase().includes('фам') || firstName.toLowerCase().includes('имя') || middleName.toLowerCase().includes('отч'))

      if (firstRowLooksLikeHeader) {
        return
      }

      if (!lastName || !firstName) {
        return
      }

      parsed.push({
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName || undefined,
      })
    })

    return parsed
  }

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const parsed = await parseXlsxFile(file)
      if (!parsed.length) {
        toast.error('В файле не найдено валидных строк')
        return
      }

      setBulkFileName(file.name)
      setParsedStudents(parsed)
      setImportedAccounts([])
      toast.success(`Файл загружен: ${parsed.length} студентов`)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось прочитать файл')
    }
  }

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!parsedStudents.length) {
      toast.error('Сначала загрузите XLSX-файл')
      return
    }

    try {
      const result = await bulkImportStudents.mutateAsync({
        group_name: bulkGroupName.trim() || undefined,
        default_password: bulkDefaultPassword.trim() || undefined,
        students: parsedStudents,
      })

      toast.success(`Импортировано студентов: ${result.created_count}`)
      setImportedAccounts(result.accounts)
      setParsedStudents([])
      setBulkFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleSave = async (id: string) => {
    const row = editing[id]
    if (!row) {
      return
    }

    try {
      await updateStudent.mutateAsync({
        id,
        full_name: row.full_name,
        group_name: row.group_name || undefined,
      })
      toast.success('Профиль обновлен')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent.mutateAsync(id)
      toast.success('Студент удален')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Управление студентами</h1>
            <p className="text-blue-600/70">Всего студентов: {studentCount}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader>
                <CardTitle>Добавление студентов</CardTitle>
                <CardDescription>
                  Можно создавать аккаунты сразу из панели, привязывать существующие UUID или загружать группу массово через XLSX.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="register" className="w-full">
                  <TabsList>
                    <TabsTrigger value="register">Создать аккаунт</TabsTrigger>
                    <TabsTrigger value="uuid">Привязать UUID</TabsTrigger>
                    <TabsTrigger value="bulk">Импорт XLSX</TabsTrigger>
                  </TabsList>

                  <TabsContent value="register">
                    <form onSubmit={handleCreateFromSite} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="student@example.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password">Пароль</Label>
                        <Input
                          id="register-password"
                          type="text"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-name">ФИО</Label>
                        <Input
                          id="register-name"
                          value={registerFullName}
                          onChange={(e) => setRegisterFullName(e.target.value)}
                          placeholder="Иванов Иван Иванович"
                          required
                        />
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

                      <Button type="submit" isLoading={registerStudent.isPending} className="md:col-span-2 md:w-fit">
                        Создать с сайта
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="uuid">
                    <form onSubmit={handleCreateByID} className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="space-y-2">
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
                          placeholder="Иванов Иван Иванович"
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

                      <div className="flex items-end">
                        <Button type="submit" isLoading={createStudent.isPending} className="w-full">
                          Добавить
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="bulk">
                    <form onSubmit={handleBulkImport} className="space-y-4">
                      <input
                        ref={fileInputRef}
                        id="bulk-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleBulkFileChange}
                        className="hidden"
                      />

                      <div
                        className="rounded-xl border border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-white p-4 md:p-5"
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            fileInputRef.current?.click()
                          }
                        }}
                      >
                        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-600/10 p-2 text-blue-700">
                              <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-blue-900">XLSX-файл группы</p>
                              <p className="text-sm text-blue-700/70">Столбцы: Фамилия, Имя, Отчество</p>
                            </div>
                          </div>

                          <Button type="button" variant="outline" className="gap-2">
                            <UploadCloud className="h-4 w-4" />
                            {bulkFileName ? 'Заменить файл' : 'Выбрать файл'}
                          </Button>
                        </div>

                        <div className="mt-3 rounded-lg bg-blue-100/60 px-3 py-2 text-sm text-blue-900">
                          {bulkFileName ? `Выбран файл: ${bulkFileName}` : 'Файл пока не выбран'}
                          {parsedStudents.length > 0 ? ` • Подготовлено записей: ${parsedStudents.length}` : ''}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="bulk-group">Группа для всего списка</Label>
                          <Input
                            id="bulk-group"
                            value={bulkGroupName}
                            onChange={(e) => setBulkGroupName(e.target.value)}
                            placeholder="ИВТ-401"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bulk-password">Пароль по умолчанию (опционально)</Label>
                          <Input
                            id="bulk-password"
                            value={bulkDefaultPassword}
                            onChange={(e) => setBulkDefaultPassword(e.target.value)}
                            placeholder="Если пусто — сгенерируется"
                          />
                        </div>
                      </div>

                      {parsedStudents.length > 0 && (
                        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                          <p className="font-medium">Превью:</p>
                          <p className="text-blue-700/80">
                            {parsedStudents
                              .slice(0, 3)
                              .map((student) => [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' '))
                              .join(' • ')}
                            {parsedStudents.length > 3 ? ' • ...' : ''}
                          </p>
                        </div>
                      )}

                      <Button type="submit" isLoading={bulkImportStudents.isPending} disabled={!parsedStudents.length}>
                        Импортировать список
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {importedAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Созданные аккаунты</CardTitle>
                <CardDescription>Сохраните эти данные для входа студентов.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {importedAccounts.map((account) => (
                    <div key={account.id} className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                      {account.full_name} • {account.email} • пароль: {account.password}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card>
              <CardHeader>
                <CardTitle>Список студентов</CardTitle>
                <CardDescription className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500/70" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по ФИО или группе"
                        className="pl-9"
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

                  <p className="text-sm text-blue-600/80">Найдено: {filteredStudents.length}</p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-blue-50" />
                    ))}
                  </div>
                ) : filteredStudents.length > 0 ? (
                  <div className="space-y-3">
                    {filteredStudents.map((student, index) => {
                      const row = editing[student.id] ?? {
                        full_name: student.full_name,
                        group_name: student.group_name || '',
                      }

                      return (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="rounded-lg bg-blue-50 p-4"
                        >
                          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-5">
                            <Input
                              value={row.full_name}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [student.id]: { ...row, full_name: e.target.value },
                                }))
                              }
                            />
                            <Input
                              value={row.group_name}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [student.id]: { ...row, group_name: e.target.value },
                                }))
                              }
                            />
                            <div className="font-semibold text-blue-900">{student.balance} 🍪</div>
                            <Button onClick={() => handleSave(student.id)} isLoading={updateStudent.isPending}>
                              Сохранить
                            </Button>
                            <Button variant="outline" onClick={() => handleDelete(student.id)} disabled={deleteStudent.isPending}>
                              Удалить
                            </Button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-blue-600/70">По текущим фильтрам студенты не найдены</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}


export const predefinedTaskTypeOptions = [
  { value: 'feedback', label: 'Замечание по материалам' },
  { value: 'sql', label: 'SQL' },
  { value: 'meme', label: 'Мем' },
] as const

export type PredefinedTaskType = (typeof predefinedTaskTypeOptions)[number]['value']

export function isPredefinedTaskType(value?: string | null): value is PredefinedTaskType {
  return predefinedTaskTypeOptions.some((option) => option.value === value)
}

export function resolveTaskTypeLabel(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) {
    return 'Другое'
  }

  const predefined = predefinedTaskTypeOptions.find((option) => option.value === normalized)
  return predefined?.label ?? normalized
}

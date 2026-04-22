const STUDENT_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'student.cookielearn.local'

export function getStudentEmailDomain() {
  return STUDENT_EMAIL_DOMAIN
}

export function transliterateRussian(value: string): string {
  return Array.from(value.toLowerCase())
    .map((char) => {
      switch (char) {
        case 'а': return 'a'
        case 'б': return 'b'
        case 'в': return 'v'
        case 'г': return 'g'
        case 'д': return 'd'
        case 'е': return 'e'
        case 'ё': return 'yo'
        case 'ж': return 'zh'
        case 'з': return 'z'
        case 'и': return 'i'
        case 'й': return 'y'
        case 'к': return 'k'
        case 'л': return 'l'
        case 'м': return 'm'
        case 'н': return 'n'
        case 'о': return 'o'
        case 'п': return 'p'
        case 'р': return 'r'
        case 'с': return 's'
        case 'т': return 't'
        case 'у': return 'u'
        case 'ф': return 'f'
        case 'х': return 'kh'
        case 'ц': return 'ts'
        case 'ч': return 'ch'
        case 'ш': return 'sh'
        case 'щ': return 'shch'
        case 'ъ': return ''
        case 'ы': return 'y'
        case 'ь': return ''
        case 'э': return 'e'
        case 'ю': return 'yu'
        case 'я': return 'ya'
        default: return char
      }
    })
    .join('')
}

export function sanitizeLogin(value: string): string {
  const normalized = transliterateRussian(value).trim().toLowerCase()
  let result = ''
  let prevWasSeparator = false

  for (const char of normalized) {
    if ((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9')) {
      result += char
      prevWasSeparator = false
      continue
    }

    if (char === '.' || char === '_' || char === '-') {
      if (!prevWasSeparator && result.length > 0) {
        result += char
        prevWasSeparator = true
      }
      continue
    }

    if (/\s/.test(char)) {
      if (!prevWasSeparator && result.length > 0) {
        result += '.'
        prevWasSeparator = true
      }
    }
  }

  return result.replace(/^[._-]+|[._-]+$/g, '')
}

export function generateLoginFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return ''
  }

  const lastName = sanitizeLogin(parts[0])
  const initials = parts.slice(1).map((part) => sanitizeLogin(part.charAt(0))).join('')

  return sanitizeLogin(initials ? `${lastName}.${initials}` : lastName)
}

export function extractLoginFromEmail(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return ''
  }

  return sanitizeLogin(trimmed.includes('@') ? trimmed.split('@')[0] : trimmed)
}

export function studentLoginToEmail(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return ''
  }

  if (trimmed.includes('@')) {
    return trimmed
  }

  const login = sanitizeLogin(trimmed)
  return login ? `${login}@${STUDENT_EMAIL_DOMAIN}` : ''
}

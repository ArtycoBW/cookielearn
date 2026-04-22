export const CORGI_NAME = 'Корги Дуров'

export type CorgiAnswerPlan = {
  selectedOption: number
  isCorrect: boolean
  revealAfterMs: number
}

function hashFNV32(value: string) {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash >>> 0
}

export function buildCorgiAnswerPlan(
  attemptId: string,
  questionId: string,
  position: number,
  correctOption: number,
  optionCount: number,
): CorgiAnswerPlan {
  if (optionCount <= 1) {
    return {
      selectedOption: correctOption,
      isCorrect: true,
      revealAfterMs: 2200,
    }
  }

  const baseAccuracy = 46 + (hashFNV32(attemptId) % 11)
  const seed = hashFNV32(`${attemptId}:${questionId}:${position}`)
  const isCorrect = seed % 100 < baseAccuracy
  const revealAfterMs = (2 + Math.floor((seed / 29) % 6)) * 1000

  if (isCorrect) {
    return {
      selectedOption: correctOption,
      isCorrect: true,
      revealAfterMs,
    }
  }

  const wrongOptions = Array.from({ length: optionCount }, (_, index) => index).filter((index) => index !== correctOption)
  const selectedOption = wrongOptions[Math.floor((seed / 97) % wrongOptions.length)] ?? 0

  return {
    selectedOption,
    isCorrect: false,
    revealAfterMs,
  }
}

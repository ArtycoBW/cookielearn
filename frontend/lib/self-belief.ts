export const selfBeliefWagerOptions = [
  {
    value: 1,
    label: '1 печенька',
    shortLabel: 'Разминка',
    description: 'Спокойный вход в матч, чтобы поймать ритм и не рисковать лишним.',
  },
  {
    value: 3,
    label: '3 печеньки',
    shortLabel: 'Основной матч',
    description: 'Сбалансированный заход: уже интересно, но без слишком жесткого давления.',
  },
  {
    value: 5,
    label: '5 печенек',
    shortLabel: 'Высокий риск',
    description: 'Ставка для тех, кто готов идти ва-банк и обыгрывать Корги Дурова по-крупному.',
  },
] as const

export function resolveSelfBeliefWagerLabel(wager: number) {
  return selfBeliefWagerOptions.find((item) => item.value === wager)?.label ?? `${wager} печенек`
}

export function formatSelfBeliefNetReward(value: number) {
  if (value > 0) {
    return `+${value}`
  }

  return `${value}`
}

export function resolveSelfBeliefOutcomeLabel(outcome: 'win' | 'draw' | 'lose') {
  switch (outcome) {
    case 'win':
      return 'Победа'
    case 'draw':
      return 'Ничья'
    case 'lose':
      return 'Поражение'
    default:
      return outcome
  }
}

export function resolveSelfBeliefOutcomeCopy(outcome: 'win' | 'draw' | 'lose') {
  switch (outcome) {
    case 'win':
      return 'Вы прошли тест лучше, чем Корги Дуров, и забрали матч.'
    case 'draw':
      return 'Ничья. Корги Дуров удержал темп, но и вы не уступили.'
    case 'lose':
      return 'В этот раз Корги Дуров оказался сильнее. Можно взять реванш новым заходом.'
    default:
      return ''
  }
}

import { Fragment, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RichTextProps = {
  text?: string | null
  className?: string
}

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

function renderInline(text: string): ReactNode[] {
  const tokenPattern =
    /(\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|(?:https?:\/\/|mailto:)[^\s<]+|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g

  const parts = text.split(tokenPattern).filter(Boolean)

  return parts.map((part, index) => {
    const markdownLink = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)$/)
    if (markdownLink) {
      const [, label, href] = markdownLink
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline decoration-primary/35 underline-offset-4 break-all hover:text-primary/80"
        >
          {label}
        </a>
      )
    }

    if (/^(?:https?:\/\/|mailto:)/.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline decoration-primary/35 underline-offset-4 break-all hover:text-primary/80"
        >
          {part}
        </a>
      )
    }

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-secondary/80 px-1.5 py-0.5 text-[0.95em] text-card-foreground">
          {part.slice(1, -1)}
        </code>
      )
    }

    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }

    return <Fragment key={index}>{part}</Fragment>
  })
}

export function RichText({ text, className }: RichTextProps) {
  if (!text?.trim()) {
    return null
  }

  const normalizedText = text.replace(/\r\n/g, '\n')
  const lines = normalizedText.split('\n')

  const blocks: Block[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphBuffer.join('\n') })
      paragraphBuffer = []
    }
  }

  const flushList = () => {
    if (listBuffer && listBuffer.items.length > 0) {
      blocks.push({ type: 'list', ordered: listBuffer.ordered, items: listBuffer.items })
      listBuffer = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const headingMatch = line.match(/^\s*(#{1,3})\s+(.*)$/)
    const unorderedListMatch = line.match(/^\s*[-*]\s+(.*)$/)
    const orderedListMatch = line.match(/^\s*\d+\.\s+(.*)$/)

    if (headingMatch) {
      flushParagraph()
      flushList()

      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      })
      continue
    }

    if (unorderedListMatch) {
      flushParagraph()
      if (!listBuffer || listBuffer.ordered) {
        flushList()
        listBuffer = { ordered: false, items: [] }
      }
      listBuffer.items.push(unorderedListMatch[1])
      continue
    }

    if (orderedListMatch) {
      flushParagraph()
      if (!listBuffer || !listBuffer.ordered) {
        flushList()
        listBuffer = { ordered: true, items: [] }
      }
      listBuffer.items.push(orderedListMatch[1])
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    flushList()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()

  return (
    <div className={cn('space-y-4 text-sm leading-7 text-inherit', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h2 key={index} className="text-[1.75rem] font-semibold leading-tight text-card-foreground">
                {renderInline(block.text)}
              </h2>
            )
          }

          if (block.level === 2) {
            return (
              <h3 key={index} className="text-xl font-semibold leading-tight text-card-foreground">
                {renderInline(block.text)}
              </h3>
            )
          }

          return (
            <h4 key={index} className="text-lg font-semibold leading-tight text-card-foreground">
              {renderInline(block.text)}
            </h4>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag
              key={index}
              className={cn(
                'space-y-2 pl-6',
                block.ordered ? 'list-decimal marker:text-card-foreground/70' : 'list-disc marker:text-primary',
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ListTag>
          )
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}

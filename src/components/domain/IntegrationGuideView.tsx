import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Terminal } from 'lucide-react'
import { CopyButton } from '@/components/ui/Controls'

interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: { className?: string[] | string }
  children?: HastNode[]
}

function textOf(node?: HastNode): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  return (node.children ?? []).map(textOf).join('')
}

function languageOf(node?: HastNode): string | undefined {
  const code = node?.children?.find((child) => child.tagName === 'code')
  const classes = code?.properties?.className
  const list = Array.isArray(classes) ? classes : classes ? [classes] : []
  return list.find((c) => c.startsWith('language-'))?.slice('language-'.length)
}

const components: Components = {
  h2: ({ node: _node, ...props }) => (
    <h2 className="mt-6 border-b border-line pb-2 text-[1rem] font-semibold tracking-tight text-ink first:mt-0" {...props} />
  ),
  h3: ({ node: _node, ...props }) => <h3 className="mt-4 text-[0.875rem] font-semibold text-ink" {...props} />,
  p: ({ node: _node, ...props }) => <p className="leading-relaxed" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="flex list-disc flex-col gap-1 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="flex list-decimal flex-col gap-1 pl-5" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-ink" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a className="font-medium text-accent hover:underline" target="_blank" rel="noopener" {...props} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-[0.8125rem]" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="border-b border-line bg-inset/60 px-3 py-2 font-medium whitespace-nowrap text-ink" {...props} />
  ),
  td: ({ node: _node, ...props }) => <td className="border-b border-line px-3 py-2 align-top last:border-b-0" {...props} />,
  code: ({ node: _node, className, children, ...props }) =>
    className?.startsWith('language-') ? (
      <code className={className} {...props}>{children}</code>
    ) : (
      <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[0.75rem] text-ink" {...props}>
        {children}
      </code>
    ),
  // Cada bloque de código trae su botón de copiar: es lo que se va a pegar en una terminal o
  // en el código del sistema que se integra.
  pre: ({ node, children }) => {
    const code = textOf(node as HastNode).replace(/\n$/, '')
    const language = languageOf(node as HastNode)

    return (
      <div className="overflow-hidden rounded-xl border border-line bg-base">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
          <span className="flex items-center gap-2 font-mono text-[0.6875rem] text-ink-muted uppercase">
            <Terminal className="size-3.5" aria-hidden />
            {language ?? 'código'}
          </span>
          <CopyButton value={code} label="Copiar código" size="inline" />
        </div>
        <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.75rem] leading-relaxed text-ink-soft">
          {children}
        </pre>
      </div>
    )
  },
}

/** Guía de integración de una app, escrita en Markdown en el catálogo. */
export function IntegrationGuideView({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3 text-[0.8438rem] text-ink-soft">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  )
}

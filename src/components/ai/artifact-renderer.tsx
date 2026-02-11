'use client'

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface ArtifactRendererProps {
  type: string
  content: string
}

const CHART_COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899']

export function ArtifactRenderer({ type, content }: ArtifactRendererProps) {
  if (type === 'html') return <HTMLArtifact content={content} />
  if (type === 'chart') return <ChartRenderer content={content} />
  if (type === 'table') return <TableRenderer content={content} />
  if (type === 'mermaid') return <MermaidRenderer content={content} />
  if (type === 'calendar') return <CalendarRenderer content={content} />
  if (type === 'pdf') return <PDFRenderer content={content} />
  if (type === 'code') return <CodeRenderer content={content} />
  if (type === 'form') return <FormRenderer content={content} />

  // Fallback: code block
  return (
    <pre className="my-2 p-3 bg-muted rounded-lg overflow-x-auto text-sm">
      <code className="font-mono">{content}</code>
    </pre>
  )
}

// --- HTML Artifact ---

function HTMLArtifact({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(200)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument
        if (doc?.body) {
          const newHeight = doc.body.scrollHeight + 20
          setHeight(Math.max(newHeight, 100))
        }
      } catch {
        // Cross-origin
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [content])

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-height' && typeof e.data.height === 'number') {
        setHeight(Math.max(e.data.height + 20, 100))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const srcDoc = useMemo(() => {
    let doc = content
    if (!doc.includes('<html') && !doc.includes('<!DOCTYPE')) {
      doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:'Inter',system-ui,sans-serif;padding:16px;margin:0;line-height:1.6;color:#1a1a1a}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #e5e7eb;font-size:13px}th{background:#f3f4f6;font-weight:600}img{max-width:100%;height:auto}*{box-sizing:border-box}</style></head><body>${doc}<script>function rh(){window.parent.postMessage({type:'artifact-height',height:document.body.scrollHeight},'*')}rh();new ResizeObserver(rh).observe(document.body)</script></body></html>`
    } else {
      if (!doc.includes('charset')) {
        doc = doc.replace(/<head>/i, '<head>\n<meta charset="utf-8">')
      }
      if (!doc.includes('viewport')) {
        doc = doc.replace(/<head>/i, '<head>\n<meta name="viewport" content="width=device-width,initial-scale=1">')
      }
      // Inject ResizeObserver so iframe auto-sizes to content
      if (!doc.includes('artifact-height')) {
        doc = doc.replace(/<\/body>/i, `<script>function rh(){window.parent.postMessage({type:'artifact-height',height:document.body.scrollHeight},'*')}rh();new ResizeObserver(rh).observe(document.body)</script></body>`)
      }
    }
    return doc
  }, [content])

  return (
    <div className="my-2 rounded-lg overflow-hidden border">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups"
        className="w-full bg-white"
        style={{ border: 'none', height: `${height}px` }}
        title="AI-generated content"
      />
    </div>
  )
}

// --- Chart Renderer ---

function ChartRenderer({ content }: { content: string }) {
  const chartData = useMemo(() => {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }, [content])

  if (!chartData || !chartData.data) {
    return (
      <pre className="my-2 p-3 bg-muted rounded-lg overflow-x-auto text-sm">
        <code className="font-mono">{content}</code>
      </pre>
    )
  }

  const { type, data, xKey = 'name', yKey = 'value', title } = chartData

  return (
    <div className="my-2 p-3 sm:p-4 border rounded-lg bg-card">
      {title && <p className="text-xs sm:text-sm font-medium mb-2">{title}</p>}
      <div className="w-full" style={{ height: 'clamp(200px, 40vh, 400px)' }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} fontSize={11} tick={{ fontSize: 10 }} />
              <YAxis fontSize={11} tick={{ fontSize: 10 }} width={45} />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, percent }: { name: string; percent: number }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {data.map((_: unknown, idx: number) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} fontSize={11} tick={{ fontSize: 10 }} />
              <YAxis fontSize={11} tick={{ fontSize: 10 }} width={45} />
              <Tooltip />
              <Bar dataKey={yKey} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Table Renderer ---

interface TableData {
  columns: string[]
  rows: unknown[][]
  title?: string
}

function TableRenderer({ content }: { content: string }) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const tableData = useMemo<TableData | null>(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.columns && Array.isArray(parsed.rows)) return parsed
      return null
    } catch {
      return null
    }
  }, [content])

  const sortedRows = useMemo(() => {
    if (!tableData) return []
    if (sortCol === null) return tableData.rows
    return [...tableData.rows].sort((a, b) => {
      const valA = a[sortCol]
      const valB = b[sortCol]
      if (valA == null && valB == null) return 0
      if (valA == null) return sortDir === 'asc' ? -1 : 1
      if (valB == null) return sortDir === 'asc' ? 1 : -1
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA
      }
      const strA = String(valA)
      const strB = String(valB)
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }, [tableData, sortCol, sortDir])

  const handleSort = useCallback((colIndex: number) => {
    setSortCol(prev => {
      if (prev === colIndex) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return colIndex
      }
      setSortDir('asc')
      return colIndex
    })
  }, [])

  if (!tableData) {
    return (
      <pre className="my-2 p-3 bg-muted rounded-lg overflow-x-auto text-sm">
        <code className="font-mono">{content}</code>
      </pre>
    )
  }

  return (
    <div className="my-2 border rounded-lg overflow-hidden">
      {tableData.title && (
        <p className="text-xs sm:text-sm font-medium p-2 sm:p-3 border-b bg-muted/50">{tableData.title}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {tableData.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap"
                  onClick={() => handleSort(idx)}
                >
                  {col}
                  {sortCol === idx && (
                    <span className="ml-1">{sortDir === 'asc' ? ' \u2191' : ' \u2193'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-0 hover:bg-muted/20">
                {tableData.columns.map((_, colIdx) => (
                  <td key={colIdx} className="px-2 sm:px-3 py-1.5 sm:py-2 max-w-[200px] truncate" title={row[colIdx] != null ? String(row[colIdx]) : ''}>
                    {row[colIdx] != null ? String(row[colIdx]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Mermaid Renderer ---

function MermaidRenderer({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'default' })
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, content)
        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render mermaid diagram')
          setSvg('')
        }
      }
    }
    renderDiagram()
    return () => { cancelled = true }
  }, [content])

  if (error) {
    return (
      <div className="my-2 border rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-destructive mb-2">Mermaid error: {error}</p>
        <pre className="p-3 bg-muted rounded-lg overflow-x-auto text-xs sm:text-sm">
          <code className="font-mono">{content}</code>
        </pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-2 p-4 border rounded-lg bg-card text-sm text-muted-foreground">
        Rendering diagram...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-2 p-3 sm:p-4 border rounded-lg bg-card overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// --- Calendar Renderer ---

interface CalendarShift {
  day: string
  employee: string
  start: string
  end: string
  role: string
}

interface CalendarData {
  week_start: string
  shifts: CalendarShift[]
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function CalendarRenderer({ content }: { content: string }) {
  const calendarData = useMemo<CalendarData | null>(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.shifts && Array.isArray(parsed.shifts)) return parsed
      return null
    } catch {
      return null
    }
  }, [content])

  const shiftsByDay = useMemo(() => {
    if (!calendarData) return {}
    const grouped: Record<string, CalendarShift[]> = {}
    for (const day of WEEKDAYS) {
      grouped[day] = []
    }
    for (const shift of calendarData.shifts) {
      const dayKey = WEEKDAYS.find(
        d => d.toLowerCase() === shift.day.toLowerCase().slice(0, 3)
      )
      if (dayKey) {
        grouped[dayKey].push(shift)
      }
    }
    return grouped
  }, [calendarData])

  if (!calendarData) {
    return (
      <pre className="my-2 p-3 bg-muted rounded-lg overflow-x-auto text-sm">
        <code className="font-mono">{content}</code>
      </pre>
    )
  }

  return (
    <div className="my-2 border rounded-lg overflow-hidden">
      <p className="text-xs sm:text-sm font-medium p-2 sm:p-3 border-b bg-muted/50">
        Week of {calendarData.week_start}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm" style={{ minWidth: '560px' }}>
          <thead>
            <tr className="border-b bg-muted/30">
              {WEEKDAYS.map(day => (
                <th key={day} className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-left font-medium">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {WEEKDAYS.map(day => (
                <td key={day} className="px-1.5 sm:px-2 py-1.5 sm:py-2 align-top border-r last:border-0">
                  {shiftsByDay[day]?.length > 0 ? (
                    <div className="space-y-1">
                      {shiftsByDay[day].map((shift, idx) => (
                        <div
                          key={idx}
                          className="p-1 sm:p-1.5 rounded bg-primary/10 text-[10px] sm:text-xs leading-tight"
                        >
                          <p className="font-medium truncate">{shift.employee}</p>
                          <p className="text-muted-foreground">
                            {shift.start}–{shift.end}
                          </p>
                          <p className="text-muted-foreground italic truncate">{shift.role}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- PDF Renderer ---

function PDFRenderer({ content }: { content: string }) {
  const url = content.trim()

  return (
    <div className="my-2 border rounded-lg overflow-hidden">
      <div className="p-2 sm:p-3 border-b bg-muted/50 flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium">PDF Document</span>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm text-primary underline hover:no-underline"
        >
          Download PDF
        </a>
      </div>
      <iframe
        src={url}
        className="w-full bg-white"
        style={{ border: 'none', height: 'clamp(300px, 50vh, 700px)' }}
        title="PDF preview"
      />
    </div>
  )
}

// --- Code Renderer ---

function CodeRenderer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  const language = useMemo(() => {
    const firstLine = content.split('\n')[0]?.trim() ?? ''
    const match = firstLine.match(/^(?:\/\/|#|\/\*|--)\s*(\w+)/)
    return match ? match[1] : null
  }, [content])

  return (
    <div className="my-2 border rounded-lg overflow-hidden">
      <div className="px-2 sm:px-3 py-1 sm:py-1.5 border-b bg-muted/50 flex items-center justify-between">
        {language ? (
          <span className="text-[10px] sm:text-xs font-mono text-muted-foreground">{language}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="text-[10px] sm:text-xs px-2 py-0.5 rounded hover:bg-muted text-muted-foreground"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-2 sm:p-3 overflow-x-auto text-xs sm:text-sm bg-card">
        <code className="font-mono">{content}</code>
      </pre>
    </div>
  )
}

// --- Form Renderer ---

interface FormField {
  name: string
  label: string
  type: string
  options?: string[]
}

interface FormDataSchema {
  fields: FormField[]
  submitLabel?: string
}

function FormRenderer({ content }: { content: string }) {
  const formData = useMemo<FormDataSchema | null>(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.fields && Array.isArray(parsed.fields)) return parsed
      return null
    } catch {
      return null
    }
  }, [content])

  const [values, setValues] = useState<Record<string, string>>({})

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', values)
  }, [values])

  if (!formData) {
    return (
      <pre className="my-2 p-3 bg-muted rounded-lg overflow-x-auto text-sm">
        <code className="font-mono">{content}</code>
      </pre>
    )
  }

  return (
    <div className="my-2 border rounded-lg p-3 sm:p-4 bg-card">
      <form onSubmit={handleSubmit} className="space-y-3">
        {formData.fields.map(field => (
          <div key={field.name} className="space-y-1">
            <label htmlFor={field.name} className="text-xs sm:text-sm font-medium">
              {field.label}
            </label>
            {field.type === 'select' && field.options ? (
              <select
                id={field.name}
                value={values[field.name] ?? ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md bg-background"
              >
                <option value="">Select...</option>
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={field.name}
                value={values[field.name] ?? ''}
                onChange={e => handleChange(field.name, e.target.value)}
                rows={3}
                className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md bg-background resize-y"
              />
            ) : (
              <input
                id={field.name}
                type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                value={values[field.name] ?? ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md bg-background"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {formData.submitLabel ?? 'Submit'}
        </button>
      </form>
    </div>
  )
}

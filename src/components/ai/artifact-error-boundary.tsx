'use client'

import React from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  content?: string
  labels?: {
    failedToRender: string
    rawContent: string
    copy: string
    copied: string
  }
}

interface State {
  hasError: boolean
  error: Error | null
  copied: boolean
}

class ArtifactErrorBoundaryInner extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, copied: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Artifact render error:', error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.content !== this.props.content) {
      this.setState({ hasError: false, error: null })
    }
  }

  handleCopy = async () => {
    if (this.props.content) {
      await navigator.clipboard.writeText(this.props.content)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    }
  }

  render() {
    const labels = this.props.labels || {
      failedToRender: 'Failed to render artifact',
      rawContent: 'Raw content:',
      copy: 'Copy',
      copied: 'Copied',
    }

    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">{labels.failedToRender}</span>
          </div>
          {this.state.error && (
            <p className="text-xs text-muted-foreground mb-3">{this.state.error.message}</p>
          )}
          {this.props.content && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{labels.rawContent}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={this.handleCopy}>
                  {this.state.copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {this.state.copied ? labels.copied : labels.copy}
                </Button>
              </div>
              <pre className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
                {this.props.content}
              </pre>
            </>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper that passes i18n labels to the class component
export function ArtifactErrorBoundary({ children, content }: { children: React.ReactNode; content?: string }) {
  // Note: We use static defaults here. Components using this can pass labels prop if they have i18n context.
  return (
    <ArtifactErrorBoundaryInner content={content}>
      {children}
    </ArtifactErrorBoundaryInner>
  )
}

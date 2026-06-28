'use client'
import { useRef, type ReactNode } from 'react'
import { Button } from 'react-bootstrap'

interface PrintWrapperProps {
  children: ReactNode
  title?: string
  buttonLabel?: string
  buttonVariant?: string
}

export default function PrintWrapper({
  children,
  title,
  buttonLabel = 'Print',
  buttonVariant = 'outline-secondary',
}: PrintWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = contentRef.current?.innerHTML ?? ''
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title ?? 'Print'}</title>
          <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
          <style>
            body { font-family: 'Nunito Sans', sans-serif; padding: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <div>
      <div className="d-flex justify-content-end mb-2 no-print">
        <Button variant={buttonVariant} size="sm" onClick={handlePrint}>
          <i className="ri-printer-line me-1" />
          {buttonLabel}
        </Button>
      </div>
      <div ref={contentRef}>{children}</div>
    </div>
  )
}

import { Document, Image, Page, pdf } from '@react-pdf/renderer'

/** Wraps a PNG data URL in a simple one-page A4 PDF — a small, genuinely new build (this
 * package was installed but unused anywhere else in this codebase before this story). */
export async function generateWhiteboardPdf(pngDataUrl: string): Promise<Blob> {
  const document = (
    <Document>
      <Page size="A4" style={{ padding: 24 }}>
        <Image src={pngDataUrl} style={{ width: '100%' }} />
      </Page>
    </Document>
  )
  return pdf(document).toBlob()
}

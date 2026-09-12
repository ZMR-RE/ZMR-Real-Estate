// Roadmap 9.11 — generic PDF/CSV export for any report/list view.
// Shared by Financials' transaction list and the Chart of Accounts
// screen so each just supplies its own columns/rows rather than
// duplicating CSV-escaping or PDF layout logic.

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportTableToCsv(filename: string, columns: string[], rows: string[][]) {
  const csv = [columns, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
  downloadBlob(filename, csv, 'text/csv')
}

// Manual row-by-row layout rather than the jspdf-autotable plugin — this
// is the only PDF report shape needed so far (a plain header + data
// rows), and a second dependency isn't worth it for that.
//
// jsPDF is dynamically imported here rather than at module scope — its
// own optional html-rendering path pulls in html2canvas/DOMPurify as
// transitive dependencies, which bloated the main bundle ~4x when
// imported eagerly. Loading it only when an export is actually triggered
// keeps every other screen's initial load unaffected.
export async function exportTableToPdf(filename: string, title: string, columns: string[], rows: string[][]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const marginTop = 20
  const marginBottom = 15
  const rowHeight = 7
  const colWidth = (pageWidth - marginX * 2) / columns.length

  let y = marginTop

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, marginX, y)
  y += 10

  doc.setFontSize(9)

  const cellText = (value: string) => {
    const [firstLine, ...rest] = doc.splitTextToSize(value, colWidth - 2)
    return rest.length > 0 ? `${firstLine}…` : (firstLine ?? '')
  }

  const drawRow = (cells: string[], isHeader: boolean) => {
    doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
    cells.forEach((cell, i) => {
      doc.text(cellText(cell), marginX + i * colWidth, y)
    })
    y += rowHeight
  }

  const drawHeader = () => {
    drawRow(columns, true)
    doc.line(marginX, y - rowHeight + 2, pageWidth - marginX, y - rowHeight + 2)
  }

  drawHeader()

  for (const row of rows) {
    if (y > pageHeight - marginBottom) {
      doc.addPage()
      y = marginTop
      drawHeader()
    }
    drawRow(row, false)
  }

  doc.save(filename)
}

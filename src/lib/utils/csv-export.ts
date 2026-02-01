/**
 * Convert an array of objects to CSV string
 */
export function objectsToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return ''

  // Header row
  const headers = columns.map((col) => `"${col.header}"`).join(',')

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
        if (typeof value === 'number') return value.toString()
        if (value instanceof Date) return `"${value.toISOString()}"`
        return `"${String(value).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  return [headers, ...rows].join('\n')
}

/**
 * Download CSV content as a file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
): void {
  const csv = objectsToCsv(data, columns)
  downloadCsv(csv, filename)
}

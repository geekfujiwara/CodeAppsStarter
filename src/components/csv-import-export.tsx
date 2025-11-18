import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type CsvColumn<T> = {
  key: keyof T
  label: string
  required?: boolean
  validate?: (value: string) => boolean | string
  transform?: (value: string) => unknown
}

export type CsvValidationError = {
  row: number
  column: string
  value: string
  error: string
}

export type CsvImportExportProps<T> = {
  columns: CsvColumn<T>[]
  data?: T[]
  onImport?: (data: T[]) => void
  fileName?: string
  className?: string
}

export function CsvImportExport<T extends Record<string, unknown>>({
  columns,
  data = [],
  onImport,
  fileName = "data",
  className,
}: CsvImportExportProps<T>) {
  const [open, setOpen] = useState(false)
  const [importStep, setImportStep] = useState<"upload" | "validate" | "complete">("upload")
  const [csvData, setCsvData] = useState<T[]>([])
  const [validationErrors, setValidationErrors] = useState<CsvValidationError[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // CSV出力
  const exportCsv = useCallback((includeData: boolean) => {
    const headers = columns.map((col) => col.label).join(",")
    let csvContent = headers + "\n"

    if (includeData && data.length > 0) {
      const rows = data.map((item) =>
        columns.map((col) => {
          const value = item[col.key]
          const stringValue = String(value ?? "")
          // カンマや改行、ダブルクォートを含む場合はエスケープ
          if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(",")
      )
      csvContent += rows.join("\n")
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${fileName}${includeData ? "" : "_template"}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [columns, data, fileName])

  // CSVパース
  const parseCsv = useCallback((text: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ""
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          currentCell += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ",") {
          currentRow.push(currentCell)
          currentCell = ""
        } else if (char === "\n" || char === "\r") {
          if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell)
            rows.push(currentRow)
            currentRow = []
            currentCell = ""
          }
          if (char === "\r" && nextChar === "\n") {
            i++
          }
        } else {
          currentCell += char
        }
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell)
      rows.push(currentRow)
    }

    return rows
  }, [])

  // CSVバリデーション
  const validateCsv = useCallback((rows: string[][]): { data: T[]; errors: CsvValidationError[] } => {
    const errors: CsvValidationError[] = []
    const validatedData: T[] = []

    if (rows.length === 0) {
      return { data: [], errors: [{ row: 0, column: "全体", value: "", error: "CSVファイルが空です" }] }
    }

    // ヘッダー行をスキップ
    const dataRows = rows.slice(1)

    dataRows.forEach((row, rowIndex) => {
      const item: Partial<T> = {}
      let hasError = false

      columns.forEach((col, colIndex) => {
        const value = row[colIndex] || ""

        // 必須チェック
        if (col.required && !value.trim()) {
          errors.push({
            row: rowIndex + 2, // ヘッダー行を考慮
            column: col.label,
            value: value,
            error: "必須項目です",
          })
          hasError = true
          return
        }

        // カスタムバリデーション
        if (col.validate && value.trim()) {
          const validationResult = col.validate(value)
          if (validationResult !== true) {
            errors.push({
              row: rowIndex + 2,
              column: col.label,
              value: value,
              error: typeof validationResult === "string" ? validationResult : "無効な値です",
            })
            hasError = true
            return
          }
        }

        // データ変換
        if (col.transform) {
          item[col.key] = col.transform(value) as T[keyof T]
        } else {
          item[col.key] = value as T[keyof T]
        }
      })

      if (!hasError) {
        validatedData.push(item as T)
      }
    })

    return { data: validatedData, errors }
  }, [columns])

  // ファイル選択
  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCsv(text)
      const { data: parsedData, errors } = validateCsv(rows)
      
      setCsvData(parsedData)
      setValidationErrors(errors)
      setImportStep("validate")
    }
    reader.readAsText(file, "UTF-8")
  }, [parseCsv, validateCsv])

  // ドラッグ&ドロップ
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type === "text/csv") {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // インポート実行
  const handleImport = useCallback(() => {
    if (onImport && csvData.length > 0) {
      onImport(csvData)
      setImportStep("complete")
    }
  }, [onImport, csvData])

  // ダイアログクローズ時のリセット
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(() => {
        setImportStep("upload")
        setCsvData([])
        setValidationErrors([])
      }, 200)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Upload className="h-4 w-4 mr-2" />
          CSV入出力
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>CSV入出力</DialogTitle>
          <DialogDescription>
            データのエクスポートまたはCSVファイルからのインポート
          </DialogDescription>
        </DialogHeader>

        {importStep === "upload" && (
          <div className="space-y-4 flex-1 overflow-auto">
            {/* エクスポートセクション */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  データのエクスポート
                </CardTitle>
                <CardDescription>現在のデータをCSV形式でダウンロード</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => exportCsv(true)}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={data.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  データを出力 ({data.length}件)
                </Button>
                <Button
                  onClick={() => exportCsv(false)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  テンプレートを出力
                </Button>
              </CardContent>
            </Card>

            {/* インポートセクション */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  CSVインポート
                </CardTitle>
                <CardDescription>CSVファイルからデータをインポート</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  )}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    CSVファイルをドラッグ&ドロップ
                    <br />
                    または
                  </p>
                  <Button
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = ".csv"
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          handleFileSelect(file)
                        }
                      }
                      input.click()
                    }}
                    variant="outline"
                  >
                    ファイルを選択
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {importStep === "validate" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* バリデーション結果 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {validationErrors.length === 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      バリデーション成功
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      バリデーションエラー
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {validationErrors.length === 0
                    ? `${csvData.length}件のデータがインポート可能です`
                    : `${validationErrors.length}件のエラーが見つかりました`}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* エラー一覧 */}
            {validationErrors.length > 0 && (
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm">エラー詳細</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">行</TableHead>
                          <TableHead className="w-32">列</TableHead>
                          <TableHead className="w-40">値</TableHead>
                          <TableHead>エラー</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationErrors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{error.row}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{error.column}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{error.value || "(空)"}</TableCell>
                            <TableCell className="text-red-600">{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* アクションボタン */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setImportStep("upload")}>
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationErrors.length > 0 || csvData.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                インポート ({csvData.length}件)
              </Button>
            </div>
          </div>
        )}

        {importStep === "complete" && (
          <div className="space-y-4 flex-1 flex flex-col items-center justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">インポート完了</h3>
              <p className="text-sm text-muted-foreground">
                {csvData.length}件のデータをインポートしました
              </p>
            </div>
            <Button onClick={() => setOpen(false)}>閉じる</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, ArrowLeft, CheckCircle, XCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'

function extractSpreadsheetId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim()
  if (!trimmed.includes('/') && trimmed.length > 10 && trimmed.length < 100) {
    return trimmed
  }
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

type ImportDetail = {
  rowNumber: number
  success: boolean
  expertId?: string | null
  expertName?: string | null
  studentId?: string | null
  studentName?: string | null
  errors: string[]
}

type ImportResult = {
  success: boolean
  summary: {
    total: number
    successful: number
    failed: number
  }
  details: ImportDetail[]
}

type ImportKind = 'experts' | 'students'

export default function SuperAdminBulkImport() {
  const [kind, setKind] = useState<ImportKind>('experts')
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [range, setRange] = useState('Sheet1!A1:Z1000')
  const [defaultPassword, setDefaultPassword] = useState('')
  const [delayBetweenRows, setDelayBetweenRows] = useState('500')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      setError('Invalid spreadsheet URL or ID.')
      toast.error('Invalid spreadsheet URL or ID')
      return
    }

    setImporting(true)
    try {
      const body: Record<string, unknown> = {
        spreadsheetId,
        range: range || 'Sheet1!A1:Z1000',
        usePublicAccess: true,
        delayBetweenRows: parseInt(delayBetweenRows, 10) || 500,
      }
      if (defaultPassword.trim()) {
        body.defaultPassword = defaultPassword.trim()
      }

      const data =
        kind === 'experts'
          ? await api.superadmin.bulkImportExperts(body)
          : await api.superadmin.bulkImportStudents(body)

      setResult(data as ImportResult)
      const s = (data as ImportResult).summary
      toast.success(`Import complete: ${s?.successful ?? 0} succeeded, ${s?.failed ?? 0} failed`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const requiredHint =
    kind === 'experts'
      ? 'Required columns: Name, Email, Phone, Domain Expertise.'
      : 'Required columns: Name, Email.'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/superadmin/home">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bulk import</h1>
          <p className="text-sm text-slate-600 mt-1">
            Import from a public Google Sheet. Creates profiles and login accounts. See{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">docs/BULK_IMPORT_GUIDE.md</code>.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={kind}
        onValueChange={(v) => {
          setKind(v as ImportKind)
          setResult(null)
          setError('')
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="experts">Experts</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value={kind} className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-[#008260]" />
                {kind === 'experts' ? 'Expert import' : 'Student import'}
              </CardTitle>
              <CardDescription>
                {requiredHint} Optional: custom default password (otherwise{' '}
                <code className="text-xs">ExpertCollaboration@123</code>).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spreadsheetUrl">Spreadsheet URL or ID *</Label>
                  <Input
                    id="spreadsheetUrl"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={spreadsheetUrl}
                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="range">Range (optional)</Label>
                    <Input
                      id="range"
                      placeholder="Sheet1!A1:Z1000"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delay">Delay between rows (ms)</Label>
                    <Input
                      id="delay"
                      type="number"
                      value={delayBetweenRows}
                      onChange={(e) => setDelayBetweenRows(e.target.value)}
                      min={100}
                      max={5000}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultPassword">Default login password (optional)</Label>
                  <Input
                    id="defaultPassword"
                    type="password"
                    placeholder="Leave empty for ExpertCollaboration@123"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#008260] hover:bg-[#006d51]" disabled={importing}>
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Start import
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Import results</CardTitle>
            <CardDescription>
              {result.summary.successful} succeeded, {result.summary.failed} failed out of{' '}
              {result.summary.total} rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{result.summary.successful} successful</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">{result.summary.failed} failed</span>
              </div>
            </div>
            {result.details?.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.details.map((d, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-sm ${
                      d.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Row {d.rowNumber}:{' '}
                        {d.expertName || d.studentName || '(no name)'}
                      </span>
                      {d.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                    </div>
                    {!d.success && d.errors?.length > 0 && (
                      <ul className="mt-2 text-red-700 list-disc list-inside">
                        {d.errors.map((err, j) => (
                          <li key={j}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

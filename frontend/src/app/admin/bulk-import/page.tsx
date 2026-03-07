'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, ArrowLeft, CheckCircle, XCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Logo from '@/components/Logo'

function extractSpreadsheetId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim()
  // If it's already just an ID (no slashes, reasonable length)
  if (!trimmed.includes('/') && trimmed.length > 10 && trimmed.length < 100) {
    return trimmed
  }
  // Match: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

type ImportDetail = {
  rowNumber: number
  success: boolean
  expertId: string | null
  expertName: string | null
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

export default function AdminBulkImport() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [range, setRange] = useState('Sheet1!A1:Z1000')
  const [delayBetweenRows, setDelayBetweenRows] = useState('500')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    const storedAuth = localStorage.getItem('admin_auth')
    if (storedAuth === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuth = () => {
    if (email === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
      localStorage.setItem('admin_auth', email)
    } else {
      toast.error('Invalid email. Access denied.')
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      setError('Invalid spreadsheet URL or ID. Paste the full URL (e.g. https://docs.google.com/spreadsheets/d/.../edit) or the Sheet ID.')
      toast.error('Invalid spreadsheet URL or ID')
      return
    }

    setImporting(true)
    try {
      const adminEmail = localStorage.getItem('admin_auth') || 'debnathsinhababu2017@gmail.com'
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/experts/bulk-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminEmail}`
          },
          body: JSON.stringify({
            spreadsheetId,
            range: range || 'Sheet1!A1:Z1000',
            usePublicAccess: true,
            delayBetweenRows: parseInt(delayBetweenRows) || 500
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setResult(data)
      toast.success(`Import complete: ${data.summary?.successful || 0} succeeded, ${data.summary?.failed || 0} failed`)
    } catch (err: any) {
      setError(err.message || 'Import failed')
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF2FF]">
        <Card className="w-full max-w-md border border-[#E0E0E0]">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#008260] p-3 rounded-full">
                <FileSpreadsheet className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Bulk Expert Import</CardTitle>
            <CardDescription>Enter your email to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@calxmap.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="border-[#DCDCDC]"
              />
            </div>
            <Button
              onClick={handleAuth}
              className="w-full bg-[#008260] hover:bg-[#006d51]"
            >
              Access Admin Panel
            </Button>
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push('/')}
                className="text-sm text-gray-600"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF] relative">
      <header className="relative bg-[#008260] shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="block">
              <Logo size="header" />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/admin/profiles">
                <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                  View Profiles
                </Button>
              </Link>
              <Link href="/admin/create-expert">
                <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                  Create Expert
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-start gap-y-6 mt-8">
        <div className="flex items-center gap-4 w-full">
          <Link href="/admin/profiles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-[#000000] font-semibold text-[32px]">Bulk Expert Import</h2>
            <p className="text-base font-sans text-[#000000] font-normal">
              Import expert profiles from a public Google Sheet. Ensure the sheet is shared as &quot;Anyone with the link can view&quot;.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 mt-8 pb-16 max-w-3xl">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white border border-[#E0E0E0]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-[#008260]" />
              Google Sheet Import
            </CardTitle>
            <CardDescription>
              Paste your public Google Sheet URL. Required columns: Name, Email, Phone, Domain Expertise. Profile Photo URL is optional.
              See BULK_EXPERT_IMPORT_GUIDE.md for full column mapping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="spreadsheetUrl">Spreadsheet URL or ID *</Label>
                <Input
                  id="spreadsheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  className="border-slate-200 focus:border-[#008260] focus:ring-[#008260]"
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
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delay">Delay between rows (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    placeholder="500"
                    value={delayBetweenRows}
                    onChange={(e) => setDelayBetweenRows(e.target.value)}
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260]"
                    min={100}
                    max={5000}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#008260] hover:bg-[#006d51]"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="mt-8 bg-white border border-[#E0E0E0]">
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>
                {result.summary.successful} succeeded, {result.summary.failed} failed out of {result.summary.total} rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{result.summary.successful} Successful</span>
                </div>
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{result.summary.failed} Failed</span>
                </div>
              </div>
              {result.details && result.details.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <Label>Row Details</Label>
                  {result.details.map((d, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border text-sm ${
                        d.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Row {d.rowNumber}: {d.expertName || '(no name)'}
                        </span>
                        {d.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      {!d.success && d.errors && d.errors.length > 0 && (
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
    </div>
  )
}

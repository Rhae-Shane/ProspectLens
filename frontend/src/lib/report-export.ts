import type { StructuredReport } from '@/types/structured-report'
import { buildCompanyOverview } from '@/lib/structured-report-utils'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function section(title: string, body: string): string {
  if (!body.trim()) return ''
  return `<section><h2>${escapeHtml(title)}</h2><div class="body">${body}</div></section>`
}

function listItems(items: string[]): string {
  if (!items.length) return ''
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function buildPrintHtml(companyName: string, structured: StructuredReport): string {
  const overview = buildCompanyOverview(structured)
  const snap = structured.company_snapshot
  const products = structured.products_services
  const customers = structured.target_customers_overview
  const stakeholders = structured.stakeholders_overview
  const signals = structured.business_signals
  const risks = structured.risks_challenges
  const discovery = structured.discovery_questions_overview
  const outreach = structured.outreach_overview
  const unknowns = structured.unknowns_overview
  const sources = structured.sources_overview

  const snapshotLines = [
    snap?.industry && `Industry: ${snap.industry}`,
    snap?.founded && `Founded: ${snap.founded}`,
    snap?.hq && `Headquarters: ${snap.hq}`,
    snap?.employees && `Employees: ${snap.employees}`,
    snap?.ceo && `CEO: ${snap.ceo}`,
    snap?.company_type && `Type: ${snap.company_type}`,
    snap?.latest_funding && `Latest funding: ${snap.latest_funding}`,
    snap?.valuation && `Valuation: ${snap.valuation}`,
  ].filter(Boolean) as string[]

  const parts = [
    `<h1>${escapeHtml(companyName)} Research Report</h1>`,
    section('Company Overview', [
      overview.description ? `<p>${escapeHtml(overview.description)}</p>` : '',
      listItems(snapshotLines),
      listItems(overview.key_metrics.map((m) => `${m.label}: ${m.value} ${m.change ?? ''}`.trim())),
    ].join('')),
    section(
      'Products & Services',
      [
        products?.summary || products?.portfolio_summary
          ? `<p>${escapeHtml(String(products.summary || products.portfolio_summary))}</p>`
          : '',
        listItems(
          (products?.core_products ?? structured.products ?? []).map(
            (p) => `${p.name}: ${p.description ?? ''}`
          )
        ),
      ].join('')
    ),
    section(
      'Target Customers',
      listItems(
        (customers?.segments ?? structured.target_customers ?? []).map(
          (s) => `${'name' in s ? s.name : s.segment}: ${'description' in s ? s.description : s.detail ?? ''}`
        )
      )
    ),
    section(
      'Stakeholders',
      listItems(
        (stakeholders?.executives ?? structured.stakeholders ?? []).map(
          (e) => `${e.name} — ${'title' in e ? e.title : ''}`
        )
      )
    ),
    section(
      'Business Signals',
      listItems((signals?.key_signals ?? structured.signals ?? []).map((s) => `${s.title ?? s.signal}: ${s.description ?? s.evidence ?? ''}`))
    ),
    section(
      'Risks & Challenges',
      listItems((risks?.top_risks ?? structured.risks ?? []).map((r) => `${r.title ?? r.risk}: ${r.description ?? ''}`))
    ),
    section(
      'Discovery Questions',
      listItems(
        (discovery?.questions ?? structured.discovery_questions ?? []).map((q) =>
          'question' in q ? q.question : String(q)
        )
      )
    ),
    section(
      'Outreach Strategies',
      listItems((outreach?.strategies ?? []).map((s) => `${s.name}: ${s.description}`))
    ),
    section(
      'Unknowns',
      listItems(
        (unknowns?.unknown_items ?? structured.unknowns ?? []).map((u) =>
          typeof u === 'string' ? u : u.unknown
        )
      )
    ),
    section(
      'Sources',
      listItems((sources?.sources ?? structured.sources ?? []).map((s) => `${s.title}: ${s.url}`))
    ),
  ].filter(Boolean)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(companyName)} Research Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; color: #111; line-height: 1.5; }
    h1 { font-size: 1.75rem; border-bottom: 2px solid #2563eb; padding-bottom: 0.5rem; }
    h2 { font-size: 1.15rem; margin-top: 1.5rem; color: #1e40af; }
    ul { padding-left: 1.25rem; }
    li { margin-bottom: 0.35rem; }
    section { margin-bottom: 1rem; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>${parts.join('')}</body>
</html>`
}

export function exportReportToPdf(companyName: string, structured: StructuredReport): void {
  const html = buildPrintHtml(companyName, structured)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!printWindow) {
    window.alert('Allow pop-ups to export the PDF, then try again.')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => {
    printWindow.print()
  }
}

export { buildPrintHtml }

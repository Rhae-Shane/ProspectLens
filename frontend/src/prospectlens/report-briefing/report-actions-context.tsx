import { createContext, useContext } from 'react'

export interface ReportActions {
  onViewFullReport: () => void
  onExportPdf: () => void
}

export const ReportActionsContext = createContext<ReportActions | null>(null)

export function useReportActions(): ReportActions | null {
  return useContext(ReportActionsContext)
}

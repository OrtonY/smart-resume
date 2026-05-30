export type ApplicationStatus = 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'

export interface JobApplication {
  id: string
  company: string
  position: string
  status: ApplicationStatus
  channel: string | null
  resumeId: string | null
  resumeTitle: string | null
  appliedAt: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface JobApplicationPage {
  items: JobApplication[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface JobApplicationListQuery {
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export interface JobApplicationCreatePayload {
  company: string
  position: string
  status: string
  channel?: string | null
  resumeId?: string | null
  appliedAt?: string | null
  notes?: string | null
}

export interface JobApplicationUpdatePayload {
  company: string
  position: string
  status: string
  channel?: string | null
  resumeId?: string | null
  appliedAt?: string | null
  notes?: string | null
}

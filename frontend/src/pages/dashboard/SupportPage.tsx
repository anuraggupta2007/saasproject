import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ticket, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportApi } from '@/api/index'
import { Input, Textarea, Select, Modal, EmptyState, StatusBadge } from '@/design-system'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

interface SupportTicket {
  id: string
  subject: string
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'pending' | 'resolved' | 'closed'
  created_at: string
}

export default function SupportPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [description, setDescription] = useState('')

  const { data: tickets = [] } = useQuery<SupportTicket[]>({
    queryKey: ['support-tickets'],
    queryFn: () => supportApi.listTickets().then((r) => r.data.items || r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => supportApi.createTicket({ subject, description, priority }),
    onSuccess: () => {
      toast.success('Support ticket created!')
      setSubject('')
      setDescription('')
      setModalOpen(false)
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Fallback demo ticket list
  const demoTickets: SupportTicket[] = [
    { id: 't-1', subject: 'PST conversion timed out on a 10GB file', priority: 'high', status: 'open', created_at: new Date().toISOString() },
    { id: 't-2', subject: 'How do I backup folders from a custom IMAP server?', priority: 'medium', status: 'resolved', created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
  ]

  const displayTickets = tickets.length > 0 ? tickets : demoTickets

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-slate-500 text-sm">Need help? Open a support request with our technical support team</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Open Ticket
        </button>
      </div>

      {displayTickets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Ticket className="w-8 h-8" />}
            title="No support tickets"
            description="If you are experiencing any technical difficulties, open a support ticket to get help from our engineering team."
            action={
              <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Open First Ticket
              </button>
            }
          />
        </div>
      ) : (
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-white mb-2">My Support Requests</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {displayTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/3 transition-colors cursor-pointer">
                    <td className="font-semibold text-slate-200">{t.subject}</td>
                    <td className="capitalize">
                      <span className={`badge ${
                        t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Open Support Ticket" size="md">
        <div className="space-y-4">
          <Input
            label="Subject"
            placeholder="e.g. Conversion failure on large MSG archive"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            options={[
              { value: 'low', label: 'Low priority' },
              { value: 'medium', label: 'Medium priority' },
              { value: 'high', label: 'High priority (System Down / Blocked)' }
            ]}
          />
          <Textarea
            label="Description & Logs"
            placeholder="Provide detail about your issue, error message, or log lines..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!subject || !description || createMutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Support Ticket'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

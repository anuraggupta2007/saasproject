import { memo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, User, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useSupportTicket, useTicketMessages, useReplyTicket, useAssignTicket, useResolveTicket, useCloseTicket } from '../hooks';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';

export const TicketDetails = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ticketData, isLoading: ticketLoading } = useSupportTicket(id!);
  const { data: messagesData, isLoading: msgsLoading } = useTicketMessages(id!);
  const replyTicket = useReplyTicket();
  const assignTicket = useAssignTicket();
  const resolveTicket = useResolveTicket();
  const closeTicket = useCloseTicket();

  const [message, setMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const ticket = ticketData;
  const messages = messagesData ?? [];

  const handleReply = () => {
    if (!message.trim()) return;
    replyTicket.mutate(
      { id: id!, data: { content: message, isInternalNote } },
      { onSuccess: () => { setMessage(''); toast.success(isInternalNote ? 'Note added' : 'Reply sent'); } }
    );
  };

  if (ticketLoading) return <SkeletonLoader count={3} variant="card" />;
  if (!ticket) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/support')} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{ticket.subject}</h1>
          <p className="text-slate-400">#{ticket.id.slice(0, 8)} from {ticket.userName}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={ticket.status} />
          <StatusBadge status={ticket.priority} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => resolveTicket.mutate(id!, { onSuccess: () => toast.success('Ticket resolved') })} leftIcon={<CheckCircle className="w-4 h-4" />}>Resolve</Button>
        <Button variant="outline" size="sm" onClick={() => closeTicket.mutate(id!, { onSuccess: () => toast.success('Ticket closed') })} leftIcon={<XCircle className="w-4 h-4" />}>Close</Button>
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Conversation" icon={<MessageSquare className="w-5 h-5" />} />
        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
          {msgsLoading ? <SkeletonLoader count={4} variant="row" /> : messages.map((msg) => (
            <div key={msg.id} className={cn('p-4 rounded-xl', msg.senderRole === 'admin' ? 'bg-brand-500/10 border border-brand-500/20 ml-8' : msg.senderRole === 'system' ? 'bg-slate-500/10 border border-slate-500/20 mx-8' : 'bg-white/5 border border-white/10 mr-8')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-brand-400" />
                  </div>
                  <span className="text-sm font-medium text-white">{msg.senderName}</span>
                  {msg.isInternalNote && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">Internal Note</span>}
                </div>
                <span className="text-xs text-slate-500">{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg">
        <div className="flex gap-3">
          <Input placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
          <Button variant="brand" onClick={handleReply} loading={replyTicket.isPending} leftIcon={<Send className="w-4 h-4" />}>Send</Button>
        </div>
        <div className="mt-2">
          <Button variant="ghost" size="sm" onClick={() => setIsInternalNote(!isInternalNote)}>
            {isInternalNote ? 'Switch to Reply' : 'Switch to Internal Note'}
          </Button>
        </div>
      </Card>
    </div>
  );
});

TicketDetails.displayName = 'TicketDetails';

export default TicketDetails;

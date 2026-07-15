import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { PaymentMethodCard } from '../components/ui/PaymentMethodCard';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { usePaymentMethods, useAddPaymentMethod, useRemovePaymentMethod, useSetDefaultPaymentMethod } from '../hooks';
import { toast } from 'react-hot-toast';

export const PaymentMethodsPage = memo(() => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const { data: methods, isLoading } = usePaymentMethods();
  const addPaymentMethod = useAddPaymentMethod();
  const removePaymentMethod = useRemovePaymentMethod();
  const setDefaultMethod = useSetDefaultPaymentMethod();

  const handleAdd = () => {
    if (!cardNumber || !expiry || !cvc) {
      toast.error('Please fill in all card details');
      return;
    }
    addPaymentMethod.mutate(
      { type: 'card', token: `tok_${cardNumber.slice(-4)}` },
      {
        onSuccess: () => {
          toast.success('Payment method added');
          setShowAddForm(false);
          setCardNumber('');
          setExpiry('');
          setCvc('');
          setCardholderName('');
        },
        onError: () => toast.error('Failed to add payment method'),
      }
    );
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this payment method?')) {
      removePaymentMethod.mutate(id, {
        onSuccess: () => toast.success('Payment method removed'),
        onError: () => toast.error('Failed to remove'),
      });
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMethod.mutate(id, {
      onSuccess: () => toast.success('Default payment method updated'),
      onError: () => toast.error('Failed to update'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader count={2} variant="row" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <p className="text-slate-400 mt-1">Manage your payment methods</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader
          title="Payment Methods"
          action={
            <Button variant="brand" size="sm" onClick={() => setShowAddForm(!showAddForm)} leftIcon={<Plus className="w-4 h-4" />}>
              Add New
            </Button>
          }
        />

        {showAddForm && (
          <CardContent className="mb-6">
            <div className="p-4 bg-white/5 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cardholder Name</label>
                  <Input placeholder="John Doe" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Card Number</label>
                  <Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Expiry</label>
                  <Input placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CVC</label>
                  <Input placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleAdd} loading={addPaymentMethod.isPending} leftIcon={<CreditCard className="w-4 h-4" />}>
                  Add Card
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent>
          {methods && methods.length > 0 ? (
            <div className="space-y-3">
              {methods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onRemove={handleRemove}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CreditCard className="w-8 h-8 text-slate-400" />}
              title="No payment methods"
              description="Add a payment method to manage your subscription."
              action={{ label: 'Add Payment Method', onClick: () => setShowAddForm(true) }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
});

PaymentMethodsPage.displayName = 'PaymentMethodsPage';

export default PaymentMethodsPage;

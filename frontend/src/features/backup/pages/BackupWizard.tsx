import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Mail, RefreshCw, FolderArchive, Filter, HardDrive, Clock, Shield, Check,
  ChevronLeft, ChevronRight, Save, Eye, AlertCircle, Info, ExternalLink,
  Plus, X, Search, Database, Settings, Calendar, Cloud
} from 'lucide-react';
import { StepProgress } from '../components/ui/Progress';
import { StatusBadge } from '../components/ui/Badge';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, Progress } from '../components/ui/Badge';
import { cn } from '@/utils/cn';
import { formatBytes } from '@/utils/format';
import { Input } from '../components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { Switch } from '../components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { backupApi } from '../api';
import { useBackupStore } from '../store';
import { toast } from 'react-hot-toast';
import type { BackupJob, BackupDestination, CompressionSettings, EncryptionSettings, NotificationSettings, RetentionSettings, AdvancedSettings, MessageFilter, WizardData, ScheduleData } from '../types';

const wizardSteps = [
  { id: 'provider', title: 'Provider', description: 'Select email provider', icon: Mail },
  { id: 'account', title: 'Account', description: 'Connect your account', icon: Mail },
  { id: 'type', title: 'Backup Type', description: 'Choose backup method', icon: RefreshCw },
  { id: 'folders', title: 'Folders', description: 'Select folders to backup', icon: FolderArchive },
  { id: 'filters', title: 'Filters', description: 'Apply message filters', icon: Filter },
  { id: 'destination', title: 'Destination', description: 'Choose backup location', icon: HardDrive },
  { id: 'schedule', title: 'Schedule', description: 'Set backup schedule', icon: Clock },
  { id: 'review', title: 'Review', description: 'Confirm settings', icon: Check },
];

const wizardSchema = z.object({
  jobName: z.string().min(3, 'Job name must be at least 3 characters').max(100),
  jobDescription: z.string().optional(),
  backupType: z.enum(['full', 'incremental', 'new_only']),
  folderIds: z.array(z.string()).min(1, 'Select at least one folder'),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number(), z.object({ from: z.string(), to: z.string() })]),
    enabled: z.boolean(),
  })).optional(),
  destination: z.object({
    location: z.enum(['local', 'external', 'network', 'cloud']),
    path: z.string().min(1, 'Path is required'),
    credentials: z.record(z.string(), z.string()).optional(),
    validateOnStart: z.boolean(),
    createFolderStructure: z.boolean(),
    folderStructure: z.enum(['flat', 'by_account', 'by_date', 'by_folder']),
  }),
  compression: z.object({
    enabled: z.boolean(),
    algorithm: z.enum(['gzip', 'brotli', 'zstd', 'lz4']),
    level: z.number().min(1).max(22),
    splitSize: z.number().optional(),
    passwordProtected: z.boolean(),
  }),
  encryption: z.object({
    enabled: z.boolean(),
    algorithm: z.enum(['aes-256-gcm', 'chacha20-poly1305']),
    keyDerivation: z.enum(['pbkdf2', 'argon2id']),
    password: z.string().optional(),
  }),
  notifications: z.object({
    onStart: z.boolean(),
    onComplete: z.boolean(),
    onFailure: z.boolean(),
    onProgress: z.object({ enabled: z.boolean(), interval: z.number() }).optional(),
    channels: z.array(z.enum(['email', 'webhook', 'push', 'slack'])),
    webhookUrl: z.string().url().optional().or(z.literal('')),
    slackWebhook: z.string().url().optional().or(z.literal('')),
  }),
  retention: z.object({
    enabled: z.boolean(),
    keepLast: z.number().min(1),
    keepDays: z.number().min(1),
    keepSize: z.number().min(1),
    deleteOnFailure: z.boolean(),
  }),
  advanced: z.object({
    maxConcurrentDownloads: z.number().min(1).max(10),
    maxConcurrentUploads: z.number().min(1).max(10),
    chunkSize: z.number().min(1024).max(100 * 1024 * 1024),
    timeout: z.number().min(30).max(3600),
    retryAttempts: z.number().min(0).max(10),
    retryDelay: z.number().min(1).max(300),
    bandwidthLimit: z.number().optional(),
    verifyChecksums: z.boolean(),
    skipExisting: z.boolean(),
    preserveTimestamps: z.boolean(),
    followSymlinks: z.boolean(),
    includeHidden: z.boolean(),
  }),
  schedule: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'cron']),
    cronExpression: z.string().optional(),
    timezone: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    time: z.string(),
    daysOfWeek: z.array(z.number()).optional(),
    dayOfMonth: z.number().optional(),
    weekOfMonth: z.number().optional(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
      timezone: z.string(),
    }).optional(),
    runNow: z.boolean(),
  }),
});

type WizardFormData = z.infer<typeof wizardSchema>;

const defaultFormData: WizardFormData = {
  jobName: '',
  jobDescription: '',
  backupType: 'incremental',
  folderIds: [],
  filters: [],
  destination: {
    location: 'local',
    path: '/backups',
    credentials: {},
    validateOnStart: true,
    createFolderStructure: true,
    folderStructure: 'by_account',
  },
  compression: {
    enabled: true,
    algorithm: 'zstd',
    level: 3,
    splitSize: undefined,
    passwordProtected: false,
  },
  encryption: {
    enabled: false,
    algorithm: 'aes-256-gcm',
    keyDerivation: 'argon2id',
    password: undefined,
  },
  notifications: {
    onStart: false,
    onComplete: true,
    onFailure: true,
    onProgress: { enabled: false, interval: 300 },
    channels: ['email'],
    webhookUrl: '',
    slackWebhook: '',
  },
  retention: {
    enabled: true,
    keepLast: 10,
    keepDays: 30,
    keepSize: 50 * 1024 * 1024 * 1024,
    deleteOnFailure: false,
  },
  advanced: {
    maxConcurrentDownloads: 4,
    maxConcurrentUploads: 2,
    chunkSize: 10 * 1024 * 1024,
    timeout: 300,
    retryAttempts: 3,
    retryDelay: 5,
    bandwidthLimit: undefined,
    verifyChecksums: true,
    skipExisting: true,
    preserveTimestamps: true,
    followSymlinks: false,
    includeHidden: false,
  },
  schedule: {
    frequency: 'once',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startDate: new Date().toISOString().split('T')[0],
    time: '02:00',
    daysOfWeek: [0],
    dayOfMonth: 1,
    weekOfMonth: 1,
    quietHours: { enabled: false, start: '22:00', end: '06:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    runNow: false,
  },
};

const stepValidationSchemas: Record<string, z.ZodSchema> = {
  type: z.object({ backupType: z.enum(['full', 'incremental', 'new_only']) }),
  folders: z.object({ folderIds: z.array(z.string()).min(1, 'Select at least one folder') }),
  destination: z.object({ destination: wizardSchema.shape.destination }),
  schedule: z.object({ schedule: wizardSchema.shape.schedule }),
};

export const BackupWizard = memo(() => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folders, setFolders] = useState<Array<{ id: string; name: string; path: string; emailCount: number; size: number; children?: any[] }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; email: string; displayName: string; provider: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { wizard: storeWizard, setWizardData, setWizardStep, completeWizardStep, resetWizard } = useBackupStore();

  const handleTestConnection = useCallback(async () => {
    setTestResult({ success: true, message: 'Connection test initiated' });
  }, []);

  const handleLoadFolders = useCallback(async (accountId: string) => {
    try {
      const response = await backupApi.accounts.folders(accountId);
      return response;
    } catch {
      return [];
    }
  }, []);

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: { ...defaultFormData, ...storeWizard.data } as any,
    mode: 'onChange',
  });

  const watchBackupType = form.watch('backupType');
  const watchDestination = form.watch('destination');
  const watchSchedule = form.watch('schedule');

  const handleNext = useCallback(async () => {
    const stepId = wizardSteps[currentStep].id;
    const schema = stepValidationSchemas[stepId];
    if (schema) {
      const result = await form.trigger(stepId.split('.') as any);
      if (!result) return;
    }
    setCompletedSteps(prev => new Set(prev).add(stepId));
    completeWizardStep(stepId);
    setCurrentStep(prev => prev + 1);
    setWizardStep(currentStep + 1);
  }, [currentStep, form, completeWizardStep, setWizardStep]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => prev - 1);
    setWizardStep(currentStep - 1);
  }, [currentStep, setWizardStep]);

  const handleSubmit = async (data: WizardFormData) => {
    setIsSubmitting(true);
    try {
      const accountId = selectedAccountId || storeWizard.data.accountId;
      if (!accountId) throw new Error('No account selected');

      const jobData = {
        accountId,
        name: data.jobName,
        description: data.jobDescription,
        backupType: data.backupType,
        settings: {
          folderSelection: { mode: 'selected' as const, includedFolders: data.folderIds, excludedFolders: [], includeSubfolders: true },
          dateRange: { mode: 'all' as const },
          conflictResolution: 'skip',
          exportFormat: 'eml',
          compression: data.compression,
          storage: data.destination,
          notifications: data.notifications,
          advanced: data.advanced,
        },
      };

      const job = await backupApi.jobs.create(jobData as any);

      if (data.schedule.frequency !== 'once') {
        await backupApi.schedules.create({
          jobId: job.id,
          name: `${data.jobName} Schedule`,
          frequency: data.schedule.frequency,
          timezone: data.schedule.timezone,
          startDate: data.schedule.startDate,
          endDate: data.schedule.endDate,
          time: data.schedule.time,
          daysOfWeek: data.schedule.daysOfWeek,
          dayOfMonth: data.schedule.dayOfMonth,
          weekOfMonth: data.schedule.weekOfMonth,
          quietHours: data.schedule.quietHours,
          enabled: true,
          maxRetries: 3,
        } as any);
      }

      if (data.schedule.runNow) {
        await backupApi.jobs.start(job.id);
      }

      toast.success('Backup job created successfully!');
      resetWizard();
      setCurrentStep(0);
      form.reset(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create backup job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepData = wizardSteps[currentStep];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <StepProgress
          steps={wizardSteps.map((s, i) => ({
            id: s.id,
            label: s.title,
            completed: completedSteps.has(s.id) || i < currentStep,
            current: i === currentStep,
          }))}
          variant="horizontal"
          size="md"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepData.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card variant="elevated" padding="lg">
            <CardHeader
              title={currentStepData.title}
              subtitle={currentStepData.description}
              icon={<currentStepData.icon className="w-5 h-5" />}
            />
            <CardContent>
              <form onSubmit={form.handleSubmit(handleSubmit)}>
                {renderStep()}
                <CardFooter divider={false}>
                  <div className="flex justify-between w-full">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBack}
                      disabled={currentStep === 0}
                      leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Back
                    </Button>
                    {currentStep === wizardSteps.length - 1 ? (
                      <Button type="submit" variant="brand" rightIcon={<Save className="w-4 h-4" />} loading={isSubmitting}>
                        Create Backup Job
                      </Button>
                    ) : (
                      <Button type="button" variant="brand" onClick={handleNext} rightIcon={<ChevronRight className="w-4 h-4" />}>
                        Next
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  function renderStep() {
    switch (currentStepData.id) {
      case 'provider':
        return <ProviderStep form={form} accounts={accounts} selectedAccountId={selectedAccountId} setSelectedAccountId={setSelectedAccountId} testResult={testResult} onTest={handleTestConnection} />;
      case 'account':
        return <AccountStep form={form} accounts={accounts} selectedAccountId={selectedAccountId} setSelectedAccountId={setSelectedAccountId} onTest={handleTestConnection} testResult={testResult} />;
      case 'type':
        return <BackupTypeStep form={form} />;
      case 'folders':
        return <FoldersStep form={form} folders={folders} accountId={selectedAccountId} onLoadFolders={handleLoadFolders} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders} setFolders={setFolders} />;
      case 'filters':
        return <FiltersStep form={form} />;
      case 'destination':
        return <DestinationStep form={form} />;
      case 'schedule':
        return <ScheduleStep form={form} />;
      case 'review':
        return <ReviewStep form={form} watchBackupType={watchBackupType} watchDestination={watchDestination} watchSchedule={watchSchedule} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  }
});

BackupWizard.displayName = 'BackupWizard';

export default BackupWizard;

function ProviderStep({ form, accounts, selectedAccountId, setSelectedAccountId, testResult, onTest }: any) {
  const providers = [
    { id: 'gmail', name: 'Gmail', logo: '📧', color: 'bg-red-500', oauth: true },
    { id: 'outlook', name: 'Outlook.com', logo: '📮', color: 'bg-blue-600', oauth: true },
    { id: 'office365', name: 'Microsoft 365', logo: '🏢', color: 'bg-blue-700', oauth: true },
    { id: 'yahoo', name: 'Yahoo Mail', logo: '📬', color: 'bg-purple-600', oauth: true },
    { id: 'icloud', name: 'iCloud Mail', logo: '☁️', color: 'bg-gray-500', oauth: true },
    { id: 'zoho', name: 'Zoho Mail', logo: '📧', color: 'bg-orange-500', oauth: true },
    { id: 'imap', name: 'Other IMAP', logo: '📫', color: 'bg-slate-500', oauth: false },
  ];

  return (
    <div className="space-y-6">
      <p className="text-slate-400">Select your email provider to begin setup</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {providers.map(provider => (
          <motion.button
            key={provider.id}
            type="button"
            onClick={() => { setSelectedAccountId(provider.id); form.setValue('provider', provider.id); }}
            className={cn(
              'relative p-6 rounded-xl border-2 transition-all',
              'hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10',
              selectedAccountId === provider.id
                ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20'
                : 'border-white/10 bg-white/5'
            )}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3', provider.color)}>
              {provider.logo}
            </div>
            <h4 className="font-semibold text-white">{provider.name}</h4>
            {provider.oauth && <Badge variant="brand" size="sm" className="mt-2">OAuth</Badge>}
            {selectedAccountId === provider.id && (
              <motion.div
                className="absolute inset-0 border-2 border-brand-500 rounded-xl pointer-events-none"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {selectedAccountId && (
        <motion.div className="p-4 bg-white/5 rounded-xl border border-white/10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h4 className="font-medium text-white mb-3">Connection Method</h4>
          <div className="flex flex-wrap gap-4">
            {providers.find(p => p.id === selectedAccountId)?.oauth && (
              <Button variant="brand" leftIcon={<ExternalLink className="w-4 h-4" />} onClick={onTest}>
                Connect with OAuth
              </Button>
            )}
            <Button variant="outline" leftIcon={<Shield className="w-4 h-4" />} onClick={() => form.setValue('authMethod', 'app_password')}>
              App Password
            </Button>
            <Button variant="outline" leftIcon={<Mail className="w-4 h-4" />} onClick={() => form.setValue('authMethod', 'password')}>
              IMAP Password
            </Button>
          </div>
          {testResult && (
            <div className={cn('mt-3 p-3 rounded-lg', testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20')}>
              <div className="flex items-center gap-2">
                {testResult.success ? <Check className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                <span className={cn(testResult.success ? 'text-emerald-400' : 'text-red-400')}>{testResult.message}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function AccountStep({ form, accounts, selectedAccountId, setSelectedAccountId, onTest, testResult }: any) {
  const [authTab, setAuthTab] = useState('oauth');

  if (!selectedAccountId || selectedAccountId === 'imap') {
    return (
      <div className="space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-center text-slate-400">Please select a provider first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-400">Configure your account connection</p>
      <Tabs value={authTab} onValueChange={setAuthTab} className="space-y-4">
        <TabsList className="bg-white/5">
          <TabsTrigger value="oauth">OAuth 2.0</TabsTrigger>
          <TabsTrigger value="app_password">App Password</TabsTrigger>
          <TabsTrigger value="password">IMAP Password</TabsTrigger>
        </TabsList>
        <TabsContent value="oauth">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-slate-400 mb-4">Click "Connect with OAuth" to authorize MailSavior to access your email account.</p>
            <Button variant="brand" className="w-full" leftIcon={<ExternalLink className="w-4 h-4" />} onClick={onTest}>
              Connect with OAuth
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="app_password">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">IMAP Host</label>
                <Input placeholder="imap.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">IMAP Port</label>
                <Input type="number" value={993} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <Input type="email" placeholder="you@gmail.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">App Password</label>
              <Input type="password" placeholder="••••••••••••••••" />
              <p className="text-xs text-slate-500 mt-1">Generate an app password from your email provider settings</p>
            </div>
            <Button variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => {}}>Test Connection</Button>
          </div>
        </TabsContent>
        <TabsContent value="password">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">IMAP Host</label>
                <Input placeholder="imap.example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">IMAP Port</label>
                <Input type="number" value={993} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">SMTP Host</label>
                <Input placeholder="smtp.example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">SMTP Port</label>
                <Input type="number" value={465} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => {}}>Test Connection</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BackupTypeStep({ form }: any) {
  const types = [
    { value: 'full', title: 'Full Backup', description: 'Backup all emails from selected folders', icon: Database, recommended: false },
    { value: 'incremental', title: 'Incremental Backup', description: 'Only backup new/changed emails since last backup', icon: RefreshCw, recommended: true },
    { value: 'new_only', title: 'New Emails Only', description: 'Backup only emails received after job creation', icon: Mail, recommended: false },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400">Choose how you want to backup your emails</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {types.map(type => (
          <motion.label
            key={type.value}
            className={cn(
              'relative p-6 rounded-xl border-2 cursor-pointer transition-all',
              form.watch('backupType') === type.value
                ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20'
                : 'border-white/10 bg-white/5 hover:border-brand-500/50'
            )}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <input type="radio" value={type.value} {...form.register('backupType')} className="sr-only" />
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <type.icon className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-white">{type.title}</h4>
            <p className="text-sm text-slate-400 mt-1">{type.description}</p>
            {type.recommended && <Badge variant="brand" size="sm" className="mt-2">Recommended</Badge>}
          </motion.label>
        ))}
      </div>
      <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          <div className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...form.register('jobDescription')} className="sr-only" />
            <span className="text-slate-300">Add job description</span>
          </div>
        </label>
        <textarea
          placeholder="Optional description for this backup job..."
          className="mt-2 w-full h-24 px-3.5 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all resize-vertical"
          {...form.register('jobDescription')}
        />
      </div>
    </div>
  );
}

function FoldersStep({ form, folders, accountId, onLoadFolders, expandedFolders, setExpandedFolders, setFolders }: any) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accountId) {
      setLoading(true);
      onLoadFolders(accountId).then((data: unknown) => { setFolders(data); setLoading(false); });
    }
  }, [accountId, onLoadFolders]);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev: Set<string>) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string, selected: boolean) => {
    const current = form.getValues('folderIds') || [];
    form.setValue('folderIds', selected ? [...current, id] : current.filter((f: string) => f !== id));
  };

  const renderFolderTree = (items: any[], level = 0) => (
    <div className={level > 0 ? 'ml-6 border-l border-white/10 pl-4' : ''}>
      {items.map(item => (
        <motion.div key={item.id} className="py-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <label className={cn('flex items-center gap-3 cursor-pointer', item.children?.length && 'group')}>
            <input
              type="checkbox"
              checked={form.watch('folderIds').includes(item.id)}
              onChange={() => toggleSelect(item.id, !form.watch('folderIds').includes(item.id))}
              className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
            />
            {item.children?.length && (
              <button
                type="button"
                onClick={() => toggleFolder(item.id)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className={cn('w-4 h-4 transition-transform', expandedFolders.has(item.id) && 'rotate-90')} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{item.name}</p>
              <p className="text-xs text-slate-500">{item.emailCount.toLocaleString()} emails · {formatBytes(item.size)}</p>
            </div>
          </label>
          {item.children?.length && expandedFolders.has(item.id) && renderFolderTree(item.children, level + 1)}
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400">Select folders to include in backup</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => form.setValue('folderIds', folders.flatMap((f: any) => [f.id, ...(f.children?.map((c: any) => c.id) || [])]))}>Select All</Button>
          <Button variant="ghost" size="sm" onClick={() => form.setValue('folderIds', [])}>Clear</Button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : folders.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          {renderFolderTree(folders)}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <FolderArchive className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p>No folders found</p>
        </div>
      )}
      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-sm text-slate-400">
          {form.watch('folderIds').length} of {folders.reduce((a: number, f: any) => a + 1 + (f.children?.length || 0), 0)} folders selected
        </p>
      </div>
    </div>
  );
}

function FiltersStep({ form }: any) {
  const filters = form.watch('filters') || [];

  const addFilter = () => {
    const newFilter = {
      id: crypto.randomUUID(),
      field: 'date',
      operator: 'between',
      value: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
      enabled: true,
    };
    form.setValue('filters', [...filters, newFilter]);
  };

  const updateFilter = (index: number, data: Partial<any>) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...data };
    form.setValue('filters', updated);
  };

  const removeFilter = (index: number) => {
    form.setValue('filters', filters.filter((_: unknown, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400">Apply filters to limit which emails are backed up</p>
        <Button variant="outline" size="sm" onClick={addFilter} leftIcon={<Plus className="w-4 h-4" />}>Add Filter</Button>
      </div>
      {filters.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border-2 border-dashed border-white/10 rounded-xl">
          <Filter className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p>No filters applied</p>
          <p className="text-sm mt-1">All emails in selected folders will be backed up</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filters.map((filter: any, index: number) => (
            <motion.div
              key={filter.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <Badge variant={filter.enabled ? 'success' : 'neutral'} size="sm">{filter.enabled ? 'Active' : 'Disabled'}</Badge>
                <Select value={filter.field} onValueChange={v => updateFilter(index, { field: v })} className="w-32">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="sender">Sender</SelectItem>
                    <SelectItem value="recipient">Recipient</SelectItem>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="has_attachment">Has Attachment</SelectItem>
                    <SelectItem value="attachment_name">Attachment Name</SelectItem>
                    <SelectItem value="read">Read Status</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="label">Label</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filter.operator} onValueChange={v => updateFilter(index, { operator: v })} className="w-32">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="not_contains">Not Contains</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="ends_with">Ends With</SelectItem>
                    <SelectItem value="between">Between</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1">
                  {filter.field === 'date' && filter.operator === 'between' && (
                    <div className="flex gap-2">
                      <Input type="date" value={typeof filter.value === 'object' ? filter.value.from : ''} onChange={e => updateFilter(index, { value: { ...(filter.value as object), from: e.target.value } })} />
                      <span className="flex items-center text-slate-500">to</span>
                      <Input type="date" value={typeof filter.value === 'object' ? filter.value.to : ''} onChange={e => updateFilter(index, { value: { ...(filter.value as object), to: e.target.value } })} />
                    </div>
                  )}
                  {['sender', 'recipient', 'subject', 'attachment_name', 'label'].includes(filter.field) && (
                    <Input placeholder="Enter value" value={typeof filter.value === 'string' ? filter.value : ''} onChange={e => updateFilter(index, { value: e.target.value })} />
                  )}
                  {filter.field === 'has_attachment' && (
                    <Select value={filter.value as string} onValueChange={v => updateFilter(index, { value: v === 'true' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {filter.field === 'read' && (
                    <Select value={filter.value as string} onValueChange={v => updateFilter(index, { value: v === 'true' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Read</SelectItem>
                        <SelectItem value="false">Unread</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {filter.field === 'size' && (
                    <div className="flex gap-2">
                      <Select value={filter.operator} onValueChange={v => updateFilter(index, { operator: v })} className="w-32">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Size (MB)" value={typeof filter.value === 'number' ? filter.value : ''} onChange={e => updateFilter(index, { value: parseInt(e.target.value) })} />
                    </div>
                  )}
                </div>
                <Switch checked={filter.enabled} onChange={v => updateFilter(index, { enabled: v })} />
                <Button variant="ghost" size="xs" onClick={() => removeFilter(index)} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function DestinationStep({ form }: any) {
  return (
    <div className="space-y-6">
      <p className="text-slate-400">Choose where to store your backups</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { value: 'local', title: 'Local Folder', description: 'Store on this machine', icon: Database },
          { value: 'external', title: 'External Drive', description: 'USB/External hard drive', icon: HardDrive },
          { value: 'network', title: 'Network Folder', description: 'NAS or network share', icon: FolderArchive },
          { value: 'cloud', title: 'Cloud Storage', description: 'S3, GCS, Azure Blob (Coming Soon)', icon: Cloud },
        ].map(dest => (
          <motion.label
            key={dest.value}
            className={cn(
              'relative p-6 rounded-xl border-2 cursor-pointer transition-all',
              form.watch('destination.location') === dest.value
                ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20'
                : 'border-white/10 bg-white/5 hover:border-brand-500/50'
            )}
            whileHover={{ y: -2 }}
          >
            <input type="radio" value={dest.value} {...form.register('destination.location')} className="sr-only" />
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <dest.icon className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-white">{dest.title}</h4>
            <p className="text-sm text-slate-400">{dest.description}</p>
          </motion.label>
        ))}
      </div>

      <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <label className="block text-sm font-medium text-slate-300 mb-1">Backup Path</label>
        <div className="flex gap-2">
          <Input
            placeholder="/backups/mailsavior"
            value={form.watch('destination.path')}
            onChange={e => form.setValue('destination.path', e.target.value, { shouldValidate: true })}
          />
          <Button variant="outline" leftIcon={<FolderArchive className="w-4 h-4" />}>Browse</Button>
        </div>
        <p className="text-xs text-slate-500">Folder will be created if it doesn't exist</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300">
          <input type="checkbox" {...form.register('destination.validateOnStart')} className="sr-only" />
          <span className="text-slate-300">Validate destination on start</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300">
          <input type="checkbox" {...form.register('destination.createFolderStructure')} className="sr-only" />
          <span className="text-slate-300">Create folder structure</span>
        </label>
      </div>

      <Select value={form.watch('destination.folderStructure')} onValueChange={v => form.setValue('destination.folderStructure', v)}>
        <SelectTrigger><SelectValue placeholder="Folder Structure" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="flat">Flat (all files in one folder)</SelectItem>
          <SelectItem value="by_account">By Account</SelectItem>
          <SelectItem value="by_date">By Date (Year/Month)</SelectItem>
          <SelectItem value="by_folder">By Source Folder</SelectItem>
        </SelectContent>
      </Select>

      {form.watch('destination.location') === 'cloud' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400">
            <Info className="w-5 h-5" />
            <span>Cloud storage support coming soon. Currently only local, external, and network destinations are available.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleStep({ form }: any) {
  const frequency = form.watch('schedule.frequency');

  return (
    <div className="space-y-6">
      <p className="text-slate-400">Configure when this backup should run</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { value: 'once', title: 'Run Once', icon: Clock },
          { value: 'daily', title: 'Daily', icon: RefreshCw },
          { value: 'weekly', title: 'Weekly', icon: Calendar },
          { value: 'monthly', title: 'Monthly', icon: Calendar },
          { value: 'cron', title: 'Custom Cron', icon: Settings },
        ].map(freq => (
          <motion.label
            key={freq.value}
            className={cn(
              'relative p-4 rounded-xl border-2 cursor-pointer text-center transition-all',
              frequency === freq.value
                ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20'
                : 'border-white/10 bg-white/5 hover:border-brand-500/50'
            )}
            whileHover={{ y: -2 }}
          >
            <input type="radio" value={freq.value} {...form.register('schedule.frequency')} className="sr-only" />
            <freq.icon className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="font-medium text-white">{freq.title}</div>
          </motion.label>
        ))}
      </div>

      <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Timezone</label>
            <Select value={form.watch('schedule.timezone')} onValueChange={v => form.setValue('schedule.timezone', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Intl.supportedValuesOf('timeZone').map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
            <Input type="date" {...form.register('schedule.startDate')} />
          </div>
        </div>

        {frequency !== 'once' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Time</label>
            <Input type="time" {...form.register('schedule.time')} />
          </div>
        )}

        {frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <Label key={day} className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-white/5 rounded-lg border border-white/10 hover:border-brand-500/50">
                  <input type="checkbox" value={i} {...form.register(`schedule.daysOfWeek.${i}`)} className="sr-only" />
                  <span className="text-sm">{day}</span>
                </Label>
              ))}
            </div>
          </div>
        )}

        {frequency === 'monthly' && (
          <div>
            <Label>Day of Month</Label>
            <Input type="number" min={1} max={28} {...form.register('schedule.dayOfMonth')} />
          </div>
        )}

        {frequency === 'cron' && (
          <div>
            <Label>Cron Expression</Label>
            <Input placeholder="0 2 * * *" {...form.register('schedule.cronExpression')} />
            <p className="text-xs text-slate-500 mt-1">Standard cron format (minute hour day month weekday)</p>
          </div>
        )}

        <div className="pt-4 border-t border-white/10">
          <Label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...form.register('schedule.runNow')} className="sr-only" />
            <span className="text-slate-300">Run immediately after creation</span>
          </Label>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ form, watchBackupType, watchDestination, watchSchedule, onSubmit, isSubmitting }: any) {
  const data = form.getValues();

  const formatFilters = (filters: any[]) => filters.map(f => `${f.field} ${f.operator} ${JSON.stringify(f.value)}`).join(', ') || 'None';

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      <p className="text-slate-400">Review your backup job configuration</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReviewSection title="Basic Settings">
          <ReviewRow label="Job Name" value={data.jobName} />
          <ReviewRow label="Description" value={data.jobDescription || '—'} />
          <ReviewRow label="Backup Type" value={watchBackupType} />
        </ReviewSection>

        <ReviewSection title="Folders & Filters">
          <ReviewRow label="Folders Selected" value={data.folderIds.length} />
          <ReviewRow label="Filters" value={formatFilters(data.filters)} />
        </ReviewSection>

        <ReviewSection title="Destination">
          <ReviewRow label="Location" value={watchDestination.location} />
          <ReviewRow label="Path" value={watchDestination.path} />
          <ReviewRow label="Structure" value={watchDestination.folderStructure} />
        </ReviewSection>

        <ReviewSection title="Compression & Encryption">
          <ReviewRow label="Compression" value={data.compression.enabled ? `${data.compression.algorithm} (level ${data.compression.level})` : 'Disabled'} />
          <ReviewRow label="Encryption" value={data.encryption.enabled ? `${data.encryption.algorithm} (${data.encryption.keyDerivation})` : 'Disabled'} />
        </ReviewSection>

        <ReviewSection title="Retention & Notifications">
          <ReviewRow label="Retention" value={data.retention.enabled ? `Keep last ${data.retention.keepLast}, ${data.retention.keepDays} days, ${formatBytes(data.retention.keepSize)}` : 'Disabled'} />
          <ReviewRow label="Notifications" value={data.notifications.channels.join(', ')} />
        </ReviewSection>

        <ReviewSection title="Schedule">
          <ReviewRow label="Frequency" value={watchSchedule.frequency} />
          {watchSchedule.frequency !== 'once' && <ReviewRow label="Time" value={`${watchSchedule.time} (${watchSchedule.timezone})`} />}
          <ReviewRow label="Run Now" value={watchSchedule.runNow ? 'Yes' : 'No'} />
        </ReviewSection>
      </div>

      <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
        <Button variant="brand" className="w-full" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Backup Job'}
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <h4 className="font-medium text-white mb-3 pb-2 border-b border-white/10">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}




import { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Settings, Filter, HardDrive, Check, ChevronLeft, ChevronRight,
  Save, FileArchive, AlertCircle, Plus, X, RefreshCw
} from 'lucide-react';
import { StepProgress } from '@/features/backup/components/ui/Progress';
import { Card, CardHeader, CardContent, CardFooter } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Progress } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import { formatBytes } from '@/utils/format';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/features/backup/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/backup/components/ui/Tabs';
import { UploadZone } from '../components/ui/UploadZone';
import { FileCard } from '../components/ui/FileCard';
import { FormatSelector } from '../components/ui/FormatSelector';
import { useConverterStore } from '../store';
import { useUploadFile, useCreateConversionJob, useStartConversion } from '../hooks';
import { toast } from 'react-hot-toast';
import type {
  InputFileInfo, OutputFormat, ConversionOptions, ConversionFilters,
  ConversionDestination, ConversionWizardData,
} from '../types';
import { INPUT_FORMATS, OUTPUT_FORMATS, VALID_FORMAT_COMBINATIONS } from '../types';

const WIZARD_STEPS = [
  { id: 'files', title: 'Files', description: 'Select input files', icon: Upload },
  { id: 'output', title: 'Output', description: 'Choose output format', icon: FileArchive },
  { id: 'options', title: 'Options', description: 'Conversion options', icon: Settings },
  { id: 'filters', title: 'Filters', description: 'Advanced filters', icon: Filter },
  { id: 'destination', title: 'Destination', description: 'Output location', icon: HardDrive },
  { id: 'review', title: 'Review', description: 'Confirm settings', icon: Check },
];

function getValidOutputFormats(inputFormats: string[]): OutputFormat[] {
  if (inputFormats.length === 0) return [];
  const allFormats = new Set<OutputFormat>();
  for (const fmt of inputFormats) {
    const valid = (VALID_FORMAT_COMBINATIONS as Record<string, OutputFormat[]>)[fmt];
    if (valid) valid.forEach((f) => allFormats.add(f));
  }
  return Array.from(allFormats);
}

export const ConversionWizard = memo(() => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const uploadFile = useUploadFile();
  const createJob = useCreateConversionJob();
  const startConversion = useStartConversion();

  const {
    uploadedFiles, setUploadedFiles, addUploadedFile, updateUploadedFile, removeUploadedFile,
    wizard, setWizardStep, setWizardData, completeWizardStep, resetWizard
  } = useConverterStore();

  const [files, setFiles] = useState<InputFileInfo[]>([]);
  const [outputFormats, setOutputFormats] = useState<string[]>([]);
  const [options, setOptions] = useState<ConversionOptions>({
    preserveFolderStructure: true,
    preserveMetadata: true,
    preserveAttachments: true,
    includeHeaders: true,
    includeDeletedItems: false,
    mergeOutputFiles: false,
    splitLargeFiles: false,
    splitSizeMb: 100,
    namingConvention: 'original',
  });
  const [filters, setFilters] = useState<ConversionFilters>({
    readStatus: 'all',
    starred: false,
  });
  const [destination, setDestination] = useState<ConversionDestination>({
    location: 'local',
    path: '/converted',
  });

  const validOutputFormats = getValidOutputFormats([...new Set(files.map(f => f.format))]);

  const handleFilesUpload = useCallback(async (newFiles: File[]) => {
    for (const file of newFiles) {
      const id = crypto.randomUUID();
      const inputFormat = file.name.split('.').pop()?.toLowerCase() || '';
      const fileInfo: InputFileInfo = {
        id,
        name: file.name,
        format: inputFormat as any,
        size: file.size,
        status: 'uploading',
        progress: 0,
        uploadedSize: 0,
        uploadSpeed: 0,
        file,
      };
      addUploadedFile(fileInfo);
      setFiles(prev => [...prev, fileInfo]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        await uploadFile.mutateAsync({ formData, onProgress: (p) => {
          updateUploadedFile(id, { progress: p });
          setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: p } : f));
        }});
        updateUploadedFile(id, { status: 'valid', progress: 100 });
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'valid', progress: 100 } : f));
      } catch {
        updateUploadedFile(id, { status: 'failed', error: 'Upload failed' });
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'failed', error: 'Upload failed' } : f));
      }
    }
  }, [addUploadedFile, updateUploadedFile, uploadFile]);

  const handleRemoveFile = useCallback((id: string) => {
    removeUploadedFile(id);
    setFiles(prev => prev.filter(f => f.id !== id));
  }, [removeUploadedFile]);

  const handleNext = useCallback(() => {
    setCompletedSteps(prev => new Set(prev).add(WIZARD_STEPS[currentStep].id));
    completeWizardStep(WIZARD_STEPS[currentStep].id);
    setCurrentStep(prev => prev + 1);
  }, [currentStep, completeWizardStep]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const validFiles = files.filter(f => f.status === 'valid' || f.status === 'uploaded');
      if (validFiles.length === 0) throw new Error('No valid files to convert');
      if (outputFormats.length === 0) throw new Error('Select at least one output format');

      const job = await createJob.mutateAsync({
        name: `Conversion ${new Date().toLocaleDateString()}`,
        fileIds: validFiles.map(f => f.id),
        outputFormats: outputFormats as OutputFormat[],
        options,
        filters,
        destination,
      });

      toast.success('Conversion job created!');
      await startConversion.mutateAsync(job.id);
      toast.success('Conversion started!');
      resetWizard();
      navigate(`/dashboard/convert/progress/${job.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create conversion');
    }
  }, [files, outputFormats, options, filters, destination, createJob, startConversion, resetWizard, navigate]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <StepProgress
          steps={WIZARD_STEPS.map((s, i) => ({
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
          key={WIZARD_STEPS[currentStep].id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card variant="elevated" padding="lg">
            {(() => {
              const StepIcon = WIZARD_STEPS[currentStep].icon
              return (
                <CardHeader
                  title={WIZARD_STEPS[currentStep].title}
                  subtitle={WIZARD_STEPS[currentStep].description}
                  icon={<StepIcon className="w-5 h-5" />}
                />
              )
            })()}
            <CardContent>
              {currentStep === 0 && (
                <div className="space-y-6">
                  <UploadZone onFiles={handleFilesUpload} />
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">{files.length} file(s) uploaded</p>
                      {files.map(file => (
                        <FileCard key={file.id} file={file} onRemove={handleRemoveFile} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <FormatSelector
                    label="Output Format(s)"
                    formats={validOutputFormats.map(f => ({ format: f, description: `Convert to .${f}` }))}
                    selected={outputFormats}
                    onChange={setOutputFormats}
                    multiple
                  />
                  {outputFormats.length > 0 && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-sm text-slate-400">
                        Selected: {outputFormats.map(f => f.toUpperCase()).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Conversion Options</h4>
                  {[
                    { key: 'preserveFolderStructure', label: 'Preserve Folder Structure', desc: 'Keep original folder hierarchy' },
                    { key: 'preserveMetadata', label: 'Preserve Metadata', desc: 'Keep email headers and metadata' },
                    { key: 'preserveAttachments', label: 'Preserve Attachments', desc: 'Include all email attachments' },
                    { key: 'includeHeaders', label: 'Include Headers', desc: 'Include full email headers' },
                    { key: 'includeDeletedItems', label: 'Include Deleted Items', desc: 'Recover and include deleted emails' },
                    { key: 'mergeOutputFiles', label: 'Merge Output Files', desc: 'Combine all emails into single file' },
                    { key: 'splitLargeFiles', label: 'Split Large Files', desc: 'Split output when exceeding size limit' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:border-white/20">
                      <div>
                        <p className="text-sm font-medium text-white">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={(options as any)[opt.key]}
                          onChange={(e) => setOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className={cn('w-10 h-6 rounded-full transition-colors', (options as any)[opt.key] ? 'bg-brand-500' : 'bg-white/10')}>
                          <div className={cn('w-4 h-4 bg-white rounded-full transition-transform mt-1', (options as any)[opt.key] ? 'translate-x-5' : 'translate-x-1')} />
                        </div>
                      </div>
                    </label>
                  ))}
                  {options.splitLargeFiles && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Max Split Size (MB)</label>
                      <Input
                        type="number"
                        value={options.splitSizeMb}
                        onChange={(e) => setOptions(prev => ({ ...prev, splitSizeMb: parseInt(e.target.value) || 100 }))}
                        min={1}
                        max={1000}
                      />
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Advanced Filters</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Date Range Start</label>
                      <Input type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Date Range End</label>
                      <Input type="date" value={filters.dateTo || ''} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Sender</label>
                      <Input placeholder="sender@example.com" value={filters.sender || ''} onChange={(e) => setFilters(prev => ({ ...prev, sender: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Recipient</label>
                      <Input placeholder="recipient@example.com" value={filters.recipient || ''} onChange={(e) => setFilters(prev => ({ ...prev, recipient: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Subject Contains</label>
                      <Input placeholder="Subject keyword" value={filters.subject || ''} onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Read Status</label>
                      <Select value={filters.readStatus || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, readStatus: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="unread">Unread</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.hasAttachments === true} onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked || undefined }))} className="rounded border-white/20 text-brand-500" />
                      <span className="text-sm text-slate-300">Has Attachments</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.starred === true} onChange={(e) => setFilters(prev => ({ ...prev, starred: e.target.checked || undefined }))} className="rounded border-white/20 text-brand-500" />
                      <span className="text-sm text-slate-300">Starred</span>
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Output Location</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'local', label: 'Local Folder', desc: 'Store on this machine' },
                      { value: 'external', label: 'External Drive', desc: 'USB/External drive' },
                      { value: 'network', label: 'Network Folder', desc: 'NAS or network share' },
                    ].map(loc => (
                      <button
                        key={loc.value}
                        onClick={() => setDestination(prev => ({ ...prev, location: loc.value as any }))}
                        className={cn(
                          'p-4 rounded-xl border-2 text-center transition-all',
                          destination.location === loc.value
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/30'
                        )}
                      >
                        <p className="font-medium text-white">{loc.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{loc.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Destination Path</label>
                    <Input
                      placeholder="/converted"
                      value={destination.path}
                      onChange={(e) => setDestination(prev => ({ ...prev, path: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <h4 className="font-medium text-white">Review Your Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h5 className="text-sm font-medium text-slate-400 mb-2">Input Files</h5>
                      <p className="text-white">{files.length} file(s)</p>
                      <p className="text-xs text-slate-500 mt-1">{formatBytes(files.reduce((s, f) => s + f.size, 0))} total</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h5 className="text-sm font-medium text-slate-400 mb-2">Output Format(s)</h5>
                      <div className="flex flex-wrap gap-1">
                        {outputFormats.map(f => (
                          <Badge key={f} variant="brand" size="sm">{f.toUpperCase()}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h5 className="text-sm font-medium text-slate-400 mb-2">Options</h5>
                      <ul className="text-sm text-white space-y-1">
                        {options.preserveFolderStructure && <li>✓ Preserve folder structure</li>}
                        {options.preserveMetadata && <li>✓ Preserve metadata</li>}
                        {options.preserveAttachments && <li>✓ Preserve attachments</li>}
                        {options.includeHeaders && <li>✓ Include headers</li>}
                      </ul>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h5 className="text-sm font-medium text-slate-400 mb-2">Destination</h5>
                      <p className="text-white">{destination.location}</p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">{destination.path}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
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
                {currentStep === WIZARD_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    variant="brand"
                    onClick={handleSubmit}
                    loading={createJob.isPending || startConversion.isPending}
                    rightIcon={<Save className="w-4 h-4" />}
                  >
                    Start Conversion
                  </Button>
                ) : (
                  <Button type="button" variant="brand" onClick={handleNext} rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Next
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

ConversionWizard.displayName = 'ConversionWizard';

export default ConversionWizard;

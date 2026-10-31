import { useState, useEffect } from 'react';
import { ModelMetadata, ComparisonJobResponse, ModelRunDetail } from '@transcode-lab/api-contracts';
import { apiClient } from './api/client';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { WorkbenchView } from './views/WorkbenchView';
import { ResultsView } from './views/ResultsView';
import { RepairView } from './views/RepairView';
import { BenchmarkView } from './views/BenchmarkView';
import { HistoryView } from './views/HistoryView';
import { RegistryView } from './views/RegistryView';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workbench');
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [systemStatus, setSystemStatus] = useState<string>('checking...');
  const [activeJob, setActiveJob] = useState<ComparisonJobResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [repairTargetRun, setRepairTargetRun] = useState<ModelRunDetail | null>(null);

  const loadModels = async () => {
    try {
      const data = await apiClient.getModels();
      setModels(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHealth = async () => {
    try {
      const h = await apiClient.getHealth();
      setSystemStatus(h.status);
    } catch (e) {
      setSystemStatus('degraded');
    }
  };

  useEffect(() => {
    loadModels();
    loadHealth();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll active job while running
  useEffect(() => {
    if (!activeJob || ['COMPLETED', 'FAILED'].includes(activeJob.status)) return;

    const pollInterval = setInterval(async () => {
      try {
        const updated = await apiClient.getComparison(activeJob.id);
        setActiveJob(updated);
      } catch (err) {
        console.error('Job polling error:', err);
      }
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [activeJob]);

  const handleWorkbenchSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const job = await apiClient.createComparison(data);
      setActiveJob(job);
      setActiveTab('results');
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRepair = (run: ModelRunDetail) => {
    setRepairTargetRun(run);
    setActiveTab('repair');
  };

  const handleSelectHistoricalJob = (job: ComparisonJobResponse) => {
    setActiveJob(job);
    setActiveTab('results');
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (!activeJob) return;
    const url = apiClient.getReportDownloadUrl(activeJob.id, format);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcode_${activeJob.id}.${format}`;
    a.click();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas-default text-text-primary">
      <Header
        systemStatus={systemStatus}
        activeJobId={activeJob?.id}
        onExport={handleExport}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasActiveJob={Boolean(activeJob && ['RUNNING', 'QUEUED'].includes(activeJob.status))}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'workbench' && (
            <WorkbenchView
              models={models}
              isSubmitting={isSubmitting}
              onSubmit={handleWorkbenchSubmit}
            />
          )}

          {activeTab === 'results' && (
            <ResultsView
              job={activeJob}
              onStartRepair={handleStartRepair}
            />
          )}

          {activeTab === 'repair' && (
            <RepairView
              initialRun={repairTargetRun || activeJob?.modelRuns[0] || null}
              availableModels={models}
            />
          )}

          {activeTab === 'benchmarks' && (
            <BenchmarkView
              availableModels={models}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              onSelectJob={handleSelectHistoricalJob}
            />
          )}

          {activeTab === 'registry' && (
            <RegistryView
              models={models}
              onRefreshModels={loadModels}
            />
          )}
        </main>
      </div>
    </div>
  );
}
export default App;

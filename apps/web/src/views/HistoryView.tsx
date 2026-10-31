import React, { useState, useEffect } from 'react';
import { ComparisonJobResponse } from '@transcode-lab/api-contracts';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { History, RefreshCw, Clock } from 'lucide-react';

interface HistoryViewProps {
  onSelectJob: (job: ComparisonJobResponse) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<ComparisonJobResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getHistory(50, 0);
      setJobs(res.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredJobs = jobs.filter(
    (j) =>
      j.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.sourceLanguage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.targetLanguage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.entryPoint.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden font-mono">
      {/* History Header */}
      <div className="h-14 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between select-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">
              Run History & Persistent Evidence
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated font-mono text-text-secondary border border-border-subtle">
              SQLite WAL Storage
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Immutable snapshots of model candidates, validation gates, test outputs, and compiler diagnostics
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHistory}
            className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="border-b border-border-subtle bg-surface-elevated px-4 py-2 flex items-center justify-between">
        <input
          type="text"
          placeholder="Filter by Job ID, language, entry point..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-72 bg-canvas-default border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-primary"
        />
        <span className="text-xs text-text-tertiary">
          Showing {filteredJobs.length} of {jobs.length} archived runs
        </span>
      </div>

      {/* Table Deck */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredJobs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-text-tertiary text-xs">
            <History className="w-8 h-8 text-border-strong mb-2" />
            <p className="text-sm font-sans font-medium text-text-secondary">No Historical Jobs Found</p>
            <p className="mt-1">Jobs submitted in the Workbench are automatically persisted here.</p>
          </div>
        ) : (
          <div className="border border-border-subtle rounded overflow-hidden bg-surface-base">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-canvas-default text-text-secondary text-[11px] border-b border-border-subtle">
                <tr>
                  <th className="py-2 px-3">Job ID</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Task Direction</th>
                  <th className="py-2 px-3">Entry Function</th>
                  <th className="py-2 px-3">Models Compared</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-[11px]">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-elevated/40">
                    <td className="py-2 px-3 font-semibold text-accent-subtle">{j.id.slice(0, 8)}</td>
                    <td className="py-2 px-3 text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(j.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-text-secondary">
                      {j.sourceLanguage.toUpperCase()} → {j.targetLanguage.toUpperCase()}
                    </td>
                    <td className="py-2 px-3 text-text-primary font-semibold">{j.entryPoint.name}</td>
                    <td className="py-2 px-3 text-text-secondary">
                      {j.modelRuns.length} models
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={j.status} showIcon={false} />
                    </td>
                    <td className="py-2 px-3 text-right space-x-2">
                      <button
                        onClick={() => onSelectJob(j)}
                        className="px-2 py-0.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded text-[11px] font-medium"
                      >
                        Reopen & Inspect
                      </button>
                      <a
                        href={apiClient.getReportDownloadUrl(j.id, 'csv')}
                        download
                        className="px-2 py-0.5 bg-surface-elevated hover:bg-surface-highlight text-text-secondary border border-border-subtle rounded text-[11px]"
                      >
                        CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

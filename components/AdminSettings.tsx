import React, { useEffect, useState } from 'react';

type RuntimeConfig = {
  database: {
    status: string;
    source: string;
  };
  authentication: {
    jwtConfigured: boolean;
  };
  email: {
    configured: boolean;
  };
  ai: {
    configured: boolean;
  };
  notes: string[];
};

const StatusBadge = ({
  ok,
  readyLabel = 'Configured',
  notReadyLabel = 'Not Ready',
}: {
  ok: boolean;
  readyLabel?: string;
  notReadyLabel?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
      ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
    }`}
  >
    {ok ? readyLabel : notReadyLabel}
  </span>
);

const AdminSettings: React.FC = () => {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRuntimeConfig = async () => {
      try {
        const response = await fetch('/api/admin/runtime-config', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch runtime configuration');
        }

        setRuntimeConfig(data);
      } catch (err: any) {
        setError(err.message || 'Unable to load runtime configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuntimeConfig();
  }, []);

  if (isLoading) {
    return <div className="p-10 animate-pulse text-indigo-600 font-black">Loading runtime infrastructure...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>;
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">System Infrastructure</h2>
        <p className="text-slate-500 font-medium">Review the real backend runtime status and active service readiness.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-10 space-y-8 shadow-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900">MongoDB Runtime</h4>
              <p className="text-xs text-slate-500">This reflects the actual database connection state of the running server.</p>
            </div>
            <StatusBadge ok={runtimeConfig?.database.status === 'connected'} readyLabel="Connected" notReadyLabel="Disconnected" />
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Config source:{' '}
            <span className="text-slate-700">
              {runtimeConfig?.database.source === 'environment' ? 'Environment Variables' : 'Local Default Fallback'}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authentication</p>
            <StatusBadge ok={Boolean(runtimeConfig?.authentication.jwtConfigured)} />
            <p className="text-xs text-slate-500">JWT secret availability for session and token security.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Gateway</p>
            <StatusBadge ok={Boolean(runtimeConfig?.email.configured)} />
            <p className="text-xs text-slate-500">SMTP readiness for mail notifications.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Services</p>
            <StatusBadge ok={Boolean(runtimeConfig?.ai.configured)} />
            <p className="text-xs text-slate-500">Gemini key availability for assistant features.</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
        <div className="flex gap-4">
          <div className="text-amber-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 mb-1">Configuration Note</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Runtime infrastructure is controlled by backend environment variables. Changing browser storage does not reconfigure the deployed system.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">System Notes</p>
        <div className="space-y-2">
          {(runtimeConfig?.notes || []).map((note, index) => (
            <p key={index} className="text-sm font-medium text-slate-600">
              {note}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

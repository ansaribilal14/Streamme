// frontend/app/admin/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { streamhub, ProviderInfo } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import {
  Shield, Lock, Database, Activity, Trash2, RefreshCw, Power, PowerOff,
  Plus, Settings as SettingsIcon, Key, Download, AlertTriangle, CheckCircle2, Film,
} from 'lucide-react';

type Tab = 'providers' | 'logs' | 'cache' | 'settings';

export default function AdminPage() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('providers');

  useEffect(() => {
    streamhub.admin.hasPin().then((d) => setHasPin(d.has_pin));
    // auto-unlock if PIN was set this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_pin')) {
      setUnlocked(true);
    }
  }, []);

  const setup = async () => {
    setError('');
    if (setupPin.length < 4 || setupPin.length > 8) {
      setError('PIN must be 4-8 characters');
      return;
    }
    try {
      await streamhub.admin.setupPin(setupPin);
      sessionStorage.setItem('admin_pin', setupPin);
      setUnlocked(true);
      setHasPin(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const verify = async () => {
    setError('');
    try {
      const r = await streamhub.admin.verifyPin(pin);
      if (r.ok) {
        sessionStorage.setItem('admin_pin', pin);
        setUnlocked(true);
      } else {
        setError('Invalid PIN');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (hasPin === null) {
    return <div className="pt-20 text-center"><Spinner size={36} /></div>;
  }

  if (!unlocked) {
    return (
      <div className="pt-20 px-4 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              {hasPin ? <Lock className="w-8 h-8 text-accent" /> : <Shield className="w-8 h-8 text-accent" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {hasPin ? 'Enter Admin PIN' : 'Set Admin PIN'}
            </h1>
            <p className="text-text-secondary text-sm">
              {hasPin
                ? 'Enter your 4-8 digit PIN to access the admin panel.'
                : 'This is your first time. Create a 4-8 digit PIN to protect the admin panel.'}
            </p>
          </div>

          <input
            type="password"
            value={hasPin ? pin : setupPin}
            onChange={(e) => hasPin ? setPin(e.target.value) : setSetupPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (hasPin ? verify() : setup())}
            placeholder="••••"
            maxLength={8}
            className="w-full bg-surface border border-border rounded-modal px-4 py-3 text-center text-2xl tracking-widest outline-none focus:border-accent mb-4"
            autoFocus
          />
          {error && <p className="text-warning text-sm text-center mb-4">{error}</p>}
          <button
            onClick={hasPin ? verify : setup}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-btn"
          >
            {hasPin ? 'Unlock' : 'Set PIN'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-7 h-7 text-accent" />
          <h1 className="text-2xl md:text-3xl font-extrabold">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
          {([
            { id: 'providers', label: 'Providers', icon: Film },
            { id: 'logs', label: 'Logs', icon: Activity },
            { id: 'cache', label: 'Cache', icon: Database },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'providers' && <ProvidersTab />}
        {tab === 'logs' && <LogsTab />}
        {tab === 'cache' && <CacheTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function ProvidersTab() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installOpen, setInstallOpen] = useState(false);
  const [installForm, setInstallForm] = useState({ name: '', version: '1.0', filename: '', repo_url: '', language: 'en', categories: 'movies' });
  const [health, setHealth] = useState<{ backend: string; cs3_bridge: string; database: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      streamhub.admin.providers().then((d) => setProviders(d.providers)).catch(() => setProviders([])),
      streamhub.admin.health().then(setHealth).catch(() => null),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (name: string, enable: boolean) => {
    if (enable) await streamhub.admin.enableProvider(name);
    else await streamhub.admin.disableProvider(name);
    load();
  };

  const updateAll = async () => {
    await streamhub.admin.updateProviders();
    load();
  };

  const install = async () => {
    await streamhub.admin.installProvider({
      ...installForm,
      categories: installForm.categories.split(',').map(s => s.trim()),
    });
    setInstallOpen(false);
    setInstallForm({ name: '', version: '1.0', filename: '', repo_url: '', language: 'en', categories: 'movies' });
    load();
  };

  const remove = async (name: string) => {
    if (!confirm(`Remove provider "${name}"?`)) return;
    await streamhub.admin.removeProvider(name);
    load();
  };

  if (loading) return <div className="text-center py-8"><Spinner /></div>;

  return (
    <div>
      {/* Health */}
      {health && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {([
            { label: 'Backend', value: health.backend },
            { label: 'CS3 Bridge', value: health.cs3_bridge },
            { label: 'Database', value: health.database },
          ]).map((h) => (
            <div key={h.label} className="bg-surface rounded-card p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {h.value === 'ok'
                  ? <CheckCircle2 className="w-5 h-5 text-success" />
                  : <AlertTriangle className="w-5 h-5 text-warning" />}
                <span className="font-semibold">{h.label}</span>
              </div>
              <p className={`text-sm ${h.value === 'ok' ? 'text-success' : 'text-warning'}`}>{h.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <p className="text-text-secondary text-sm">{providers.length} providers installed</p>
        <div className="flex gap-2">
          <button
            onClick={updateAll}
            className="flex items-center gap-2 bg-surface hover:bg-surface-elevated border border-border px-3 py-1.5 rounded-btn text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Update All
          </button>
          <button
            onClick={() => setInstallOpen(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-btn text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-card overflow-hidden">
        {providers.map((p) => (
          <div key={p.name} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-surface-elevated transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <Badge variant="outline">v{p.version}</Badge>
                <Badge variant={p.enabled ? 'success' : 'default'}>
                  {p.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {p.language && <Badge variant="outline">{p.language}</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                <span>{p.filename}</span>
                {p.last_updated && <span>· Updated {new Date(p.last_updated).toLocaleDateString()}</span>}
                {p.categories && p.categories.length > 0 && (
                  <span>· {p.categories.join(', ')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle(p.name, !p.enabled)}
                className={`p-2 rounded-btn transition-colors ${
                  p.enabled
                    ? 'text-success hover:bg-surface-elevated'
                    : 'text-text-muted hover:bg-surface-elevated'
                }`}
                title={p.enabled ? 'Disable' : 'Enable'}
              >
                {p.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => remove(p.name)}
                className="p-2 rounded-btn text-text-muted hover:text-warning hover:bg-surface-elevated"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={installOpen} onClose={() => setInstallOpen(false)} title="Add Provider">
        <div className="space-y-3">
          <p className="text-text-secondary text-sm">
            Add a provider by name. In a full CloudStream setup, this would download the .cs3 file from the repo URL.
          </p>
          <div>
            <label className="text-xs uppercase text-text-muted">Name *</label>
            <input
              type="text"
              value={installForm.name}
              onChange={(e) => setInstallForm({ ...installForm, name: e.target.value })}
              placeholder="MyProvider"
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted">Filename *</label>
            <input
              type="text"
              value={installForm.filename}
              onChange={(e) => setInstallForm({ ...installForm, filename: e.target.value })}
              placeholder="myprovider.cs3"
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted">Repo URL</label>
            <input
              type="text"
              value={installForm.repo_url}
              onChange={(e) => setInstallForm({ ...installForm, repo_url: e.target.value })}
              placeholder="https://github.com/..."
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase text-text-muted">Version</label>
              <input
                type="text"
                value={installForm.version}
                onChange={(e) => setInstallForm({ ...installForm, version: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-text-muted">Language</label>
              <input
                type="text"
                value={installForm.language}
                onChange={(e) => setInstallForm({ ...installForm, language: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted">Categories (comma-separated)</label>
            <input
              type="text"
              value={installForm.categories}
              onChange={(e) => setInstallForm({ ...installForm, categories: e.target.value })}
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={install}
            disabled={!installForm.name || !installForm.filename}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-btn"
          >
            Install Provider
          </button>
        </div>
      </Modal>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'error' | 'warn' | 'info' | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    streamhub.admin.logs(filter).then((d) => setLogs(d.logs)).catch(() => setLogs([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const clear = async () => {
    await streamhub.admin.clearLogs();
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {(['info', 'warn', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(filter === f ? undefined : f)}
              className={`px-3 py-1 rounded-badge text-xs font-medium ${
                filter === f ? 'bg-accent text-white' : 'bg-surface text-text-secondary'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={clear} className="text-warning text-sm flex items-center gap-1 hover:underline">
          <Trash2 className="w-4 h-4" /> Clear
        </button>
      </div>
      <div className="bg-black/40 rounded-card p-4 font-mono text-xs overflow-x-auto max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="text-center"><Spinner /></div>
        ) : logs.length === 0 ? (
          <p className="text-text-muted text-center py-8">No logs.</p>
        ) : (
          logs.slice().reverse().map((log, i) => (
            <div key={i} className="py-0.5 border-b border-border/50 last:border-b-0">
              <span className="text-text-muted">[{new Date(log.time).toLocaleTimeString()}]</span>{' '}
              <span className={
                log.level === 'error' ? 'text-warning' :
                log.level === 'warn' ? 'text-yellow-400' :
                'text-text-secondary'
              }>[{log.level.toUpperCase()}]</span>{' '}
              <span>{log.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CacheTab() {
  const [stats, setStats] = useState<{ metadata_count: number; subtitle_count: number; db_size_bytes: number } | null>(null);

  const load = () => {
    streamhub.admin.cacheStats().then(setStats).catch(() => null);
  };

  useEffect(() => { load(); }, []);

  const clear = async () => {
    if (!confirm('Clear all cached metadata and subtitles?')) return;
    await streamhub.admin.clearCache();
    load();
  };

  if (!stats) return <div className="text-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-card p-6 text-center">
          <Database className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-3xl font-bold">{stats.metadata_count}</p>
          <p className="text-text-secondary text-sm">Metadata entries</p>
        </div>
        <div className="bg-surface rounded-card p-6 text-center">
          <Film className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-3xl font-bold">{stats.subtitle_count}</p>
          <p className="text-text-secondary text-sm">Subtitle entries</p>
        </div>
        <div className="bg-surface rounded-card p-6 text-center">
          <Download className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-3xl font-bold">{(stats.db_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
          <p className="text-text-secondary text-sm">Total DB size</p>
        </div>
      </div>

      <button
        onClick={clear}
        className="flex items-center gap-2 bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-btn font-medium"
      >
        <Trash2 className="w-4 h-4" /> Clear All Cache
      </button>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [apiKeys, setApiKeys] = useState({ tmdb_api_key: '', omdb_api_key: '', opensubtitles_api_key: '' });

  const load = () => {
    streamhub.admin.settings().then((d) => {
      setSettings(d.settings);
      // Don't populate keys (they're masked)
    }).catch(() => null);
  };

  useEffect(() => { load(); }, []);

  const saveKeys = async () => {
    setSaving(true);
    const updates: Record<string, string> = {};
    if (apiKeys.tmdb_api_key) updates.tmdb_api_key = apiKeys.tmdb_api_key;
    if (apiKeys.omdb_api_key) updates.omdb_api_key = apiKeys.omdb_api_key;
    if (apiKeys.opensubtitles_api_key) updates.opensubtitles_api_key = apiKeys.opensubtitles_api_key;
    if (Object.keys(updates).length > 0) {
      await streamhub.admin.updateSettings(updates);
    }
    setApiKeys({ tmdb_api_key: '', omdb_api_key: '', opensubtitles_api_key: '' });
    setSaving(false);
    load();
    alert('Settings saved');
  };

  const changePin = async () => {
    if (newPin.length < 4 || newPin.length > 8) {
      alert('PIN must be 4-8 characters');
      return;
    }
    try {
      await streamhub.admin.changePin(newPin);
      sessionStorage.setItem('admin_pin', newPin);
      setNewPin('');
      alert('PIN changed');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    await streamhub.admin.updateSettings({ [key]: value });
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* API Keys */}
      <section className="bg-surface rounded-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-accent" /> API Keys
        </h2>
        <p className="text-text-secondary text-sm mb-4">
          Enter new values to update. Existing keys are hidden for security. Leave blank to keep current.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase text-text-muted">TMDB API Key</label>
            <input
              type="text"
              value={apiKeys.tmdb_api_key}
              onChange={(e) => setApiKeys({ ...apiKeys, tmdb_api_key: e.target.value })}
              placeholder={settings.tmdb_api_key ? '•••••••• (set)' : 'Enter TMDB API key'}
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted">OMDb API Key</label>
            <input
              type="text"
              value={apiKeys.omdb_api_key}
              onChange={(e) => setApiKeys({ ...apiKeys, omdb_api_key: e.target.value })}
              placeholder={settings.omdb_api_key ? '•••••••• (set)' : 'Enter OMDb API key'}
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted">OpenSubtitles API Key</label>
            <input
              type="text"
              value={apiKeys.opensubtitles_api_key}
              onChange={(e) => setApiKeys({ ...apiKeys, opensubtitles_api_key: e.target.value })}
              placeholder={settings.opensubtitles_api_key ? '•••••••• (set)' : 'Enter OpenSubtitles API key'}
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
        </div>
        <button
          onClick={saveKeys}
          disabled={saving}
          className="mt-4 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-btn font-medium disabled:opacity-50"
        >
          Save API Keys
        </button>
      </section>

      {/* Theme */}
      <section className="bg-surface rounded-card p-6">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase text-text-muted block mb-2">Theme</label>
            <div className="flex gap-2">
              {(['dark', 'amoled', 'navy'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    saveSetting('theme', t);
                    document.body.classList.remove('theme-amoled', 'theme-navy');
                    if (t === 'amoled') document.body.classList.add('theme-amoled');
                    if (t === 'navy') document.body.classList.add('theme-navy');
                    localStorage.setItem('streamhub_theme', t);
                  }}
                  className={`px-4 py-2 rounded-btn text-sm font-medium capitalize ${
                    settings.theme === t ? 'bg-accent text-white' : 'bg-surface-elevated'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted block mb-2">Default Subtitle Language</label>
            <input
              type="text"
              defaultValue={settings.default_subtitle_language || 'en'}
              onBlur={(e) => saveSetting('default_subtitle_language', e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted block mb-2">Default Quality</label>
            <select
              defaultValue={settings.default_quality || '1080p'}
              onChange={(e) => saveSetting('default_quality', e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
            >
              <option value="4k">4K</option>
              <option value="1440p">1440p</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
        </div>
      </section>

      {/* Change PIN */}
      <section className="bg-surface rounded-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-accent" /> Change Admin PIN
        </h2>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="New 4-8 digit PIN"
            maxLength={8}
            className="flex-1 bg-surface-elevated border border-border rounded-btn px-3 py-2 outline-none focus:border-accent"
          />
          <button
            onClick={changePin}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-btn font-medium"
          >
            Update
          </button>
        </div>
      </section>
    </div>
  );
}

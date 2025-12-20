import React, { useEffect, useMemo, useState } from 'react';
import { Database, KeyRound, Link2, CheckCircle, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { DEFAULT_NOTION_CONFIG, loadNotionConfig, saveNotionConfig } from '@/config/notionConfig';
import { notionBillingService } from '@/services/NotionBillingService';

type TestState = 'idle' | 'running' | 'success' | 'error';
type SchemaState = 'hidden' | 'loading' | 'ready' | 'error';

export const NotionSettingsSection: React.FC = () => {
  const defaults = useMemo(() => DEFAULT_NOTION_CONFIG, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<TestState>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [schemaState, setSchemaState] = useState<SchemaState>('hidden');
  const [schemaMessage, setSchemaMessage] = useState<string>('');
  const [billingSchema, setBillingSchema] = useState<null | Awaited<ReturnType<typeof notionBillingService.getDatabaseSchemaSummary>>>(null);

  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState(defaults.proxyUrl || 'https://api.notion.com/v1');
  const [billingDbId, setBillingDbId] = useState('');
  const [patientsDbId, setPatientsDbId] = useState('');
  const [mbsCodesDbId, setMbsCodesDbId] = useState('');
  const [currentInpatientsDbId, setCurrentInpatientsDbId] = useState('');
  const [structuralWorkupDbId, setStructuralWorkupDbId] = useState('');

  const buildDraftConfig = () => ({
    apiKey: apiKey.trim(),
    proxyUrl: proxyUrl.trim(),
    databases: {
      billing: billingDbId.trim(),
      patients: patientsDbId.trim(),
      mbsCodes: mbsCodesDbId.trim(),
      currentInpatients: currentInpatientsDbId.trim(),
      structuralWorkup: structuralWorkupDbId.trim()
    }
  });

  useEffect(() => {
    const run = async () => {
      try {
        const config = await loadNotionConfig();
        setApiKey(config?.apiKey || '');
        setProxyUrl(config?.proxyUrl || defaults.proxyUrl || 'https://api.notion.com/v1');
        setBillingDbId(config?.databases?.billing || defaults.databases?.billing || '');
        setPatientsDbId(config?.databases?.patients || defaults.databases?.patients || '');
        setMbsCodesDbId(config?.databases?.mbsCodes || defaults.databases?.mbsCodes || '');
        setCurrentInpatientsDbId(config?.databases?.currentInpatients || defaults.databases?.currentInpatients || '');
        setStructuralWorkupDbId(config?.databases?.structuralWorkup || defaults.databases?.structuralWorkup || '');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [defaults.proxyUrl]);

  const handleSave = async () => {
    setSaving(true);
    setTestMessage('');
    setTesting('idle');
    setSchemaState('hidden');
    try {
      await saveNotionConfig(buildDraftConfig());
      setTestMessage('Saved.');
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting('running');
    setTestMessage('');
    setSchemaState('hidden');
    try {
      // Ensure the service reads the latest values from storage.
      await saveNotionConfig(buildDraftConfig());
      await notionBillingService.reloadConfig();
      const [me, db] = await Promise.all([
        notionBillingService.testConnection(),
        notionBillingService.getBillingDatabaseInfo()
      ]);
      setTesting('success');
      setTestMessage(`Connected${me.name ? ` as ${me.name}` : ''}. Billing DB: ${db.title}`);
    } catch (error) {
      setTesting('error');
      setTestMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleLoadBillingSchema = async () => {
    setSchemaState('loading');
    setSchemaMessage('');
    setBillingSchema(null);
    try {
      await saveNotionConfig(buildDraftConfig());
      await notionBillingService.reloadConfig();
      const schema = await notionBillingService.getDatabaseSchemaSummary(billingDbId);
      setBillingSchema(schema);
      setSchemaState('ready');
    } catch (error) {
      setSchemaState('error');
      setSchemaMessage(error instanceof Error ? error.message : String(error));
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
        <div className="flex items-center space-x-2 mb-3">
          <Database className="w-5 h-5 text-ink-primary" />
          <span className="font-medium text-ink-primary">Notion</span>
        </div>
        <div className="text-sm text-ink-tertiary">Loading Notion settings...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-purple-600" />
          <div>
            <div className="font-medium text-ink-primary">Notion</div>
            <div className="text-xs text-ink-secondary mt-0.5">
              Billing sync writes a record to your Notion database when you mark an item as Entered.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={saving || testing === 'running'}
            className="flex items-center gap-2 px-3 py-2 bg-surface-secondary border border-line-primary rounded-md text-sm text-ink-primary hover:bg-white disabled:opacity-50"
            title="Test Notion connection"
          >
            {testing === 'running' ? <RefreshCw className="w-4 h-4 motion-safe:animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Test
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary hover:bg-surface-tertiary disabled:opacity-50"
            title="Save Notion settings"
          >
            {saving ? <RefreshCw className="w-4 h-4 motion-safe:animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <KeyRound className="w-4 h-4" />
            API Key
          </div>
          <input
            type="password"
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary"
            placeholder="secret_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Create a Notion Integration, copy the internal integration token, and share your database with that integration.
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Link2 className="w-4 h-4" />
            Base URL (advanced)
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary"
            placeholder="https://api.notion.com/v1"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Default is direct Notion API. Set to a proxy only if you run one locally.
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            Billing Database ID
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={billingDbId}
            onChange={(e) => setBillingDbId(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Patient, MBS Code, Date of service, Referring, Note, Billing Entered?
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            Patient Database ID
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={patientsDbId}
            onChange={(e) => setPatientsDbId(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Name, Cabrini UR, Summary
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            MBS Codes Database ID
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={mbsCodesDbId}
            onChange={(e) => setMbsCodesDbId(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Code, Description, MBS Fee, Common (ranking)
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            Current Inpatients Database ID
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={currentInpatientsDbId}
            onChange={(e) => setCurrentInpatientsDbId(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Patient information for current inpatients
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            Structural Workup Database ID
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={structuralWorkupDbId}
            onChange={(e) => setStructuralWorkupDbId(e.target.value)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Patient, workup type, status, referring doctor, notes
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
        <div className="text-blue-800">
          Copy the 32-character database ID from your Notion database URL (with or without dashes).
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleLoadBillingSchema}
          disabled={saving || testing === 'running' || schemaState === 'loading' || !billingDbId.trim()}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary hover:bg-surface-tertiary disabled:opacity-50"
          title="Fetch Billing database schema from Notion"
        >
          {schemaState === 'loading' ? <RefreshCw className="w-4 h-4 motion-safe:animate-spin" /> : <Database className="w-4 h-4" />}
          Load Billing Schema
        </button>
        <span className="text-xs text-ink-tertiary">
          Uses Notion API `GET /v1/databases/{'{database_id}'}`.
        </span>
      </div>

      {schemaState === 'error' && schemaMessage && (
        <div className="mt-3 p-3 rounded-lg border text-xs flex items-start gap-2 bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div className="min-w-0">{schemaMessage}</div>
        </div>
      )}

      {schemaState === 'ready' && billingSchema && (
        <div className="mt-3 p-3 rounded-lg border border-line-primary bg-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs text-ink-secondary">
              Billing DB: <span className="font-medium text-ink-primary">{billingSchema.title}</span>{' '}
              <span className="font-mono text-ink-tertiary">({billingSchema.databaseId})</span>
            </div>
            <button
              type="button"
              className="text-xs text-ink-secondary hover:text-ink-primary underline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(billingSchema, null, 2));
                  setSchemaMessage('Schema copied to clipboard.');
                } catch (e) {
                  setSchemaMessage(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Copy JSON
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-tertiary border-b border-line-primary">
                  <th className="py-1 pr-2 font-medium">Property</th>
                  <th className="py-1 pr-2 font-medium">Type</th>
                  <th className="py-1 pr-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {billingSchema.properties.map((p) => (
                  <tr key={p.name} className="border-b border-line-primary last:border-b-0">
                    <td className="py-1 pr-2 font-mono text-ink-primary">{p.name}</td>
                    <td className="py-1 pr-2 text-ink-secondary">{p.type}</td>
                    <td className="py-1 pr-2 text-ink-tertiary font-mono">
                      {p.relationDatabaseId ? `relation → ${p.relationDatabaseId}` : ''}
                      {p.selectOptions?.length ? `options: ${p.selectOptions.join(', ')}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {schemaMessage && (
            <div className="mt-2 text-[11px] text-ink-tertiary">{schemaMessage}</div>
          )}
        </div>
      )}

      {testMessage && (
        <div className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2 ${
          testing === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : testing === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {testing === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5" /> : <CheckCircle className="w-4 h-4 mt-0.5" />}
          <div className="min-w-0">{testMessage}</div>
        </div>
      )}
    </div>
  );
};

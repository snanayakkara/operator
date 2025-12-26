import React, { useEffect, useMemo, useState } from 'react';
import { Database, KeyRound, Link2, CheckCircle, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { DEFAULT_NOTION_CONFIG, loadNotionConfig, saveNotionConfig } from '@/config/notionConfig';
import { notionBillingService } from '@/services/NotionBillingService';
import { NotionStructuralWorkupService } from '@/services/NotionStructuralWorkupService';

type TestState = 'idle' | 'running' | 'success' | 'error';
type SchemaState = 'hidden' | 'loading' | 'ready' | 'error';
type DatabaseKey = 'billing' | 'patients' | 'mbsCodes' | 'currentInpatients' | 'structuralWorkup';

type DatabaseTestResult = {
  status: TestState;
  title?: string;
  error?: string;
};

type SampleStatus = 'idle' | 'loading' | 'ready' | 'error';

type SampleRecord = {
  id: string;
  title: string;
};

type SampleResult = {
  status: SampleStatus;
  records: SampleRecord[];
  error?: string;
};

const createEmptyDatabaseTests = (): Record<DatabaseKey, DatabaseTestResult> => ({
  billing: { status: 'idle' },
  patients: { status: 'idle' },
  mbsCodes: { status: 'idle' },
  currentInpatients: { status: 'idle' },
  structuralWorkup: { status: 'idle' }
});

const createEmptySampleResults = (): Record<DatabaseKey, SampleResult> => ({
  billing: { status: 'idle', records: [] },
  patients: { status: 'idle', records: [] },
  mbsCodes: { status: 'idle', records: [] },
  currentInpatients: { status: 'idle', records: [] },
  structuralWorkup: { status: 'idle', records: [] }
});

export const NotionSettingsSection: React.FC = () => {
  const defaults = useMemo(() => DEFAULT_NOTION_CONFIG, []);
  const notionStructuralService = useMemo(() => NotionStructuralWorkupService.getInstance(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<TestState>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [schemaState, setSchemaState] = useState<SchemaState>('hidden');
  const [schemaMessage, setSchemaMessage] = useState<string>('');
  const [billingSchema, setBillingSchema] = useState<null | Awaited<ReturnType<typeof notionBillingService.getDatabaseSchemaSummary>>>(null);
  const [databaseTests, setDatabaseTests] = useState<Record<DatabaseKey, DatabaseTestResult>>(createEmptyDatabaseTests);
  const [sampleResults, setSampleResults] = useState<Record<DatabaseKey, SampleResult>>(createEmptySampleResults);
  const [samplesVisible, setSamplesVisible] = useState(false);

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

  const databaseTargets = useMemo(() => ([
    { key: 'billing' as const, label: 'Billing', id: billingDbId },
    { key: 'patients' as const, label: 'Patient', id: patientsDbId },
    { key: 'mbsCodes' as const, label: 'MBS Codes', id: mbsCodesDbId },
    { key: 'currentInpatients' as const, label: 'Current Inpatients', id: currentInpatientsDbId },
    { key: 'structuralWorkup' as const, label: 'Structural Workup', id: structuralWorkupDbId }
  ]), [billingDbId, patientsDbId, mbsCodesDbId, currentInpatientsDbId, structuralWorkupDbId]);

  const resetVerificationState = () => {
    setTesting('idle');
    setTestMessage('');
    setDatabaseTests(createEmptyDatabaseTests());
    setSampleResults(createEmptySampleResults());
    setSamplesVisible(false);
  };

  const handleTextChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      resetVerificationState();
      setter(event.target.value);
    };

  const renderDatabaseStatusIcon = (key: DatabaseKey) => {
    const result = databaseTests[key];
    if (!result || result.status === 'idle') return null;
    if (result.status === 'running') {
      return <RefreshCw className="w-4 h-4 text-ink-tertiary motion-safe:animate-spin" title="Testing database" />;
    }
    if (result.status === 'success') {
      return (
        <CheckCircle
          className="w-4 h-4 text-green-600"
          title={result.title ? `Verified: ${result.title}` : 'Verified'}
        />
      );
    }
    return (
      <AlertCircle
        className="w-4 h-4 text-red-600"
        title={result.error || 'Database test failed'}
      />
    );
  };

  const renderSampleStatusIcon = (key: DatabaseKey) => {
    const result = sampleResults[key];
    if (!result || result.status === 'idle') return null;
    if (result.status === 'loading') {
      return <RefreshCw className="w-4 h-4 text-ink-tertiary motion-safe:animate-spin" title="Loading samples" />;
    }
    if (result.status === 'ready') {
      const title = result.records.length ? `Loaded ${result.records.length} record(s)` : 'Connected, no records found';
      return <CheckCircle className="w-4 h-4 text-green-600" title={title} />;
    }
    return (
      <AlertCircle
        className="w-4 h-4 text-red-600"
        title={result.error || 'Sample load failed'}
      />
    );
  };

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
    setDatabaseTests(() => {
      const next = createEmptyDatabaseTests();
      databaseTargets.forEach(({ key }) => {
        next[key] = { status: 'running' };
      });
      return next;
    });
    try {
      // Ensure the service reads the latest values from storage.
      await saveNotionConfig(buildDraftConfig());
      await Promise.all([
        notionBillingService.reloadConfig(),
        notionStructuralService.reloadConfig()
      ]);

      const me = await notionBillingService.testConnection();
      const results = await Promise.all(
        databaseTargets.map(async ({ key, label, id }) => {
          const trimmedId = id.trim();
          if (!trimmedId) {
            return { key, label, status: 'error' as const, error: 'Missing database ID.' };
          }
          try {
            const service = key === 'structuralWorkup' ? notionStructuralService : notionBillingService;
            const info = await service.getDatabaseInfo(trimmedId);
            return { key, label, status: 'success' as const, title: info.title };
          } catch (error) {
            return {
              key,
              label,
              status: 'error' as const,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );

      const nextTests = createEmptyDatabaseTests();
      const errors: string[] = [];
      results.forEach((result) => {
        if (result.status === 'success') {
          nextTests[result.key] = { status: 'success', title: result.title };
        } else {
          nextTests[result.key] = { status: 'error', error: result.error };
          errors.push(`${result.label}: ${result.error}`);
        }
      });

      setDatabaseTests(nextTests);
      if (errors.length === 0) {
        setTesting('success');
        setTestMessage(`Connected${me.name ? ` as ${me.name}` : ''}. Verified ${results.length}/${results.length} databases.`);
      } else {
        const verifiedCount = results.length - errors.length;
        const errorSummary = errors.length > 2
          ? `${errors.slice(0, 2).join(' | ')} | ${errors.length - 2} more`
          : errors.join(' | ');
        setTesting('error');
        setTestMessage(`Connected${me.name ? ` as ${me.name}` : ''}. Verified ${verifiedCount}/${results.length} databases. ${errorSummary}`);
      }
    } catch (error) {
      setTesting('error');
      setTestMessage(error instanceof Error ? error.message : String(error));
      setDatabaseTests(createEmptyDatabaseTests());
    }
  };

  const handleLoadSampleRecords = async () => {
    const sampleLimit = 5;
    setSamplesVisible(true);
    setSampleResults(() => {
      const next = createEmptySampleResults();
      databaseTargets.forEach(({ key }) => {
        next[key] = { status: 'loading', records: [] };
      });
      return next;
    });
    try {
      await saveNotionConfig(buildDraftConfig());
      await Promise.all([
        notionBillingService.reloadConfig(),
        notionStructuralService.reloadConfig()
      ]);

      const results = await Promise.all(
        databaseTargets.map(async ({ key, label, id }) => {
          const trimmedId = id.trim();
          if (!trimmedId) {
            return { key, label, status: 'error' as const, error: 'Missing database ID.', records: [] };
          }
          try {
            const records = await notionBillingService.getSampleRecords(trimmedId, sampleLimit);
            return { key, label, status: 'ready' as const, records };
          } catch (error) {
            return {
              key,
              label,
              status: 'error' as const,
              error: error instanceof Error ? error.message : String(error),
              records: []
            };
          }
        })
      );

      const nextResults = createEmptySampleResults();
      results.forEach((result) => {
        if (result.status === 'ready') {
          nextResults[result.key] = { status: 'ready', records: result.records };
        } else {
          nextResults[result.key] = { status: 'error', records: [], error: result.error };
        }
      });
      setSampleResults(nextResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSampleResults(() => {
        const next = createEmptySampleResults();
        databaseTargets.forEach(({ key }) => {
          next[key] = { status: 'error', records: [], error: message };
        });
        return next;
      });
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

  const samplesLoading = Object.values(sampleResults).some((result) => result.status === 'loading');

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
            onChange={handleTextChange(setApiKey)}
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
            onChange={handleTextChange(setProxyUrl)}
          />
          <div className="text-xs text-ink-tertiary">
            Default is direct Notion API. Set to a proxy only if you run one locally.
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            <span>Billing Database ID</span>
            {renderDatabaseStatusIcon('billing')}
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={billingDbId}
            onChange={handleTextChange(setBillingDbId)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Patient, MBS Code, Date of service, Referring, Note, Billing Entered?
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            <span>Patient Database ID</span>
            {renderDatabaseStatusIcon('patients')}
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={patientsDbId}
            onChange={handleTextChange(setPatientsDbId)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Name, Cabrini UR, Summary
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            <span>MBS Codes Database ID</span>
            {renderDatabaseStatusIcon('mbsCodes')}
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={mbsCodesDbId}
            onChange={handleTextChange(setMbsCodesDbId)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Code, Description, MBS Fee, Common (ranking)
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            <span>Current Inpatients Database ID</span>
            {renderDatabaseStatusIcon('currentInpatients')}
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={currentInpatientsDbId}
            onChange={handleTextChange(setCurrentInpatientsDbId)}
          />
          <div className="text-xs text-ink-tertiary">
            Fields: Patient information for current inpatients
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Database className="w-4 h-4" />
            <span>Structural Workup Database ID</span>
            {renderDatabaseStatusIcon('structuralWorkup')}
          </div>
          <input
            className="w-full px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={structuralWorkupDbId}
            onChange={handleTextChange(setStructuralWorkupDbId)}
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

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleLoadSampleRecords}
          disabled={saving || testing === 'running' || samplesLoading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-line-primary rounded-md text-sm text-ink-primary hover:bg-surface-tertiary disabled:opacity-50"
          title="Fetch sample records from each Notion database"
        >
          {samplesLoading ? <RefreshCw className="w-4 h-4 motion-safe:animate-spin" /> : <Database className="w-4 h-4" />}
          Load Sample Records
        </button>
        <span className="text-xs text-ink-tertiary">
          Fetches up to 5 records from each database.
        </span>
      </div>

      {samplesVisible && (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {databaseTargets.map(({ key, label }) => {
            const sample = sampleResults[key];
            return (
              <div key={key} className="p-3 rounded-lg border border-line-primary bg-white">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-ink-secondary">{label} samples</div>
                  {renderSampleStatusIcon(key)}
                </div>
                {sample.status === 'loading' && (
                  <div className="text-xs text-ink-tertiary">Loading samples...</div>
                )}
                {sample.status === 'error' && (
                  <div className="text-xs text-red-700">{sample.error || 'Failed to load samples.'}</div>
                )}
                {sample.status === 'ready' && (
                  sample.records.length > 0 ? (
                    <select
                      className="w-full px-3 py-2 bg-surface-secondary border border-line-primary rounded-md text-xs text-ink-primary appearance-none"
                      defaultValue=""
                    >
                      <option value="">Sample records ({sample.records.length})</option>
                      {sample.records.map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-ink-tertiary">No records found.</div>
                  )
                )}
              </div>
            );
          })}
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

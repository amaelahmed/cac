'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

type KnowledgeObjectForm = {
  id: string;
  domain_id: string;
  industry_id: string;
  object_type: string;
  author: string;
  review_status: string;
  base_confidence: number;
  tags: string;
  expected_output: string;
  placeholders: string;
  target_goal: string;
  target_audience: string;
  target_location: string;
  target_size: string;
  target_service: string;
  target_stage: string;
  target_model: string;
  target_pricing: string;
  target_type: string;
  target_maturity: string;
  target_challenge: string;
  content_json: string;
  change_summary?: string;
};

type VersionHistoryRow = {
  id: string;
  version: string;
  author: string;
  change_summary: string;
  created_at: string;
};

type ApiError = {
  error?: string;
  version?: string;
};

const targetFields = [
  'target_goal',
  'target_audience',
  'target_location',
  'target_size',
  'target_service',
  'target_stage',
  'target_model',
  'target_pricing',
  'target_type',
  'target_maturity',
  'target_challenge',
] as const;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}

export default function KnowledgeEditorWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KnowledgeEditor />
    </Suspense>
  );
}

function KnowledgeEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  const isNew = idParam === 'new';
  const [loading, setLoading] = useState(!isNew && Boolean(idParam));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionHistoryRow[]>([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [rollbackConfirmId, setRollbackConfirmId] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formData, setFormData] = useState<KnowledgeObjectForm>({
    id: '',
    domain_id: '',
    industry_id: '',
    object_type: '',
    author: '',
    review_status: 'Draft',
    base_confidence: 100,
    tags: '[]',
    expected_output: '',
    placeholders: '[]',
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: '{\n  "title": "",\n  "description": ""\n}',
    change_summary: '',
  });

  useEffect(() => {
    if (isNew || !idParam) return;

    Promise.all([
      fetch(`/api/admin/knowledge-objects?id=${encodeURIComponent(idParam)}`).then((res) => {
        if (!res.ok) throw new Error('Failed to load object');
        return res.json() as Promise<KnowledgeObjectForm>;
      }),
      fetch(`/api/admin/versions?object_id=${encodeURIComponent(idParam)}`).then((res) => {
        if (!res.ok) return [];
        return res.json() as Promise<VersionHistoryRow[]>;
      }).catch(() => [] as VersionHistoryRow[]),
    ])
      .then(([data, versionsData]) => {
        setFormData({
          ...data,
          tags: data.tags || '[]',
          placeholders: data.placeholders || '[]',
          expected_output: data.expected_output || '',
        });
        setVersions(versionsData);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        setError(getErrorMessage(requestError));
        setLoading(false);
      });
  }, [isNew, idParam]);

  const confirmRollback = async () => {
    if (!rollbackConfirmId) return;

    setRollingBack(rollbackConfirmId);
    setError(null);
    try {
      const res = await fetch('/api/admin/knowledge-objects/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: idParam, version_id: rollbackConfirmId }),
      });
      const data = await res.json() as ApiError;
      if (!res.ok) throw new Error(data.error || 'Rollback failed');
      window.location.reload();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
      setRollingBack(null);
      setRollbackConfirmId(null);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (name === 'content_json') {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch {
        setJsonError('Content must be valid JSON.');
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (jsonError) return;

    setSaving(true);
    setError(null);
    try {
      const payload: KnowledgeObjectForm = { ...formData };
      if (!isNew && !payload.change_summary) payload.change_summary = 'Updated via Admin CMS';

      const res = await fetch('/api/admin/knowledge-objects', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as ApiError;
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      router.push('/admin/knowledge');
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  const inputClass = 'w-full bg-[#1A1A1A] border border-[#333] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-400 mb-1';
  const pageError = error || (!isNew && !idParam ? 'No knowledge object was selected.' : null);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/admin/knowledge" className="text-gray-400 hover:text-white mr-4">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-3xl font-bold">{isNew ? 'Create Knowledge Object' : `Edit Object: ${idParam}`}</h1>
      </div>

      {pageError && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-6" role="alert">
          {pageError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 border-b border-[#222] pb-2">Core Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="id">Object ID (Unique)</label>
              <input id="id" type="text" name="id" value={formData.id} onChange={handleChange} required disabled={!isNew} className={`${inputClass} ${!isNew ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className={labelClass} htmlFor="domain_id">Domain ID</label>
              <input id="domain_id" type="text" name="domain_id" value={formData.domain_id} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry_id">Industry ID</label>
              <input id="industry_id" type="text" name="industry_id" value={formData.industry_id} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="object_type">Object Type</label>
              <input id="object_type" type="text" name="object_type" value={formData.object_type} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="author">Author</label>
              <input id="author" type="text" name="author" value={formData.author} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="review_status">Review Status</label>
              <select id="review_status" name="review_status" value={formData.review_status} onChange={handleChange} className={inputClass}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            {!isNew && (
              <div className="col-span-1 md:col-span-2">
                <label className={labelClass} htmlFor="change_summary">Change Summary</label>
                <input id="change_summary" type="text" name="change_summary" value={formData.change_summary || ''} onChange={handleChange} className={inputClass} placeholder="Briefly describe what changed..." required />
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 border-b border-[#222] pb-2">Targeting Criteria</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {targetFields.map((field) => (
              <div key={field}>
                <label className={labelClass} htmlFor={field}>{field.replace('target_', '')}</label>
                <input id={field} type="text" name={field} value={formData[field]} onChange={handleChange} className={inputClass} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 border-b border-[#222] pb-2">Content Payload</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="tags">Tags (JSON Array)</label>
              <input id="tags" type="text" name="tags" value={formData.tags} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="placeholders">Placeholders (JSON Array)</label>
              <input id="placeholders" type="text" name="placeholders" value={formData.placeholders} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="content_json">Content JSON (Actual Module Payload)</label>
              <textarea
                id="content_json"
                name="content_json"
                value={formData.content_json}
                onChange={handleChange}
                required
                rows={10}
                spellCheck={false}
                className={`${inputClass} font-mono text-sm ${jsonError ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving || Boolean(jsonError)}
            className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Object'}
          </button>
        </div>
      </form>

      {!isNew && versions.length > 0 && (
        <div className="mt-12 bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 border-b border-[#222] pb-2">Version History</h2>
          <div className="space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <div>
                  <p className="text-sm font-medium text-white">Version: {version.version}</p>
                  <p className="text-xs text-gray-400">Author: {version.author} | {new Date(version.created_at).toLocaleString()}</p>
                  <p className="text-xs text-gray-300 mt-1">{version.change_summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRollbackConfirmId(version.id)}
                  disabled={rollingBack === version.id}
                  className="text-sm bg-[#333] hover:bg-[#444] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {rollingBack === version.id ? 'Restoring...' : 'Rollback'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rollbackConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Rollback Object</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to rollback to version <span className="font-mono text-gray-300">{rollbackConfirmId}</span>? This will create a new version.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRollbackConfirmId(null)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRollback()}
                disabled={rollingBack === rollbackConfirmId}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {rollingBack === rollbackConfirmId ? 'Restoring...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

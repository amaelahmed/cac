'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle, Upload } from 'lucide-react';

type ImportPreview = {
  format?: string;
  total?: number;
  validCount: number;
  invalidCount: number;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  newCount: number;
  duplicateCount: number;
  errors: string[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Import failed';
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rawImportText, setRawImportText] = useState<string | null>(null);
  const [updateMode, setUpdateMode] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreview(null);
    setRawImportText(null);
    setError(null);
    setSuccess(false);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      setRawImportText(text);
      const isJson = file.name.toLowerCase().endsWith('.json');
      const res = await fetch(`/api/admin/knowledge-objects/import?update=${updateMode ? 'true' : 'false'}`, {
        method: 'POST',
        headers: { 'Content-Type': isJson ? 'application/json' : 'application/x-yaml' },
        body: text,
      });
      const data = await res.json() as ImportPreview & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not check this file.');
      setPreview(data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!rawImportText || !file) return;
    setLoading(true);
    setError(null);

    try {
      const isJson = file.name.toLowerCase().endsWith('.json');
      const res = await fetch(`/api/admin/knowledge-objects/import-commit?update=${updateMode ? 'true' : 'false'}`, {
        method: 'POST',
        headers: { 'Content-Type': isJson ? 'application/json' : 'application/x-yaml' },
        body: rawImportText,
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setSuccess(true);
      setPreview(null);
      setRawImportText(null);
      setFile(null);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const willCreate = preview?.created ?? preview?.newCount ?? 0;
  const willUpdate = preview?.updated ?? 0;
  const willSkipOrFail = (preview?.skipped ?? 0) + (preview?.failed ?? preview?.invalidCount ?? 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/admin/knowledge" className="text-gray-400 hover:text-white mr-4">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-3xl font-bold">Bulk Import Knowledge Objects</h1>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl p-8 mb-8">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-[#1A1A1A] border-[#333] transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">JSON, YAML, or YML files</p>
            </div>
            <input type="file" className="hidden" accept=".json,.yaml,.yml" onChange={handleFileChange} />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={updateMode}
            onChange={(event) => {
              setUpdateMode(event.target.checked);
              setPreview(null);
              setRawImportText(null);
            }}
            className="h-4 w-4 accent-blue-600"
          />
          Allow explicit updates for duplicate IDs
        </label>

        {file && (
          <div className="mt-4 flex items-center justify-between bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
            <span className="text-sm font-medium text-white">{file.name}</span>
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Analyze File'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-8 flex items-start" role="alert">
          <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded-xl mb-8 flex items-start">
          <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
          <p>Import completed successfully!</p>
        </div>
      )}

      {preview && (
        <div className="space-y-6">
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 border-b border-[#222] pb-2">Analysis Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Format</p>
                <p className="text-2xl font-bold text-white uppercase">{preview.format || 'json'}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Total Valid</p>
                <p className="text-2xl font-bold text-green-500">{preview.validCount}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Total Invalid</p>
                <p className="text-2xl font-bold text-red-500">{preview.invalidCount}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">New Objects</p>
                <p className="text-2xl font-bold text-blue-500">{preview.newCount}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Duplicates</p>
                <p className="text-2xl font-bold text-yellow-500">{preview.duplicateCount}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Will Create</p>
                <p className="text-2xl font-bold text-blue-500">{willCreate}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Will Update</p>
                <p className="text-2xl font-bold text-cyan-400">{willUpdate}</p>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                <p className="text-sm text-gray-400">Skipped / Failed</p>
                <p className="text-2xl font-bold text-red-500">{willSkipOrFail}</p>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-red-400 mb-2">Errors &amp; Warnings:</h3>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                  {preview.errors.slice(0, 10).map((previewError, index) => (
                    <li key={`${previewError}-${index}`}>{previewError}</li>
                  ))}
                  {preview.errors.length > 10 && (
                    <li>...and {preview.errors.length - 10} more errors.</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-[#222]">
              <button
                type="button"
                onClick={() => void handleCommit()}
                disabled={loading || preview.validCount === 0}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Importing...' : `Import ${preview.validCount} Valid Objects`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

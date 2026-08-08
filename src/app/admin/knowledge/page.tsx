'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';

type KnowledgeObject = {
  id: string;
  domain_id: string;
  industry_id: string;
  object_type: string;
  review_status: string;
  author: string;
  updated_at: string;
};

export default function KnowledgeLibrary() {
  const [objects, setObjects] = useState<KnowledgeObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const itemsPerPage = 20;

  const fetchObjects = async () => {
    const res = await fetch('/api/admin/knowledge-objects');
    if (!res.ok) throw new Error('Could not load knowledge objects.');
    const data = await res.json() as KnowledgeObject[];
    setObjects(data);
  };

  const refreshObjects = () => {
    setLoading(true);
    setError(null);
    fetchObjects()
      .catch((requestError: unknown) => {
        setObjects([]);
        setError(requestError instanceof Error ? requestError.message : 'Could not load knowledge objects.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;

    fetch('/api/admin/knowledge-objects')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load knowledge objects.');
        return res.json() as Promise<KnowledgeObject[]>;
      })
      .then((data) => {
        if (active) setObjects(data);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setObjects([]);
        setError(requestError instanceof Error ? requestError.message : 'Could not load knowledge objects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/knowledge-objects?id=${deleteConfirmId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete this object.');
      setDeleteConfirmId(null);
      refreshObjects();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete this object.');
    } finally {
      setDeleting(false);
    }
  };

  const downloadExport = async (format: 'json' | 'yaml') => {
    const res = await fetch(`/api/admin/knowledge-objects/export?format=${format}`);
    if (!res.ok) {
      setError(`Could not export ${format.toUpperCase()}.`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `knowledge_objects_export.${format === 'yaml' ? 'yaml' : 'json'}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = objects.filter((object) =>
    object.id.toLowerCase().includes(normalizedSearch)
      || object.industry_id.toLowerCase().includes(normalizedSearch)
      || object.domain_id?.toLowerCase().includes(normalizedSearch)
      || object.object_type?.toLowerCase().includes(normalizedSearch)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Knowledge Library</h1>
        <Link
          href="/admin/knowledge/edit?id=new"
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Object
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-6" role="alert">
          {error}
        </div>
      )}

      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#222] flex gap-4 bg-[#0A0A0A]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by ID or Industry..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/import"
              className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-sm font-medium transition-colors"
            >
              Import JSON/YAML
            </Link>
            <button
              type="button"
              className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-sm font-medium transition-colors"
              onClick={() => void downloadExport('json')}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-sm font-medium transition-colors"
              onClick={() => void downloadExport('yaml')}
            >
              Export YAML
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1A1A1A] text-gray-400">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Industry</th>
                <th className="px-6 py-3 font-medium">Domain</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Updated</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No objects found.</td>
                </tr>
              ) : (
                paginated.map((object) => (
                  <tr key={object.id} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-300">{object.id}</td>
                    <td className="px-6 py-4">{object.industry_id}</td>
                    <td className="px-6 py-4 text-gray-400">{object.domain_id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        object.review_status === 'Published'
                          ? 'bg-green-500/10 text-green-500'
                          : object.review_status === 'Archived'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {object.review_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(object.updated_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/knowledge/edit?id=${encodeURIComponent(object.id)}`}
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(object.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-[#333] rounded transition-colors"
                          title="Soft Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="p-4 border-t border-[#222] bg-[#0A0A0A] flex items-center justify-between text-sm text-gray-400">
            <div>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-[#222] hover:bg-[#333] border border-[#333] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-[#222] hover:bg-[#333] border border-[#333] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Delete Object</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to soft delete <span className="font-mono text-gray-300">{deleteConfirmId}</span>? This action can be undone by an administrator in the database.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

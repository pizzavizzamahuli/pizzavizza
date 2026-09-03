'use client';

import { useEffect, useState, useCallback } from 'react';

type AuditRow = {
  _id: string;
  type: string;
  performedBy?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: string;
};

export default function AuditLogViewer() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const fetchPage = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(p));
      q.set('pageSize', String(pageSize));
      if (typeFilter) q.set('type', typeFilter);
      const res = await fetch(`/api/admin/audit-logs?${q.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setItems(json.data.items || []);
        setPage(json.data.page || p);
        setTotal(json.data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => void fetchPage(1), 0);
    return () => clearTimeout(t);
  }, [fetchPage]);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <div className="text-sm text-stone-500">{total} entries</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-stone-500">Type</label>
          <input value={typeFilter ?? ''} onChange={(e) => setTypeFilter(e.target.value || null)} placeholder="e.g. STORE_SECRETS_UPDATED" className="rounded-md border px-2 py-1 text-sm" />
          <button onClick={() => fetchPage(1)} className="ml-2 rounded-md border px-3 py-1 text-sm">Filter</button>
        </div>
        <div className="text-sm text-stone-500">{total} entries</div>
      </div>

      <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">By</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-stone-500">No audit entries found.</td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-3 text-stone-600">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-stone-900">{row.type}</td>
                  <td className="px-4 py-3 text-stone-600">{row.performedBy ?? 'system'}</td>
                  <td className="px-4 py-3 text-stone-600">
                    <div className="text-xs text-stone-500">Old: {row.oldValue ? JSON.stringify(row.oldValue) : '—'}</div>
                    <div className="mt-1 text-xs text-stone-500">New: {row.newValue ? JSON.stringify(row.newValue) : '—'}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-stone-500">Page {page}</div>
        <div className="flex gap-2">
          <button disabled={loading || page <= 1} onClick={() => fetchPage(page - 1)} className="rounded-md border px-3 py-2 text-sm">Prev</button>
          <button disabled={loading || page * pageSize >= total} onClick={() => fetchPage(page + 1)} className="rounded-md border px-3 py-2 text-sm">Next</button>
        </div>
      </div>
    </div>
  );
}

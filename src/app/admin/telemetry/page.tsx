'use client';

import { useEffect, useState } from 'react';

type TelemetryItem = {
  object_id: string;
  count: number;
};

type TelemetryData = {
  topGenerated: TelemetryItem[];
  topEdited: TelemetryItem[];
  topExported: TelemetryItem[];
  topRegenerated: TelemetryItem[];
  totalStats: {
    total_objects: number;
    total_generations: number;
    total_edits: number;
    total_exports: number;
  };
};

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function TopList({ title, items }: { title: string; items: TelemetryItem[] }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No data available.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.object_id} className="flex justify-between items-center text-sm border-b border-[#222] pb-2 last:border-0 last:pb-0">
              <div className="truncate max-w-[200px]" title={item.object_id}>
                <span className="text-gray-500 mr-2">#{index + 1}</span>
                {item.object_id}
              </div>
              <span className="font-mono bg-[#222] px-2 py-1 rounded text-gray-300">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TelemetryDashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch('/api/admin/telemetry')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load activity.');
        return res.json() as Promise<TelemetryData>;
      })
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load activity.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl" role="alert">
          Error loading telemetry: {error || 'Activity data is unavailable.'}
        </div>
      </div>
    );
  }

  const { topGenerated, topEdited, topExported, topRegenerated, totalStats } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Telemetry Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Objects" value={totalStats.total_objects} />
        <StatCard title="Total Generations" value={totalStats.total_generations} />
        <StatCard title="Total Edits" value={totalStats.total_edits} />
        <StatCard title="Total Exports" value={totalStats.total_exports} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TopList title="Most Generated" items={topGenerated} />
        <TopList title="Most Edited" items={topEdited} />
        <TopList title="Most Exported" items={topExported} />
        <TopList title="Highest Regeneration" items={topRegenerated} />
      </div>
    </div>
  );
}

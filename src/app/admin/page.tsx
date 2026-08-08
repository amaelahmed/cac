import Link from 'next/link';
import { Activity, Database, FileText } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link href="/admin/knowledge" className="block p-6 bg-[#111] border border-[#222] rounded-xl hover:border-[#444] transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Knowledge Library</h2>
            <Database className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-gray-400">Manage, edit, and create Intelligence Modules.</p>
        </Link>

        <Link href="/admin/telemetry" className="block p-6 bg-[#111] border border-[#222] rounded-xl hover:border-[#444] transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Telemetry</h2>
            <Activity className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-gray-400">View real-time engine metrics and analytics.</p>
        </Link>

        <div className="block p-6 bg-[#111] border border-[#222] rounded-xl opacity-50 cursor-not-allowed">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Reports (Coming Soon)</h2>
            <FileText className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-gray-400">Manage generated strategic reports.</p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">System Status</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-[#222]">
            <span className="text-gray-400">Knowledge Engine</span>
            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">Online</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#222]">
            <span className="text-gray-400">D1 Database</span>
            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">Connected</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-400">Version</span>
            <span className="text-gray-200">v1.5.0-beta</span>
          </div>
        </div>
      </div>
    </div>
  );
}

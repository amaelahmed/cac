'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Database, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';

type LocalDevSession = {
  enabled: boolean;
  session?: { user: { id: string; email: string; name: string } } | null;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [localDev, setLocalDev] = useState<LocalDevSession>({ enabled: false, session: null });
  const [localDevChecked, setLocalDevChecked] = useState(false);
  const hasAccess = Boolean(session?.user || localDev.session?.user);

  useEffect(() => {
    void fetch('/api/dev-session')
      .then((response) => response.json() as Promise<LocalDevSession>)
      .then((data) => setLocalDev(data))
      .catch(() => setLocalDev({ enabled: false, session: null }))
      .finally(() => setLocalDevChecked(true));
  }, []);

  useEffect(() => {
    if (!isPending && localDevChecked && !hasAccess) {
      router.push('/');
    }
  }, [hasAccess, isPending, localDevChecked, router]);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Knowledge Library', href: '/admin/knowledge', icon: Database },
    { name: 'Telemetry', href: '/admin/telemetry', icon: Activity },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  if (isPending || !localDevChecked || !hasAccess) {
    return (
      <div className="flex h-screen bg-[#050505] text-[#f5f5f5] items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="w-64 border-r border-[#222] bg-[#0A0A0A] flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">CAC Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Intelligence Platform</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-500'
                    : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#222]">
          <Link href="/" className="flex items-center px-4 py-3 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors">
            <LogOut className="mr-3 h-5 w-5" />
            Exit Admin
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

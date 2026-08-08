import { ShieldCheck, WalletCards } from 'lucide-react';

const settings = [
  {
    title: 'Beta Access',
    value: 'Open',
    description: 'Generation and saved reports are available to signed-in testers without a transaction.',
    icon: ShieldCheck,
  },
  {
    title: 'Future Price',
    value: '₹799 / 31 days',
    description: 'Razorpay is prepared for the later paid plan, but checkout is not shown in the app during testing.',
    icon: WalletCards,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <section key={setting.title} className="border border-[#222] bg-[#111] p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{setting.title}</h2>
                <Icon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="mb-3 font-mono text-sm text-green-500">{setting.value}</div>
              <p className="text-sm leading-6 text-gray-400">{setting.description}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

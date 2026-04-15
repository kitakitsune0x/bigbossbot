import { notFound } from 'next/navigation';
import { DASHBOARD_PANEL_IDS, DASHBOARD_PANEL_LABELS, type DashboardPanelId } from '@/lib/auth/config';
import PanelPageClient from '@/components/dashboard/PanelPageClient';

export function generateStaticParams() {
  return DASHBOARD_PANEL_IDS.map((id) => ({ panelId: id }));
}

export default async function PanelPage({
  params,
}: {
  params: Promise<{ panelId: string }>;
}) {
  const { panelId } = await params;

  if (!(DASHBOARD_PANEL_IDS as readonly string[]).includes(panelId)) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-border px-4 py-2 shrink-0 bg-card">
        <h1 className="text-sm font-semibold uppercase tracking-wider">
          {DASHBOARD_PANEL_LABELS[panelId as DashboardPanelId]}
        </h1>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <PanelPageClient panelId={panelId as DashboardPanelId} />
      </div>
    </div>
  );
}

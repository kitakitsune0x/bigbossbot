import type { DashboardPanelId } from '@/lib/auth/config';

export const DASHBOARD_PANEL_FOCUS_EVENT = 'aware:focus-dashboard-panel';

type PlainLeftClickLike = {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export function isPlainLeftClick(event: PlainLeftClickLike) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function focusDashboardPanel(panelId: DashboardPanelId) {
  window.dispatchEvent(
    new CustomEvent<{ panelId: DashboardPanelId }>(DASHBOARD_PANEL_FOCUS_EVENT, {
      detail: { panelId },
    }),
  );
}

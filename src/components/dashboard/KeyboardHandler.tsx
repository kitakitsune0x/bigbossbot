'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { scrollToPanel } from '@/components/dashboard/CommandPalette';
import { useDashboardPreferences } from '@/components/dashboard/PreferencesProvider';

export default function KeyboardHandler() {
  const router = useRouter();
  const { visiblePanels, viewer } = useDashboardPreferences();
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      // Skip if inside input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Skip if command palette or dialog is open
      if (document.querySelector('[role="dialog"]')) return;

      // Cmd+B: Toggle sidebar
      if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-sidebar'));
        return;
      }

      // Number keys 1-9,0: Jump to panel by index
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const num = parseInt(e.key);
        if (!isNaN(num)) {
          const idx = num === 0 ? 9 : num - 1;
          if (idx < visiblePanels.length) {
            e.preventDefault();
            scrollToPanel(visiblePanels[idx]);
          }
          return;
        }

        // G + key navigation
        if (e.key === 'g' && !pendingG.current) {
          pendingG.current = true;
          clearTimeout(gTimer.current);
          gTimer.current = setTimeout(() => { pendingG.current = false; }, 500);
          return;
        }

        if (pendingG.current) {
          pendingG.current = false;
          clearTimeout(gTimer.current);
          if (e.key === 'd') { router.push('/dashboard'); return; }
          if (e.key === 's' && viewer.isAuthenticated) { router.push('/account/settings'); return; }
          if (e.key === 'u' && viewer.role === 'admin') { router.push('/admin/users'); return; }
        }
      }
    };

    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [router, viewer, visiblePanels]);

  return null;
}

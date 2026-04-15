'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SHORTCUT_GROUPS = [
  {
    label: 'General',
    shortcuts: [
      { keys: ['\u2318', 'K'], description: 'Open command palette' },
      { keys: ['\u2318', 'B'], description: 'Toggle sidebar' },
      { keys: ['\u2318', '/'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialogs' },
    ],
  },
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'S'], description: 'Go to Security' },
      { keys: ['G', 'U'], description: 'Go to User Management' },
    ],
  },
  {
    label: 'Dashboard',
    shortcuts: [
      { keys: ['1'], description: 'Jump to 1st panel' },
      { keys: ['2'], description: 'Jump to 2nd panel' },
      { keys: ['3'], description: 'Jump to 3rd panel' },
      { keys: ['0'], description: 'Jump to 10th panel' },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 text-[10px] font-mono font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const handleCustom = () => setOpen((o) => !o);

    document.addEventListener('keydown', handleKey);
    window.addEventListener('toggle-shortcuts-help', handleCustom);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('toggle-shortcuts-help', handleCustom);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold uppercase tracking-wider">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review available navigation and dashboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between">
                    <span className="text-[12px]">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, i) => (
                        <Kbd key={i}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { Kbd };

'use client';

import { useDataFeed, formatPrice } from '@/lib/hooks';

interface OilData {
  type: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  error?: boolean;
}

export default function MetricsBar() {
  const { data: oilData } = useDataFeed<OilData[]>('/api/oil', 600000);

  const wti = oilData?.find(o => o.type === 'crude_wti');
  const brent = oilData?.find(o => o.type === 'crude_brent');
  const natGas = oilData?.find(o => o.type === 'natural_gas');

  const metrics = [
    {
      label: 'WTI',
      value: wti && !wti.error && wti.price !== null ? `$${formatPrice(wti.price)}` : '—',
      change: !wti?.error && wti?.changePercent !== null && wti?.changePercent !== undefined ? wti.changePercent : null,
    },
    {
      label: 'BRENT',
      value: brent && !brent.error && brent.price !== null ? `$${formatPrice(brent.price)}` : '—',
      change: !brent?.error && brent?.changePercent !== null && brent?.changePercent !== undefined ? brent.changePercent : null,
    },
    {
      label: 'NATGAS',
      value: natGas && !natGas.error && natGas.price !== null ? `$${formatPrice(natGas.price)}` : '—',
      change: !natGas?.error && natGas?.changePercent !== null && natGas?.changePercent !== undefined ? natGas.changePercent : null,
    },
    { label: 'THREAT', value: 'ELEVATED', change: 0, isThreat: true },
  ];

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-2 px-2.5 py-0.5">
          <span className="text-[10px] text-muted-foreground tracking-wider">{m.label}</span>
          <span className={`text-[13px] font-semibold font-mono ${
            m.isThreat ? 'text-caution' : ''
          }`}>
            {m.value}
          </span>
          {!m.isThreat && typeof m.change === 'number' && m.change !== 0 && (
            <span className={`text-[10px] font-mono ${m.change > 0 ? 'value-up' : 'value-down'}`}>
              {m.change > 0 ? '+' : ''}{m.change.toFixed(2)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

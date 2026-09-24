import React, { memo } from 'react';
import { useTheme } from '../../services/themeContext';

export interface DexScreenerWidgetProps {
  sym: string;
  poolAddress?: string;
  height?: number | string;
}

// Known top Solana DEX Raydium / Orca pool addresses
const KNOWN_DEX_POOLS: Record<string, string> = {
  SOL: 'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
  BONK: '8sLbNZoA1cfnvMJLPfp98nS8ETAYoxK2YVT3DVhWC9mU',
  WIF: 'EP2ib6dYdEeqD8MfE2ezHCxX3kEDnjG2A3YMg9N73qg3',
  JUP: '22Mmge5EKCAspZMyoDnUtFFYmfibEs3XdZtLD42xTRqX',
  RAY: 'AVs9TA4nWDzfPJE9gGVNJmvhcQy3V9PGVoq4QKDUAPAl',
  POPCAT: 'FRhB8L7Y9Qq41qZXYLt75b5g9UvCXKDH28gkUvM3mp9',
  MEW: '8cM15msrQhMRd5S2H4pPpswXg7P5uPbgxQ8w56p9y2a',
  BOME: 'DSUvc5qf5LJHHV5e2tD184ixYNCRgwMWbgzPSpCqPr2',
  PENGU: '2t48WsqhFzX6pC6y4xMfqy7H3sZ346yXj1',
  TRUMP: '6p6xgHyF7AeQHydaKV1i4mE4N65pb8V6fQ4N3k8pump',
  FARTCOIN: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
};

export const DexScreenerWidget: React.FC<DexScreenerWidgetProps> = memo(({
  sym,
  poolAddress,
  height = 360,
}) => {
  const { isLight } = useTheme();
  const cleanSym = (sym || 'SOL').toUpperCase().trim();
  const targetPool = poolAddress || KNOWN_DEX_POOLS[cleanSym] || KNOWN_DEX_POOLS.SOL;

  const embedUrl = `https://dexscreener.com/solana/${targetPool}?embed=1&theme=${isLight ? 'light' : 'dark'}&trades=0&info=0`;

  return (
    <div
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        overflow: 'hidden',
        background: isLight ? '#FFFFFF' : '#0B0E14',
      }}
    >
      <iframe
        src={embedUrl}
        title={`DexScreener ${cleanSym}`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="clipboard-write"
      />
    </div>
  );
});

DexScreenerWidget.displayName = 'DexScreenerWidget';

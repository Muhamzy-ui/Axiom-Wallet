import React, { useEffect, useRef, memo } from 'react';
import { useTheme } from '../../services/themeContext';

export interface TradingViewWidgetProps {
  sym: string;
  timeframe?: string;
  height?: number | string;
}

const TV_SYMBOL_MAP: Record<string, string> = {
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT',
  BNB: 'BINANCE:BNBUSDT',
  XRP: 'BINANCE:XRPUSDT',
  DOGE: 'BINANCE:DOGEUSDT',
  ADA: 'BINANCE:ADAUSDT',
  AVAX: 'BINANCE:AVAXUSDT',
  SUI: 'BINANCE:SUIUSDT',
  BONK: 'BINANCE:BONKUSDT',
  WIF: 'BINANCE:WIFUSDT',
  JUP: 'BINANCE:JUPUSDT',
  RAY: 'BINANCE:RAYUSDT',
  PEPE: 'BINANCE:PEPEUSDT',
  SHIB: 'BINANCE:SHIBUSDT',
  NEAR: 'BINANCE:NEARUSDT',
  APT: 'BINANCE:APTUSDT',
  LINK: 'BINANCE:LINKUSDT',
  POPCAT: 'BINANCE:POPCATUSDT',
  FLOKI: 'BINANCE:FLOKIUSDT',
  RENDER: 'BINANCE:RENDERUSDT',
  FET: 'BINANCE:FETUSDT',
};

const TF_TO_TV: Record<string, string> = {
  '1s': '1',
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  'D': 'D',
  '1d': 'D',
};

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  sym,
  timeframe = '15m',
  height = 360,
}) => {
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cleanSym = (sym || 'BTC').toUpperCase().trim();
  const tvSymbol = TV_SYMBOL_MAP[cleanSym] || `BINANCE:${cleanSym}USDT`;
  const tvInterval = TF_TO_TV[timeframe] || '15';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    const widgetConfig = {
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: isLight ? 'light' : 'dark',
      style: '1', // 1 = Real Japanese Candlesticks
      locale: 'en',
      enable_publishing: false,
      backgroundColor: isLight ? '#FFFFFF' : '#0B0E14',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'MASimple@tv-basicstudies',
      ],
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [tvSymbol, tvInterval, isLight]);

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
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';

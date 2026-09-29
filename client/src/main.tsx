import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './services/themeContext';
import { AxiomLogo } from './components/common/AxiomLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Axiom Root Interface Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080B11",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          padding: 24,
          textAlign: "center"
        }}>
          <div style={{ marginBottom: 20 }}>
            <AxiomLogo size={56} withGlow={true} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Axiom Terminal Recovery</h2>
          <p style={{ color: "#94A3B8", fontSize: 13, maxWidth: 440, marginBottom: 20, lineHeight: 1.5 }}>
            {this.state.error?.message || "An unexpected interface error occurred during render."}
          </p>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("axiom_active_view");
                const toRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.includes("orders") || key.includes("trade"))) {
                    toRemove.push(key);
                  }
                }
                toRemove.forEach(k => localStorage.removeItem(k));
              } catch {}
              window.location.href = "/";
            }}
            style={{
              background: "#7C3AED", color: "#fff", border: "none",
              padding: "12px 28px", borderRadius: 10, fontWeight: 700,
              fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124, 58, 237, 0.3)"
            }}
          >
            Reload Axiom Wallet
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);


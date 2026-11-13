import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import './styles/app.css';
import './pwa';
import { App } from './App';

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app"><div className="screen no-tabs" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22 }}>Что-то пошло не так</h1>
        <p className="muted">Данные сохранены. Попробуй перезагрузить приложение.</p>
        <button className="btn primary" onClick={() => { window.location.hash = '/'; window.location.reload(); }}>Перезагрузить</button>
      </div></div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Boundary><App /></Boundary></React.StrictMode>,
);

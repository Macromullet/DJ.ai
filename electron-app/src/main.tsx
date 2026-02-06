import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { bootstrapApp } from './config/bootstrap';
import { ErrorBoundary } from './components/ErrorBoundary';
import MainApp from './App';

// Design system (order matters: tokens → base → utilities → component styles)
import './styles/tokens.css';
import './styles/base.css';
import './styles/utilities.css';

// Bootstrap the application
bootstrapApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

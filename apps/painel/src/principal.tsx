import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Aplicacao } from './Aplicacao';
import './estilos.css';

const INTERVALO_ATUALIZACAO_MS = 15_000;

const clienteConsulta = new QueryClient({
  defaultOptions: { queries: { refetchInterval: INTERVALO_ATUALIZACAO_MS, retry: 1 } },
});

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento raiz não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsulta}>
      <BrowserRouter>
        <Aplicacao />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

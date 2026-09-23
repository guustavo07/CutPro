import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const ITENS_MENU = [
  { caminho: '/', rotulo: 'Dashboard', icone: '◱' },
  { caminho: '/canais', rotulo: 'Canais', icone: '◎' },
  { caminho: '/lives', rotulo: 'Lives', icone: '●' },
  { caminho: '/cortes', rotulo: 'Cortes', icone: '✂' },
  { caminho: '/publicacoes', rotulo: 'Publicações', icone: '↗' },
  { caminho: '/configuracoes', rotulo: 'Configurações', icone: '⚙' },
];

function classeLink(ativo: boolean): string {
  const base = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition';
  if (ativo) return `${base} bg-superficieAlta text-textoPrimario`;

  return `${base} text-textoSecundario hover:bg-superficieAlta hover:text-textoPrimario`;
}

export function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-borda bg-superficie lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destaque text-sm font-bold">
            C
          </span>
          <span className="text-base font-semibold tracking-tight">CutPro</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {ITENS_MENU.map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              end={item.caminho === '/'}
              className={({ isActive }) => classeLink(isActive)}
            >
              <span aria-hidden className="text-destaqueSuave">
                {item.icone}
              </span>
              <span className="whitespace-nowrap">{item.rotulo}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}

export function TituloPagina({ titulo, descricao }: { readonly titulo: string; readonly descricao?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      {descricao ? <p className="mt-1 text-sm text-textoSecundario">{descricao}</p> : null}
    </header>
  );
}

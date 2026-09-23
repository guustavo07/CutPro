import { Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { Canais } from './paginas/Canais';
import { Configuracoes } from './paginas/Configuracoes';
import { Cortes, DetalheCorte } from './paginas/Cortes';
import { Dashboard } from './paginas/Dashboard';
import { DetalheLive, Lives } from './paginas/Lives';
import { Publicacoes } from './paginas/Publicacoes';

export function Aplicacao() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/canais" element={<Canais />} />
        <Route path="/lives" element={<Lives />} />
        <Route path="/lives/:id" element={<DetalheLive />} />
        <Route path="/cortes" element={<Cortes />} />
        <Route path="/cortes/:id" element={<DetalheCorte />} />
        <Route path="/publicacoes" element={<Publicacoes />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Layout>
  );
}

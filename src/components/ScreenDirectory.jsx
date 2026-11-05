import {
  ArrowUpRight,
  Compass,
  ShieldCheck,
  Store,
  UserRound,
  Wrench,
} from "lucide-react";
import { SCREEN_GROUPS } from "../routes.js";
export default function ScreenDirectory() {
  return (
    <section className="wrap screen-directory">
      <span className="eyebrow">SUPERVISÃO AZULSKYE</span>
      <h1>Todas as telas, em um só lugar.</h1>
      <p>
        Use este mapa para revisar a loja e cada perfil. Os painéis continuam
        demonstrativos, com dados salvos somente neste navegador.
      </p>
      <div className="directory-logins">
        <h2>Acessos de demonstração</h2>
        <p>
          Senha dos quatro perfis: <code>AzulDemo123!</code>
        </p>
        <div>
          <span>
            <UserRound size={18} /> cliente@azulskye.demo
          </span>
          <span>
            <Store size={18} /> vendedor@azulskye.demo
          </span>
          <span>
            <Wrench size={18} /> oficina@azulskye.demo
          </span>
          <span>
            <ShieldCheck size={18} /> admin@azulskye.demo
          </span>
        </div>
        <a className="btn btn-primary" href="#/entrar">
          Escolher perfil <ArrowUpRight size={16} />
        </a>
      </div>
      {SCREEN_GROUPS.map((group) => (
        <section className="directory-group" key={group.title}>
          <h2>{group.title}</h2>
          <p>{group.description}</p>
          <div className="directory-grid">
            {group.screens.map(([label, path]) => (
              <a key={path} href={`#${path}`}>
                <span>
                  <strong>{label}</strong>
                  <code>{path}</code>
                </span>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>
        </section>
      ))}
      <div className="directory-note">
        <Compass size={24} />
        <p>
          Notificações abrem pelo sino dos painéis. Cadastro e edição de
          produtos abrem em “Novo produto” e no ícone de edição. Os detalhes de
          pedidos abrem ao tocar no pedido; o checkout abre pela sacola.
        </p>
      </div>
    </section>
  );
}

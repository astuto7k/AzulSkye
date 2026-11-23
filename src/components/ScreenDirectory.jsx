import {
  ArrowUpRight,
  Compass,
} from "lucide-react";
import { SCREEN_GROUPS } from "../routes.js";
export default function ScreenDirectory() {
  return (
    <section className="wrap screen-directory">
      <span className="eyebrow">SUPERVISÃO AZULSKYE</span>
      <h1>Todas as telas, em um só lugar.</h1>
      <p>
        Escolha uma tela para abrir. As áreas de gestão exigem o acesso correspondente.
      </p>
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
          Ative avisos de vendas em Configurações. Você pode abrir cada pedido para acompanhar o pagamento e a retirada.
        </p>
      </div>
    </section>
  );
}

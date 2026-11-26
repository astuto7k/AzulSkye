import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { money } from "../model.js";
export default function CheckoutSummary({ group, config, total }) {
  const [all, setAll] = useState(false);
  const visible = all ? group.items : group.items.slice(0, 2);
  return (
    <aside className="ck-summary">
      <div className="ck-summary-title">
        <ShoppingBag size={20} />
        <h2>Seu pedido</h2>
        <a href="#/sacola">Editar</a>
      </div>
      <ul>
        {visible.map((p) => (
          <li key={p.id}>
            <img src={p.image} alt="" width="60" height="60" />
            <div>
              <strong>{p.name}</strong>
              <small>
                {p.quantity} {p.quantity === 1 ? "unidade" : "unidades"}
              </small>
            </div>
            <b>{money(p.price * p.quantity)}</b>
          </li>
        ))}
      </ul>
      {group.items.length > 2 && (
        <button
          type="button"
          className="text-link"
          onClick={() => setAll(!all)}
        >
          {all ? "Ver menos" : "Ver todos os " + group.items.length + " itens"}
        </button>
      )}
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(group.total)}</dd>
        </div>
        <div>
          <dt>{config?.deliveryMode === "pickup" ? "Retirada" : "Entrega"}</dt>
          <dd>
            {config?.enabled
              ? config.deliveryMode === "pickup"
                ? "Grátis"
                : money(config.shippingCents / 100)
              : "A confirmar"}
          </dd>
        </div>
        <div className="ck-total">
          <dt>Total</dt>
          <dd>{config?.enabled ? money(total) : "A confirmar"}</dd>
        </div>
      </dl>
    </aside>
  );
}

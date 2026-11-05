import { useState } from "react";
import {
  Wrench,
  ArrowUpRight,
  Check,
  MapPin,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import {
  SPECIALTIES,
  SERVICE_STATUSES,
  validateWorkshop,
  visibleWorkshopRequests,
} from "../workshops.js";
const Note = () => (
  <div className="demo-note">
    <ShieldCheck size={16} />
    <span>
      Demonstração: use dados fictícios. Cadastros e solicitações ficam apenas
      neste navegador; nenhum contato é enviado.
    </span>
  </div>
);
const Status = ({ status }) => (
  <span
    className={`tag tag-${status === "approved" ? "green" : status === "pending" ? "amber" : "red"}`}
  >
    {status === "approved"
      ? "Aprovada"
      : status === "pending"
        ? "Em análise"
        : "Suspensa / recusada"}
  </span>
);
export function WorkshopForm({ profile, onSave }) {
  const [selected, setSelected] = useState(profile?.specialties || []),
    [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const value = {
          ...Object.fromEntries(new FormData(e.currentTarget)),
          specialties: selected,
        };
        const issue = validateWorkshop(value);
        if (issue) return setError(issue);
        setError("");
        onSave(value);
      }}
    >
      <div className="form-grid">
        <label className="field">
          <span>Nome da oficina ou profissional</span>
          <input
            name="name"
            defaultValue={profile?.name}
            required
            maxLength="100"
          />
        </label>
        <label className="field">
          <span>Nome do responsável</span>
          <input
            name="owner"
            defaultValue={profile?.owner}
            required
            maxLength="100"
          />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Tipo de parceiro</span>
          <select
            name="documentType"
            defaultValue={profile?.documentType || "CNPJ"}
          >
            <option value="CNPJ">Empresa — CNPJ</option>
            <option value="CPF">Profissional autônomo — CPF</option>
          </select>
        </label>
        <label className="field">
          <span>Email de contato (teste)</span>
          <input
            type="email"
            name="email"
            defaultValue={profile?.email}
            placeholder="oficina@example.com"
            required
          />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Cidade e estado</span>
          <input
            name="city"
            defaultValue={profile?.city}
            placeholder="Cidade, UF"
            required
          />
        </label>
        <label className="field">
          <span>Forma de atendimento</span>
          <select name="serviceMode" defaultValue={profile?.serviceMode}>
            <option>Presencial e envio de equipamento</option>
            <option>Somente presencial</option>
            <option>Somente envio de equipamento</option>
          </select>
        </label>
      </div>
      <fieldset className="workshop-specialties">
        <legend>Especialidades</legend>
        <div>
          {SPECIALTIES.map((s) => (
            <label className="radio-label" key={s}>
              <input
                type="checkbox"
                checked={selected.includes(s)}
                onChange={(e) =>
                  setSelected((v) =>
                    e.target.checked ? [...v, s] : v.filter((x) => x !== s),
                  )
                }
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Serviços e apresentação</span>
        <textarea
          name="description"
          rows="4"
          defaultValue={profile?.description}
          placeholder="Descreva o que você conserta e como atende."
          required
          maxLength="1500"
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit">
        Enviar para aprovação <ArrowUpRight size={17} />
      </button>
    </form>
  );
}
export function WorkshopRegistration({ data, update, notify }) {
  const [sent, setSent] = useState(false);
  return (
    <section className="wrap workshop-page">
      <span className="eyebrow">PARCEIROS AZULSKYE</span>
      <h1>Seu conhecimento mantém o voo em dia.</h1>
      <p>
        Cadastre sua oficina ou seu perfil profissional para manutenção de
        motores, velas, asas e outros equipamentos.
      </p>
      <Note />
      {sent ? (
        <div className="panel settings-panel">
          <Check size={35} />
          <h2>Cadastro enviado para análise.</h2>
          <p>
            A equipe AzulSkye pode aprovar ou recusar a solicitação em
            Administração → Oficinas parceiras.
          </p>
          <a className="btn btn-primary" href="#/telas">
            Ver acessos e telas <ArrowUpRight size={17} />
          </a>
        </div>
      ) : (
        <div className="panel settings-panel">
          <WorkshopForm
            onSave={(profile) => {
              update((d) => ({
                ...d,
                workshops: [
                  ...d.workshops,
                  {
                    ...profile,
                    id: crypto.randomUUID(),
                    status: "pending",
                    isDemo: true,
                  },
                ],
              }));
              setSent(true);
              notify("Cadastro de oficina enviado para análise.");
            }}
          />
        </div>
      )}
    </section>
  );
}
export function WorkshopDirectory({ data, user, update, notify, go }) {
  const [specialty, setSpecialty] = useState("Todas"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null);
  const shops = data.workshops.filter(
    (w) =>
      w.status === "approved" &&
      (specialty === "Todas" || w.specialties.includes(specialty)) &&
      `${w.name} ${w.city}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section className="wrap workshop-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OFICINAS PARCEIRAS</span>
          <h1>Cuidado especializado para seu equipamento.</h1>
        </div>
        <a className="btn btn-primary" href="#/ser-oficina">
          Quero ser parceiro <ArrowUpRight size={17} />
        </a>
      </div>
      <p>
        Encontre empresas e profissionais por especialidade e localização.
        Confirme o serviço e as condições diretamente com o parceiro.
      </p>
      <Note />
      <div className="workshop-filters">
        <label className="field">
          <span>Buscar oficina ou cidade</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou localização"
          />
        </label>
        <label className="field">
          <span>Especialidade</span>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option>Todas</option>
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="workshop-grid">
        {shops.map((w) => (
          <article className="panel settings-panel" key={w.id}>
            <Wrench size={28} />
            <h2>{w.name}</h2>
            <p className="workshop-location">
              <MapPin size={16} />
              {w.city}
            </p>
            <div className="workshop-tags">
              {w.specialties.map((s) => (
                <span className="tag tag-blue" key={s}>
                  {s}
                </span>
              ))}
            </div>
            <p>{w.description}</p>
            <small>{w.serviceMode}</small>
            {w.isDemo && (
              <p className="muted">
                Perfil demonstrativo · sem credenciamento real.
              </p>
            )}
            <button
              className="btn btn-outline"
              onClick={() => {
                if (user?.role !== "client") {
                  notify(
                    "Escolha o perfil de cliente para testar uma solicitação.",
                  );
                  go("/entrar");
                  return;
                }
                setSelected(selected === w.id ? null : w.id);
              }}
            >
              Solicitar orçamento de teste <ArrowUpRight size={16} />
            </button>
            {selected === w.id && (
              <form
                className="form-stack request-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  update((d) => ({
                    ...d,
                    serviceRequests: [
                      {
                        ...value,
                        id: crypto.randomUUID(),
                        workshopId: w.id,
                        workshopName: w.name,
                        customerId: user.email,
                        customer: user.name,
                        status: "Recebida",
                        createdAt: new Date().toISOString(),
                      },
                      ...d.serviceRequests,
                    ],
                  }));
                  setSelected(null);
                  notify("Solicitação de teste registrada para a oficina.");
                }}
              >
                <label className="field">
                  <span>Equipamento / modelo</span>
                  <input name="equipment" required maxLength="120" />
                </label>
                <label className="field">
                  <span>O que precisa de manutenção?</span>
                  <textarea
                    name="description"
                    rows="3"
                    required
                    maxLength="1500"
                  />
                </label>
                <button className="btn btn-primary">
                  Enviar solicitação de teste
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
      {!shops.length && (
        <div className="empty">
          <h2>Nenhuma oficina encontrada.</h2>
          <p>Tente outra especialidade ou localização.</p>
        </div>
      )}
    </section>
  );
}
export function WorkshopRequests({ data, user, update, notify }) {
  const requests = visibleWorkshopRequests(data.serviceRequests, user);
  return (
    <section className="panel settings-panel">
      <h2>Solicitações de manutenção</h2>
      {!requests.length ? (
        <p>Nenhuma solicitação de teste recebida.</p>
      ) : (
        requests.map((r) => (
          <article className="service-request" key={r.id}>
            <div>
              <h3>{r.equipment}</h3>
              <p>
                {r.customer} · {r.workshopName}
              </p>
              <p>{r.description}</p>
            </div>
            <label className="field">
              <span>Etapa do atendimento</span>
              <select
                value={r.status}
                onChange={(e) => {
                  const status = e.target.value;
                  update((d) => ({
                    ...d,
                    serviceRequests: d.serviceRequests.map((x) =>
                      x.id === r.id ? { ...x, status } : x,
                    ),
                  }));
                  notify("Etapa do atendimento atualizada.");
                }}
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </article>
        ))
      )}
    </section>
  );
}
export function WorkshopAdmin({ data, user, update, notify }) {
  const status = (id, value) => {
    update((d) => ({
      ...d,
      workshops: d.workshops.map((w) =>
        w.id === id ? { ...w, status: value } : w,
      ),
    }));
    notify(
      value === "approved"
        ? "Oficina aprovada na demonstração."
        : "Cadastro de oficina atualizado.",
    );
  };
  return (
    <div className="workshop-admin">
      <section className="panel settings-panel">
        <h2>Cadastros de oficinas parceiras</h2>
        <p>
          Analise empresas e profissionais antes de publicar seus perfis na área
          de oficinas.
        </p>
        {data.workshops.map((w) => (
          <article className="workshop-admin-row" key={w.id}>
            <div>
              <h3>{w.name}</h3>
              <p>
                {w.owner} · {w.documentType} · {w.email}
              </p>
              <p>
                {w.city} · {w.specialties.join(", ")}
              </p>
              <p>{w.description}</p>
            </div>
            <Status status={w.status} />
            <div className="button-row">
              {w.status !== "approved" && (
                <button
                  className="btn btn-primary"
                  onClick={() => status(w.id, "approved")}
                >
                  Aprovar
                </button>
              )}
              <button
                className="btn btn-outline"
                onClick={() => status(w.id, "rejected")}
              >
                {w.status === "approved" ? "Suspender" : "Recusar"}
              </button>
            </div>
          </article>
        ))}
      </section>
      <WorkshopRequests
        data={data}
        user={user}
        update={update}
        notify={notify}
      />
    </div>
  );
}
export function WorkshopDashboard({ data, user, page, update, notify }) {
  const profile = data.workshops.find((w) => w.id === user.workshopId),
    tab = page.split("/")[2] || "visao-geral";
  return (
    <section className="wrap workshop-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PAINEL DA OFICINA PARCEIRA</span>
          <h1>Seu espaço de manutenção.</h1>
        </div>
        <a className="btn btn-outline" href="#/telas">
          Todas as telas <ArrowUpRight size={16} />
        </a>
      </div>
      <nav className="workshop-tabs" aria-label="Painel da oficina">
        {[
          ["visao-geral", "Visão geral"],
          ["perfil", "Meu perfil e serviços"],
          ["solicitacoes", "Solicitações"],
        ].map(([id, label]) => (
          <a
            key={id}
            className={tab === id ? "active" : ""}
            href={`#/oficina/${id}`}
          >
            {label}
          </a>
        ))}
      </nav>
      <Note />
      {tab === "perfil" ? (
        <section className="panel settings-panel">
          <h2>Meu perfil e serviços</h2>
          <p>
            Alterações no perfil retornam à análise antes de aparecer no
            diretório.
          </p>
          <WorkshopForm
            profile={profile}
            onSave={(value) => {
              update((d) => ({
                ...d,
                workshops: d.workshops.map((w) =>
                  w.id === user.workshopId
                    ? { ...w, ...value, status: "pending" }
                    : w,
                ),
              }));
              notify("Perfil enviado para nova aprovação.");
            }}
          />
        </section>
      ) : tab === "solicitacoes" ? (
        <WorkshopRequests
          data={data}
          user={user}
          update={update}
          notify={notify}
        />
      ) : (
        <>
          <div className="metrics-grid three">
            <article className="metric">
              <div>
                Perfil da oficina <Wrench size={20} />
              </div>
              <strong>{profile?.name || "Cadastro pendente"}</strong>
              {profile && <Status status={profile.status} />}
            </article>
            <article className="metric">
              <div>Especialidades</div>
              <strong>{profile?.specialties.length || 0}</strong>
              <small>{profile?.specialties.join(" · ")}</small>
            </article>
            <article className="metric">
              <div>Solicitações de teste</div>
              <strong>
                {visibleWorkshopRequests(data.serviceRequests, user).length}
              </strong>
              <small>Sem envio de contato ou cobrança real.</small>
            </article>
          </div>
          <section className="panel settings-panel">
            <h2>Prepare seu próximo atendimento.</h2>
            <p>
              Apresente os serviços, acompanhe as solicitações e mantenha seu
              perfil atualizado.
            </p>
            <div className="button-row">
              <a className="btn btn-primary" href="#/oficina/perfil">
                <Settings2 size={17} /> Editar perfil e serviços
              </a>
              <a className="btn btn-outline" href="#/oficina/solicitacoes">
                Ver solicitações
              </a>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

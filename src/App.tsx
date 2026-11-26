import CloudPanel from "./CloudPanel";
import { cloudSave, cloudLogout, cloudRead, cloudUseLoaded } from "./cloud";
import AuthGate from "./AuthGate";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowRight,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCircle2,
  Wallet,
  Landmark,
  Building2,
  Car,
  Layers,
  PiggyBank,
  House,
  ChartNoAxesCombined,
  Clock3,
  Link2,
  Settings2,
  Eye,
  EyeOff,
  Download,
  Upload,
  FileText,
  ShieldCheck,
  X,
  LogOut,
  Sun,
  Moon,
  Trash2,
  Search,
  Info,
  BookOpen,
  RefreshCw,
  Archive,
} from "lucide-react";
import Papa from "papaparse";
import { pref } from "./preferences";
import Importer from "./Importer";
import Portfolio from "./Portfolio";
import { isStore } from "./validation";
import Insights from "./Insights";
import {
  bankCoverage,
  coverageChecked,
  personalProviderTerms,
  personalProviderActivation,
} from "./bankCoverage";
import OperationForm from "./OperationForm";
import {
  categories,
  empty,
  demo,
  demoHistory,
  today,
  uid,
  totals,
  value,
  latest,
  money,
  dateLabel,
  parseNumber,
  transfer,
  fingerprint,
  type Asset,
  type Category,
  type Store,
  type Valuation,
} from "./model";
import { load, save, download } from "./storage";
const icons = {
  cash: Wallet,
  investment: ChartNoAxesCombined,
  pension: PiggyBank,
  property: House,
  vehicle: Car,
  other: Layers,
  debt: Landmark,
};
const colors: Record<Category, string> = {
  cash: "#658b73",
  investment: "#a5ba90",
  pension: "#d2b979",
  property: "#345b43",
  vehicle: "#a49a87",
  other: "#868da5",
  debt: "#be7658",
};
type Page = "Panoramica" | "Patrimonio" | "Storico" | "Fonti";
const nav = [
  { name: "Panoramica" as Page, icon: House },
  { name: "Patrimonio" as Page, icon: Wallet },
  { name: "Storico" as Page, icon: Clock3 },
  { name: "Fonti" as Page, icon: Link2 },
];
function Dog({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "dog small" : "dog"}
      viewBox="0 0 320 230"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="164"
        cy="209"
        rx="117"
        ry="7"
        fill="currentColor"
        opacity=".05"
      />
      <g
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m183 174 77-22 24 40-76 22z" fill="var(--paper)" />
        <path d="m185 170 76-22 24 40-76 22z" fill="var(--card)" />
        <path d="m199 176 53-15m-48 22 53-15m-49 22 35-10" opacity=".35" />
        <path
          d="M108 195c-8-9-12-22-9-38l-15-19-8-31 22-12 12-29 34 3 23 27 22 11-7 19-25 9 5 24 16 17-3 26h-22l-6-19-7-6-7 28h-23l1-15"
          fill="var(--paper)"
        />
        <path d="m98 95 9-30 13 25-7 18m26-37 3-18 20 36M103 153c-25-10-39-22-41-44-9 29 1 47 35 61m19 17 5-27m31-26-29-6m2-18 5 2m25-8 2 2m15 7 13-4m-41 13 11 3m-50 16-3 12m19-30-3 7m5-40 2 6" />
        <path
          d="m115 129 44 5-8 21-17-11-14 5z"
          fill="#345B43"
          stroke="#345B43"
        />
        <path d="m154 144 6 16-11-6" stroke="#345B43" />
        <path d="m66 71 3-7m-16 18-7-2m136-27 5-5" opacity=".4" />
      </g>
    </svg>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    const focusables = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        ) || [],
      ).filter((e) => !e.hasAttribute("disabled"));
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = focusables();
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
      >
        <header>
          <div>
            <span className="eyebrow">IL TUO TACCUINO</span>
            <h2>{title}</h2>
          </div>
          <button className="iconbutton" aria-label="Chiudi" onClick={onClose}>
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function App({
  authReturn = null,
}: {
  authReturn?: "signin" | "expired" | null;
}) {
  const [mode, setMode] = useState<"personal" | "demo" | null>(null),
    [store, setStore] = useState<Store>(empty),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState<Page>("Panoramica"),
    [modal, setModal] = useState<string | null>(null),
    [selected, setSelected] = useState<Asset | null>(null),
    [hidden, setHidden] = useState(false),
    [theme, setTheme] = useState(() => pref.get("bau-theme") || "light"),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState("category"),
    [asOf, setAsOf] = useState(today()),
    [compare, setCompare] = useState(""),
    [persistError, setPersistError] = useState("");
  const [auth, setAuth] = useState(false),
    [sync, setSync] = useState<"saved" | "saving" | "error">("saved");
  const syncRef = useRef<"saved" | "saving" | "error">("saved");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const setSyncStatus = (v: "saved" | "saving" | "error") => {
    syncRef.current = v;
    setSync(v);
  };
  useEffect(() => {
    const m = pref.get("bau-mode") as "personal" | "demo" | null;
    if (m === "demo" && !authReturn) {
      load("demo")
        .then((data) => {
          setStore(data || demo());
          setMode("demo");
        })
        .catch(() => setPersistError("Demo locale non disponibile."))
        .finally(() => setLoading(false));
    } else {
      setAuth(m === "personal" || !!authReturn);
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (mode !== "personal") return;
    const before = (e: BeforeUnloadEvent) => {
      if (syncRef.current !== "saved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [mode]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    pref.set("bau-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const start = async (m: "personal" | "demo") => {
    if (m === "personal") {
      setAuth(true);
      setMode(null);
      setStore(empty());
      cloudLogout();
      return;
    }
    try {
      const next = (await load("demo")) || demo();
      await save("demo", next);
      cloudLogout();
      setAuth(false);
      setStore(next);
      setMode("demo");
      pref.set("bau-mode", "demo");
      setPage("Panoramica");
      setPersistError("");
    } catch {
      setPersistError("Impossibile aprire la demo del dispositivo.");
    }
  };
  const openPersonal = (s: Store) => {
    setStore(s);
    setMode("personal");
    setAuth(false);
    pref.set("bau-mode", "personal");
    setPage("Panoramica");
    setPersistError("");
    setSyncStatus("saved");
  };
  const logout = () => {
    if (syncRef.current === "saving") return;
    if (
      syncRef.current === "error" &&
      !window.confirm(
        "Ci sono modifiche non salvate. Uscendo verranno perse. Vuoi uscire?",
      )
    )
      return;
    cloudLogout();
    setStore(empty());
    setMode(null);
    setModal(null);
    setSelected(null);
    setAuth(false);
    setPersistError("");
    setSyncStatus("saved");
    pref.remove("bau-mode");
  };
  const update = async (s: Store) => {
    if (mode === "personal") {
      if (syncRef.current !== "saved") {
        setPersistError(
          "Salvataggio non disponibile: risolvi prima l’errore o attendi il completamento.",
        );
        return;
      }
      setSyncStatus("saving");
      setStore(s);
      try {
        await cloudSave(s);
        if (modeRef.current === "personal") {
          setSyncStatus("saved");
          setPersistError("");
        }
      } catch (e) {
        if (modeRef.current === "personal") {
          setSyncStatus("error");
          setPersistError((e as Error).message);
        }
      }
    } else if (mode === "demo") {
      setStore(s);
      try {
        await save("demo", s);
        setPersistError("");
      } catch {
        setPersistError("Demo non salvata sul dispositivo.");
      }
    }
  };
  const retryOnline = async () => {
    if (syncRef.current !== "error") return;
    setSyncStatus("saving");
    try {
      await cloudSave(store, true);
      setSyncStatus("saved");
      setPersistError("");
    } catch (e) {
      setSyncStatus("error");
      setPersistError((e as Error).message);
    }
  };
  const reloadOnline = async () => {
    if (syncRef.current === "saving") return;
    if (
      syncRef.current === "error" &&
      !window.confirm(
        "Ricaricare il cloud scarta le modifiche non salvate mostrate qui. Vuoi continuare?",
      )
    )
      return;
    setSyncStatus("saving");
    try {
      const s = await cloudRead();
      if (!s) throw Error("Archivio online non trovato: accedi di nuovo.");
      cloudUseLoaded();
      setStore(s);
      setSelected(null);
      setModal(null);
      setSyncStatus("saved");
      setPersistError("");
    } catch (e) {
      setSyncStatus("error");
      setPersistError((e as Error).message);
    }
  };
  const fmt = (n: number, c = "EUR") => (hidden ? "••••••" : money(n, c));
  const t = totals(store.assets, asOf),
    active = store.assets.filter((a) => !a.archivedAt || a.archivedAt > asOf),
    dateList = [
      ...new Set(
        store.assets.flatMap((a) => [
          ...a.valuations.map((v) => v.date),
          ...(a.archivedAt ? [a.archivedAt] : []),
        ]),
      ),
    ]
      .filter((d) => d <= asOf)
      .sort();
  const close = () => {
    setModal(null);
    setSelected(null);
  };
  const add = () => {
    setSelected(null);
    setModal("add");
  };
  const assetRows = (assets: Asset[]) =>
    assets.map((a) => {
      const I = icons[a.category],
        v = latest(a, asOf),
        n = value(a, asOf);
      return (
        <button
          className="asset-row"
          key={a.id}
          onClick={() => {
            setSelected(a);
            setModal("detail");
          }}
        >
          <span className={"asset-icon " + a.category}>
            <I size={19} />
          </span>
          <span className="asset-name">
            <strong>{a.name}</strong>
            <small>
              {a.institution || categories[a.category]}
              {a.share !== "100" ? ` · Quota ${a.share}%` : ""}
            </small>
          </span>
          <span className="asset-value">
            <strong>
              {n === null
                ? "Non disponibile"
                : fmt(a.category === "debt" ? -n.toNumber() : n.toNumber())}
            </strong>
            <small>
              {v
                ? `${v.source} · ${dateLabel(v.date)}${(new Date(asOf).getTime() - new Date(v.date).getTime()) / 86400000 > 90 ? " · Da aggiornare" : ""}`
                : "Nessuna rilevazione"}
            </small>
          </span>
          <ChevronRight size={16} className="muted" />
        </button>
      );
    });
  if (loading)
    return (
      <div className="loading">
        <BookOpen /> Apro il tuo taccuino…
      </div>
    );
  return (
    <>
      <header className="topbar">
        <div className="top-inner">
          <button
            className="brand"
            onClick={() => setPage("Panoramica")}
            aria-label="BauPatrimonio, panoramica"
          >
            <span className="brandmark">
              <BookOpen size={22} />
            </span>
            Bau<span>Patrimonio</span>
            <span className="beta">BETA</span>
          </button>
          <div className="top-actions">
            {mode && (
              <>
                <span className="device-label">
                  <span className="status-dot" />{" "}
                  {mode === "demo" ? "Demo sul dispositivo" : "Archivio online"}
                </span>
                <button
                  className="iconbutton"
                  aria-label={hidden ? "Mostra importi" : "Nascondi importi"}
                  onClick={() => setHidden(!hidden)}
                >
                  {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
                <button
                  className="avatar"
                  aria-label="Apri profilo e impostazioni"
                  disabled={mode === "personal" && sync !== "saved"}
                  onClick={() => setModal("profile")}
                >
                  TU
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      {!mode ? (
        <main className="welcome">
          <div className="welcome-label">
            <span className="status-dot" /> MENO RUMORE. PIÙ CHIAREZZA.
          </div>
          <Dog />
          <h1>
            Il tuo patrimonio.
            <br />
            <em>In chiaro.</em>
          </h1>
          <p>
            Quello che possiedi, quello che devi.
            <br />
            Un solo taccuino per vedere l’insieme.
          </p>
          {auth ? (
            <AuthGate
              initialNotice={authReturn}
              onReady={openPersonal}
              onCancel={() => {
                cloudLogout();
                setAuth(false);
                pref.remove("bau-mode");
              }}
            />
          ) : (
            <div className="welcome-buttons">
              <button className="primary" onClick={() => start("personal")}>
                Accedi o crea account <ArrowRight size={18} />
              </button>
              <button className="secondary" onClick={() => start("demo")}>
                Prova con dati di esempio
              </button>
            </div>
          )}
          <div className="welcome-facts">
            <span>
              <ShieldCheck size={17} /> I tuoi dati restano tuoi
            </span>
            <span>
              <Check size={17} /> Nessuna banca richiesta
            </span>
          </div>
          <div className="welcome-note">
            Fatto per fare il punto. Non per inseguire il mercato.
          </div>
          {persistError && (
            <p role="alert" className="error">
              {persistError}
            </p>
          )}
        </main>
      ) : (
        <>
          <div className="nav-container">
            <nav className="desktop-nav" aria-label="Navigazione principale">
              {nav.map(({ name, icon: I }) => (
                <button
                  key={name}
                  className={page === name ? "active" : ""}
                  onClick={() => setPage(name)}
                >
                  <I size={17} />
                  {name}
                </button>
              ))}
            </nav>
          </div>
          <main className="main">
            {mode === "personal" && (
              <div className="sync-status" role="status" aria-live="polite">
                <span>
                  {sync === "saved"
                    ? "Salvato online"
                    : sync === "saving"
                      ? "Salvataggio online in corso…"
                      : "Modifiche non salvate online · non chiudere questa pagina"}
                </span>
                <button
                  className="inline-link"
                  disabled={sync === "saving"}
                  onClick={reloadOnline}
                >
                  Aggiorna dati online
                </button>
              </div>
            )}
            {mode === "demo" && (
              <div className="demo-banner">
                <span>
                  <span className="demo-dot" /> Questo è un patrimonio di
                  esempio. Esplora, senza pensieri.
                </span>
                <button onClick={() => start("personal")}>
                  Passa al mio patrimonio <ArrowRight size={15} />
                </button>
              </div>
            )}
            {persistError && (
              <div role="alert" className="error">
                {persistError}
                {mode === "personal" && (
                  <>
                    <p>
                      Le modifiche non salvate restano solo in questa pagina,
                      non sul server. Scarica una copia prima di ricaricare o
                      uscire.
                    </p>
                    <button
                      className="secondary"
                      onClick={() =>
                        download(
                          "baupatrimonio-non-salvato.json",
                          JSON.stringify({
                            version: 1,
                            mode: "personal",
                            data: store,
                          }),
                        )
                      }
                    >
                      Scarica modifiche non salvate
                    </button>
                    <button className="secondary" onClick={retryOnline}>
                      Riprova salvataggio
                    </button>
                    <button className="text-button" onClick={logout}>
                      Esci e accedi di nuovo
                    </button>
                  </>
                )}
              </div>
            )}
            <fieldset
              className="online-workspace"
              disabled={mode === "personal" && sync !== "saved"}
            >
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {page === "Panoramica"
                      ? "IL QUADRO D’INSIEME"
                      : page === "Patrimonio"
                        ? "OGNI VOCE, AL SUO POSTO"
                        : page === "Storico"
                          ? "IL TUO PERCORSO NEL TEMPO"
                          : "DA DOVE ARRIVANO I TUOI DATI"}
                  </div>
                  <h1>
                    {page === "Panoramica"
                      ? "Il tuo patrimonio, in chiaro."
                      : page === "Patrimonio"
                        ? "Il tuo patrimonio"
                        : page === "Storico"
                          ? "La storia dei tuoi numeri"
                          : "Le tue fonti"}
                  </h1>
                  <p>
                    {page === "Panoramica"
                      ? "Totale, grafici e andamento del tuo patrimonio."
                      : page === "Patrimonio"
                        ? "Aggiungi e aggiorna beni, investimenti, conti e debiti."
                        : page === "Storico"
                          ? "Rilevazioni e movimenti, senza perdere il filo."
                          : "Importa i tuoi dati. I collegamenti bancari non sono ancora attivi."}
                  </p>
                </div>
                <button className="primary add-desktop" onClick={add}>
                  <Plus size={18} /> Aggiungi voce
                </button>
              </div>
              {page === "Panoramica" && (
                <>
                  <section className="net-card">
                    <div className="net-top">
                      <span>
                        <span className="status-dot" /> PATRIMONIO NETTO
                      </span>
                      <span className="asof">
                        Al {dateLabel(asOf)} <Clock3 size={14} />
                      </span>
                    </div>
                    <div className="net-amount">
                      {fmt(t.net)}
                      <span>EUR</span>
                    </div>
                    <p className="net-caption">
                      Quello che possiedi, al netto di quello che devi.
                    </p>
                    {t.missing.length > 0 && (
                      <div className="warning">
                        Totale parziale · Mancano valore o cambio di:{" "}
                        {t.missing.join(", ")}
                      </div>
                    )}
                    <div className="net-bottom">
                      <div>
                        <span className="mini-icon">
                          <ArrowDownLeft size={16} />
                        </span>
                        <span>
                          <small>Totale attività</small>
                          <strong>{fmt(t.active)}</strong>
                        </span>
                      </div>
                      <span className="net-divider" />
                      <div>
                        <span className="mini-icon debt">
                          <ArrowUpRight size={16} />
                        </span>
                        <span>
                          <small>Debito residuo</small>
                          <strong>{fmt(t.debt)}</strong>
                        </span>
                      </div>
                      <div className="net-note">
                        <ShieldCheck size={17} />
                        <span>
                          Nessun doppio conteggio.
                          <br />
                          Solo la tua quota.
                        </span>
                      </div>
                    </div>
                  </section>
                  {mode === "demo" &&
                    !store.assets.some((a) =>
                      a.valuations.some((v) =>
                        v.note?.startsWith("Storico dimostrativo"),
                      ),
                    ) && (
                      <button
                        className="demo-history"
                        onClick={() => {
                          update(demoHistory(store));
                          setToast(
                            "Aggiunto uno storico fittizio al solo archivio demo.",
                          );
                        }}
                      >
                        <ChartNoAxesCombined size={17} />
                        <span>
                          Prova i grafici con sei mesi di storico dimostrativo{" "}
                          <small>
                            Dati inventati e dichiarati. Il netto attuale non
                            cambia.
                          </small>
                        </span>
                        <Plus size={17} />
                      </button>
                    )}
                  <Insights
                    store={store}
                    asOf={asOf}
                    hidden={hidden}
                    onChange={update}
                  />
                  <section className="card overview-assets">
                    <div className="section-heading">
                      <h2>
                        Le tue voci{" "}
                        <span className="count">{active.length}</span>
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => setPage("Patrimonio")}
                      >
                        Vedi patrimonio <ArrowRight size={15} />
                      </button>
                    </div>
                    {active.length ? (
                      assetRows(active.slice(0, 4))
                    ) : (
                      <EmptyState onAdd={add} />
                    )}
                  </section>
                  <div className="notebook-note">
                    <BookOpen size={18} />
                    <span>
                      <strong>Un buon inizio è già chiarezza.</strong> Aggiorna
                      i tuoi valori quando vuoi: ogni rilevazione costruisce la
                      tua storia.
                    </span>
                  </div>
                </>
              )}
              {page === "Patrimonio" && (
                <>
                  <div className="toolbar">
                    <button
                      className="secondary"
                      onClick={() => setModal("operation")}
                    >
                      <FileText size={16} /> Registra operazione
                    </button>
                    <label className="search">
                      <Search size={17} />
                      <input
                        placeholder="Cerca una voce o un istituto"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Raggruppa patrimonio"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option value="category">Per categoria</option>
                      <option value="institution">Per istituto</option>
                    </select>
                    <button
                      className="secondary"
                      onClick={() => setModal("transfer")}
                    >
                      <ArrowLeftRight size={16} />
                      <span>Trasferisci</span>
                    </button>
                  </div>
                  <div className="summary-strip">
                    <span>
                      Attività <strong>{fmt(t.active)}</strong>
                    </span>
                    <span>
                      Debiti <strong>{fmt(t.debt)}</strong>
                    </span>
                    <span>
                      Netto <strong>{fmt(t.net)}</strong>
                    </span>
                  </div>
                  {[
                    ...new Set(
                      active.map((a) =>
                        group === "category"
                          ? a.category
                          : a.institution || "Senza istituto",
                      ),
                    ),
                  ].map((g) => {
                    const rows = active.filter(
                      (a) =>
                        (group === "category"
                          ? a.category
                          : a.institution || "Senza istituto") === g &&
                        `${a.name} ${a.institution}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    );
                    return rows.length ? (
                      <section className="card asset-group" key={g}>
                        <div className="section-heading">
                          <h2>
                            {group === "category"
                              ? categories[g as Category]
                              : g}{" "}
                            <span className="count">{rows.length}</span>
                          </h2>
                          <strong>
                            {fmt(
                              rows.reduce(
                                (s, a) => s + (value(a, asOf)?.toNumber() || 0),
                                0,
                              ),
                            )}
                          </strong>
                        </div>
                        {assetRows(rows)}
                      </section>
                    ) : null;
                  })}
                  {!active.length && (
                    <section className="card">
                      <EmptyState onAdd={add} />
                    </section>
                  )}
                  {query &&
                    !active.some((a) =>
                      `${a.name} ${a.institution}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ) && <p>Nessuna voce corrisponde alla ricerca.</p>}
                  {store.assets.some((a) => a.archivedAt) && (
                    <details className="card archived">
                      <summary>
                        Voci archiviate ·{" "}
                        {store.assets.filter((a) => a.archivedAt).length}
                      </summary>
                      {assetRows(store.assets.filter((a) => a.archivedAt))}
                    </details>
                  )}
                </>
              )}
              {page === "Storico" && (
                <>
                  <section className="card history-filters">
                    <label>
                      Situazione al
                      <input
                        type="date"
                        value={asOf}
                        max={today()}
                        onChange={(e) =>
                          e.target.value && setAsOf(e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Confronta con
                      <input
                        type="date"
                        value={compare}
                        max={asOf}
                        onChange={(e) => setCompare(e.target.value)}
                      />
                    </label>
                    <div>
                      <small>Patrimonio netto al {dateLabel(asOf)}</small>
                      <strong>{fmt(t.net)}</strong>
                      {compare && (
                        <span className="change">
                          {t.net - totals(store.assets, compare).net >= 0
                            ? "+"
                            : ""}
                          {fmt(t.net - totals(store.assets, compare).net)} ·
                          Variazione del patrimonio
                        </span>
                      )}
                    </div>
                  </section>
                  {(t.missing.length > 0 ||
                    (compare &&
                      totals(store.assets, compare).missing.length > 0)) && (
                    <p className="warning">
                      Confronto parziale: alcune voci non hanno una rilevazione
                      o un cambio valido alla data scelta.
                    </p>
                  )}
                  {compare && (
                    <section className="card comparison-card">
                      <div className="section-heading">
                        <h2>Quali voci hanno cambiato il totale?</h2>
                      </div>
                      {store.assets.map((a) => {
                        const old =
                          a.archivedAt && a.archivedAt <= compare
                            ? 0
                            : value(a, compare)?.toNumber();
                        const now =
                          a.archivedAt && a.archivedAt <= asOf
                            ? 0
                            : value(a, asOf)?.toNumber();
                        const delta =
                          old !== undefined && now !== undefined
                            ? (now - old) * (a.category === "debt" ? -1 : 1)
                            : null;
                        return (
                          <div className="comparison-row" key={a.id}>
                            <span>
                              <strong>{a.name}</strong>
                              <small>
                                {a.archivedAt && a.archivedAt <= asOf
                                  ? "Archiviazione della voce"
                                  : latest(a, asOf)?.note ||
                                    latest(a, asOf)?.source ||
                                    "Nessuna rilevazione"}
                                {a.category === "debt"
                                  ? " · Effetto del debito sul netto"
                                  : ""}
                              </small>
                            </span>
                            <strong>
                              {delta === null
                                ? "Non confrontabile"
                                : `${delta > 0 ? "+" : ""}${fmt(delta)}`}
                            </strong>
                          </div>
                        );
                      })}
                      <p className="field-note comparison-note">
                        Le differenze includono nuovi dati, stime, prezzi e
                        cambi. I movimenti non modificano automaticamente le
                        valutazioni e non sono una misura di rendimento.
                      </p>
                    </section>
                  )}
                  <div className="info-line">
                    <Info size={17} /> Una differenza di patrimonio non è un
                    rendimento. Le stime e i nuovi inserimenti possono
                    modificarla.
                  </div>
                  <section className="card">
                    <div className="section-heading">
                      <h2>Il tuo registro</h2>
                      <span className="subtle-tag">
                        Dati originali conservati
                      </span>
                    </div>
                    <div className="timeline">
                      {[
                        ...store.assets.flatMap((a) =>
                          a.valuations.map((v) => ({
                            id: v.id,
                            date: v.date,
                            title: a.name,
                            description: `${v.source}${v.note ? " · " + v.note : ""}`,
                            amount: Number(v.amount),
                            currency: v.currency,
                            kind: "Rilevazione",
                          })),
                        ),
                        ...store.movements.map((m) => ({
                          id: m.id,
                          date: m.date,
                          title: m.description,
                          description:
                            store.assets.find((a) => a.id === m.assetId)
                              ?.name || "",
                          amount: Number(m.amount),
                          currency: m.currency,
                          kind: "Movimento",
                        })),
                        ...store.imports.map((i) => ({
                          id: i.id,
                          date: i.date,
                          title: i.name,
                          description: `${i.rows} righe · ${i.kind}`,
                          amount: null,
                          currency: "EUR",
                          kind: "Importazione",
                        })),
                      ]
                        .filter((e) => e.date <= asOf)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((e) => (
                          <div className="timeline-row" key={e.id}>
                            <span className="timeline-icon">
                              {e.kind === "Importazione" ? (
                                <Upload size={17} />
                              ) : e.kind === "Movimento" ? (
                                <ArrowLeftRight size={17} />
                              ) : (
                                <Clock3 size={17} />
                              )}
                            </span>
                            <div>
                              <small>
                                {dateLabel(e.date)} · {e.kind}
                              </small>
                              <strong>{e.title}</strong>
                              <p>{e.description}</p>
                            </div>
                            {e.amount !== null && (
                              <strong>{fmt(e.amount, e.currency)}</strong>
                            )}
                          </div>
                        ))}
                      {!store.assets.length && <EmptyState onAdd={add} />}
                    </div>
                  </section>
                </>
              )}
              {page === "Fonti" && (
                <>
                  <section className="card source-manual">
                    <span className="source-icon">
                      <BookOpen size={25} />
                    </span>
                    <div>
                      <h2>Il tuo taccuino manuale</h2>
                      <p>
                        Saldi, stime e debiti. Li aggiorni tu, quando serve.
                      </p>
                      <span className="source-status">
                        <span className="status-dot" /> Attivo · {active.length}{" "}
                        voci ·{" "}
                        {dateList.length
                          ? `Ultima rilevazione ${dateLabel(dateList.at(-1)!)}`
                          : "Nessuna rilevazione"}
                      </span>
                    </div>
                    <button className="secondary" onClick={add}>
                      Aggiungi voce <Plus size={16} />
                    </button>
                  </section>
                  <section className="card import-card">
                    <div className="section-heading">
                      <div>
                        <h2>Da un file, senza ricominciare</h2>
                        <p>
                          Importa una fotografia del patrimonio o i movimenti di
                          un conto.
                        </p>
                      </div>
                      <Upload size={24} className="muted" />
                    </div>
                    <div className="import-choices">
                      <button onClick={() => setModal("import-balances")}>
                        <FileText size={22} />
                        <strong>Saldi o posizioni a una data</strong>
                        <span>Aggiorna le valutazioni, non i versamenti.</span>
                        <span className="text-button">
                          Importa CSV <ArrowRight size={16} />
                        </span>
                      </button>
                      <button onClick={() => setModal("import-movements")}>
                        <ArrowLeftRight size={22} />
                        <strong>Movimenti</strong>
                        <span>
                          Registra le operazioni senza alterare i saldi.
                        </span>
                        <span className="text-button">
                          CSV / Excel Fideuram <ArrowRight size={16} />
                        </span>
                      </button>
                    </div>
                    <div className="example-links">
                      Tracciati BauPatrimonio:{" "}
                      <a
                        href={
                          import.meta.env.BASE_URL + "examples/posizioni.csv"
                        }
                        download
                      >
                        esempio posizioni <Download size={13} />
                      </a>{" "}
                      <a
                        href={import.meta.env.BASE_URL + "examples/saldi.csv"}
                        download
                      >
                        esempio saldi <Download size={13} />
                      </a>
                      <a
                        href={
                          import.meta.env.BASE_URL + "examples/movimenti.csv"
                        }
                        download
                      >
                        esempio movimenti <Download size={13} />
                      </a>
                    </div>
                  </section>
                  <div className="section-title">
                    <h2>Collegamenti bancari</h2>
                    <span className="subtle-tag">
                      Solo lettura, quando disponibili
                    </span>
                  </div>
                  {bankCoverage.map((bank, i) => (
                    <section className="card bank-card" key={bank.name}>
                      <span className="bank-logo">
                        {i ? "TR" : <Landmark size={23} />}
                      </span>
                      <div>
                        <h3>{bank.name}</h3>
                        <p>
                          {i
                            ? "Conto e movimenti: percorso AIS documentato. Titoli non verificati."
                            : "Conto e movimenti: percorso AIS documentato. Dossier e pensione non verificati."}
                        </p>
                        <small>
                          Nessun collegamento attivo · Aggiornamento manuale o
                          CSV disponibile
                        </small>
                      </div>
                      <span className="unavailable">Non configurato</span>
                    </section>
                  ))}
                  <div className="info-line">
                    <ShieldCheck size={18} />
                    <span>
                      Non chiediamo password bancarie, PIN o OTP. Nessuna
                      integrazione simulata.{" "}
                      <button
                        className="inline-link"
                        onClick={() => setModal("coverage")}
                      >
                        Leggi copertura e limiti
                      </button>
                    </span>
                  </div>
                  {store.imports.length > 0 && (
                    <section className="card">
                      <div className="section-heading">
                        <h2>Importazioni eseguite</h2>
                      </div>
                      {store.imports.map((i) => (
                        <div className="import-log" key={i.id}>
                          <FileText size={18} />
                          <span>
                            {i.name}
                            <small>
                              {dateLabel(i.date)} · {i.rows} righe · {i.kind}
                            </small>
                          </span>
                          <CheckCircle2 size={17} />
                        </div>
                      ))}
                    </section>
                  )}
                </>
              )}
              <footer className="footer">
                <span>
                  <BookOpen size={14} /> BauPatrimonio{" "}
                  <span className="footer-sep">/</span> Il valore della
                  chiarezza.
                </span>
                <span>
                  <ShieldCheck size={13} /> Privato, per natura.
                </span>
              </footer>
            </fieldset>
          </main>
          <button
            className="mobile-add primary"
            disabled={mode === "personal" && sync !== "saved"}
            onClick={add}
          >
            <Plus size={19} /> Aggiungi voce
          </button>
          <nav className="mobile-nav" aria-label="Navigazione mobile">
            {nav.map(({ name, icon: I }) => (
              <button
                className={page === name ? "active" : ""}
                key={name}
                onClick={() => setPage(name)}
              >
                <I size={20} />
                <span>{name}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      {modal === "add" && (
        <AssetForm
          initial={selected}
          onClose={close}
          onSave={(a) => {
            update({
              ...store,
              assets: selected
                ? store.assets.map((x) => (x.id === a.id ? a : x))
                : [...store.assets, a],
            });
            close();
            setToast(
              selected
                ? "Nuova rilevazione salvata. Lo storico è conservato."
                : "Voce aggiunta al tuo patrimonio.",
            );
          }}
        />
      )}
      {modal === "detail" && selected && (
        <Modal title={selected.name} onClose={close}>
          <div className="detail-total">
            <span>
              {categories[selected.category]} · Quota {selected.share}%
            </span>
            <strong>
              {value(selected, asOf) === null
                ? "Non disponibile"
                : fmt(value(selected, asOf)!.toNumber())}
            </strong>
            <small>
              Valore di tua competenza
              {selected.category === "debt" ? " · capitale residuo" : ""}
            </small>
          </div>
          <div className="detail-meta">
            <span>
              Istituto <strong>{selected.institution || "Non indicato"}</strong>
            </span>
            <span>
              Metodo <strong>Valutazioni datate</strong>
            </span>
            {Object.entries(selected.details)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <span key={k}>
                  {k}
                  <strong>{v}</strong>
                </span>
              ))}
          </div>
          <h3 className="detail-heading">Storico delle rilevazioni</h3>
          {[...selected.valuations]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((v) => (
              <div className="valuation-entry" key={v.id}>
                <div className="valuation-row">
                  <span>
                    {dateLabel(v.date)}
                    <small>
                      {v.source}
                      {v.note ? " · " + v.note : ""}
                      {v.currency !== "EUR"
                        ? ` · Cambio ${v.fx || "mancante"} EUR/${v.currency} · ${v.fxSource || "Fonte non indicata"} ${v.fxDate || ""}`
                        : ""}
                    </small>
                  </span>
                  <strong>{fmt(Number(v.amount), v.currency)}</strong>
                </div>
                {v.positions && (
                  <details className="historical-positions">
                    <summary>
                      Strumenti a questa data · {v.positions.length}
                    </summary>
                    {v.positions.map((p) => (
                      <div className="historical-position" key={p.id}>
                        <strong>{p.name}</strong>
                        <span>
                          {p.quantity} × {fmt(Number(p.price), p.currency)}
                        </span>
                        <small>
                          {p.isin || "ISIN non indicato"} · {p.source} ·{" "}
                          {dateLabel(p.date)}
                        </small>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}
          {latest(selected, asOf)?.positions?.map((p) => (
            <div className="position-summary" key={p.id}>
              <strong>{p.name}</strong>
              <span>
                {p.quantity} × {fmt(Number(p.price), p.currency)}
              </span>
              <small>
                {p.isin || "ISIN non indicato"} · {p.source} ·{" "}
                {dateLabel(p.date)}
              </small>
            </div>
          ))}
          {selected.category === "investment" && (
            <button
              className="secondary portfolio-button"
              onClick={() => setModal("portfolio")}
            >
              <Layers size={16} /> Dettaglio strumenti e riconciliazione
            </button>
          )}
          <div className="modal-actions">
            <button
              className="secondary"
              onClick={() => {
                if (
                  confirm(
                    selected.archivedAt
                      ? "Ripristinare questa voce?"
                      : "Archiviare la voce da oggi? Le rilevazioni precedenti rimangono nello storico.",
                  )
                ) {
                  update({
                    ...store,
                    assets: store.assets.map((a) =>
                      a.id === selected.id
                        ? {
                            ...a,
                            archivedAt: a.archivedAt ? undefined : today(),
                          }
                        : a,
                    ),
                  });
                  close();
                }
              }}
            >
              <Archive size={16} />
              {selected.archivedAt ? "Ripristina" : "Archivia"}
            </button>
            <button className="primary" onClick={() => setModal("add")}>
              <Plus size={16} /> Nuova rilevazione
            </button>
          </div>
        </Modal>
      )}
      {modal === "portfolio" && selected && (
        <Modal title="Dettaglio del dossier" onClose={close} wide>
          <Portfolio
            asset={selected}
            onClose={close}
            onSave={(a) => {
              update({
                ...store,
                assets: store.assets.map((x) => (x.id === a.id ? a : x)),
              });
              close();
              setToast(
                "Dettaglio riconciliato. Il totale non è conteggiato due volte.",
              );
            }}
          />
        </Modal>
      )}
      {modal === "operation" && (
        <Modal title="Registra un’operazione già eseguita" onClose={close}>
          <OperationForm
            store={store}
            onClose={close}
            onSave={(s) => {
              update(s);
              close();
              setToast(
                "Operazione contabile registrata. Nessun ordine inviato.",
              );
            }}
          />
        </Modal>
      )}
      {modal === "profile" && (
        <Modal title="Il tuo spazio" onClose={close}>
          <div className="profile-intro">
            <span className="avatar">TU</span>
            <div>
              <strong>Un taccuino personale</strong>
              <p>
                {mode === "demo"
                  ? "Archivio dimostrativo sul dispositivo."
                  : "Archivio personale online, protetto dal tuo account."}
              </p>
            </div>
          </div>
          <div className="cloud-info">
            <ShieldCheck size={18} />
            <div>
              <strong>Gratuito. Senza abbonamenti.</strong>
              <p>
                La configurazione online è già inclusa. Accedi con lo stesso
                account da ciascun dispositivo. Nessun piano a pagamento viene
                attivato dall’app.
              </p>
              <a
                href={import.meta.env.BASE_URL + "GUIDA.html"}
                target="_blank"
                rel="noreferrer"
              >
                Guida passo passo
              </a>
            </div>
          </div>
          <CloudPanel personal={mode === "personal"} />
          <h3>Aspetto</h3>
          <div className="theme-options">
            <button
              className={theme === "light" ? "chosen" : ""}
              onClick={() => setTheme("light")}
            >
              <Sun size={20} /> Chiaro{" "}
              {theme === "light" && <Check size={16} />}
            </button>
            <button
              className={theme === "amoled" ? "chosen" : ""}
              onClick={() => setTheme("amoled")}
            >
              <Moon size={20} /> AMOLED{" "}
              {theme === "amoled" && <Check size={16} />}
            </button>
          </div>
          <label className="setting-row">
            <span>
              Nascondi importi
              <small>Una protezione visiva, non una cifratura.</small>
            </span>
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
          </label>
          <div className="setting-row">
            <span>
              Valuta di riferimento
              <small>Cambi storicizzati per ogni rilevazione.</small>
            </span>
            <strong>EUR · €</strong>
          </div>
          <div className="profile-actions">
            <label className="restore-backup">
              Ripristina backup JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5_000_000)
                      throw Error("Backup troppo grande (massimo 5 MB).");
                    const b = JSON.parse(await f.text());
                    if (b.version !== 1 || b.mode !== mode || !isStore(b.data))
                      throw Error(
                        "Backup non valido o appartenente all’altro archivio.",
                      );
                    if (
                      confirm(
                        "Sostituire questo archivio con il backup selezionato?",
                      )
                    ) {
                      update(b.data);
                      close();
                      setToast(
                        "Ripristino registrato. Controlla lo stato del salvataggio.",
                      );
                    }
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              />
            </label>
            <button
              onClick={() =>
                download(
                  `baupatrimonio-${mode}-${today()}.json`,
                  JSON.stringify(
                    {
                      version: 1,
                      mode,
                      exportedAt: new Date().toISOString(),
                      data: store,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download size={18} />
              <span>
                Scarica backup strutturato
                <small>JSON, senza segreti. Contiene dati finanziari.</small>
              </span>
            </button>
            <button
              onClick={() => {
                const rows = store.assets.map((a) => ({
                  nome: a.name,
                  categoria: categories[a.category],
                  quota: a.share,
                  data: latest(a)?.date || "",
                  importo_originale: latest(a)?.amount || "",
                  valuta: latest(a)?.currency || "",
                  valore_EUR: value(a)?.toString() || "",
                  archiviata: a.archivedAt || "",
                }));
                download(
                  "riepilogo-patrimonio.csv",
                  "\uFEFF" +
                    Papa.unparse(rows, {
                      delimiter: ";",
                      escapeFormulae: true,
                    }),
                  "text/csv;charset=utf-8",
                );
              }}
            >
              <FileText size={18} />
              <span>
                Esporta riepilogo CSV
                <small>Valori originali e quota di tua competenza.</small>
              </span>
            </button>
            <button disabled={sync === "saving"} onClick={logout}>
              <LogOut size={18} />
              <span>
                {mode === "personal"
                  ? "Esci dall’account"
                  : "Torna alla copertina"}
                <small>I dati salvati restano nel tuo archivio.</small>
              </span>
            </button>
            <button className="danger" onClick={() => setModal("delete")}>
              <Trash2 size={18} />
              <span>
                Elimina dati {mode === "demo" ? "dimostrativi" : "personali"}
              </span>
            </button>
          </div>
        </Modal>
      )}
      {modal === "delete" && (
        <DeleteModal
          personal={mode === "personal"}
          onClose={close}
          onDelete={() => {
            update(empty());
            close();
            setToast(
              "Svuotamento richiesto. Controlla lo stato del salvataggio online.",
            );
          }}
        />
      )}
      {modal?.startsWith("import-") && (
        <Modal
          title={
            modal === "import-balances"
              ? "Importa saldi o posizioni"
              : "Importa movimenti"
          }
          onClose={close}
          wide
        >
          <Importer
            kind={modal === "import-balances" ? "balances" : "movements"}
            store={store}
            onClose={close}
            onSave={(s) => {
              update(s);
              close();
              setToast(
                "Importazione completata. File originale non conservato.",
              );
            }}
          />
        </Modal>
      )}
      {modal === "transfer" && (
        <TransferForm
          store={store}
          onClose={close}
          onSave={(s) => {
            update(s);
            close();
            setToast("Trasferimento registrato. Patrimonio netto invariato.");
          }}
        />
      )}
      {modal === "coverage" && (
        <Modal title="Collegamenti: cosa è disponibile" onClose={close}>
          <div className="prose">
            <p>
              <strong>
                Stato al 19 novembre 2026: nessun connettore attivato.
              </strong>
            </p>
            <p>
              Verifica documentale: {coverageChecked}. Nessun conto collegato,
              nessuna sandbox o produzione bancaria collaudata.
            </p>
            {bankCoverage.map((bank) => (
              <div key={bank.name}>
                <h3>{bank.name}</h3>
                <p>
                  {bank.country}. {bank.account}
                </p>
                <p>{bank.transactions}</p>
                <p>{bank.securities}</p>
                <p>
                  <a href={bank.source} target="_blank" rel="noreferrer">
                    Fonte ufficiale della banca
                  </a>{" "}
                  ·{" "}
                  <a
                    href={bank.providerSource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Documentazione del provider
                  </a>
                </p>
              </div>
            ))}
            <h3>Possibile strada gratuita per uso personale</h3>
            <p>
              I{" "}
              <a href={personalProviderTerms} target="_blank" rel="noreferrer">
                termini di Enable Banking
              </a>{" "}
              prevedono uso gratuito limitato ai propri conti collegati («Linked
              Accounts»), in modalità restricted, non un servizio bancario
              pubblico gratuito per tutti. Sono necessari un account del
              provider, un’applicazione personale e i consensi.{" "}
              <a
                href={personalProviderActivation}
                target="_blank"
                rel="noreferrer"
              >
                Procedura ufficiale
              </a>
              .
            </p>
            <p>
              GitHub Pages ospita soltanto file statici: non può proteggere una
              chiave privata né eseguire callback e sincronizzazioni server. Per
              collegare i conti serve anche un backend riservato, da configurare
              separatamente. Non inserire segreti in GitHub, nel browser o in
              chat. Non è stato attivato alcun servizio esterno.
            </p>
            <div className="warning">
              Puoi usare subito dati manuali e CSV nel formato dell’app. Non
              sono tracciati ufficiali delle banche.
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </>
  );
}
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <Dog small />
      <h3>Ogni patrimonio inizia da una voce.</h3>
      <p>
        Un conto, una casa o un piccolo risparmio.
        <br />
        Non serve collegare una banca.
      </p>
      <button className="primary" onClick={onAdd}>
        <Plus size={17} /> Aggiungi la prima voce
      </button>
    </div>
  );
}
function AssetForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Asset | null;
  onSave: (a: Asset) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<Category>(
      initial?.category || "cash",
    ),
    [step, setStep] = useState(initial ? 1 : 0),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState(""),
    [currency, setCurrency] = useState(
      latest(initial || ({ valuations: [] } as unknown as Asset))?.currency ||
        "EUR",
    );
  const form = useRef<HTMLFormElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const f = new FormData(form.current!);
      const date = String(f.get("date"));
      if (date > today()) throw Error("Usa una data non futura.");
      if (
        initial?.valuations.some((v) => v.date === date) &&
        !confirm(
          "Esiste già una rilevazione per questa data. Aggiungere una nuova versione? Il vecchio valore rimane nel registro; l’ultimo inserito sarà quello valido per questa data.",
        )
      )
        return;
      const amount = unknown ? "0" : parseNumber(String(f.get("amount"))),
        share = parseNumber(String(f.get("share") || initial?.share || 100));
      if (Number(amount) < 0 || Number(share) <= 0 || Number(share) > 100)
        throw Error(
          "Valore non negativo e quota maggiore di 0 e fino al 100%.",
        );
      const details = { ...(initial?.details || {}) };
      [
        "Categoria personalizzata",
        "Natura",
        "Disponibilità",
        "Somme vincolate",
        "Contributi personali",
        "Contributi datore",
        "TFR conferito",
        "Prezzo acquisto",
        "Mutuo o finanziamento collegato",
        "Rata",
        "Tasso",
        "Scadenza",
        "Note",
      ].forEach((k) => {
        if (f.has(k)) details[k] = String(f.get(k) || "");
      });
      const fx =
        currency === "EUR" || unknown
          ? undefined
          : parseNumber(String(f.get("fx")));
      if (fx && Number(fx) <= 0) throw Error("Il cambio deve essere positivo.");
      if (fx && String(f.get("fxDate")) > date)
        throw Error(
          "La data del cambio non può essere successiva alla rilevazione.",
        );
      const v: Valuation = {
        id: uid(),
        date,
        amount,
        currency,
        source: String(f.get("source")),
        fx,
        fxDate: fx ? String(f.get("fxDate")) : undefined,
        fxSource: fx ? String(f.get("fxSource")) : undefined,
        note: String(f.get("note") || ""),
      };
      onSave(
        initial
          ? { ...initial, details, valuations: [...initial.valuations, v] }
          : {
              id: uid(),
              name: String(f.get("name")).trim(),
              category,
              institution: String(f.get("institution") || "").trim(),
              share,
              details,
              valuations: unknown ? [] : [v],
            },
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal
      title={initial ? "Nuova rilevazione" : "Aggiungi al tuo patrimonio"}
      onClose={onClose}
    >
      {step === 0 ? (
        <>
          <p className="form-intro">Da cosa vuoi iniziare?</p>
          <div className="category-picker">
            {(Object.entries(categories) as [Category, string][]).map(
              ([c, label]) => {
                const I = icons[c];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setStep(1);
                    }}
                  >
                    <span className={"asset-icon " + c}>
                      <I size={21} />
                    </span>
                    <span>
                      <strong>
                        {c === "cash" ? "Conto corrente e liquidità" : label}
                      </strong>
                      <small>
                        {
                          {
                            cash: "Conti, depositi, contanti o liquidità broker",
                            investment:
                              "Un valore totale per iniziare, senza ogni titolo",
                            pension:
                              "Posizione maturata, senza duplicare i contributi",
                            property: "Valore stimato e quota di proprietà",
                            vehicle: "Valore attuale, non il prezzo d’acquisto",
                            other: "Crediti, partecipazioni e altri beni",
                            debt: "Il capitale residuo, non le rate future",
                          }[c]
                        }
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                );
              },
            )}
          </div>
        </>
      ) : (
        <form ref={form} onSubmit={submit}>
          <button
            type="button"
            className="back-link"
            onClick={() => (initial ? onClose() : setStep(0))}
          >
            <ArrowLeftRight size={14} />
            {initial ? initial.name : categories[category]}
          </button>
          {!initial && (
            <label>
              Nome della voce
              <input
                name="name"
                placeholder={
                  category === "cash"
                    ? "Es. Il mio conto corrente"
                    : "Un nome per riconoscerla"
                }
                required
                maxLength={100}
              />
            </label>
          )}
          {!initial && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={unknown}
                onChange={(e) => setUnknown(e.target.checked)}
              />
              <span>
                Valore non ancora disponibile (non verrà considerato zero).
              </span>
            </label>
          )}
          <div className="form-row">
            <label>
              {category === "debt"
                ? "Capitale residuo totale"
                : category === "cash"
                  ? "Saldo contabile"
                  : category === "pension"
                    ? "Posizione maturata"
                    : "Valore totale attuale"}
              <input
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                disabled={unknown}
                required={!unknown}
              />
            </label>
            <label className="currency-field">
              Valuta
              <select
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["EUR", "USD", "GBP", "CHF", "JPY", "CAD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Data della rilevazione
            <input
              name="date"
              type="date"
              defaultValue={today()}
              max={today()}
              required
            />
          </label>
          {currency !== "EUR" && !unknown && (
            <div className="fx-fields">
              <p>
                Conserviamo il valore originale e questo cambio. Non verrà
                aggiornato automaticamente.
              </p>
              <label>
                Quanti EUR vale 1 {currency}?
                <input
                  name="fx"
                  inputMode="decimal"
                  placeholder="Es. 0,94"
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Data cambio
                  <input
                    type="date"
                    name="fxDate"
                    max={today()}
                    defaultValue={today()}
                    required
                  />
                </label>
                <label>
                  Fonte cambio
                  <input name="fxSource" placeholder="Es. BCE" required />
                </label>
              </div>
            </div>
          )}
          <label>
            Fonte
            <select
              name="source"
              defaultValue={
                latest(initial || ({ valuations: [] } as unknown as Asset))
                  ?.source ||
                (["property", "vehicle"].includes(category)
                  ? "Stima personale"
                  : "Manuale")
              }
            >
              <option>Manuale</option>
              <option>Stima personale</option>
            </select>
          </label>
          {["property", "vehicle", "debt"].includes(category) && !initial && (
            <label>
              La mia quota (%)
              <input
                name="share"
                inputMode="decimal"
                defaultValue="100"
                required
              />
              <small>
                Applichiamo questa quota al valore totale. La quota del mutuo è
                indipendente da quella della casa.
              </small>
            </label>
          )}
          {category === "investment" && (
            <p className="warning">
              Inserisci solo il valore dei titoli, oppure l’intero broker senza
              registrare anche la sua liquidità. Puoi aggiungere il dettaglio
              strumenti dal dossier dopo aver salvato.
            </p>
          )}
          {category === "pension" && (
            <p className="field-note">
              I contributi già nella posizione non si sommano di nuovo al
              patrimonio.
            </p>
          )}
          <details className="advanced">
            <summary>
              Dettagli facoltativi <ChevronDown size={15} />
            </summary>
            {!initial && (
              <>
                <label>
                  Istituto o gruppo
                  <input
                    name="institution"
                    placeholder="Es. Fideuram, patrimonio personale"
                  />
                </label>
                {!["property", "vehicle", "debt"].includes(category) && (
                  <label>
                    La mia quota (%)
                    <input
                      name="share"
                      defaultValue="100"
                      inputMode="decimal"
                    />
                  </label>
                )}
              </>
            )}
            {category === "other" && (
              <>
                <label>
                  Categoria personalizzata
                  <input
                    name="Categoria personalizzata"
                    defaultValue={
                      initial?.details["Categoria personalizzata"] || ""
                    }
                    placeholder="Es. Crediti verso terzi"
                  />
                </label>
                <label>
                  Natura della voce
                  <select
                    name="Natura"
                    defaultValue={
                      initial?.details["Natura"] || "Bene non liquido"
                    }
                  >
                    <option>Liquidità</option>
                    <option>Capitale investito</option>
                    <option>Previdenza</option>
                    <option>Bene non liquido</option>
                  </select>
                </label>
              </>
            )}
            {(category === "cash"
              ? ["Disponibilità", "Somme vincolate"]
              : category === "pension"
                ? ["Contributi personali", "Contributi datore", "TFR conferito"]
                : category === "property"
                  ? ["Mutuo o finanziamento collegato"]
                  : category === "vehicle"
                    ? ["Prezzo acquisto", "Mutuo o finanziamento collegato"]
                    : category === "debt"
                      ? ["Rata", "Tasso", "Scadenza"]
                      : []
            ).map((k) => (
              <label key={k}>
                {k}
                <input name={k} defaultValue={initial?.details[k] || ""} />
                <small>Informativo, non sommato al patrimonio.</small>
              </label>
            ))}
            <label>
              Nota sulla rilevazione
              <input
                name="note"
                maxLength={250}
                placeholder="Es. Valore da prospetto trimestrale"
              />
            </label>
          </details>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Annulla
            </button>
            <button className="primary" type="submit">
              <Check size={17} /> Salva{initial ? " rilevazione" : ""}
            </button>
          </div>
          <p className="form-security">
            <ShieldCheck size={13} /> Nessuna credenziale bancaria richiesta.
          </p>
        </form>
      )}
    </Modal>
  );
}
function DeleteModal({
  personal,
  onClose,
  onDelete,
}: {
  onClose: () => void;
  onDelete: () => void;
  personal: boolean;
}) {
  const [v, setV] = useState("");
  return (
    <Modal title="Elimina i dati di questo archivio" onClose={onClose}>
      <p>
        {personal
          ? "L’operazione svuota il tuo archivio ONLINE per tutti i tuoi dispositivi dopo il salvataggio riuscito. Non elimina il tuo account. La demo resta separata."
          : "L’operazione elimina soltanto la demo su questo browser. Il patrimonio personale online non viene modificato."}
      </p>
      <label>
        Scrivi ELIMINA per confermare
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          autoComplete="off"
        />
      </label>
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>
          Annulla
        </button>
        <button
          className="destructive"
          disabled={v !== "ELIMINA"}
          onClick={onDelete}
        >
          Elimina definitivamente
        </button>
      </div>
    </Modal>
  );
}
function TransferForm({
  store,
  onClose,
  onSave,
}: {
  store: Store;
  onClose: () => void;
  onSave: (s: Store) => void;
}) {
  const [error, setError] = useState("");
  const accounts = store.assets.filter(
    (a) => a.category === "cash" && !a.archivedAt,
  );
  return (
    <Modal title="Trasferisci tra conti tuoi" onClose={onClose}>
      <p className="form-intro">
        Registra uno spostamento, non un guadagno. Non esegue pagamenti. Solo
        liquidità in EUR al 100%.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const f = new FormData(e.currentTarget);
            onSave(
              transfer(
                store,
                String(f.get("from")),
                String(f.get("to")),
                parseNumber(String(f.get("amount"))),
                String(f.get("date")),
              ),
            );
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label>
          Da
          <select name="from" required>
            {accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          A
          <select name="to" required defaultValue={accounts[1]?.id}>
            {accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Importo in EUR
          <input name="amount" inputMode="decimal" required />
        </label>
        <label>
          Data
          <input
            name="date"
            type="date"
            max={today()}
            defaultValue={today()}
            required
          />
        </label>
        <p className="warning">
          Crea due nuove rilevazioni alla data scelta. Usa la data dell’ultima
          rilevazione o una successiva; nessuna stima futura verrà ricalcolata.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onClose}>
            Annulla
          </button>
          <button className="primary" disabled={accounts.length < 2}>
            Registra trasferimento
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default App;

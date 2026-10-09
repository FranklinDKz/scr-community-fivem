import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Download,
  ShieldCheck,
  MessageCircle,
  LockKeyhole,
  Check,
  LoaderCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { api, asset, preview } from "./api";
import {
  DISCORD,
  money,
  offers,
  type OfferId,
  type Resource,
} from "../shared/catalog";
import {
  Home,
  Catalog,
  ResourcePage,
  Store,
  ProductPage,
  Support,
  Account,
  Legal,
  NotFound,
} from "./pages";
import Admin from "./Admin";
export type Me = {
  user: {
    id: string;
    name: string;
    avatar: string | null;
    email: string | null;
    admin: boolean;
  } | null;
  usage: { downloads: number; remaining: number } | null;
  access: { sku: string; valid_until: string | null }[];
};
type Context = {
  me: Me;
  refresh: () => Promise<void>;
  resources: Resource[];
  loading: boolean;
  loadError: string;
  reload: () => Promise<void>;
  toast: (m: string) => void;
  buy: (sku: OfferId | string, title?: string, amount?: number) => void;
  login: () => void;
  preferences: { consent: "all" | "essential" | null; sound: boolean };
  setPreferences: (value: {
    consent: "all" | "essential";
    sound: boolean;
  }) => void;
};
const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);
export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={"button " + className} {...props}>
      {children}
    </button>
  );
}
export function DiscordLink({
  className = "",
  children = "Entrar no Discord",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      className={"button " + className}
      href={DISCORD}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={18} />
      {children}
    </a>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const current = ref.current;
    current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      current?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Download size={30} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function CookiePreferences({
  value,
  onChange,
}: {
  value: { consent: "all" | "essential" | null; sound: boolean };
  onChange: (value: { consent: "all" | "essential"; sound: boolean }) => void;
}) {
  const [open, setOpen] = useState(value.consent === null);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("scr-preferences-open", show);
    return () => window.removeEventListener("scr-preferences-open", show);
  }, []);
  if (!open) return null;
  return (
    <div
      className="cookie-panel"
      role="dialog"
      aria-label="Preferências de cookies"
    >
      <div>
        <strong>Você escolhe como navegar.</strong>
        <p>
          Cookies essenciais mantêm sua conta conectada. Com sua permissão,
          também medimos visitas e lembramos os sons de interface.
        </p>
      </div>
      <div className="cookie-actions">
        <Button
          onClick={() => {
            onChange({ consent: "essential", sound: false });
            setOpen(false);
          }}
        >
          Somente essenciais
        </Button>
        <Button
          className="primary"
          onClick={() => {
            onChange({ consent: "all", sound: true });
            setOpen(false);
          }}
        >
          Aceitar e continuar
        </Button>
      </div>
      {value.consent && (
        <button className="text-button" onClick={() => setOpen(false)}>
          Fechar sem alterar
        </button>
      )}
    </div>
  );
}
function Checkout({
  offer,
  onClose,
}: {
  offer: { sku: string; title: string; price: number };
  onClose: () => void;
}) {
  const { me, login, toast } = useApp();
  const [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const known = offers[offer.sku as OfferId];
  async function pay() {
    if (!me.user) {
      login();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ url: string }>("/checkout", {
        method: "POST",
        body: JSON.stringify({ sku: offer.sku, acceptTerms: accepted }),
      });
      window.location.assign(result.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        offer.sku === "unlimited"
          ? "Continue construindo. Sem esperar."
          : "Seu próximo passo começa aqui."
      }
      onClose={onClose}
    >
      {offer.sku === "unlimited" && (
        <p>
          Você usou seus 5 downloads de hoje. Eles são renovados à meia-noite,
          no horário de Brasília. Ou libere downloads ilimitados por 30 dias.
        </p>
      )}
      <div className="checkout-summary">
        <span>{offer.title}</span>
        <strong>{money(offer.price)}</strong>
        <small>
          {known?.days
            ? `Acesso por ${known.days} dias · pagamento único · renovação manual`
            : "Compra única · acesso permanente ao produto contratado"}
        </small>
      </div>
      {offer.sku === "exclusive" && (
        <p>
          Desbloqueia o catálogo de scripts exclusivos. O limite diário de
          downloads continua aplicável.
        </p>
      )}
      {preview && (
        <p className="notice">Prévia: o pagamento ainda não está disponível.</p>
      )}
      <label className="check-field">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          Li e aceito os{" "}
          <Link to="/termos" onClick={onClose}>
            termos de compra
          </Link>{" "}
          e a{" "}
          <Link to="/privacidade" onClick={onClose}>
            política de privacidade
          </Link>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button
        className="primary full"
        disabled={!accepted || busy || preview}
        onClick={pay}
      >
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <LockKeyhole size={18} />
        )}{" "}
        {me.user ? "Continuar para pagamento" : "Entrar para comprar"}
      </Button>
      <small className="muted center">
        A liberação acontece após a confirmação do pagamento.
      </small>
      <button
        className="text-button center"
        onClick={() => {
          toast("Fale com a equipe pelo Discord para tirar dúvidas.");
          window.open(DISCORD, "_blank", "noopener,noreferrer");
        }}
      >
        Precisa de ajuda com a compra?
      </button>
    </Modal>
  );
}
export default function App() {
  const [me, setMe] = useState<Me>({ user: null, usage: null, access: [] }),
    [resources, setResources] = useState<Resource[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [notification, setNotification] = useState(""),
    [menu, setMenu] = useState(false),
    [checkout, setCheckout] = useState<{
      sku: string;
      title: string;
      price: number;
    } | null>(null);
  const [preferences, setPreferencesState] = useState<{
    consent: "all" | "essential" | null;
    sound: boolean;
  }>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("scr_preferences") || "null") || {
          consent: null,
          sound: false,
        }
      );
    } catch {
      return { consent: null, sound: false };
    }
  });
  const location = useLocation();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (message: string) => {
    setNotification(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotification(""), 6500);
  };
  async function refresh() {
    try {
      setMe(await api("/me"));
    } catch {
      setMe({ user: null, usage: null, access: [] });
    }
  }
  async function reload() {
    setLoading(true);
    setLoadError("");
    try {
      setResources(await api("/resources"));
    } catch {
      setLoadError("Não foi possível carregar o catálogo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    void reload();
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const setPreferences = (value: {
    consent: "all" | "essential";
    sound: boolean;
  }) => {
    setPreferencesState(value);
    localStorage.setItem("scr_preferences", JSON.stringify(value));
  };
  useEffect(() => {
    if (!preferences.sound) return;
    const click = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest("button,a,[role=button]"))
        return;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(560, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        340,
        context.currentTime + 0.045,
      );
      gain.gain.setValueAtTime(0.018, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.05,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.055);
      oscillator.addEventListener("ended", () => void context.close());
    };
    document.addEventListener("pointerup", click);
    return () => document.removeEventListener("pointerup", click);
  }, [preferences.sound]);
  useEffect(() => {
    if (preview || preferences.consent !== "all") return;
    let visitorId = localStorage.getItem("scr_visitor_id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("scr_visitor_id", visitorId);
    }
    void api("/analytics/view", {
      method: "POST",
      body: JSON.stringify({ path: location.pathname, visitorId }),
    }).catch(() => undefined);
  }, [location.pathname, preferences.consent]);
  const buy = (sku: string, title?: string, amount?: number) => {
    const item = offers[sku as OfferId];
    if (item || title)
      setCheckout({
        sku,
        title: title || item.title,
        price: amount ?? item.price,
      });
  };
  const login = () => {
    window.location.hash = "#/conta";
  };
  return (
    <AppContext.Provider
      value={{
        me,
        refresh,
        resources,
        loading,
        loadError,
        reload,
        toast,
        buy,
        login,
        preferences,
        setPreferences,
      }}
    >
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      {preview && (
        <div className="preview-bar">
          Prévia do site{" "}
          <span>· Login, downloads e compras aguardam ativação.</span>
        </div>
      )}
      <header className="header">
        <div className="nav-wrap">
          <Link className="brand" to="/" aria-label="ScR Community, início">
            <img src={asset("assets/logo.png")} alt="" />
            <span>
              ScR <b>Community</b>
              <small>Free Resources FiveM</small>
            </span>
          </Link>
          <nav
            aria-label="Navegação principal"
            className={menu ? "nav open" : "nav"}
          >
            <NavLink to="/" end>
              Início
            </NavLink>
            <NavLink to="/resources">Resources</NavLink>
            <NavLink to="/loja">Nossa loja</NavLink>
            <NavLink to="/suporte">Suporte & IA</NavLink>
          </nav>
          <div className="nav-actions">
            {me.usage && me.usage.downloads > 0 && (
              <span className="download-counter">
                <Download size={15} /> Downloads restantes:{" "}
                <b>
                  {me.access.some((a) => a.sku === "unlimited")
                    ? "∞"
                    : me.usage.remaining}
                </b>
              </span>
            )}
            {me.user ? (
              <Link className="account-button" to="/conta">
                {me.user.avatar && <img src={me.user.avatar} alt="" />}
                <span>{me.user.name}</span>
                <ChevronDown size={14} />
              </Link>
            ) : (
              <button className="button nav-login" onClick={login}>
                <LockKeyhole size={17} />
                <span>Entrar</span>
              </button>
            )}
            <button
              className="icon-button menu-toggle"
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/resources" element={<Catalog />} />
          <Route path="/resources/:id" element={<ResourcePage />} />
          <Route path="/loja" element={<Store />} />
          <Route path="/loja/:id" element={<ProductPage />} />
          <Route path="/suporte" element={<Support />} />
          <Route path="/conta" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/termos" element={<Legal />} />
          <Route path="/privacidade" element={<Legal privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer>
        <div className="container footer-main">
          <Link className="brand" to="/">
            <img src={asset("assets/logo.png")} alt="" />
            <span>
              ScR <b>Community</b>
              <small>Uma comunidade. Infinitas possibilidades.</small>
            </span>
          </Link>
          <div className="footer-links">
            <Link to="/resources">Resources</Link>
            <Link to="/loja">Loja</Link>
            <a href={DISCORD} target="_blank" rel="noreferrer">
              Discord <ExternalLink size={12} />
            </a>
            <Link to="/termos">Termos</Link>
            <Link to="/privacidade">Privacidade</Link>
            <button
              className="footer-preferences"
              onClick={() =>
                window.dispatchEvent(new Event("scr-preferences-open"))
              }
            >
              Cookies & sons
            </button>
            {(me.user?.admin || preview) && (
              <Link to="/admin">Administração</Link>
            )}
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} ScR Community. Feito por quem vive o
            FiveM.
          </span>
          <span>
            Projeto independente, sem vínculo com Rockstar Games ou Cfx.re.
          </span>
        </div>
      </footer>
      {notification && (
        <div className="toast" role="status">
          <Check size={18} />
          {notification}
          <button onClick={() => setNotification("")} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}
      {checkout && (
        <Checkout offer={checkout} onClose={() => setCheckout(null)} />
      )}
      <CookiePreferences value={preferences} onChange={setPreferences} />
    </AppContext.Provider>
  );
}

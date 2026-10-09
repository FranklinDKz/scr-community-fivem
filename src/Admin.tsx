import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Upload,
  Trash2,
  Pencil,
  ShieldCheck,
  FileArchive,
  ImagePlus,
  X,
  LoaderCircle,
  Package,
  MessageSquare,
  LayoutGrid,
  LockKeyhole,
  Eye,
  ShoppingBag,
} from "lucide-react";
import {
  type Resource,
  type Media,
  type Product,
  products as defaultProducts,
  DISCORD,
  money,
  previewResources,
} from "../shared/catalog";
import { api, preview, asset } from "./api";
import { Button, Modal, Empty, useApp } from "./App";
type Draft = Omit<Resource, "downloads" | "createdAt" | "id" | "demo">;
const blank: Draft = {
  title: "",
  description: "",
  category: "script",
  framework: "Standalone",
  version: "1.0.0",
  exclusive: false,
  published: false,
  reviewed: false,
  author: "ScR Community",
  license: "",
  media: [],
  fileKey: null,
  filename: null,
};
async function upload(file: File) {
  const data = new FormData();
  data.append("file", file);
  return api<{
    key: string;
    url: string | null;
    filename: string;
    type: "image" | "video";
  }>("/admin/upload", { method: "POST", body: data });
}
const blankProduct = (): Product => ({
  id: "",
  title: "",
  subtitle: "",
  price: 100,
  category: "base",
  image: "",
  label: "Multi-framework",
  docs: "",
  video: "",
  features: [],
  description: "",
  gallery: [],
  discordRoleId: "",
  deliveryUrl: "https://dk-license-api.onrender.com/download/instalador",
  licenseTicketUrl: DISCORD,
  published: false,
  sortOrder: 100,
});

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useApp();
  const [draft, setDraft] = useState<Product>(product || blankProduct());
  const [features, setFeatures] = useState(
    (product?.features || []).join("\n"),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function uploadImage(file: File | undefined, cover = false) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await upload(file);
      if (!result.url) throw new Error("Selecione uma imagem.");
      if (cover) set("image", result.url);
      else
        set("gallery", [
          ...draft.gallery,
          { url: result.url, type: result.type, caption: file.name },
        ]);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...draft,
        features: features
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      await api("/admin/products" + (product ? "/" + product.id : ""), {
        method: product ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      toast(product ? "Produto atualizado." : "Produto criado.");
      onSaved();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={product ? `Editar ${product.title}` : "Novo produto"}
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <form className="form resource-editor" onSubmit={save}>
        <div className="form-row">
          <label>
            Identificador
            <input
              required
              pattern="[a-z0-9][a-z0-9-]{1,79}"
              value={draft.id}
              disabled={!!product}
              onChange={(event) => set("id", event.target.value.toLowerCase())}
              placeholder="nome-do-produto"
            />
          </label>
          <label>
            Categoria
            <select
              value={draft.category}
              onChange={(event) =>
                set("category", event.target.value as Product["category"])
              }
            >
              <option value="base">Base</option>
              <option value="script">Script</option>
              <option value="service">Serviço</option>
            </select>
          </label>
          <label>
            Ordem
            <input
              type="number"
              min="0"
              max="10000"
              value={draft.sortOrder}
              onChange={(event) => set("sortOrder", Number(event.target.value))}
            />
          </label>
        </div>
        <label>
          Nome do produto
          <input
            required
            minLength={2}
            maxLength={100}
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </label>
        <label>
          Frase de apresentação
          <input
            required
            minLength={3}
            maxLength={180}
            value={draft.subtitle}
            onChange={(event) => set("subtitle", event.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Valor em R$
            <input
              required
              type="number"
              min="1"
              max="100000"
              step="0.01"
              value={(draft.price / 100).toFixed(2)}
              onChange={(event) =>
                set("price", Math.round(Number(event.target.value) * 100))
              }
            />
          </label>
          <label>
            Selo / compatibilidade
            <input
              required
              minLength={2}
              maxLength={80}
              value={draft.label}
              onChange={(event) => set("label", event.target.value)}
            />
          </label>
        </div>
        <label>
          Descrição completa
          <textarea
            required
            minLength={20}
            maxLength={12000}
            rows={6}
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </label>
        <label>
          Benefícios — um por linha
          <textarea
            rows={7}
            value={features}
            onChange={(event) => setFeatures(event.target.value)}
            placeholder={"Instalador ScR\nSuporte permanente\nMulti-framework"}
          />
        </label>
        <fieldset>
          <legend>Imagem principal e galeria</legend>
          {draft.image && (
            <img
              className="admin-product-cover"
              src={
                draft.image.startsWith("assets/")
                  ? asset(draft.image)
                  : draft.image
              }
              alt="Prévia da capa"
            />
          )}
          <label className="upload-box">
            <ImagePlus size={20} />
            <span>
              Enviar imagem principal<small>JPG, PNG ou WebP · até 25 MB</small>
            </span>
            <input
              aria-label="Imagem principal do produto"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading || preview}
              onChange={(event) =>
                void uploadImage(event.target.files?.[0], true)
              }
            />
          </label>
          <label>
            Ou URL da imagem principal
            <input
              value={draft.image}
              onChange={(event) => set("image", event.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className="admin-media">
            {draft.gallery.map((media, index) => (
              <div key={`${media.url}-${index}`}>
                {media.type === "image" ? (
                  <img src={media.url} alt={media.caption} />
                ) : (
                  <span>Vídeo</span>
                )}
                <small>{media.caption || "Sem legenda"}</small>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover mídia ${index + 1}`}
                  onClick={() =>
                    set(
                      "gallery",
                      draft.gallery.filter((_, item) => item !== index),
                    )
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <label className="upload-box">
            <ImagePlus size={20} />
            <span>
              Adicionar à galeria<small>Até 12 imagens ou vídeos</small>
            </span>
            <input
              aria-label="Adicionar mídia do produto"
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4"
              disabled={uploading || preview || draft.gallery.length >= 12}
              onChange={(event) => void uploadImage(event.target.files?.[0])}
            />
          </label>
        </fieldset>
        <div className="form-row">
          <label>
            Vídeo do YouTube
            <input
              type="url"
              value={draft.video}
              onChange={(event) => set("video", event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>
          <label>
            Documentação / GitBook
            <input
              type="url"
              value={draft.docs}
              onChange={(event) => set("docs", event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>
        <label>
          Link de entrega do instalador
          <input
            required
            type="url"
            value={draft.deliveryUrl}
            onChange={(event) => set("deliveryUrl", event.target.value)}
          />
          <small>Aparece somente para uma compra aprovada.</small>
        </label>
        <div className="form-row">
          <label>
            ID do cargo no Discord
            <input
              inputMode="numeric"
              pattern="[0-9]{17,20}"
              value={draft.discordRoleId}
              onChange={(event) =>
                set("discordRoleId", event.target.value.trim())
              }
              placeholder="1191845850436083722"
            />
          </label>
          <label>
            Link para liberar licença / ticket
            <input
              required
              type="url"
              value={draft.licenseTicketUrl}
              onChange={(event) => set("licenseTicketUrl", event.target.value)}
            />
          </label>
        </div>
        <label className="check-field">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => set("published", event.target.checked)}
          />
          <span>Produto publicado e disponível para compra</span>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="primary" disabled={busy || uploading || preview}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Upload size={16} />
            )}{" "}
            Salvar produto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function Editor({
  resource,
  onClose,
  onSaved,
}: {
  resource: Resource | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useApp();
  const [draft, setDraft] = useState<Draft>(resource || blank),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [mediaUrl, setMediaUrl] = useState(""),
    [caption, setCaption] = useState(""),
    [mediaType, setMediaType] = useState<"image" | "video">("image");
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function pick(file: File | undefined, zip = false) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await upload(file);
      if (zip)
        setDraft((d) => ({
          ...d,
          fileKey: result.key,
          filename: result.filename,
        }));
      else if (result.url)
        setDraft((d) => ({
          ...d,
          media: [
            ...d.media,
            { url: result.url!, type: result.type, caption: file.name },
          ],
        }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/resources" + (resource ? "/" + resource.id : ""), {
        method: resource ? "PUT" : "POST",
        body: JSON.stringify(draft),
      });
      toast(draft.published ? "Resource publicado." : "Rascunho salvo.");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={resource ? "Editar resource" : "Publicar um novo resource"}
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <form className="form resource-editor" onSubmit={save}>
        {preview && (
          <p className="notice">
            Prévia do painel. Os campos podem ser explorados; alterações não são
            salvas.
          </p>
        )}
        <label>
          Título
          <input
            required
            minLength={3}
            maxLength={100}
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Nome do script ou mapa"
          />
        </label>
        <div className="form-row">
          <label>
            Categoria
            <select
              value={draft.category}
              onChange={(e) =>
                set("category", e.target.value as "map" | "script")
              }
            >
              <option value="script">Script</option>
              <option value="map">Mapa</option>
            </select>
          </label>
          <label>
            Framework
            <input
              required
              minLength={2}
              maxLength={80}
              value={draft.framework}
              onChange={(e) => set("framework", e.target.value)}
            />
          </label>
          <label>
            Versão
            <input
              required
              maxLength={30}
              value={draft.version}
              onChange={(e) => set("version", e.target.value)}
            />
          </label>
        </div>
        <label>
          Descrição e instruções
          <textarea
            required
            minLength={20}
            maxLength={12000}
            rows={6}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="O que faz, dependências, instalação, configuração e alterações feitas pela equipe."
          />
        </label>
        <div className="form-row">
          <label>
            Autor original
            <input
              required
              minLength={2}
              maxLength={100}
              value={draft.author}
              onChange={(e) => set("author", e.target.value)}
            />
          </label>
          <label>
            Licença / autorização de distribuição
            <input
              required
              minLength={3}
              maxLength={500}
              value={draft.license}
              onChange={(e) => set("license", e.target.value)}
              placeholder="Ex.: MIT, com link do autor"
            />
          </label>
        </div>
        <fieldset>
          <legend>Galeria de fotos e vídeos</legend>
          <div className="admin-media">
            {draft.media.map((m, i) => (
              <div key={i}>
                {m.type === "image" ? (
                  <img
                    src={m.url.startsWith("assets/") ? asset(m.url) : m.url}
                    alt={m.caption}
                  />
                ) : (
                  <span>Vídeo {i + 1}</span>
                )}
                <small>{m.caption || "Sem legenda"}</small>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover mídia ${i + 1}`}
                  onClick={() =>
                    set(
                      "media",
                      draft.media.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <label className="upload-box">
            <ImagePlus size={20} />
            <span>
              {uploading ? "Enviando..." : "Enviar foto ou vídeo"}
              <small>JPG, PNG, WebP ou MP4 · até 25 MB · até 12 mídias</small>
            </span>
            <input
              aria-label="Enviar mídia"
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4"
              disabled={preview || uploading || draft.media.length >= 12}
              onChange={(e) => void pick(e.target.files?.[0])}
            />
          </label>
          <div className="form-row">
            <label>
              Tipo
              <select
                value={mediaType}
                onChange={(e) =>
                  setMediaType(e.target.value as "image" | "video")
                }
              >
                <option value="image">Foto</option>
                <option value="video">Vídeo / YouTube</option>
              </select>
            </label>
            <label>
              URL HTTPS
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>
          <label>
            Descrição da foto ou vídeo
            <input
              maxLength={500}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Explique o que aparece nesta mídia"
            />
          </label>
          <Button
            type="button"
            disabled={
              !mediaUrl.startsWith("https://") || draft.media.length >= 12
            }
            onClick={() => {
              set("media", [
                ...draft.media,
                { url: mediaUrl, type: mediaType, caption },
              ]);
              setMediaUrl("");
              setCaption("");
            }}
          >
            <Plus size={15} /> Adicionar à galeria
          </Button>
        </fieldset>
        <label className="upload-box">
          <FileArchive size={26} />
          <span>
            {draft.filename || "Enviar arquivo do resource"}
            <small>ZIP · até 50 MB · armazenado com acesso protegido</small>
          </span>
          <input
            aria-label="Enviar ZIP"
            type="file"
            accept=".zip"
            disabled={preview || uploading}
            onChange={(e) => void pick(e.target.files?.[0], true)}
          />
        </label>
        <label>
          Tipo de acesso
          <select
            value={draft.exclusive ? "exclusive" : "free"}
            onChange={(e) => set("exclusive", e.target.value === "exclusive")}
          >
            <option value="free">Gratuito · limite diário da plataforma</option>
            <option value="exclusive">
              Exclusivo · acesso permanente de R$ 19,99
            </option>
          </select>
          <small>
            Gratuito aparece para todos. Exclusivo exige que o usuário tenha o
            desbloqueio do catálogo.
          </small>
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={draft.reviewed}
            onChange={(e) => set("reviewed", e.target.checked)}
          />
          <span>
            Confirmei a autorização de distribuição e revisei segurança,
            instalação, configuração e compatibilidade do arquivo.
          </span>
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          <span>Publicar no catálogo (exige arquivo e revisão)</span>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="primary"
            type="submit"
            disabled={busy || uploading || preview}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Upload size={16} />
            )}{" "}
            {draft.published ? "Publicar resource" : "Salvar rascunho"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function TicketEditor({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reply, setReply] = useState(ticket.reply || ""),
    [status, setStatus] = useState(ticket.status),
    [quote, setQuote] = useState(
      ticket.quote_amount ? String(ticket.quote_amount / 100) : "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/tickets/" + ticket.id, {
        method: "PUT",
        body: JSON.stringify({
          reply,
          status,
          quoteAmount: quote ? Math.round(Number(quote) * 100) : null,
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={ticket.subject} onClose={onClose}>
      <p className="pre-line">{ticket.message}</p>
      <form className="form" onSubmit={save}>
        <label>
          Resposta da equipe
          <textarea
            rows={6}
            maxLength={8000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Em aberto</option>
              <option value="answered">Respondido</option>
              <option value="closed">Encerrado</option>
            </select>
          </label>
          <label>
            Orçamento em R$ (opcional)
            <input
              type="number"
              min="1"
              max="100000"
              step="0.01"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
          </label>
        </div>
        <p className="muted">
          Registre escopo, prazo e entregas na resposta antes de enviar um
          orçamento. O cliente poderá pagar na área de chamados.
        </p>
        {error && <p className="error">{error}</p>}
        <Button className="primary full" disabled={busy}>
          Salvar resposta
        </Button>
      </form>
    </Modal>
  );
}
export default function Admin() {
  const { me, login, toast, reload } = useApp();
  const [tab, setTab] = useState("products"),
    [catalogProducts, setCatalogProducts] = useState<Product[]>([]),
    [resources, setResources] = useState<Resource[]>([]),
    [tickets, setTickets] = useState<any[]>([]),
    [integrations, setIntegrations] = useState({
      discord: false,
      discordRoles: false,
      payments: false,
    }),
    [analytics, setAnalytics] = useState<any>({
      summary: { views: 0, visitors: 0, users: 0, active_users: 0 },
      daily: [],
      pages: [],
      users: [],
      recent: [],
    }),
    [editor, setEditor] = useState<Resource | null | undefined>(undefined),
    [productEditor, setProductEditor] = useState<Product | null | undefined>(
      undefined,
    ),
    [ticket, setTicket] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null);
  async function load() {
    setBusy(true);
    try {
      if (preview) {
        setResources(previewResources);
        setCatalogProducts(defaultProducts);
        setAnalytics({
          summary: {
            views: 2847,
            visitors: 1216,
            users: 438,
            active_users: 191,
          },
          daily: [],
          pages: [
            { path: "/resources", views: 1084 },
            { path: "/loja", views: 736 },
          ],
          users: [
            {
              id: "preview",
              name: "Visitante de exemplo",
              email: "usuario@exemplo.com",
              auth_provider: "email",
              last_login_at: new Date().toISOString(),
              last_login_ip: "200.***.***.42",
            },
          ],
          recent: [],
        });
        return;
      }
      const [r, t, p, a, i] = await Promise.all([
        api("/admin/resources"),
        api("/admin/tickets"),
        api("/admin/products"),
        api("/admin/analytics"),
        api("/config"),
      ]);
      setResources(r);
      setTickets(t);
      setCatalogProducts(p);
      setAnalytics(a);
      setIntegrations(i);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (me.user?.admin || preview) void load();
  }, [me.user?.id]);
  if (!preview && !me.user)
    return (
      <div className="container page account-gate">
        <LockKeyhole size={42} />
        <h1>Painel da equipe.</h1>
        <p>Entre com sua conta autorizada para administrar o site.</p>
        <Button onClick={login}>Ir para o login</Button>
      </div>
    );
  if (!preview && !me.user?.admin)
    return (
      <div className="container page account-gate">
        <LockKeyhole size={42} />
        <h1>Acesso reservado à equipe.</h1>
        <p>
          A conta precisa estar autorizada como administradora. O dono do
          servidor recebe esse acesso ao entrar pelo Discord oficial.
        </p>
        <Link className="button" to="/">
          Voltar ao site
        </Link>
      </div>
    );
  return (
    <div className="container page admin">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ScR / Administração</span>
          <h1>Sua comunidade, organizada.</h1>
          <p>Publique resources e cuide de cada entrega.</p>
        </div>
        <div className="inline-actions">
          <Button onClick={() => setProductEditor(null)}>
            <ShoppingBag size={18} /> Novo produto
          </Button>
          <Button className="primary" onClick={() => setEditor(null)}>
            <Plus size={18} /> Novo resource
          </Button>
        </div>
      </div>
      {preview && (
        <div className="notice">
          <Eye size={18} /> Prévia do painel administrativo. Na versão completa,
          apenas as contas autorizadas da equipe acessam esta área.
        </div>
      )}
      {!preview && (!integrations.discord || !integrations.discordRoles) && (
        <div className="notice admin-integration-warning">
          <MessageSquare size={18} />
          <span>
            <strong>Integração do Discord aguardando credenciais.</strong>
            Configure o OAuth para vincular contas e o token do bot para aplicar
            automaticamente os cargos dos produtos.
          </span>
        </div>
      )}
      <section className="admin-publish-guide">
        <div>
          <span className="eyebrow">Publicação do proprietário</span>
          <h2>Do arquivo ao catálogo.</h2>
          <p>
            Você controla cada lançamento: salva como rascunho, revisa e só
            então publica para todos ou para o catálogo exclusivo.
          </p>
        </div>
        <ol>
          <li>
            <strong>01</strong>
            <span>Crie o resource</span>
            <small>Escolha script ou mapa e informe framework e versão.</small>
          </li>
          <li>
            <strong>02</strong>
            <span>Monte a página</span>
            <small>
              Adicione descrição, até 12 fotos ou vídeos e legendas.
            </small>
          </li>
          <li>
            <strong>03</strong>
            <span>Defina o acesso</span>
            <small>Selecione Gratuito ou Exclusivo antes de publicar.</small>
          </li>
          <li>
            <strong>04</strong>
            <span>Envie e revise</span>
            <small>Anexe o ZIP, confirme licença e revisão e publique.</small>
          </li>
        </ol>
      </section>
      <div className="admin-stats">
        <div>
          <ShoppingBag />
          <span>
            Produtos<strong>{catalogProducts.length}</strong>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            Gratuitos publicados
            <strong>
              {
                resources.filter((r) => r.published && !r.demo && !r.exclusive)
                  .length
              }
            </strong>
          </span>
        </div>
        <div>
          <LockKeyhole />
          <span>
            Exclusivos publicados
            <strong>
              {
                resources.filter((r) => r.published && !r.demo && r.exclusive)
                  .length
              }
            </strong>
          </span>
        </div>
        <div>
          <MessageSquare />
          <span>
            Chamados em aberto
            <strong>{tickets.filter((t) => t.status === "open").length}</strong>
          </span>
        </div>
      </div>
      <div className="tabs admin-tabs">
        {[
          ["products", "Produtos & entregas", ShoppingBag],
          ["resources", "Resources", LayoutGrid],
          ["tickets", "Chamados", MessageSquare],
          ["analytics", "Acessos & usuários", Eye],
        ].map(([id, label, Icon]: any) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {busy && (
        <div className="loading">
          <LoaderCircle className="spin" /> Carregando...
        </div>
      )}
      {tab === "products" &&
        (catalogProducts.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Entrega</th>
                  <th>Cargo Discord</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {catalogProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.title}</strong>
                      <small>
                        {product.label} · {product.id}
                      </small>
                    </td>
                    <td>{money(product.price)}</td>
                    <td>
                      {product.deliveryUrl
                        ? "Instalador configurado"
                        : "Pendente"}
                    </td>
                    <td>
                      <code>{product.discordRoleId || "—"}</code>
                    </td>
                    <td>
                      <span className="status">
                        {product.published ? "Publicado" : "Oculto"}
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <Button
                          aria-label={`Editar ${product.title}`}
                          onClick={() => setProductEditor(product)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          aria-label={`Excluir ${product.title}`}
                          disabled={preview}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Excluir ${product.title} da loja?`,
                              )
                            )
                              return;
                            try {
                              await api(`/admin/products/${product.id}`, {
                                method: "DELETE",
                              });
                              toast("Produto removido.");
                              await load();
                              await reload();
                            } catch (failure) {
                              setError((failure as Error).message);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Cadastre o primeiro produto">
            Defina preço, imagens, entrega e cargo do Discord.
          </Empty>
        ))}
      {tab === "resources" &&
        (resources.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Acesso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      <small>
                        {r.framework} · v{r.version}
                      </small>
                    </td>
                    <td>{r.category === "map" ? "Mapa" : "Script"}</td>
                    <td>
                      <span className="status">
                        {r.demo
                          ? "Exemplo"
                          : r.published
                            ? "Publicado"
                            : "Rascunho"}
                      </span>
                    </td>
                    <td>{r.exclusive ? "Exclusivo" : "Gratuito"}</td>
                    <td>
                      <div className="inline-actions">
                        <Button
                          aria-label={"Editar " + r.title}
                          onClick={() => setEditor(r)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          aria-label={"Excluir " + r.title}
                          onClick={() => setDeleteId(r.id)}
                          disabled={preview}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Publique seu primeiro resource">
            Clique em Novo resource, adicione os arquivos e conclua a revisão
            antes de publicar.
          </Empty>
        ))}
      {tab === "tickets" &&
        (tickets.length ? (
          <div className="ticket-list">
            {tickets.map((t) => (
              <article key={t.id}>
                <div>
                  <h3>{t.subject}</h3>
                  <span className="status">{t.status}</span>
                </div>
                <p>
                  {t.name} · {t.message.slice(0, 160)}
                </p>
                <Button onClick={() => setTicket(t)}>Responder / orçar</Button>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Nenhum chamado por aqui">
            Pedidos de orçamento e de suporte aparecerão nesta área.
          </Empty>
        ))}
      {tab === "analytics" && (
        <div className="analytics-panel">
          <div className="analytics-summary">
            <div>
              <span>Visualizações · 30 dias</span>
              <strong>
                {Number(analytics.summary.views || 0).toLocaleString("pt-BR")}
              </strong>
            </div>
            <div>
              <span>Visitantes únicos</span>
              <strong>
                {Number(analytics.summary.visitors || 0).toLocaleString(
                  "pt-BR",
                )}
              </strong>
            </div>
            <div>
              <span>Contas cadastradas</span>
              <strong>
                {Number(analytics.summary.users || 0).toLocaleString("pt-BR")}
              </strong>
            </div>
            <div>
              <span>Logins · 30 dias</span>
              <strong>
                {Number(analytics.summary.active_users || 0).toLocaleString(
                  "pt-BR",
                )}
              </strong>
            </div>
          </div>
          <h2>Páginas mais acessadas</h2>
          <div className="analytics-bars">
            {analytics.pages.map((page: any) => {
              const max = Math.max(
                1,
                ...analytics.pages.map((item: any) => Number(item.views)),
              );
              return (
                <div key={page.path}>
                  <span>{page.path}</span>
                  <div>
                    <i
                      style={{ width: `${(Number(page.views) / max) * 100}%` }}
                    />
                  </div>
                  <b>{Number(page.views).toLocaleString("pt-BR")}</b>
                </div>
              );
            })}
          </div>
          <h2>Usuários e logins recentes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Login</th>
                  <th>Último IP</th>
                </tr>
              </thead>
              <tbody>
                {analytics.users.map((account: any) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}</strong>
                      <small>
                        {account.auth_provider === "discord"
                          ? "Discord"
                          : "E-mail"}
                      </small>
                    </td>
                    <td>{account.email || "—"}</td>
                    <td>
                      {account.last_login_at
                        ? new Date(
                            account.last_login_at +
                              (String(account.last_login_at).endsWith("Z")
                                ? ""
                                : "Z"),
                          ).toLocaleString("pt-BR")
                        : "Nunca"}
                    </td>
                    <td>
                      <code>{account.last_login_ip || "—"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted analytics-privacy">
            Os relatórios de IP e acesso ficam disponíveis apenas ao dono e são
            removidos após 90 dias. Use esses dados somente para segurança e
            gestão do site.
          </p>
        </div>
      )}
      {editor !== undefined && (
        <Editor
          resource={editor}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined);
            void load();
            void reload();
          }}
        />
      )}
      {productEditor !== undefined && (
        <ProductEditor
          product={productEditor}
          onClose={() => setProductEditor(undefined)}
          onSaved={() => {
            setProductEditor(undefined);
            void load();
            void reload();
          }}
        />
      )}
      {ticket && (
        <TicketEditor
          ticket={ticket}
          onClose={() => setTicket(null)}
          onSaved={() => {
            setTicket(null);
            void load();
          }}
        />
      )}
      {deleteId && (
        <Modal title="Excluir este resource?" onClose={() => setDeleteId(null)}>
          <p>
            Ele será removido do catálogo. O arquivo armazenado será preservado
            para recuperação pela equipe.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              className="danger"
              onClick={async () => {
                try {
                  await api("/admin/resources/" + deleteId, {
                    method: "DELETE",
                  });
                  setDeleteId(null);
                  await load();
                  await reload();
                  toast("Resource removido.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Excluir resource
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

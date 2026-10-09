import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Download,
  Search,
  SlidersHorizontal,
  Code2,
  MapPin,
  ShieldCheck,
  Zap,
  Check,
  Layers3,
  Sparkles,
  Headphones,
  LockKeyhole,
  Play,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Terminal,
  Building2,
  Palette,
  Gauge,
  Store as StoreIcon,
  Bot,
  Send,
  LoaderCircle,
  X,
  Plus,
  ExternalLink,
  BookOpen,
  LogOut,
} from "lucide-react";
import {
  services,
  scrScripts,
  partners,
  discordChannel,
  DISCORD,
  money,
  type Resource,
  type Media,
  type Product,
} from "../shared/catalog";
import { api, asset, preview, ApiError, downloadFile } from "./api";
import { Button, DiscordLink, Empty, Modal, useApp } from "./App";
const source = (url: string) => (url.startsWith("assets/") ? asset(url) : url);
export function ResourceCard({ resource: r }: { resource: Resource }) {
  return (
    <Link
      to={"/resources/" + r.id}
      className={"resource-card " + (r.exclusive ? "exclusive-card" : "")}
    >
      <div className={"resource-cover " + r.category}>
        {r.media.find((m) => m.type === "image") ? (
          <img
            src={source(r.media.find((m) => m.type === "image")!.url)}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="cover-placeholder">
            {r.category === "map" ? <MapPin size={54} /> : <Code2 size={54} />}
          </div>
        )}
        <div className="cover-shade" />
        <span className="category-badge">
          {r.category === "map" ? <MapPin size={12} /> : <Code2 size={12} />}{" "}
          {r.category === "map" ? "Mapa" : "Script"}
        </span>
        {r.exclusive && (
          <span className="exclusive-badge">
            <LockKeyhole size={12} /> Exclusivo
          </span>
        )}
        {r.demo && (
          <div className="preview-cover-title">
            {r.category === "map"
              ? "O próximo cenário\nda sua cidade."
              : r.exclusive
                ? "O próximo nível\ndo seu servidor."
                : "Mais possibilidades\npara sua cidade."}
          </div>
        )}
        <span className="view-resource">
          Ver resource <Plus size={16} />
        </span>
      </div>
      <div className="resource-info">
        <div className="resource-meta">
          <span>{r.framework}</span>
          <span>{r.demo ? "Prévia" : `v${r.version}`}</span>
        </div>
        <h3>{r.title}</h3>
        <div className="resource-bottom">
          <span>
            {r.demo ? (
              "Exemplo de publicação"
            ) : r.reviewed ? (
              <>
                <ShieldCheck size={14} /> Revisado pela ScR
              </>
            ) : (
              "Em revisão"
            )}
          </span>
          <b>{r.exclusive ? "Exclusivo" : "Gratuito"}</b>
        </div>
      </div>
    </Link>
  );
}
function CatalogContent({ limit }: { limit?: number }) {
  const { resources, loading, loadError, reload } = useApp();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const category = params.get("tipo") || "todos",
    framework = params.get("framework") || "todos";
  const filtered = resources.filter(
    (r) =>
      (category === "todos" ||
        (category === "exclusivos" ? r.exclusive : r.category === category)) &&
      (framework === "todos" || r.framework === framework) &&
      `${r.title} ${r.description} ${r.framework}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const visible = limit ? filtered.slice(0, limit) : filtered;
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === "todos") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }
  return (
    <>
      <div className="catalog-controls">
        <div className="tabs" aria-label="Categorias">
          {[
            ["todos", "Todos", Layers3],
            ["script", "Scripts", Code2],
            ["map", "Mapas", MapPin],
            ["exclusivos", "Exclusivos", LockKeyhole],
          ].map(([id, label, Icon]: any) => (
            <button
              key={id}
              onClick={() => filter("tipo", id)}
              aria-pressed={category === id}
              className={category === id ? "active" : ""}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="search-controls">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Buscar resources"
              placeholder="Encontre seu próximo resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {!limit && (
            <label className="framework-filter">
              <SlidersHorizontal size={16} />
              <select
                aria-label="Filtrar framework"
                value={framework}
                onChange={(e) => filter("framework", e.target.value)}
              >
                <option value="todos">Frameworks</option>
                {[...new Set(resources.map((r) => r.framework))].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      {loading ? (
        <div className="loading" role="status">
          <LoaderCircle className="spin" /> Carregando resources...
        </div>
      ) : loadError ? (
        <div className="empty">
          <p>{loadError}</p>
          <Button onClick={reload}>Tentar novamente</Button>
        </div>
      ) : visible.length ? (
        <div className="resource-grid">
          {visible.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            resources.length
              ? "Nenhum resource encontrado"
              : "Os primeiros resources estão chegando"
          }
        >
          {resources.length
            ? "Tente outro termo ou escolha uma categoria diferente."
            : "A equipe está preparando os arquivos para publicação. Acompanhe os próximos lançamentos no Discord."}
        </Empty>
      )}
      {preview && (
        <p className="catalog-note">
          Catálogo ilustrativo. Os arquivos reais serão publicados pela equipe
          ScR.
        </p>
      )}
    </>
  );
}
export function Home() {
  const { products } = useApp();
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src={asset("assets/scene.png")}
          alt="Cena ilustrativa de um carro esportivo em uma cidade à noite"
        />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-tag">
            <span className="tag-line" /> ScR Community, edição 2026
          </div>
          <h1>
            Tudo para o seu FiveM.
            <br />
            Sem caça ao tesouro.
          </h1>
          <p>
            Scripts, mapas, bases e suporte reunidos em um catálogo cuidado por
            quem trabalha com FiveM todos os dias.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/resources">
              <Download size={18} />
              Explorar resources
            </Link>
            <Link className="button promo" to="/loja?tab=divulgue">
              <Sparkles size={17} /> Divulgue seu projeto
            </Link>
            <Link className="button glass" to="/loja">
              Conhecer nossas bases
            </Link>
          </div>
          <div className="hero-bottom">
            <span>
              <Code2 size={16} /> Gratuitos e exclusivos
            </span>
            <i />
            <span>
              <ShieldCheck size={16} /> Revisados pela equipe ScR
            </span>
          </div>
        </div>
        <div className="hero-caption">
          Um arquivo vivo para quem constrói cidades.
        </div>
      </section>
      <div className="trust-strip">
        <div className="container trust-inner">
          <div>
            <ShieldCheck />
            <span>
              Revisão humana<strong>Arquivo conferido antes de publicar</strong>
            </span>
          </div>
          <div>
            <Terminal />
            <span>
              Prontos para configurar
              <strong>Compatibilidade explicada sem enrolação</strong>
            </span>
          </div>
          <div>
            <Gauge />
            <span>
              Foco em performance<strong>Menos peso, menos retrabalho</strong>
            </span>
          </div>
          <div>
            <MessageCircle />
            <span>
              Suporte próximo<strong>Você fala com quem entende</strong>
            </span>
          </div>
        </div>
      </div>
      <section className="promotion-spotlight">
        <div className="container promotion-spotlight-inner">
          <div className="promotion-spotlight-copy">
            <span className="eyebrow">Espaço para criadores e comunidades</span>
            <h2>
              Seu trabalho merece vitrine.
              <br />E público certo.
            </h2>
            <p>
              Anuncie seu trabalho para quem já procura resources de FiveM. Você
              escolhe o plano, envia descrição, imagens, vídeo, preço e link de
              contato; a equipe ScR revisa e publica sua vitrine.
            </p>
            <div className="promotion-spotlight-actions">
              <Link className="button primary" to="/loja?tab=divulgue">
                <Sparkles size={17} /> Quero divulgar
              </Link>
              <a
                className="button glass"
                href={discordChannel("1480286534912704585")}
                target="_blank"
                rel="noreferrer"
              >
                Divulgar no Discord <ExternalLink size={15} />
              </a>
            </div>
          </div>
          <div className="promotion-spotlight-plans">
            <div>
              <span>Script ou mapa</span>
              <strong>{money(799)}</strong>
              <small>7 dias no site</small>
            </div>
            <div className="featured">
              <span>Script ou mapa</span>
              <strong>{money(2499)}</strong>
              <small>30 dias no site</small>
            </div>
            <div>
              <span>Cidade ou comunidade</span>
              <strong>{money(7990)}</strong>
              <small>30 dias no site</small>
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">O próximo upgrade está aqui</span>
            <h2>Explore os resources.</h2>
          </div>
          <Link className="subtle-link" to="/resources">
            Ver catálogo completo <Layers3 size={16} />
          </Link>
        </div>
        <CatalogContent limit={3} />
      </section>
      <section className="container quality">
        <div className="quality-icon">
          <ShieldCheck size={34} />
        </div>
        <div>
          <h3>Seu servidor merece cuidado.</h3>
          <p>
            Testes, configuração, otimização e correções fazem parte da nossa
            curadoria. Cada resource só recebe o selo ScR depois da revisão da
            equipe.
          </p>
        </div>
        <span className="quality-mark">
          <Check size={15} /> Compromisso ScR
        </span>
      </section>
      <section className="container section store-teaser">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ScR Store</span>
            <h2>
              Uma base forte.
              <br />
              Uma cidade sem limites.
            </h2>
          </div>
          <p>
            Comece com estrutura. Dê a sua identidade.
            <br />
            Conte com quem entende de FiveM.
          </p>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => p.category === "base")
            .map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
        </div>
      </section>
      <section className="container support-teaser">
        <div className="support-symbol">
          <Terminal size={42} />
          <span>ScR</span>
        </div>
        <div>
          <span className="eyebrow">
            Você não precisa resolver tudo sozinho
          </span>
          <h2>Seu time fora do jogo.</h2>
          <p>
            Instalação, configuração e ajuda de verdade. Nossa equipe e a IA ScR
            ao lado do seu projeto.
          </p>
        </div>
        <Link to="/suporte" className="button primary">
          Conhecer o suporte <Headphones size={18} />
        </Link>
      </section>
      <section className="container community">
        <div>
          <span className="eyebrow">Bem-vindo à ScR Community</span>
          <h2>
            Quem constrói junto,
            <br />
            vai mais longe.
          </h2>
          <p>
            Troque ideias, acompanhe os lançamentos e converse com o DK RP e a
            equipe. Sua comunidade também está aqui.
          </p>
          <DiscordLink className="primary" />
        </div>
        <img
          src={asset("assets/banner.png")}
          alt="ScR Community"
          loading="lazy"
        />
      </section>
      <section className="container faq section">
        <h2>Antes de entrar no jogo.</h2>
        {[
          [
            "Os resources são gratuitos?",
            "O catálogo reúne scripts e mapas gratuitos. Itens exclusivos são identificados e têm acesso contratado separadamente.",
          ],
          [
            "Como funciona a revisão ScR?",
            "A equipe revisa cada arquivo, registra a compatibilidade e confirma a autorização de distribuição antes da publicação. O selo indica essa revisão; mantenha backups e teste a compatibilidade com a sua base.",
          ],
          [
            "Posso usar qualquer framework?",
            "Confira o framework e as dependências indicadas na página de cada resource. As bases da loja têm documentação própria de compatibilidade.",
          ],
          [
            "O suporte das bases continua incluído?",
            "Sim. As bases Creative V6 e Standalone incluem o suporte permanente anunciado. O plano extra cobre assistência a mapas e scripts e o acesso à IA ScR.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <Plus size={18} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
function ProductCard({
  product: p,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <Link className={"product-card product-" + index} to={"/loja/" + p.id}>
      <div
        className="product-visual"
        style={{
          backgroundImage: `url(${source(p.image || "assets/banner.png")})`,
        }}
      >
        <div className="product-caption">
          <span>ScR Originals</span>
          <strong>{p.title.toUpperCase()}</strong>
          <small>{p.label}</small>
        </div>
      </div>
      <div className="product-info">
        <div>
          <h3>
            {p.category === "base" ? "Base " : ""}
            {p.title}
          </h3>
          <p>{p.subtitle}</p>
        </div>
        <div>
          <span>Acesso permanente</span>
          <strong>{money(p.price)}</strong>
        </div>
      </div>
      <div className="product-foot">
        <span>
          <ShieldCheck size={15} /> Suporte permanente incluído
        </span>
        <span>
          Conhecer a base <Plus size={15} />
        </span>
      </div>
    </Link>
  );
}
export function Catalog() {
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">Tudo para a sua cidade</span>
        <h1>O seu próximo resource.</h1>
        <p>
          Scripts, mapas e novidades organizados para você encontrar e
          construir.
        </p>
      </div>
      <CatalogContent />
    </div>
  );
}
function Gallery({ media }: { media: Media[] }) {
  const [index, setIndex] = useState(0);
  const current = media[index];
  function videoUrl(url: string) {
    try {
      const u = new URL(url);
      if (
        [
          "youtu.be",
          "www.youtube.com",
          "youtube.com",
          "www.youtube-nocookie.com",
        ].includes(u.hostname)
      ) {
        const id =
          u.hostname === "youtu.be"
            ? u.pathname.slice(1)
            : u.searchParams.get("v") || u.pathname.split("/").pop();
        return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
          ? "https://www.youtube-nocookie.com/embed/" + id
          : null;
      }
    } catch {}
    return null;
  }
  return (
    <div className="gallery">
      {current ? (
        <>
          <div className="gallery-stage">
            {current.type === "image" ? (
              <img
                src={source(current.url)}
                alt={current.caption || "Imagem do resource"}
              />
            ) : videoUrl(current.url) ? (
              <iframe
                src={videoUrl(current.url)!}
                title={current.caption || "Vídeo do resource"}
                allowFullScreen
              />
            ) : (
              <video src={source(current.url)} controls preload="metadata" />
            )}
            {media.length > 1 && (
              <>
                <button
                  aria-label="Mídia anterior"
                  className="gallery-prev icon-button"
                  onClick={() =>
                    setIndex((index - 1 + media.length) % media.length)
                  }
                >
                  <ChevronLeft />
                </button>
                <button
                  aria-label="Próxima mídia"
                  className="gallery-next icon-button"
                  onClick={() => setIndex((index + 1) % media.length)}
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
          <p className="caption">{current.caption}</p>
          {media.length > 1 && (
            <div className="thumbnails">
              {media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={i === index ? "selected" : ""}
                  aria-label={`Ver ${m.type === "video" ? "vídeo" : "imagem"} ${i + 1}`}
                  aria-pressed={i === index}
                >
                  {m.type === "image" ? (
                    <img src={source(m.url)} alt="" />
                  ) : (
                    <Play size={24} />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="gallery-stage placeholder">
          <Package size={60} />
          <p>Imagens serão adicionadas pela equipe.</p>
        </div>
      )}
    </div>
  );
}
export function ResourcePage() {
  const { id } = useParams();
  const { resources, loading, me, refresh, buy, login, toast } = useApp();
  const resource = resources.find((r) => r.id === id);
  const [busy, setBusy] = useState(false);
  if (loading) return <div className="loading">Carregando resource...</div>;
  if (!resource) return <NotFound />;
  async function download() {
    if (resource!.demo) {
      toast("Este é um exemplo de publicação. Nenhum arquivo está incluído.");
      return;
    }
    if (!me.user) {
      login();
      return;
    }
    setBusy(true);
    try {
      await downloadFile(
        "/resources/" + resource!.id + "/download",
        resource!.filename || "resource.zip",
      );
      await refresh();
      toast("Download iniciado. Bom projeto!");
    } catch (e) {
      if (e instanceof ApiError && e.code === "DOWNLOAD_LIMIT")
        buy("unlimited");
      else if (e instanceof ApiError && e.code === "EXCLUSIVE_REQUIRED")
        buy("exclusive");
      else toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <Link className="breadcrumb" to="/resources">
        <ChevronLeft size={16} /> Voltar aos resources
      </Link>
      <div className="detail-grid">
        <div>
          <Gallery media={resource.media} />
          <section className="detail-description">
            <h2>Sobre o resource</h2>
            <p className="pre-line">{resource.description}</p>
            <h3>Instalação & compatibilidade</h3>
            <p>
              Framework: {resource.framework}. Consulte as instruções incluídas
              no arquivo e faça backup antes de instalar na sua cidade.
            </p>
          </section>
        </div>
        <aside className="detail-sidebar">
          <span className="eyebrow">
            {resource.category === "map" ? "Mapa" : "Script"} /{" "}
            {resource.framework}
          </span>
          <h1>{resource.title}</h1>
          <p>
            {resource.demo
              ? "Prévia de publicação da ScR Community."
              : "Publicado por " + resource.author}
          </p>
          <div className="detail-price">
            {resource.exclusive ? (
              <>
                <LockKeyhole size={22} /> Exclusivo
              </>
            ) : (
              "Download gratuito"
            )}
          </div>
          {resource.reviewed && (
            <span className="verified">
              <ShieldCheck size={16} /> Revisado pela ScR
            </span>
          )}
          <Button className="primary full" onClick={download} disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Download size={18} />
            )}{" "}
            {resource.demo
              ? "Sobre esta prévia"
              : resource.exclusive &&
                  !me.access.some((a) => a.sku === "exclusive")
                ? "Desbloquear resource"
                : "Baixar resource"}
          </Button>
          {resource.exclusive && (
            <small>Acesso ao catálogo exclusivo por {money(1999)}.</small>
          )}
          <dl>
            <div>
              <dt>Versão</dt>
              <dd>{resource.version}</dd>
            </div>
            <div>
              <dt>Autor</dt>
              <dd>{resource.author}</dd>
            </div>
            <div>
              <dt>Licença</dt>
              <dd>{resource.license}</dd>
            </div>
            <div>
              <dt>Downloads</dt>
              <dd>{resource.downloads}</dd>
            </div>
          </dl>
          <Link className="support-note" to="/suporte">
            <Headphones size={20} />
            <span>
              Precisa de uma mão?<small>Conheça o suporte de instalação.</small>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
export function Store() {
  const [params, setParams] = useSearchParams();
  const tabs = ["bases", "scripts", "servicos", "parceiros", "divulgue"];
  const requestedTab = params.get("tab") || "bases";
  const [filter, setFilter] = useState(
    tabs.includes(requestedTab) ? requestedTab : "bases",
  );
  const { buy, products } = useApp();
  const icons: Record<string, typeof Code2> = {
    city: Building2,
    code: Code2,
    terminal: Terminal,
    gauge: Gauge,
    palette: Palette,
    store: StoreIcon,
    map: MapPin,
    bot: Bot,
    megaphone: Sparkles,
    lock: LockKeyhole,
  };
  function changeFilter(value: string) {
    setFilter(value);
    setParams(value === "bases" ? {} : { tab: value }, { replace: true });
  }
  return (
    <div className="container page">
      <div className="store-heading">
        <div>
          <span className="eyebrow">ScR Store / por DK RP</span>
          <h1>
            Ideias grandes.
            <br />
            Estrutura à altura.
          </h1>
          <p>
            Bases, scripts e serviços para sua cidade.
            <br />
            Tudo em um só lugar.
          </p>
        </div>
        <div className="store-stamp">
          <img src={asset("assets/logo.png")} alt="ScR Community" />
        </div>
      </div>
      <div className="tabs store-tabs">
        {[
          ["bases", "Nossas bases"],
          ["scripts", "Scripts ScR"],
          ["servicos", "Serviços & design"],
          ["parceiros", "VPS & Loja VIP"],
          ["divulgue", "Divulgue no site"],
        ].map(([value, label]) => (
          <button
            className={filter === value ? "active" : ""}
            aria-pressed={filter === value}
            onClick={() => changeFilter(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      {filter === "bases" && (
        <>
          <div className="product-grid">
            {products
              .filter((p) => p.category === "base")
              .map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
          </div>
          <div className="store-assurance">
            <span>
              <ShieldCheck /> Suporte permanente nas bases
            </span>
            <span>
              <BookOpen /> Documentação para começar
            </span>
            <span>
              <MessageCircle /> Atendimento direto com a equipe
            </span>
          </div>
        </>
      )}
      {filter === "scripts" && (
        <div className="store-managed-section">
          {products.some((product) => product.category === "script") && (
            <div className="product-grid">
              {products
                .filter((product) => product.category === "script")
                .map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                  />
                ))}
            </div>
          )}
          <div className="services-grid">
            {scrScripts.map((script, index) => (
              <article className="service-card" key={script.title}>
                <div className="service-icon">
                  {index === 0 ? <ShieldCheck /> : <Code2 />}
                </div>
                <span className="sale-label">À venda pela ScR</span>
                <h3>{script.title}</h3>
                <p>{script.description}</p>
                <a
                  className="button"
                  href={DISCORD}
                  target="_blank"
                  rel="noreferrer"
                >
                  Comprar no Discord <MessageCircle size={16} />
                </a>
              </article>
            ))}
          </div>
        </div>
      )}
      {filter === "servicos" && (
        <div className="services-grid">
          {services.map((service) => {
            const Icon = icons[service.icon] || Code2;
            return (
              <article className="service-card" key={service.id}>
                <div className="service-icon">
                  <Icon />
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a
                  className="button"
                  href={discordChannel(
                    "channelId" in service ? service.channelId : undefined,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir ticket no Discord <ExternalLink size={15} />
                </a>
              </article>
            );
          })}
        </div>
      )}
      {filter === "parceiros" && (
        <div className="partner-grid">
          {partners.map((partner, index) => (
            <article className="partner-card" key={partner.id}>
              <div className="partner-icon">
                {index === 0 ? <Gauge size={34} /> : <StoreIcon size={34} />}
              </div>
              <span className="eyebrow">Recomendado por DK RP</span>
              <h2>{partner.title}</h2>
              <p>{partner.description}</p>
              <a
                className="button primary"
                href={partner.href}
                target="_blank"
                rel="sponsored noreferrer"
              >
                {partner.cta} <ExternalLink size={16} />
              </a>
              <small>
                Link externo de parceiro. Confira as condições no site do
                fornecedor.
              </small>
            </article>
          ))}
        </div>
      )}
      {filter === "divulgue" && (
        <section className="promotion-market">
          <div className="promotion-intro">
            <span className="eyebrow">Seu trabalho merece ser encontrado</span>
            <h2>Venda seus scripts e mapas.</h2>
            <p>
              Ganhe uma vitrine dentro da ScR Community e apresente seu resource
              para quem já está construindo uma cidade FiveM.
            </p>
          </div>
          <div className="promotion-plans">
            <article>
              <span>Vitrine semanal</span>
              <strong>{money(799)}</strong>
              <small>7 dias de divulgação no site</small>
              <Button
                className="primary full"
                onClick={() => buy("seller-week")}
              >
                Divulgar por 7 dias
              </Button>
            </article>
            <article className="featured-plan">
              <span>Vitrine mensal</span>
              <strong>{money(2499)}</strong>
              <small>30 dias de divulgação no site</small>
              <Button
                className="primary full"
                onClick={() => buy("seller-month")}
              >
                Divulgar por 30 dias
              </Button>
            </article>
            <article>
              <span>Comunidade ou cidade</span>
              <strong>{money(7990)}</strong>
              <small>30 dias de destaque no site</small>
              <Button
                className="primary full"
                onClick={() => buy("community-month")}
              >
                Divulgar minha comunidade
              </Button>
            </article>
          </div>
          <div className="promotion-how">
            {[
              [
                "01",
                "Escolha o plano",
                "7 ou 30 dias para resources; 30 dias para cidade ou comunidade.",
              ],
              [
                "02",
                "Finalize a compra",
                "O acesso para enviar o anúncio aparece automaticamente na sua conta.",
              ],
              [
                "03",
                "Envie os materiais",
                "Informe título, descrição, preço, contato e links de imagens ou vídeo.",
              ],
              [
                "04",
                "Revisão e publicação",
                "A equipe ScR confere o material e monta sua vitrine no site.",
              ],
            ].map(([number, title, description]) => (
              <div key={number}>
                <strong>{number}</strong>
                <span>{title}</span>
                <small>{description}</small>
              </div>
            ))}
          </div>
          <div className="notice">
            <MessageCircle size={18} /> Depois da compra, abra “Minha conta” e
            use “Enviar materiais”. Para aparecer também no Discord, abra um
            ticket no canal de divulgação; esse serviço é combinado à parte.
          </div>
        </section>
      )}
      <section className="store-help">
        <div>
          <h2>Um projeto fora da caixa?</h2>
          <p>
            Conte sua ideia para o DK RP. Vamos encontrar o caminho para
            construí-la.
          </p>
        </div>
        <DiscordLink />
      </section>
    </div>
  );
}
export function ProductPage() {
  const { id } = useParams();
  const { buy, products } = useApp();
  const p = products.find((p) => p.id === id);
  const [reference, setReference] = useState(false);
  if (!p) return <NotFound />;
  return (
    <div className="container page">
      <Link className="breadcrumb" to="/loja">
        <ChevronLeft size={16} /> Voltar à loja
      </Link>
      <div className="detail-grid product-detail">
        <div>
          <div
            className="product-visual large"
            style={{
              backgroundImage: `url(${source(p.image || "assets/banner.png")})`,
            }}
          >
            <div className="product-caption">
              <span>ScR Originals</span>
              <strong>{p.title.toUpperCase()}</strong>
              <small>{p.label}</small>
            </div>
          </div>
          <div className="reference-actions">
            {p.docs && (
              <a
                className="button"
                href={p.docs}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen size={17} /> Documentação
              </a>
            )}
            <Button onClick={() => setReference(true)}>
              Ver apresentação original
            </Button>
          </div>
          <div className="detail-description">
            <h2>Feita para construir.</h2>
            <p>{p.description}</p>
            <ul className="features">
              {p.features.map((f) => (
                <li key={f}>
                  <Check size={17} />
                  {f}
                </li>
              ))}
            </ul>
            {(p.video || p.gallery.length > 0) && (
              <Gallery
                media={[
                  ...(p.video
                    ? [
                        {
                          url: p.video,
                          type: "video" as const,
                          caption: `Demonstração de ${p.title}, por DK RP.`,
                        },
                      ]
                    : []),
                  ...p.gallery,
                ]}
              />
            )}
          </div>
        </div>
        <aside className="detail-sidebar">
          <span className="eyebrow">Base FiveM / {p.label}</span>
          <h1>Base {p.title}</h1>
          <p>{p.subtitle}</p>
          <div className="price-large">{money(p.price)}</div>
          <small>Pagamento único · licença permanente</small>
          <Button className="primary full" onClick={() => buy(p.id)}>
            <Package size={18} /> Comprar base
          </Button>
          <DiscordLink className="full">Tirar dúvidas</DiscordLink>
          <div className="included">
            <ShieldCheck size={22} />
            <span>
              <strong>Suporte permanente incluído</strong>
              <small>Acompanhamento da equipe para sua base.</small>
            </span>
          </div>
          <p className="muted">
            A entrega online fica disponível na sua conta após a confirmação do
            pagamento. Consulte os requisitos e a licença na documentação.
          </p>
          <Link to="/termos" className="subtle-link">
            Ler os termos de compra
          </Link>
        </aside>
      </div>
      {reference && (
        <Modal
          title="Apresentação original ScR"
          onClose={() => setReference(false)}
        >
          <img
            className="reference-image"
            src={source(p.image || "assets/banner.png")}
            alt={"Apresentação de venda original da Base " + p.title}
          />
        </Modal>
      )}
    </div>
  );
}
function TicketModal({
  subject,
  onClose,
  kind,
}: {
  subject: string;
  onClose: () => void;
  kind: "quote" | "support" | "promotion";
}) {
  const { me, login, toast } = useApp();
  const [message, setMessage] = useState(""),
    [title, setTitle] = useState(subject),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!me.user) {
      login();
      return;
    }
    setBusy(true);
    try {
      await api("/tickets", {
        method: "POST",
        body: JSON.stringify({ subject: title, message, kind }),
      });
      toast("Pedido enviado. Acompanhe a resposta na sua conta.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        kind === "quote"
          ? "Vamos falar do seu projeto."
          : kind === "promotion"
            ? "Envie sua divulgação."
            : "Como podemos ajudar?"
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Assunto
          <input
            required
            minLength={4}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          {kind === "quote"
            ? "Conte sua ideia"
            : kind === "promotion"
              ? "Envie descrição, links e materiais"
              : "Descreva o problema"}
          <textarea
            required
            minLength={20}
            maxLength={8000}
            rows={6}
            placeholder={
              kind === "promotion"
                ? "Informe o produto ou comunidade, link, texto, imagens e contato. Não envie senhas ou tokens."
                : "Informe o framework, o que você precisa e os detalhes do seu projeto. Não envie senhas ou tokens."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="primary full"
          disabled={busy || preview}
        >
          {busy
            ? "Enviando..."
            : me.user
              ? "Enviar pedido"
              : "Entrar para enviar"}
        </Button>
        <DiscordLink className="full">Prefiro falar no Discord</DiscordLink>
      </form>
    </Modal>
  );
}
export function Support() {
  const { me, buy, toast } = useApp();
  const enabled = me.access.some((a) => a.sku === "support");
  const [ticket, setTicket] = useState(false);
  const [messages, setMessages] = useState<
      { role: "user" | "assistant"; content: string }[]
    >([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!enabled) {
      buy("support");
      return;
    }
    if (!input.trim()) return;
    const history = [
      ...messages,
      { role: "user" as const, content: input },
    ].slice(-11);
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const { answer } = await api("/ai", {
        method: "POST",
        body: JSON.stringify({ messages: history }),
      });
      setMessages([...history, { role: "assistant", content: answer }]);
    } catch (e) {
      toast((e as Error).message);
      setInput(input);
      setMessages(messages);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">Equipe ScR + inteligência artificial</span>
        <h1>
          Menos erros no console.
          <br />
          Mais vida na sua cidade.
        </h1>
        <p>
          Uma equipe para instalar, configurar e explicar. Uma IA para ajudar no
          próximo desafio.
        </p>
      </div>
      <div className="support-layout">
        <div className="support-plan">
          <Headphones size={32} />
          <h2>Suporte extra</h2>
          <p>Para quem quer construir com acompanhamento.</p>
          <div className="price-large">
            R$ 59,90 <small>/ mês</small>
          </div>
          <ul className="features">
            {[
              "Instalação de mapas e scripts",
              "Configuração orientada pela equipe",
              "Explicações para você aprender a fazer",
              "IA ScR para analisar dúvidas e logs",
              "Chamados acompanhados pela sua conta",
            ].map((f) => (
              <li key={f}>
                <Check size={17} />
                {f}
              </li>
            ))}
          </ul>
          <Button
            className="primary full"
            onClick={() => (enabled ? setTicket(true) : buy("support"))}
          >
            {enabled ? "Abrir chamado" : "Quero esse suporte"}
          </Button>
          <small>
            30 dias de acesso. Renovação manual, sem cobrança automática. IA:
            até 30 mensagens por dia.
          </small>
        </div>
        <section className="ai-panel">
          <div className="ai-heading">
            <div>
              <Bot />
              <span>
                ScR AI<small>Seu assistente FiveM</small>
              </span>
            </div>
            <span className="ai-badge">
              {enabled ? "Acesso ativo" : "Incluído no suporte"}
            </span>
          </div>
          <div className="chat-history" aria-live="polite">
            {messages.length ? (
              messages.map((m, i) => (
                <div key={i} className={"chat-message " + m.role}>
                  <strong>{m.role === "user" ? "Você" : "ScR AI"}</strong>
                  <p>{m.content}</p>
                </div>
              ))
            ) : (
              <div className="ai-welcome">
                <div className="ai-orb">
                  <Terminal size={34} />
                </div>
                <h3>Vamos resolver isso juntos.</h3>
                <p>
                  Do primeiro ensure ao erro que não sai do console. Conte o que
                  está acontecendo.
                </p>
                <div className="prompt-suggestions">
                  {[
                    "Meu script não inicia. Por onde começar?",
                    "Como configurar um resource na Creative?",
                    "Como investigar consumo alto de CPU?",
                  ].map((t) => (
                    <button key={t} onClick={() => setInput(t)}>
                      {t}
                      <Plus size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {busy && (
              <div className="chat-message assistant">
                <LoaderCircle className="spin" size={18} /> Analisando seu
                caso...
              </div>
            )}
          </div>
          <form className="chat-input" onSubmit={send}>
            <textarea
              aria-label="Mensagem para a IA"
              value={input}
              maxLength={8000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cole o erro ou conte sua dúvida..."
              rows={2}
            />
            <button
              aria-label="Enviar mensagem"
              disabled={busy || !input.trim()}
            >
              {busy ? (
                <LoaderCircle className="spin" size={19} />
              ) : (
                <Send size={19} />
              )}
            </button>
          </form>
          <small className="ai-footnote">
            Não envie senhas ou tokens. A IA pode errar; valide as orientações
            em ambiente de teste.
          </small>
        </section>
      </div>
      <div className="exclusive-promo">
        <div>
          <LockKeyhole size={28} />
          <h2>Resources com a assinatura ScR.</h2>
          <p>Conheça os scripts exclusivos da comunidade.</p>
        </div>
        <div>
          <strong>R$ 19,99</strong>
          <span>Compra única · acesso permanente ao catálogo exclusivo</span>
          <Button onClick={() => buy("exclusive")}>
            Desbloquear exclusivos
          </Button>
        </div>
      </div>
      <div className="notice">
        Já comprou uma base ScR? O suporte permanente da sua base continua
        incluído. Este plano é um serviço adicional para mapas, scripts e IA.
      </div>
      {ticket && (
        <TicketModal
          subject=""
          kind="support"
          onClose={() => setTicket(false)}
        />
      )}
    </div>
  );
}
function AuthPanel() {
  const { refresh } = useApp();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    params.has("cadastro") ? "register" : "login",
  );
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify({ name, email, password, remember }),
      });
      await refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page auth-page">
      <div className="auth-presentation">
        <img src={asset("assets/logo.png")} alt="ScR Community" />
        <span className="eyebrow">Sua cidade. Sua conta.</span>
        <h1>Entre para continuar construindo.</h1>
        <p>
          Baixe resources, acompanhe compras e fale com a equipe em um só lugar.
        </p>
      </div>
      <div className="auth-card">
        <div className="tabs auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Criar conta
          </button>
        </div>
        <form className="form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Nome de perfil
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "register" ? 10 : 1}
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small>
              {mode === "register"
                ? "Use pelo menos 10 caracteres."
                : "Sua senha é enviada somente por uma conexão segura."}
            </small>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Manter conectado neste dispositivo</span>
          </label>
          {!remember && (
            <small>
              Mesmo desmarcado, sua sessão continua por 24 horas. Marcado, fica
              ativa por 30 dias.
            </small>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button className="primary full" disabled={busy || preview}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <LockKeyhole size={18} />
            )}
            {mode === "login" ? "Entrar" : "Criar minha conta"}
          </Button>
        </form>
        <div className="auth-divider">
          <span>ou</span>
        </div>
        <a
          className="button full"
          href={preview ? undefined : "/api/auth/discord"}
          onClick={(event) => {
            if (preview) event.preventDefault();
          }}
        >
          <MessageCircle size={18} /> Continuar com Discord
        </a>
        <small className="auth-note">
          Ao continuar, você aceita os termos e a política de privacidade.
        </small>
      </div>
    </div>
  );
}

export function Account() {
  const { me, refresh, toast, buy, preferences, setPreferences } = useApp();
  const [orders, setOrders] = useState<any[]>([]),
    [tickets, setTickets] = useState<any[]>([]),
    [error, setError] = useState(""),
    [ticket, setTicket] = useState<"support" | "promotion" | null>(null),
    [busy, setBusy] = useState(false),
    [profileName, setProfileName] = useState(me.user?.name || ""),
    [profileBusy, setProfileBusy] = useState(false);
  const [params] = useSearchParams();
  async function load() {
    setBusy(true);
    try {
      const [o, t] = await Promise.all([api("/orders"), api("/tickets")]);
      setOrders(o);
      setTickets(t);
      await refresh();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (me.user) void load();
  }, [me.user?.id]);
  useEffect(() => setProfileName(me.user?.name || ""), [me.user?.name]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      await refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  if (!me.user) return <AuthPanel />;
  return (
    <div className="container page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Minha conta</span>
          <h1>Olá, {me.user.name}.</h1>
        </div>
        <div className="inline-actions">
          {me.user.admin && (
            <Link className="button" to="/admin">
              Painel admin
            </Link>
          )}
          <Button onClick={logout}>
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </div>
      {params.has("pagamento") && (
        <div className="notice">
          Seu retorno do checkout foi recebido. A liberação depende da
          confirmação do pagamento. Atualize esta página em alguns instantes.
        </div>
      )}
      {!me.user.discordLinked && (
        <div className="notice account-discord-link">
          <MessageCircle size={19} />
          <span>
            <strong>Vincule seu Discord para receber cargos de cliente.</strong>
            Depois da aprovação, o site aplica o cargo correspondente à base.
          </span>
          <a className="button primary" href="/api/auth/discord?link=1">
            Vincular Discord
          </a>
        </div>
      )}
      <div className="account-access">
        <div>
          <h3>Seus acessos</h3>
          {me.access.length ? (
            me.access.map((a, i) => (
              <p key={i}>
                <ShieldCheck size={16} />{" "}
                {a.sku === "support"
                  ? "Suporte + IA"
                  : a.sku === "exclusive"
                    ? "Catálogo exclusivo"
                    : a.sku === "unlimited"
                      ? "Downloads ilimitados"
                      : a.sku === "seller-week"
                        ? "Divulgação semanal"
                        : a.sku === "seller-month"
                          ? "Divulgação mensal"
                          : a.sku === "community-month"
                            ? "Destaque de comunidade"
                            : a.sku}{" "}
                <small>
                  {a.valid_until
                    ? "até " +
                      new Date(a.valid_until).toLocaleDateString("pt-BR")
                    : "Permanente"}
                </small>
              </p>
            ))
          ) : (
            <p>Você tem acesso ao catálogo gratuito.</p>
          )}
        </div>
        <Button onClick={() => setTicket("support")}>
          Novo chamado <Plus size={16} />
        </Button>
      </div>
      {me.access.some((item) =>
        ["seller-week", "seller-month", "community-month"].includes(item.sku),
      ) && (
        <div className="notice promotion-access">
          <Sparkles size={18} /> Seu plano de divulgação está ativo.
          <Button onClick={() => setTicket("promotion")}>
            Enviar materiais
          </Button>
          <a className="button" href={DISCORD} target="_blank" rel="noreferrer">
            Divulgar também no Discord
          </a>
        </div>
      )}
      <section className="profile-settings">
        <div>
          <h2>Perfil & preferências</h2>
          <p>{me.user.email || "Conta conectada pelo Discord"}</p>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setProfileBusy(true);
            try {
              await api("/profile", {
                method: "PUT",
                body: JSON.stringify({ name: profileName }),
              });
              await refresh();
              toast("Nome de perfil atualizado.");
            } catch (failure) {
              toast((failure as Error).message);
            } finally {
              setProfileBusy(false);
            }
          }}
        >
          <label>
            Nome de perfil
            <input
              minLength={2}
              maxLength={60}
              required
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
            />
          </label>
          <Button disabled={profileBusy}>Salvar nome</Button>
        </form>
        <label className="sound-toggle">
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(event) =>
              setPreferences({
                consent: preferences.consent || "all",
                sound: event.target.checked,
              })
            }
          />
          <span>Sons de clique</span>
        </label>
        <Button
          onClick={async () => {
            await logout();
            window.location.hash = "#/conta?cadastro=1";
          }}
        >
          Criar outra conta
        </Button>
      </section>
      <div className="section-heading compact">
        <h2>Minhas compras</h2>
        <Button onClick={load} disabled={busy}>
          {busy ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>
      {error && <p className="error">{error}</p>}
      {orders.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.title}
                    <small>
                      {new Date(o.created_at + "Z").toLocaleDateString("pt-BR")}
                    </small>
                  </td>
                  <td>{money(o.amount)}</td>
                  <td>
                    <span className={"status " + o.status}>
                      {(
                        {
                          approved: "Aprovado",
                          pending: "Aguardando",
                          refunded: "Reembolsado",
                          charged_back: "Contestado",
                          cancelled: "Cancelado",
                        } as Record<string, string>
                      )[o.status] || o.status}
                    </span>
                  </td>
                  <td>
                    {o.status === "approved" && o.delivery_url ? (
                      <div className="purchase-actions">
                        <a
                          className="button"
                          href={`/api/orders/${o.id}/installer`}
                        >
                          <Download size={16} /> Baixar instalador
                        </a>
                        {o.license_ticket_url && (
                          <a
                            className="button"
                            href={o.license_ticket_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle size={16} /> Liberar licença
                          </a>
                        )}
                        {o.discord_role_status !== "granted" && (
                          <Button
                            onClick={async () => {
                              try {
                                const result = await api<{
                                  status: string;
                                  error?: string;
                                }>(`/orders/${o.id}/discord-role`, {
                                  method: "POST",
                                });
                                toast(
                                  result.status === "granted"
                                    ? "Cargo de cliente aplicado no Discord."
                                    : result.error ||
                                        "Vincule o Discord e entre no servidor para ativar o cargo.",
                                );
                                await load();
                              } catch (failure) {
                                toast((failure as Error).message);
                              }
                            }}
                          >
                            <ShieldCheck size={16} />{" "}
                            {o.discord_role_status === "granted"
                              ? "Cargo ativo"
                              : "Ativar cargo"}
                          </Button>
                        )}
                        {o.discord_role_status === "granted" && (
                          <small className="role-success">
                            <Check size={14} /> Cargo de cliente ativo
                          </small>
                        )}
                        {o.discord_role_error && (
                          <small>{o.discord_role_error}</small>
                        )}
                      </div>
                    ) : o.status === "approved" ? (
                      "Acesso liberado"
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Seu projeto começa aqui">
          Suas compras e arquivos aparecerão nesta página.
        </Empty>
      )}
      <h2 className="section-title">Meus chamados</h2>
      {tickets.length ? (
        <div className="ticket-list">
          {tickets.map((t) => (
            <article key={t.id}>
              <div>
                <h3>{t.subject}</h3>
                <span className="status">
                  {t.status === "open"
                    ? "Em aberto"
                    : t.status === "answered"
                      ? "Respondido"
                      : "Encerrado"}
                </span>
              </div>
              <p className="pre-line">{t.message}</p>
              {t.reply && (
                <blockquote>
                  <strong>Equipe ScR</strong>
                  <p className="pre-line">{t.reply}</p>
                </blockquote>
              )}
              {t.quote_amount && (
                <Button
                  onClick={() =>
                    buy("quote:" + t.id, t.subject, t.quote_amount)
                  }
                >
                  Pagar orçamento · {money(t.quote_amount)}
                </Button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum chamado aberto.</p>
      )}
      {ticket && (
        <TicketModal
          subject=""
          kind={ticket}
          onClose={() => {
            setTicket(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
export function Legal({ privacy = false }: { privacy?: boolean }) {
  return (
    <article className="container page legal">
      <span className="eyebrow">ScR Community</span>
      <h1>{privacy ? "Política de privacidade" : "Termos de uso e compra"}</h1>
      <p className="muted">Atualizado em 8 de outubro de 2026.</p>
      {privacy ? (
        <>
          <h2>Dados utilizados</h2>
          <p>
            No cadastro por e-mail, armazenamos nome, e-mail e uma versão
            protegida da senha. No login via Discord, usamos seu identificador,
            nome e avatar público. Mantemos compras, acessos, downloads e
            chamados para prestar o serviço. Nunca recebemos sua senha do
            Discord.
          </p>
          <h2>Pagamentos e assistência com IA</h2>
          <p>
            Os dados de cartão são tratados diretamente pelo provedor de
            pagamento. Quando você usa a IA ScR, o texto da conversa é
            processado pelo Cloudflare Workers AI para gerar a resposta. Não
            envie senhas, tokens, dados pessoais de jogadores ou informações
            confidenciais. As conversas ficam na tela durante a sessão; o site
            não mantém um histórico persistente de IA.
          </p>
          <h2>Cookies e retenção</h2>
          <p>
            Cookies essenciais mantêm a sessão por 24 horas ou 30 dias quando
            “manter conectado” está ativo. Com consentimento, salvamos a
            preferência de sons e medimos páginas visitadas, navegador, origem e
            endereço IP. Registros de acesso e IP são removidos após 90 dias;
            compras e chamados permanecem enquanto necessários ao atendimento e
            às obrigações aplicáveis.
          </p>
          <h2>Suas solicitações</h2>
          <p>
            Solicite acesso, correção ou exclusão dos seus dados pelo Discord
            oficial. A equipe pode precisar manter registros necessários à
            execução de contratos ou obrigações legais.
          </p>
        </>
      ) : (
        <>
          <h2>Resources e distribuição</h2>
          <p>
            Use cada resource de acordo com a licença e os requisitos informados
            na sua página. Somente arquivos com autorização de distribuição
            devem ser publicados. O selo de revisão registra a análise da
            equipe, sem garantir ausência absoluta de falhas ou compatibilidade
            com qualquer servidor.
          </p>
          <h2>Downloads e acessos</h2>
          <p>
            O acesso gratuito permite até cinco downloads por dia, com renovação
            à meia-noite no horário de Brasília. As condições de desbloqueio são
            apresentadas quando o limite é atingido. O acesso aos exclusivos
            custa R$ 19,99 em pagamento único e abrange o catálogo exclusivo
            enquanto o serviço estiver disponível; não inclui automaticamente a
            remoção do limite diário.
          </p>
          <h2>Suporte extra</h2>
          <p>
            R$ 59,90 por 30 dias de instalação, configuração, orientação e
            acesso à IA ScR. A renovação é manual, sem cobrança automática. A IA
            tem limite de 30 mensagens por dia. Não há prazo de resposta
            garantido nesta oferta. O suporte permanente anunciado para as bases
            é independente do plano extra.
          </p>
          <h2>Divulgação no site</h2>
          <p>
            A vitrine para venda de scripts e mapas custa R$ 7,99 por sete dias
            ou R$ 24,99 por 30 dias. A divulgação de comunidade ou cidade custa
            R$ 79,90 por 30 dias. O anunciante deve possuir os direitos sobre o
            material e enviar texto, mídia, links e contato pelo chamado. A
            publicação no Discord é combinada separadamente por ticket.
          </p>
          <h2>Compras, entregas e licenças</h2>
          <p>
            A liberação depende da confirmação do provedor de pagamento. As
            bases incluem licença e condições descritas na documentação de cada
            produto. Para serviços sob orçamento, escopo, prazo, entregas e
            preço devem ser acordados no chamado antes do pagamento.
          </p>
          <h2>Cancelamentos e atendimento</h2>
          <p>
            Entre em contato pelo Discord oficial para solicitar cancelamento,
            relatar problemas ou tratar reembolsos. Pedidos serão avaliados
            conforme a oferta contratada e os direitos aplicáveis ao consumidor.
            Estes termos não afastam direitos previstos em lei.
          </p>
        </>
      )}
      <h2>Contato</h2>
      <p>Responsável pelo atendimento: DK RP / ScR Community.</p>
      <DiscordLink />
      <p className="muted">
        ScR Community é um projeto independente, sem afiliação à Rockstar Games
        ou Cfx.re.
      </p>
    </article>
  );
}
export function NotFound() {
  return (
    <div className="container page not-found">
      <span className="error-number">404</span>
      <h1>Essa rota ainda não existe.</h1>
      <p>Volte para a comunidade e encontre seu próximo resource.</p>
      <Link className="button primary" to="/">
        Voltar ao início
      </Link>
    </div>
  );
}

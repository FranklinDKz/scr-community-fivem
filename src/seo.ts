import { useEffect } from "react";

const SITE = "ScR Community";
const ORIGIN = "https://scr-community.dk-rp.workers.dev";

type Meta = { title: string; description: string; index?: boolean };

const routes: Record<string, Meta> = {
  "/": {
    title: "Scripts, mapas e bases para FiveM",
    description:
      "Scripts e mapas FiveM revisados, bases prontas e suporte de quem trabalha com servidores todo dia. Baixe grátis na ScR Community.",
  },
  "/resources": {
    title: "Resources FiveM grátis: scripts e mapas",
    description:
      "Catálogo de scripts e mapas para FiveM com framework, versão e dependências à vista. Cada arquivo é conferido antes de ir ao ar.",
  },
  "/loja": {
    title: "Bases FiveM Creative V6 e Standalone",
    description:
      "Bases FiveM com suporte incluso, scripts exclusivos, VPS e divulgação para criadores. Veja preços e o que vem em cada produto.",
  },
  "/suporte": {
    title: "Suporte para servidores FiveM",
    description:
      "Abra um chamado, fale com a equipe no Discord ou tire dúvidas com a IA ScR sobre instalação, configuração e erros de resource.",
  },
  "/termos": {
    title: "Termos de compra",
    description: "Regras de compra, entrega e suporte da ScR Community.",
  },
  "/privacidade": {
    title: "Política de privacidade",
    description:
      "Quais dados a ScR Community coleta e como você controla cada um.",
  },
  "/conta": {
    title: "Minha conta",
    description: "Acesse seus downloads, compras e preferências.",
    index: false,
  },
  "/admin": { title: "Administração", description: "", index: false },
};

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [, key, val] = selector.match(/\[(\w+(?::\w+)?)="([^"]+)"\]/) || [];
    el.setAttribute(key, val);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function useSeo(pathname: string, override?: Partial<Meta>) {
  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const path = pathname.replace(base, "") || "/";
    const known = routes[path];
    const meta: Meta = {
      ...(known ?? {
        title: "Página não encontrada",
        description: "",
        index: path.startsWith("/resources/") || path.startsWith("/loja/"),
      }),
      ...override,
    };
    const full =
      path === "/" ? `${SITE}: ${meta.title}` : `${meta.title} | ${SITE}`;
    document.title = full;
    const url = ORIGIN + path;
    const description = meta.description || routes["/"].description;
    setMeta('meta[name="description"]', "content", description);
    setMeta(
      'meta[name="robots"]',
      "content",
      meta.index === false
        ? "noindex,nofollow"
        : "index,follow,max-image-preview:large",
    );
    setMeta('meta[property="og:title"]', "content", full);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:title"]', "content", full);
    setMeta('meta[name="twitter:description"]', "content", description);
    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [pathname, override?.title, override?.description]);
}

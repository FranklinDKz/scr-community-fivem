export const DISCORD = "https://discord.gg/NBtdqHuw72";
export const DISCORD_GUILD_ID = "1177621426321244250";
export const discordChannel = (channelId?: string) =>
  channelId
    ? `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`
    : DISCORD;
export type Media = { url: string; type: "image" | "video"; caption: string };
export type Product = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  category: "base" | "script" | "service";
  image: string;
  label: string;
  docs: string;
  video: string;
  features: string[];
  description: string;
  gallery: Media[];
  discordRoleId: string;
  deliveryUrl: string;
  licenseTicketUrl: string;
  published: boolean;
  sortOrder: number;
};
export type Resource = {
  id: string;
  title: string;
  description: string;
  category: "script" | "map";
  framework: string;
  version: string;
  exclusive: boolean;
  published: boolean;
  reviewed: boolean;
  author: string;
  license: string;
  media: Media[];
  fileKey: string | null;
  filename: string | null;
  downloads: number;
  createdAt: string;
  demo?: boolean;
};
export const products: Product[] = [
  {
    id: "creative-v6",
    title: "Creative V6",
    subtitle: "Uma cidade pronta para a sua história.",
    price: 39990,
    category: "base",
    image: "assets/creative-reference.png",
    label: "Multi-framework",
    docs: "https://scr-community-1.gitbook.io/creative-v6-multi-framework",
    video: "https://www.youtube.com/watch?v=y3J5HJMhcTg",
    features: [
      "Núcleo no padrão Creative Network",
      "Creative V5, vRP e vRPex",
      "Temas SP ou RJ e pack de veículos BR",
      "Smartphone, polícias e facções",
      "Instalador ScR e licença por IP",
      "Suporte permanente incluído",
    ],
    description:
      "A base que reúne os sistemas essenciais para tirar sua cidade do papel. Baús, crafting, blips, fardas, veículos e locais configurados, com orientação da equipe ScR.",
    gallery: [],
    discordRoleId: "1191845850436083722",
    deliveryUrl: "https://dk-license-api.onrender.com/download/instalador",
    licenseTicketUrl: DISCORD,
    published: true,
    sortOrder: 10,
  },
  {
    id: "standalone",
    title: "Standalone",
    subtitle: "Sua cidade. Suas regras. Seu controle.",
    price: 79990,
    category: "base",
    image: "assets/standalone-reference.png",
    label: "Configuração in-game",
    docs: "https://scr-community.gitbook.io/base-standalone",
    video: "https://www.youtube.com/watch?v=vs1_ygaER6M",
    features: [
      "Gerenciamento de sistemas dentro do jogo",
      "Baús, crafting, rotas e grupos",
      "Polícia, hospital e mecânica",
      "Tema, cores e identidade da cidade",
      "Compatibilidade com múltiplos frameworks",
      "Suporte permanente incluído",
    ],
    description:
      "Mais autonomia para personalizar sua cidade. Ajuste sistemas, grupos e identidade visual dentro do jogo. Consulte a documentação para confirmar a compatibilidade dos seus scripts.",
    gallery: [],
    discordRoleId: "1524550741312929812",
    deliveryUrl: "https://dk-license-api.onrender.com/download/instalador",
    licenseTicketUrl: DISCORD,
    published: true,
    sortOrder: 20,
  },
];
export const offers = {
  unlimited: { title: "Downloads ilimitados", price: 599, days: 30 },
  exclusive: { title: "Acesso aos exclusivos", price: 1999, days: null },
  support: { title: "Suporte extra + IA ScR", price: 5990, days: 30 },
  "seller-week": {
    title: "Venda seus scripts e mapas · 7 dias",
    price: 799,
    days: 7,
  },
  "seller-month": {
    title: "Venda seus scripts e mapas · 30 dias",
    price: 2499,
    days: 30,
  },
  "community-month": {
    title: "Divulgação de comunidade ou cidade · 30 dias",
    price: 7990,
    days: 30,
  },
  "creative-v6": { title: "Base Creative V6", price: 39990, days: null },
  standalone: { title: "Base Standalone", price: 79990, days: null },
} as const;
export type OfferId = keyof typeof offers;
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const services = [
  {
    id: "cidade",
    title: "Crie sua cidade",
    description:
      "Planejamento, instalação e configuração de uma cidade com a sua identidade.",
    icon: "city",
    channelId: "1214689064284979310",
  },
  {
    id: "dev",
    title: "Seu programador",
    description:
      "Desenvolvimento e manutenção para os sistemas do seu servidor.",
    icon: "code",
    channelId: "1194605799742386336",
  },
  {
    id: "script",
    title: "Seu script, do zero",
    description:
      "Transforme uma ideia em um resource feito para o seu projeto.",
    icon: "terminal",
    channelId: "1522177213355655309",
  },
  {
    id: "jogadores",
    title: "Divulgação & mais jogadores",
    description:
      "Divulgação da sua comunidade ou cidade para alcançar novos jogadores.",
    icon: "megaphone",
    channelId: "1480286534912704585",
  },
  {
    id: "decrypt",
    title: "Descriptografar scripts autorizados",
    description:
      "Atendimento para scripts próprios ou com autorização do titular.",
    icon: "lock",
    channelId: "1515442015985471729",
  },
  {
    id: "vps-optimize",
    title: "Otimizar sua VPS",
    description: "Análise e otimização do ambiente de hospedagem da cidade.",
    icon: "gauge",
    channelId: "1557729600371425340",
  },
  {
    id: "windows",
    title: "Otimizar Windows & FiveM",
    description: "Ajustes de desempenho para o computador e o FiveM.",
    icon: "gauge",
    channelId: "1537942791017988147",
  },
  {
    id: "fardas",
    title: "Fardas FiveM",
    description: "Fardas personalizadas para a identidade da sua cidade.",
    icon: "palette",
  },
  {
    id: "design",
    title: "Logos, banners & designers",
    description: "Logo, banners e peças visuais para divulgar seu projeto.",
    icon: "palette",
  },
  {
    id: "loadscreen",
    title: "Loadscreen",
    description: "Tela de carregamento feita para a identidade da sua cidade.",
    icon: "palette",
  },
  {
    id: "maps-custom",
    title: "Mapas personalizados",
    description: "Letreiros, favelas, praças e garagens modificadas.",
    icon: "map",
  },
  {
    id: "maps-optimize",
    title: "Separar & otimizar mapas",
    description: "Organização e redução de peso dos mapas do servidor.",
    icon: "map",
  },
  {
    id: "optimize-assets",
    title: "Otimizar veículos & scripts",
    description: "Análise de desempenho de veículos e resources autorizados.",
    icon: "gauge",
  },
  {
    id: "bots",
    title: "Criar bots",
    description: "Bots para organizar e automatizar sua comunidade.",
    icon: "bot",
  },
  {
    id: "vip-config",
    title: "Configurar loja VIP",
    description: "Configuração da loja e dos produtos da sua cidade.",
    icon: "store",
  },
  {
    id: "fix-scripts",
    title: "Corrigir erros de scripts",
    description: "Diagnóstico e correção de resources com autorização de uso.",
    icon: "code",
  },
];

export const scrScripts = [
  {
    title: "Anticheat FiveM",
    description: "Proteção ScR para fortalecer a segurança da sua cidade.",
  },
  {
    title: "Banco & empréstimo",
    description: "Sistema financeiro para criar novas possibilidades de RP.",
  },
  {
    title: "Elevador & interface",
    description: "Interface ScR para pontos de acesso e múltiplos andares.",
  },
  {
    title: "Autoescola",
    description: "Experiência completa para aulas, provas e habilitação.",
  },
] as const;

export const partners = [
  {
    id: "vps",
    title: "VPS Gamer",
    description:
      "Hospedagem para manter sua cidade online com estrutura dedicada ao projeto.",
    href: "https://financeiro.wyzehost.com.br/aff.php?aff=116",
    cta: "Conhecer planos de VPS",
  },
  {
    id: "vip-store",
    title: "Loja VIP",
    description:
      "Crie sua loja online para organizar produtos e vendas da comunidade.",
    href: "https://centralcart.com/?ref=DKRP",
    cta: "Criar minha loja VIP",
  },
] as const;
export const previewResources: Resource[] = [
  {
    id: "preview-garage",
    title: "Garagem inteligente",
    category: "script",
    framework: "vRP / Creative",
    description:
      "Prévia de como seus scripts serão apresentados: descrição, compatibilidade, galeria e instruções em uma página. O administrador substitui este exemplo por um resource real.",
    exclusive: false,
    media: [
      {
        url: "assets/scene.png",
        type: "image",
        caption: "Imagem ilustrativa do catálogo.",
      },
    ],
  },
  {
    id: "preview-map",
    title: "Novos lugares. Novas histórias.",
    category: "map",
    framework: "Standalone",
    description:
      "Espaço para os mapas da comunidade, com imagens dos ambientes, informações de instalação e arquivos publicados pela equipe.",
    exclusive: false,
    media: [
      {
        url: "assets/scene.png",
        type: "image",
        caption: "Imagem ilustrativa. Nenhum mapa está incluído nesta prévia.",
      },
    ],
  },
  {
    id: "preview-exclusive",
    title: "Feito para ir além",
    category: "script",
    framework: "Multi-framework",
    description:
      "Área reservada aos scripts exclusivos da ScR. Os arquivos reais e as informações de cada lançamento serão publicados pela equipe.",
    exclusive: true,
    media: [
      {
        url: "assets/banner.png",
        type: "image",
        caption: "Identidade ScR Community.",
      },
    ],
  },
].map((r) => ({
  ...r,
  version: "1.0",
  published: true,
  reviewed: false,
  author: "ScR Community",
  license: "Exemplo de apresentação",
  fileKey: null,
  filename: null,
  downloads: 0,
  createdAt: "2026-10-08T00:00:00.000Z",
  demo: true,
})) as Resource[];

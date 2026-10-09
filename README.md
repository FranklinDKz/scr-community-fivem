# ScR Community | Free Resources FiveM

Portal público da ScR Community para publicar resources gratuitos, vender bases e scripts, oferecer suporte e divulgar projetos FiveM.

Site publicado: https://scr-community.dk-rp.workers.dev

## O que está incluído

- catálogo de scripts e mapas com busca, filtros, galeria, vídeos e downloads protegidos;
- limite de 5 downloads diários, exibido somente depois do primeiro download;
- downloads ilimitados por 30 dias, catálogo exclusivo e suporte mensal com IA;
- loja das bases Creative V6 e Standalone, Scripts ScR, serviços, VPS e Loja VIP;
- planos para divulgar scripts, mapas, comunidades e cidades;
- conta por e-mail e senha ou Discord, perfil editável e sessão persistente;
- painel administrativo para resources, arquivos, chamados, entregas, usuários e acessos;
- checkout InfinitePay confirmado no servidor antes de liberar qualquer acesso;
- banco Cloudflare D1, arquivos privados no R2 e aplicação no Cloudflare Workers.

## Desenvolvimento

Requer Node.js 22 ou mais recente.

```bash
npm install
npx wrangler d1 migrations apply scr-community --local
npm run dev:api
```

Em outro terminal:

```bash
npm run dev
```

Copie `.dev.vars.example` para `.dev.vars` e preencha somente os recursos que pretende testar. Não salve credenciais no Git.

Para uma prévia visual sem banco e sem operações reais:

```bash
VITE_STATIC_PREVIEW=true npm run dev
```

No PowerShell:

```powershell
$env:VITE_STATIC_PREVIEW='true'; npm run dev
```

## Configuração de produção

Variáveis públicas ficam em `wrangler.jsonc`. Segredos devem ser cadastrados com `wrangler secret put`:

- `PASSWORD_PEPPER`: valor aleatório longo para proteger senhas;
- `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET`: login pelo Discord;
- `OPENAI_API_KEY`: IA do plano de suporte;
- `ADMIN_DISCORD_IDS`: opção de emergência para IDs administrativos;
- `MERCADOPAGO_*`: fallback opcional, pois o checkout principal usa InfinitePay.

O dono do servidor `ScR Community` recebe permissão administrativa automaticamente ao entrar pelo Discord, usando a confirmação de propriedade devolvida pelo próprio Discord.

Atualize `APP_URL` para o endereço final antes de configurar o callback do Discord:

```text
https://SEU-DOMINIO/api/auth/callback
```

## Publicação

```bash
npm test
npm run build
npx wrangler d1 migrations apply scr-community --remote
npx wrangler deploy
```

Depois da publicação, cadastre os ZIPs das bases no painel. A compra online de cada base permanece bloqueada enquanto o arquivo de entrega não estiver cadastrado.

## Segurança e privacidade

- Senhas recebem PBKDF2 com salt individual e pepper mantido como segredo.
- Cookies de sessão usam HttpOnly, Secure em produção e SameSite=Lax.
- Pagamentos InfinitePay são validados novamente em `/payment_check`; redirects e webhooks nunca liberam acesso sozinhos.
- Mídias e ZIPs são validados, ficam no R2 e downloads pagos são servidos por rotas autorizadas.
- Métricas e IPs só ficam visíveis no painel do dono e são removidos após 90 dias.
- Recursos só podem ser publicados com arquivo, licença/autorização e confirmação da revisão.

## Verificações

```bash
npm test
npm run build
npm audit
```

import { previewResources } from "../shared/catalog";
export const preview = import.meta.env.VITE_STATIC_PREVIEW === "true";
export const asset = (path: string) =>
  import.meta.env.BASE_URL + path.replace(/^\//, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (preview) {
    if (options.method && options.method !== "GET")
      throw new ApiError(
        "Esta é uma prévia. Este recurso será ativado na publicação completa.",
      );
    if (path === "/resources") return previewResources as T;
    if (path === "/me") return { user: null, usage: null, access: [] } as T;
    if (path === "/config")
      return { discord: false, payments: false, ai: false } as T;
    throw new ApiError("Entre na versão completa para acessar sua conta.");
  }
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(!(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      error: "Não foi possível conectar. Tente novamente.",
    }))) as { error: string; code?: string };
    throw new ApiError(error.error, error.code, response.status);
  }
  return response.json();
}
export async function downloadFile(path: string, filename: string) {
  if (preview)
    throw new ApiError(
      "Os exemplos da prévia não incluem arquivos para download.",
    );
  const response = await fetch("/api" + path, { method: "POST" });
  if (!response.ok) {
    const error = (await response.json()) as { error: string; code?: string };
    throw new ApiError(error.error, error.code, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

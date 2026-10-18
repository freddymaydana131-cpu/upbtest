export type Producto = {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  descripcion: string | null;
  etiqueta: string | null;
  createdAt: string;
};

export type Pedido = {
  id: number;
  estado: string;
  total: number;
  createdAt: string;
  productos: {
    idProducto: number | null;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const reintentosProductos = [2000, 4000, 8000, 12000, 15000, 15000, 15000];

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function esperarReintento(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const limpiar = () => signal?.removeEventListener("abort", cancelar);
    const timeout = setTimeout(() => {
      limpiar();
      resolve();
    }, delay);
    const cancelar = () => {
      clearTimeout(timeout);
      limpiar();
      reject(new DOMException("La solicitud fue cancelada.", "AbortError"));
    };

    if (signal?.aborted) {
      cancelar();
    } else {
      signal?.addEventListener("abort", cancelar, { once: true });
    }
  });
}

function esErrorTransitorio(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof ApiError &&
      (error.status === 429 || error.status >= 500))
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl) {
    throw new Error("Configura NEXT_PUBLIC_API_URL para conectar con el catálogo.");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const contenido = await response.text();
    let mensaje = `La API respondió con HTTP ${response.status}.`;

    if (contenido) {
      try {
        const error = JSON.parse(contenido) as { error?: string };
        if (error.error) mensaje = error.error;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }

    throw new ApiError(mensaje, response.status);
  }

  return (await response.json()) as T;
}

export async function listarProductos(
  nombre = "",
  signal?: AbortSignal,
  onRetry?: (attempt: number, totalAttempts: number) => void,
) {
  const query = nombre.trim() ? `?nombre=${encodeURIComponent(nombre.trim())}` : "";
  const totalAttempts = reintentosProductos.length + 1;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await request<Producto[]>(`/api/productos${query}`, { signal });
    } catch (error) {
      const delay = reintentosProductos[attempt - 1];
      if (signal?.aborted || delay === undefined || !esErrorTransitorio(error)) {
        throw error;
      }

      onRetry?.(attempt + 1, totalAttempts);
      await esperarReintento(delay, signal);
    }
  }
}

export function crearPedido(productos: { idProducto: number; cantidad: number }[]) {
  return request<Pedido>("/api/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productos }),
  });
}

export function obtenerPedido(id: number) {
  return request<Pedido>(`/api/pedidos/${id}`);
}

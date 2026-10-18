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
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || `La API respondió con HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function listarProductos(nombre = "", signal?: AbortSignal) {
  const query = nombre.trim() ? `?nombre=${encodeURIComponent(nombre.trim())}` : "";
  return request<Producto[]>(`/api/productos${query}`, { signal });
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

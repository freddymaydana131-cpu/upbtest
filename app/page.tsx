"use client";

import { useEffect, useState } from "react";
import {
  crearPedido,
  listarProductos,
  obtenerPedido,
  type Pedido,
  type Producto,
} from "../lib/api";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price);

function CoffeeIllustration() {
  return (
    <svg
      className="coffee-illustration"
      viewBox="0 0 520 520"
      role="img"
      aria-label="Ilustración de una taza de café recién servido"
    >
      <defs>
        <linearGradient id="cup" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#e7d3b7" />
        </linearGradient>
        <linearGradient id="coffee" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#9b5b2b" />
          <stop offset="1" stopColor="#542a19" />
        </linearGradient>
      </defs>
      <circle cx="260" cy="260" r="218" fill="#e9b86d" />
      <circle cx="260" cy="260" r="178" fill="#f4d49d" />
      <path
        d="M108 346c75 28 224 28 303 0l-29 55c-54 28-188 28-245 0z"
        fill="#c88142"
        opacity=".36"
      />
      <ellipse cx="258" cy="364" rx="151" ry="34" fill="#fff5e5" />
      <path
        d="M139 226h239v96c0 48-39 87-87 87h-65c-48 0-87-39-87-87z"
        fill="url(#cup)"
      />
      <path
        d="M378 249h22c29 0 51 22 51 49s-22 49-51 49h-26"
        fill="none"
        stroke="#e7d3b7"
        strokeWidth="23"
      />
      <path
        d="M378 267h17c18 0 31 13 31 31s-13 31-31 31h-20"
        fill="none"
        stroke="#b27647"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <ellipse cx="258" cy="229" rx="120" ry="25" fill="#f8ead3" />
      <ellipse cx="258" cy="232" rx="105" ry="18" fill="url(#coffee)" />
      <path
        d="M255 221c-24 12-14 22 3 17 17-6 20-18 5-20-18-2-41 10-38 20 3 9 25 7 43-5 13-9 25-11 37-7"
        fill="none"
        stroke="#d7a36e"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M211 180c-18-21 13-28-2-52m57 51c-18-21 13-28-2-52m60 55c-18-21 13-28-2-52"
        fill="none"
        stroke="#fff8ed"
        strokeLinecap="round"
        strokeWidth="7"
        opacity=".85"
      />
      <path d="M111 163l9 19 20 2-15 13 4 20-18-10-18 10 4-20-15-13 20-2z" fill="#fff8ed" />
      <circle cx="403" cy="147" r="7" fill="#fff8ed" />
      <circle cx="126" cy="300" r="5" fill="#fff8ed" />
      <path d="M402 360l6 12 13 2-10 9 2 13-11-6-11 6 2-13-10-9 13-2z" fill="#fff8ed" />
    </svg>
  );
}

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [intentosCatalogo, setIntentosCatalogo] = useState(1);
  const [recargaCatalogo, setRecargaCatalogo] = useState(0);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [carrito, setCarrito] = useState<Record<number, { producto: Producto; cantidad: number }>>({});
  const [creandoPedido, setCreandoPedido] = useState(false);
  const [consultandoPedido, setConsultandoPedido] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [errorPedido, setErrorPedido] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    listarProductos(busqueda, controller.signal, (attempt) => {
      setIntentosCatalogo(attempt);
    })
      .then(setProductos)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setErrorCatalogo(
            error instanceof TypeError
              ? "No se pudo conectar con el catálogo después de varios intentos."
              : error instanceof Error
                ? error.message
                : "No se pudo cargar el catálogo.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoCatalogo(false);
      });

    return () => controller.abort();
  }, [busqueda, recargaCatalogo]);

  const itemsCarrito = Object.values(carrito);
  const cantidadEnCarrito = itemsCarrito.reduce((total, item) => total + item.cantidad, 0);
  const totalCarrito = itemsCarrito.reduce(
    (total, item) => total + item.producto.precio * item.cantidad,
    0,
  );

  const cambiarCantidad = (producto: Producto, cambio: number) => {
    setCarrito((actual) => {
      const actualCantidad = actual[producto.id]?.cantidad ?? 0;
      const nuevaCantidad = Math.min(actualCantidad + cambio, producto.stock);
      const siguiente = { ...actual };

      if (nuevaCantidad <= 0) {
        delete siguiente[producto.id];
      } else {
        siguiente[producto.id] = { producto, cantidad: nuevaCantidad };
      }

      return siguiente;
    });
  };

  const confirmarPedido = async () => {
    setCreandoPedido(true);
    setErrorPedido("");

    try {
      const nuevoPedido = await crearPedido(
        itemsCarrito.map(({ producto, cantidad }) => ({
          idProducto: producto.id,
          cantidad,
        })),
      );
      setPedido(nuevoPedido);
      setCarrito({});
      setProductos((actuales) =>
        actuales.map((producto) => {
          const itemPedido = nuevoPedido.productos.find(
            (item) => item.idProducto === producto.id,
          );
          return itemPedido
            ? { ...producto, stock: Math.max(0, producto.stock - itemPedido.cantidad) }
            : producto;
        }),
      );
    } catch (error) {
      setErrorPedido(
        error instanceof Error ? error.message : "No se pudo crear el pedido.",
      );
    } finally {
      setCreandoPedido(false);
    }
  };

  const consultarPedido = async () => {
    if (!pedido) return;
    setConsultandoPedido(true);
    setErrorPedido("");

    try {
      setPedido(await obtenerPedido(pedido.id));
    } catch (error) {
      setErrorPedido(
        error instanceof Error ? error.message : "No se pudo consultar el pedido.",
      );
    } finally {
      setConsultandoPedido(false);
    }
  };

  return (
    <>
      <div className="top-note">
        <span>Un buen café también es una pausa.</span>
        <span className="top-note-mark" aria-hidden="true">
          ✳
        </span>
      </div>

      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Pausa Café, inicio">
          <span className="brand-mark" aria-hidden="true">
            p.
          </span>
          <span>
            pausa<span className="brand-light">café</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#menu">El menú</a>
          <a href="#nosotros">Nuestra idea</a>
          <a className="nav-cta" href="#visitanos">
            Encuentra tu pausa <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line" />
              CAFÉ RICO, DÍAS TRANQUILOS
            </p>
            <h1>
              Baja el ritmo.
              <br />
              <span>Sube el café.</span>
            </h1>
            <p className="hero-description">
              Café de origen, hecho con cariño y sin afán. Un pequeño recordatorio
              de que los mejores momentos no tienen que ir deprisa.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#menu">
                Descubre el menú <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#nosotros">
                Conoce Pausa <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="hero-footnote">
              <span className="footnote-stars" aria-hidden="true">
                ★★★★★
              </span>
              <span>Un sorbito de calma, todos los días.</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="art-stamp" aria-hidden="true">
              <span>CAFÉ</span>
              <span>CON</span>
              <span>CALMA</span>
            </div>
            <CoffeeIllustration />
            <div className="art-caption">
              <span className="caption-dot" />
              Hecho al momento, para disfrutar despacio
            </div>
          </div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line" />
                ALGO RICO TE ESPERA
              </p>
              <h2>Tu pausa, <em>a tu manera.</em></h2>
            </div>
            <p className="section-intro">
              Favoritos sencillos, preparados con buenos ingredientes y mucho
              cuidado.
            </p>
          </div>

          <div className="menu-tools">
            <label className="menu-search">
              <span>Buscar en el menú</span>
              <input
                type="search"
                value={busqueda}
                onChange={(event) => {
                  setCargandoCatalogo(true);
                  setIntentosCatalogo(1);
                  setErrorCatalogo("");
                  setBusqueda(event.target.value);
                }}
                placeholder="Ej. latte"
              />
            </label>
            <p className="menu-feedback" aria-live="polite">
              {cargandoCatalogo
                ? intentosCatalogo > 1
                  ? `Conectando... (intento ${intentosCatalogo} de 8)`
                  : "Conectando..."
                : errorCatalogo}
            </p>
            {errorCatalogo && (
              <button
                className="menu-retry"
                type="button"
                onClick={() => {
                  setCargandoCatalogo(true);
                  setIntentosCatalogo(1);
                  setErrorCatalogo("");
                  setRecargaCatalogo((actual) => actual + 1);
                }}
              >
                Reintentar conexión
              </button>
            )}
          </div>

          <div className="menu-grid">
            {productos.map((producto, index) => {
              const numero = String(index + 1).padStart(2, "0");
              const cantidad = carrito[producto.id]?.cantidad ?? 0;
              return (
                <article className="drink-card" key={producto.id}>
                  <div className="drink-card-top">
                    <span className="drink-number">{numero}</span>
                    <span className="drink-tag">{producto.etiqueta || "Pausa"}</span>
                  </div>
                  <div className={`drink-art drink-art-${numero}`}>
                    <span className="drink-cup" aria-hidden="true">
                      <span className="cup-coffee" />
                      <span className="cup-handle" />
                    </span>
                    <span className="drink-sparkle" aria-hidden="true">
                      ✳
                    </span>
                  </div>
                  <div className="drink-info">
                    <div>
                      <h3>{producto.nombre}</h3>
                      <p>{producto.descripcion || "Preparado con cariño y sin afán."}</p>
                    </div>
                    <span className="drink-price">{formatPrice(producto.precio)}</span>
                  </div>
                  <div className="drink-order">
                    <span>{producto.stock} disponibles</span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label={`Quitar una unidad de ${producto.nombre}`}
                        disabled={cantidad === 0}
                        onClick={() => cambiarCantidad(producto, -1)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{cantidad}</span>
                      <button
                        type="button"
                        aria-label={`Añadir una unidad de ${producto.nombre}`}
                        disabled={cantidad >= producto.stock}
                        onClick={() => cambiarCantidad(producto, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!cargandoCatalogo && !errorCatalogo && productos.length === 0 && (
            <p className="menu-feedback">No encontramos productos con esa búsqueda.</p>
          )}

          <div className="order-panel">
            <div className="order-summary">
              <p>{cantidadEnCarrito} productos en tu pedido</p>
              <strong>{formatPrice(totalCarrito)}</strong>
            </div>
            <button
              className="button button-dark"
              type="button"
              disabled={cantidadEnCarrito === 0 || creandoPedido}
              onClick={confirmarPedido}
            >
              {creandoPedido ? "Creando pedido..." : "Confirmar pedido"}
            </button>
          </div>

          {errorPedido && <p className="order-error" role="alert">{errorPedido}</p>}

          {pedido && (
            <div className="order-result" aria-live="polite">
              <div>
                <strong>Pedido #{pedido.id} · {pedido.estado}</strong>
                <p>Total: {formatPrice(pedido.total)}</p>
                {pedido.productos.map((item) => (
                  <p key={`${pedido.id}-${item.idProducto}-${item.nombre}`}>
                    {item.cantidad} × {item.nombre}
                  </p>
                ))}
              </div>
              <button
                className="button button-dark"
                type="button"
                disabled={consultandoPedido}
                onClick={consultarPedido}
              >
                {consultandoPedido ? "Consultando..." : "Consultar pedido"}
              </button>
            </div>
          )}
        </section>

        <section className="closing-section" id="nosotros">
          <span className="closing-flower" aria-hidden="true">
            ✳
          </span>
          <p className="eyebrow">UN LUGAR PARA ESTAR</p>
          <h2>
            No hace falta una ocasión.
            <br />
            <em>Solo ganas de una pausa.</em>
          </h2>
          <a className="button button-light" href="#visitanos">
            Ven por tu café <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section className="visit-section" id="visitanos">
          <div className="visit-mark" aria-hidden="true">
            p.
          </div>
          <div>
            <p className="eyebrow">PAUSA CAFÉ</p>
            <h2>Nos vemos en tu próxima pausa.</h2>
          </div>
          <a className="button button-dark" href="#inicio">
            Volver al inicio <span aria-hidden="true">↑</span>
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#inicio">
          pausa<span className="brand-light">café</span>
        </a>
        <span>Hecho con calma y buen café.</span>
        <span>© 2026 Pausa Café</span>
      </footer>
    </>
  );
}

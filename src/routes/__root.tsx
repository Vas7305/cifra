import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { THEME_BOOT_SCRIPT } from "@/components/dashboard/theme-toggle";
import appCss from "../styles.css?url";

const APP_NAME = "Cifra";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${APP_NAME} · Finanzas personales y de negocio` },
      {
        name: "description",
        content:
          "Tablero de finanzas personales y de negocio con filtros de fecha, indicadores y tendencias. Funciona sin conexión.",
      },
      { name: "theme-color", content: "#f0ede5", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#021c1a", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});

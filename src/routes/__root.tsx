import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider } from "@/lib/theme-context";
import { CartDrawer } from "@/components/marketplace/CartDrawer";
import { Toaster } from "@/components/ui/sonner";

const themeBootstrap = `(function(){try{var s=localStorage.getItem('hh-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var r=document.documentElement;r.classList.remove('dark','light');r.classList.add(t);r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Harvest Hub Zimbabwe — Premium Agricultural Commerce" },
      {
        name: "description",
        content:
          "Harvest Hub Zimbabwe is a premium agricultural commerce platform connecting farmers, shops, transport and markets.",
      },
      { name: "author", content: "Harvest Hub Zimbabwe" },
      { property: "og:title", content: "Harvest Hub Zimbabwe — Premium Agricultural Commerce" },
      {
        property: "og:description",
        content: "Premium agricultural commerce for Zimbabwe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Harvest Hub Zimbabwe — Premium Agricultural Commerce" },
      { name: "description", content: "Harvest Hub ZW is a premium agricultural commerce platform for Zimbabwe." },
      { property: "og:description", content: "Harvest Hub ZW is a premium agricultural commerce platform for Zimbabwe." },
      { name: "twitter:description", content: "Harvest Hub ZW is a premium agricultural commerce platform for Zimbabwe." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/45c06938-364b-4257-82e6-cb3d759880cd/id-preview-18a14c67--761d40ea-1abd-4984-97bd-6720996a93d3.lovable.app-1779322214530.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/45c06938-364b-4257-82e6-cb3d759880cd/id-preview-18a14c67--761d40ea-1abd-4984-97bd-6720996a93d3.lovable.app-1779322214530.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/harvest-hub-logo.png" },
      { rel: "apple-touch-icon", href: "/harvest-hub-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <Outlet />
            <CartDrawer />
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


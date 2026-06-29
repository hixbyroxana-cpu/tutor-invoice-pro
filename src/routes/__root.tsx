import { Outlet, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LessonPaid — Tutoring Invoice Generator" },
      { name: "description", content: "Manage students and generate professional tutoring invoices in seconds." },
      { property: "og:title", content: "LessonPaid — Tutoring Invoice Generator" },
      { name: "twitter:title", content: "LessonPaid — Tutoring Invoice Generator" },
      { property: "og:description", content: "Manage students and generate professional tutoring invoices in seconds." },
      { name: "twitter:description", content: "Manage students and generate professional tutoring invoices in seconds." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4596179-da44-472f-a668-3c4a8896378f/id-preview-9f8f27fa--28fc16b1-ef79-47a7-aa38-0d757a4ffa0f.lovable.app-1778327181563.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4596179-da44-472f-a668-3c4a8896378f/id-preview-9f8f27fa--28fc16b1-ef79-47a7-aa38-0d757a4ffa0f.lovable.app-1778327181563.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    </div>
  ),
});

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">Page not found</p>
        <a href="/" className="inline-block mt-4 underline">Go home</a>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Outlet />
    </QueryClientProvider>
  );
}

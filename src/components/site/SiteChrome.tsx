import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { PublicSettings } from "@/lib/types";

const NAV = [
  { to: "/", label: "Work" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader({ settings }: { settings: PublicSettings | null }) {
  const [open, setOpen] = useState(false);
  const name = settings?.display_name || "Portfolio";
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="text-[0.95rem] font-medium tracking-tight">
          {name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
          {settings?.resume_href && (
            <a href={settings.resume_href} target="_blank" rel="noreferrer" className="link-underline text-foreground">
              Résumé
            </a>
          )}
        </nav>
        <button
          type="button"
          className="-mr-2 p-2 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-border md:hidden">
          <div className="container-page flex flex-col py-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-3 text-base">
                {n.label}
              </Link>
            ))}
            {settings?.resume_href && (
              <a href={settings.resume_href} target="_blank" rel="noreferrer" className="py-3 text-base">
                Résumé
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function profileLinks(s: PublicSettings | null) {
  if (!s) return [];
  return [
    { label: "LinkedIn", href: s.linkedin_url },
    { label: "GitHub", href: s.github_url },
    { label: "Dribbble", href: s.dribbble_url },
    { label: "Website", href: s.other_url },
  ].filter((l): l is { label: string; href: string } => !!l.href);
}

export function SiteFooter({ settings }: { settings: PublicSettings | null }) {
  const links = profileLinks(settings);
  return (
    <footer className="mt-32 border-t border-border">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {settings?.display_name}
          {settings?.footer_text ? ` · ${settings.footer_text}` : ""}
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {settings?.contact_email && (
            <li>
              <a className="hover:text-foreground" href={`mailto:${settings.contact_email}`}>
                Email
              </a>
            </li>
          )}
          {links.map((l) => (
            <li key={l.label}>
              <a className="hover:text-foreground" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

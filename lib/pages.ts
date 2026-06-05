// The 6 workshop pages, in fixed order. Source of truth for both the
// top nav tabs and the footer prev/next.

export type PageDef = {
  num: number;
  label: string;
  slug: string; // appended to /r/[code]/. Empty string = base route (Welcome).
};

export const PAGES: ReadonlyArray<PageDef> = [
  { num: 0, label: "Welcome",      slug: ""            },
  { num: 1, label: "Celebrate",    slug: "celebrate"   },
  { num: 2, label: "Health check", slug: "health"      },
  { num: 3, label: "Commitments",  slug: "commitments" },
  { num: 4, label: "Future",       slug: "future"      },
  { num: 5, label: "Close",        slug: "close"       },
] as const;

export function pageHref(code: string, slug: string): string {
  return slug ? `/r/${code}/${slug}` : `/r/${code}`;
}

// Resolve the active page number from a pathname like "/r/CXMTG/celebrate".
// Returns 0 (Welcome) for the base /r/[code] route, or -1 if not on a room page.
export function pageNumFromPath(pathname: string, code: string): number {
  const base = `/r/${code}`;
  if (pathname === base || pathname === `${base}/`) return 0;
  if (!pathname.startsWith(`${base}/`)) return -1;
  const tail = pathname.slice(base.length + 1).split("/")[0];
  const match = PAGES.findIndex((p) => p.slug === tail);
  return match === -1 ? -1 : match;
}

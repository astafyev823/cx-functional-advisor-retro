"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { PillButton } from "@/app/components/PillButton";
import { PAGES, pageHref, pageNumFromPath } from "@/lib/pages";

// Bottom prev/next pager with "Page X of 8" indicator. Mirrors the
// reference's <div class="footer-nav">. Each navigation scrolls back to
// the top of the page (reference behavior).
export function PageFooter({ code }: { code: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeNum = pageNumFromPath(pathname ?? "", code);

  // Scroll to top whenever the active page changes (mirrors the
  // reference's window.scrollTo({ top: 0, behavior: 'smooth' }) calls).
  useEffect(() => {
    if (activeNum < 0) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeNum]);

  if (activeNum < 0) return null;

  const prev = activeNum > 0 ? PAGES[activeNum - 1] : null;
  const next = activeNum < PAGES.length - 1 ? PAGES[activeNum + 1] : null;

  const go = (slug: string) => {
    router.push(pageHref(code, slug));
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 flex items-center justify-between gap-4">
      <PillButton
        variant="secondary"
        disabled={!prev}
        onClick={() => prev && go(prev.slug)}
      >
        ← Back
      </PillButton>
      <div className="text-xs text-ink-faint">
        Page {activeNum + 1} of {PAGES.length}
      </div>
      {next ? (
        <Link href={pageHref(code, next.slug)} prefetch>
          <PillButton>Next →</PillButton>
        </Link>
      ) : (
        <PillButton disabled>Next →</PillButton>
      )}
    </div>
  );
}

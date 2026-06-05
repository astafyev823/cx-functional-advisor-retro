import Link from "next/link";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { COLORS } from "@/lib/colors";

// Placeholder shell used by pages that haven't been built yet.
// Keeps the same page layout (shapes, padding, typography) so the nav
// + footer feel consistent across all 8 tabs.

type Props = {
  pageNum: number;
  pageLabel: string;
  description: string;
  back?: { code: string; toLabel: string; toHref: string };
};

export function ComingSoon({ pageNum, pageLabel, description, back }: Props) {
  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10 max-w-[640px]">
        <Eyebrow color={COLORS[4].hex}>PAGE {pageNum} · COMING SOON</Eyebrow>
        <h1 className="text-[36px] font-medium text-navy mb-3 leading-tight">
          {pageLabel}
        </h1>
        <p className="text-[15px] text-ink-mute leading-relaxed mb-6">
          {description}
        </p>
        <Card style={{ background: COLORS[4].tint }} className="border-transparent">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium shrink-0"
              style={{ background: COLORS[4].hex }}
            >
              ⏳
            </div>
            <div className="text-[13px]" style={{ color: COLORS[4].dark }}>
              We&apos;re still building this page. The nav + footer work — use them
              to navigate to a finished page.
            </div>
          </div>
        </Card>
        {back ? (
          <div className="mt-6">
            <Link href={back.toHref}>
              <PillButton variant="secondary">← {back.toLabel}</PillButton>
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

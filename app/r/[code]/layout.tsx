import { PageFooter } from "@/app/components/PageFooter";
import { PageNav } from "@/app/components/PageNav";
import { SessionProvider } from "@/app/components/SessionProvider";
import { normalizeCode } from "@/lib/rooms";

// Next 16: params is a Promise — await before reading.
export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalizeCode(code);
  return (
    <SessionProvider code={normalized}>
      <div className="min-h-screen flex flex-col">
        <PageNav code={normalized} />
        <div className="flex-1 flex flex-col">{children}</div>
        <PageFooter code={normalized} />
      </div>
    </SessionProvider>
  );
}

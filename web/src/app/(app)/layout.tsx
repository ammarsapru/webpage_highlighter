import Link from "next/link";
import { requireSessionOrRedirect } from "@/lib/auth";
import NavLogoutButton from "@/components/NavLogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionOrRedirect();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            Highlight Vault
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="hover:underline">
              Documents
            </Link>
            <Link href="/upload" className="hover:underline">
              Upload PDF
            </Link>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
            <NavLogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}

import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface PageShellProps {
  children: ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
        <span className="text-lg font-semibold tracking-tight">CR Portal</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Log out
        </button>
      </header>

      {/* ── Page content ── */}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

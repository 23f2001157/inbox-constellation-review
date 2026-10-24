import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Gauge, Inbox, Moon, Network, Search, Send, Settings, Sun, WifiOff } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { loadSettings, setSettings, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Workspace", icon: Inbox },
  { to: "/compose", label: "Compose & Test", icon: Send },
  { to: "/benchmark", label: "Benchmark", icon: Gauge },
  { to: "/how-it-works", label: "How it works", icon: Network },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-primary-foreground shadow-glow">
        <FlaskConical className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="font-bold tracking-tight">InboxPilot</p>
        <p className="text-[11px] text-muted-foreground">5-agent email triage</p>
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const { theme } = useSettings();
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setSettings({ theme: theme === "dark" ? "light" : "dark" })}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { data: emails } = useQuery({ queryKey: ["emails"], queryFn: api.emails });
  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page or email…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Pages">
          {NAV.map((n) => (
            <CommandItem key={n.to} onSelect={() => go(() => navigate({ to: n.to }))}>
              <n.icon className="mr-2 h-4 w-4" /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Emails">
          {emails?.map((e) => (
            <CommandItem key={e.id} value={`${e.subject} ${e.sender}`} onSelect={() => go(() => navigate({ to: "/", search: { email: e.id } }))}>
              <Inbox className="mr-2 h-4 w-4" />
              <span className="truncate">{e.subject}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  useEffect(() => loadSettings(), []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", s.theme === "dark");
  }, [s.theme]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="bg-page min-h-screen">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 backdrop-blur-xl lg:flex">
          <Logo />
          <button onClick={() => setOpen(true)} className="mt-6 flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <Search className="h-4 w-4" /> Search <kbd className="ml-auto rounded bg-muted px-1.5 text-[10px]">⌘K</kbd>
          </button>
          <nav className="mt-4 space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true, includeSearch: false }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex items-center justify-between">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", s.useMock ? "bg-secondary" : "bg-success/15 text-success")}>
              {s.useMock ? "Mock data" : "Live backend"}
            </span>
            <ThemeToggle />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-sidebar px-3 py-2 backdrop-blur-xl lg:hidden">
            <Logo />
            <div className="ml-auto flex items-center">
              <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setOpen(true)}><Search className="h-4 w-4" /></Button>
              <ThemeToggle />
            </div>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true, includeSearch: false }} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground" activeProps={{ className: "bg-accent text-accent-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          {s.backendOffline && !s.useMock && (
            <div className="flex items-center gap-2 border-b border-cat-followup/40 bg-cat-followup/15 px-4 py-2 text-sm">
              <WifiOff className="h-4 w-4 text-cat-followup" /> Backend offline, using mock data.
              <button className="ml-auto text-xs font-medium underline" onClick={() => setSettings({ useMock: true, backendOffline: false })}>Switch to mock mode</button>
            </div>
          )}
          <main className="flex-1 p-3 sm:p-5">{children}</main>
          <footer className="px-5 py-4 text-center text-xs text-muted-foreground">Runs fully local, no data leaves your machine</footer>
        </div>
      </div>
      <CommandPalette open={open} setOpen={setOpen} />
    </div>
  );
}

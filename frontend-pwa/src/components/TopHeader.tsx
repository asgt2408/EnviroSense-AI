import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wifi, WifiOff, ChevronDown, LogOut, User as UserIcon, Shield, Download, CloudOff, Radio } from "lucide-react";
import { useSensorData, formatRelative } from "@/lib/resilience";
import { NotificationBell } from "@/components/NotificationBell";

/**
 * Global top status header. Shows:
 *  - Live Sync indicator (with delta-sync sweep) OR Historical Mode badge
 *  - Network connection (Online/Offline PWA state)
 *  - Notification opt-in bell
 *  - User profile dropdown (Admin / Viewer)
 */
export function TopHeader() {
  const { isLive, lastSyncTs } = useSensorData();
  // Tick once a second so the "Ns ago" relative timestamp stays fresh in the UI.
  const [, setNow] = useState(0);
  // Initialize to a static value to keep SSR & first client render identical;
  // sync with navigator.onLine inside useEffect after hydration.
  const [online, setOnline] = useState<boolean>(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [role, setRole] = useState<"Admin" | "Viewer">("Admin");
  const [installed, setInstalled] = useState(false);

  // Delta-sync sweep micro-interaction — toggled briefly each time the
  // resilience layer reports a fresh sync timestamp. Decoupled from the
  // 60s polling cadence so the animation can also re-fire on manual refresh.
  const [sweep, setSweep] = useState(false);
  const lastSeenSyncRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow((n) => (n + 1) % 1_000_000), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Trigger the sweep animation whenever a new successful sync lands.
  useEffect(() => {
    if (!isLive || !lastSyncTs) return;
    if (lastSeenSyncRef.current === lastSyncTs) return;
    lastSeenSyncRef.current = lastSyncTs;
    setSweep(true);
    const t = window.setTimeout(() => setSweep(false), 950);
    return () => window.clearTimeout(t);
  }, [isLive, lastSyncTs]);

  const relSync = formatRelative(lastSyncTs);

  return (
    <header className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 mb-4 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-md bg-background/60 border-b border-border">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Live sync / Historical mode */}
        {isLive ? (
          <div
            className="delta-sweep inline-flex items-center gap-2 rounded-full border border-clean/30 bg-clean/10 px-3 py-1.5 text-xs"
            data-sweep={sweep ? "on" : "off"}
            title={`Delta-sync · last fetch ${relSync}`}
          >
            <span className="delta-ring">
              <span className="live-dot block" />
            </span>
            <span className="text-clean font-medium">Live Sync</span>
            <span className="text-muted-foreground">· Δ {relSync}</span>
          </div>
        ) : (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-moderate/40 bg-moderate/10 px-3 py-1.5 text-xs"
            title="Backend unreachable — using cached snapshot"
          >
            <CloudOff className="h-3.5 w-3.5 text-moderate" />
            <span className="text-moderate font-medium">Historical Mode</span>
            <span className="text-muted-foreground hidden sm:inline">· Disconnected</span>
            <span className="text-muted-foreground">· last sync {relSync}</span>
          </div>
        )}

        {/* Hidden import to keep tree-shaker happy on the unused Radio icon */}
        <span className="hidden">
          <Radio className="h-3 w-3" />
        </span>


        {/* Network status */}
        <div
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs",
            online
              ? "border-cyan/30 bg-cyan/10 text-cyan"
              : "border-poor/40 bg-poor/10 text-poor",
          ].join(" ")}
          title={online ? "PWA online" : "PWA offline — using cached data"}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
        </div>

        {/* PWA */}
        <button
          type="button"
          onClick={() => setInstalled(true)}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-clean/40 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          {installed ? "PWA Ready" : "PWA Installable"}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-xs text-muted-foreground">
            Node: <span className="text-foreground">My Terrace-on-Room</span>
          </span>

          {/* Notification opt-in bell */}
          <NotificationBell />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel pl-1 pr-2.5 py-1 text-xs hover:border-clean/40 transition-colors"
            >
              <span className="grid place-items-center h-7 w-7 rounded-full bg-clean/15 text-clean">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline font-medium">{role}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 mt-2 w-56 panel p-2 z-20">
                  <div className="px-2 py-2 text-xs">
                    <div className="font-medium">operator@envirosense.ai</div>
                    <div className="text-muted-foreground">Signed in as {role}</div>
                  </div>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => {
                      setRole("Admin");
                      setProfileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary ${role === "Admin" ? "text-clean" : ""}`}
                  >
                    <Shield className="h-3.5 w-3.5" /> Admin role
                  </button>
                  <button
                    onClick={() => {
                      setRole("Viewer");
                      setProfileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary ${role === "Viewer" ? "text-clean" : ""}`}
                  >
                    <UserIcon className="h-3.5 w-3.5" /> Viewer role
                  </button>
                  <div className="my-1 border-t border-border" />
                  <Link
                    to="/login"
                    onClick={() => setProfileOpen(false)}
                    className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary text-poor"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

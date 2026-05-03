import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In · EnviroSense AI" },
      { name: "description", content: "Sign in to the EnviroSense AI environmental intelligence console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("operator@envirosense.ai");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  return (
    <div className="min-h-screen w-full grid place-items-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-[0.06] pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-clean/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="grid place-items-center h-14 w-14 rounded-2xl bg-clean/10 border border-clean/30 shadow-[0_0_32px_oklch(0.78_0.18_150_/_0.35)] overflow-hidden">
            <img
              src="/icon-512.png"
              alt="EnviroSense AI logo"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
          </div>
          <div className="mt-3 text-center leading-tight">
            <div className="font-semibold tracking-tight text-lg">EnviroSense AI</div>
            <div className="text-[11px] text-muted-foreground">Intelligence Console</div>
          </div>
        </div>

        <div className="panel panel-glow-clean p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Sign in to your console</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Edge-to-Cloud environmental intelligence. Authorised personnel only.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/";
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground" htmlFor="email">
                Email
              </label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-panel/60 pl-9 pr-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-clean/40 focus:border-clean/40"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground" htmlFor="password">
                Password
              </label>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-panel/60 pl-9 pr-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-clean/40 focus:border-clean/40"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <span
                  onClick={() => setRemember((v) => !v)}
                  className={`relative h-4 w-7 rounded-full border transition-colors ${remember ? "bg-clean/30 border-clean/50" : "bg-panel border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full transition-transform ${remember ? "left-0.5 translate-x-3 bg-clean" : "left-0.5 bg-muted-foreground"}`}
                  />
                </span>
                <span className="text-muted-foreground">Remember me</span>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only"
                />
              </label>
              <a className="text-clean hover:underline" href="#">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="group w-full inline-flex items-center justify-center gap-2 rounded-lg bg-clean text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-[0_0_24px_oklch(0.78_0.18_150_/_0.4)] hover:bg-clean/90 transition-colors"
            >
              Enter Console <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-[10px] leading-relaxed text-muted-foreground border-t border-border pt-4">
            EnviroSense AI Intelligence Layer is for advisory purposes only. Forecasts and anomaly classifications are
            illustrative and must not be used as a substitute for certified air-quality measurements.
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Need access? <Link to="/" className="text-clean hover:underline">Continue as guest</Link>
        </div>
      </div>
    </div>
  );
}

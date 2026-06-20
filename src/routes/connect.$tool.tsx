import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import Nango from "@nangohq/frontend";

export const Route = createFileRoute("/connect/$tool")({
  component: ConnectToolPage,
});

const BACKEND = "https://b00dee1a-faf6-4ce1-acba-96e99e4523cb-00-2lowjfdxf78br.spock.replit.dev";

type FieldConfig = { key: string; label: string; placeholder: string; type?: string };

const TOOL_FIELDS: Record<string, FieldConfig[]> = {
  Notion: [
    { key: "integration_token", label: "Integration Token", placeholder: "secret_xxxx..." },
    { key: "page_or_database_id", label: "Page or Database ID", placeholder: "Paste your Notion page or database ID" },
  ],
};

function getUserId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "company_brain_user_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

function ConnectToolPage() {
  const { tool } = Route.useParams();
  const navigate = useNavigate();
  const fields = useMemo(() => TOOL_FIELDS[tool] ?? [], [tool]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const user_id = getUserId();
      const res = await fetch(`${BACKEND}/api/nango/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, tool, ...values }),
      });
      if (!res.ok) throw new Error("session failed");
      const data = await res.json();
      const token = data.connectSessionToken ?? data.token ?? data.sessionToken;
      if (!token) throw new Error("missing token");

      const nango = new Nango({ connectSessionToken: token });
      nango.openConnectUI({
        onEvent: (event: { type: string; payload?: { connectionId?: string } }) => {
          if (event.type === "connect") {
            const connection_id = event.payload?.connectionId ?? "";
            fetch(`${BACKEND}/api/connect`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id, tool, connection_id }),
            }).catch(() => {});
            setConnected(true);
            setLoading(false);
          } else if (event.type === "close") {
            setLoading(false);
          }
        },
      });
    } catch {
      setError("Connection failed. Please try again.");
      setLoading(false);
    }
  };

  const monogram = tool.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex flex-col">
      <header className="h-12 flex items-center px-4 border-b border-neutral-200 bg-white">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-5">
          {!connected ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md bg-neutral-900 text-white flex items-center justify-center text-sm font-semibold">
                  {monogram}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold">{tool}</div>
                  <div className="text-[11px] text-neutral-500">Nango OAuth integration</div>
                </div>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Connect your {tool} account to let Marketing Brain pull context from it.
              </p>

              {fields.length > 0 && (
                <div className="space-y-3">
                  {fields.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[11px] font-medium text-neutral-700">{f.label}</label>
                      <input
                        type={f.type ?? "text"}
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Connect {tool}
              </button>

              {error && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={handleConnect}
                    className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs font-medium hover:bg-neutral-50"
                  >
                    Retry
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <div className="text-base font-semibold">{tool} connected successfully</div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  Marketing Brain can now pull context from {tool}.
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => navigate({ to: "/" })}
                  className="w-full px-3 py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700"
                >
                  Go to Home
                </button>
                <button
                  onClick={() => navigate({ to: "/", search: { panel: "link" } as never })}
                  className="w-full px-3 py-2.5 rounded-md border border-neutral-200 bg-white text-sm font-medium hover:bg-neutral-50"
                >
                  Connect Another Tool
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
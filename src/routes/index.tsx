import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Briefcase, MessageSquare, Link2, FileEdit, Calendar, LayoutGrid, User,
  X, Send, Paperclip, Plus, MoreHorizontal, ArrowLeft, AtSign, FileText, Copy, Share2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marketing Brain" },
      { name: "description", content: "AI workspace for marketing teams." },
      { property: "og:title", content: "Marketing Brain" },
      { property: "og:description", content: "AI workspace for marketing teams." },
    ],
  }),
  component: Index,
});

type RailKey = "work" | "chat" | "link" | "drafts" | "calendar" | "apps" | "profile";
type WorkTab = "files" | "people" | "tools";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

function Index() {
  const [active, setActive] = useState<RailKey>("work");
  const [workTab, setWorkTab] = useState<WorkTab>("files");
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-900 grid grid-cols-[60px_1fr] md:grid-cols-[75px_320px_1fr]">
      <Rail active={active} onChange={setActive} />
      <ContextColumn active={active} workTab={workTab} setWorkTab={setWorkTab} />
      <main className="hidden md:flex min-w-0 border-l border-neutral-200 bg-white">
        <Canvas active={active} />
      </main>

      {isMobile && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-neutral-900 text-white shadow-lg flex items-center justify-center hover:bg-neutral-700"
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {isMobile && chatOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 h-12">
            <span className="text-sm font-medium">Chat</span>
            <button onClick={() => setChatOpen(false)} aria-label="Close chat" className="p-1 rounded hover:bg-neutral-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <Canvas active={active} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Column 1: Rail ---------------- */
function Rail({ active, onChange }: { active: RailKey; onChange: (k: RailKey) => void }) {
  const top: { key: RailKey; icon: typeof Briefcase; label: string }[] = [
    { key: "work", icon: Briefcase, label: "Work" },
    { key: "chat", icon: MessageSquare, label: "Chat" },
    { key: "link", icon: Link2, label: "Link" },
  ];
  const bottom: { key: RailKey; icon: typeof Briefcase; label: string }[] = [
    { key: "drafts", icon: FileEdit, label: "Drafts" },
    { key: "calendar", icon: Calendar, label: "Calendar" },
    { key: "apps", icon: LayoutGrid, label: "Apps" },
    { key: "profile", icon: User, label: "Profile" },
  ];
  return (
    <nav className="flex flex-col items-center justify-between bg-neutral-100 border-r border-neutral-200 py-3 overflow-y-auto">
      <div className="flex flex-col items-center gap-1">
        <div className="mb-3 h-8 w-8 rounded-md bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">M</div>
        {top.map((i) => <RailBtn key={i.key} item={i} active={active === i.key} onClick={() => onChange(i.key)} />)}
      </div>
      <div className="flex flex-col items-center gap-1">
        {bottom.map((i) => <RailBtn key={i.key} item={i} active={active === i.key} onClick={() => onChange(i.key)} />)}
      </div>
    </nav>
  );
}

function RailBtn({
  item, active, onClick,
}: { item: { icon: typeof Briefcase; label: string }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-lg transition-colors ${
        active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200"
      }`}
      title={item.label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[9px] leading-none">{item.label}</span>
    </button>
  );
}

/* ---------------- Column 2: Context Directory ---------------- */
function ContextColumn({
  active, workTab, setWorkTab,
}: { active: RailKey; workTab: WorkTab; setWorkTab: (t: WorkTab) => void }) {
  return (
    <aside className="flex flex-col min-w-0 bg-white border-r border-neutral-200 overflow-hidden">
      <div className="h-12 flex items-center justify-between px-4 border-b border-neutral-200">
        <h2 className="text-sm font-semibold capitalize">{active}</h2>
        <button className="p-1 rounded hover:bg-neutral-100"><Plus className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {active === "work" && <WorkPanel tab={workTab} setTab={setWorkTab} />}
        {active === "chat" && <ChatListPanel />}
        {active === "link" && <LinkPanel />}
        {active === "drafts" && <SimpleList title="Drafts" items={["Q4 Campaign Brief", "Product Launch Memo", "Newsletter Draft"]} />}
        {active === "calendar" && <SimpleList title="Upcoming" items={["Standup — 9:00", "Brand Review — 11:30", "1:1 with Alex — 14:00"]} />}
        {active === "apps" && <LinkPanel />}
        {active === "profile" && <SimpleList title="Account" items={["Profile", "Preferences", "Notifications", "Sign out"]} />}
      </div>
    </aside>
  );
}

function WorkPanel({ tab, setTab }: { tab: WorkTab; setTab: (t: WorkTab) => void }) {
  const tabs: WorkTab[] = ["files", "people", "tools"];
  const [selectedFile, setSelectedFile] = useState<null | { name: string; date: string }>(null);
  const files = [
    { name: "Brand_Guide.pdf", date: "Mar 12, 2026" },
    { name: "Q4_Strategy.docx", date: "May 28, 2026" },
    { name: "Audience_Research.xlsx", date: "May 30, 2026" },
  ];
  const people = [
    { name: "Jason M.", role: "Head of Q3 Launch" },
    { name: "Alex Reed", role: "Brand Lead" },
    { name: "Jordan Kim", role: "Content Strategist" },
    { name: "Sam Patel", role: "Performance Marketing" },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex gap-1 border-b border-neutral-200 px-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedFile(null); }}
            className={`px-3 py-2 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >{t}</button>
        ))}
      </div>
      <div className="p-3">
        {tab === "files" && !selectedFile && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Metric n="12" label="Files" />
              <Metric n="4" label="Sources" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">Suggested Actions</p>
              <div className="flex flex-col gap-1.5">
                {["Summarize brand guide", "Draft a launch email", "Generate campaign ideas"].map((s) => (
                  <button key={s} className="text-left text-xs px-3 py-2 rounded-md border border-neutral-200 hover:bg-neutral-50">{s}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1 px-1">Ingested Files</p>
              {files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFile(f)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50 text-left"
                >
                  <div className="h-7 w-7 shrink-0 rounded bg-neutral-200 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-neutral-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-neutral-500 truncate">Uploaded {f.date}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === "files" && selectedFile && (
          <div className="space-y-3">
            <button
              onClick={() => setSelectedFile(null)}
              className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="rounded-md border border-neutral-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded bg-neutral-200 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-neutral-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{selectedFile.name}</div>
                  <div className="text-[10px] text-neutral-500">Uploaded {selectedFile.date}</div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500 px-1">Details</p>
              <DetailRow k="Type" v={selectedFile.name.split(".").pop()?.toUpperCase() ?? ""} />
              <DetailRow k="Uploaded" v={selectedFile.date} />
              <DetailRow k="Owner" v="Jason M." />
              <DetailRow k="Status" v="Indexed" />
            </div>
          </div>
        )}
        {tab === "people" && (
          <div className="space-y-1">
            {people.map((p) => (
              <div key={p.name} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50">
                <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-200" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{p.role}</div>
                </div>
                <button
                  title="Tag into workflow"
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <AtSign className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === "tools" && (
          <div className="space-y-1">
            {["Notion", "Google Drive", "Slack", "Figma", "HubSpot"].map((t) => (
              <Row key={t} title={t} sub="Connected" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 text-xs">
      <span className="text-neutral-500">{k}</span>
      <span className="text-neutral-900 font-medium">{v}</span>
    </div>
  );
}

function ChatListPanel() {
  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1 px-1">Channels</p>
        {["#marketing", "#brand", "#campaigns", "#general"].map((c) => (
          <Row key={c} title={c} sub="" />
        ))}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1 px-1">Direct Messages</p>
        {["Alex Reed", "Jordan Kim", "Sam Patel"].map((c) => (
          <Row key={c} title={c} sub="Active" avatar />
        ))}
      </div>
    </div>
  );
}

function LinkPanel() {
  const apps = ["Notion", "Drive", "Docs", "Sheets", "Slack", "Gmail", "Zoom", "Figma"];
  return (
    <div className="p-3">
      <div className="grid grid-cols-3 gap-2">
        {apps.map((a) => (
          <button key={a} className="aspect-square rounded-md border border-neutral-200 hover:bg-neutral-50 flex flex-col items-center justify-center gap-1">
            <div className="h-7 w-7 rounded bg-neutral-200" />
            <span className="text-[10px] text-neutral-700">{a}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="text-xl font-semibold">{n}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}

function Row({ title, sub, avatar }: { title: string; sub?: string; avatar?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50 cursor-pointer">
      <div className={`h-7 w-7 shrink-0 ${avatar ? "rounded-full" : "rounded"} bg-neutral-200`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{title}</div>
        {sub && <div className="text-[10px] text-neutral-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function SimpleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-3">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">{title}</p>
      {items.map((i) => <Row key={i} title={i} />)}
    </div>
  );
}

/* ---------------- Column 3: Canvas ---------------- */
function Canvas({ active }: { active: RailKey }) {
  return (
    <section className="flex flex-col flex-1 min-w-0 h-full">
      <header className="h-12 flex items-center justify-between px-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-neutral-200" />
          <div>
            <div className="text-xs font-semibold">Execution Canvas</div>
            <div className="text-[10px] text-neutral-500 capitalize">{active} workspace</div>
          </div>
        </div>
        <button className="p-1 rounded hover:bg-neutral-100"><MoreHorizontal className="h-4 w-4" /></button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <div className="text-xs text-neutral-500">
          Generated from <span className="font-medium text-neutral-800">Brand_Guide.pdf</span> + <span className="font-medium text-neutral-800">Q4_Strategy.docx</span>
        </div>
        <OutputBlock />
      </div>

      <div className="border-t border-neutral-200 p-3">
        <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
          <button className="p-1 text-neutral-500 hover:text-neutral-800"><Paperclip className="h-4 w-4" /></button>
          <input
            placeholder="Describe an output to generate…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400"
          />
          <button className="p-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-700"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

function OutputBlock() {
  const collaborators = [
    { initials: "JM", tone: "bg-neutral-800" },
    { initials: "AR", tone: "bg-neutral-600" },
    { initials: "JK", tone: "bg-neutral-400" },
  ];
  return (
    <article className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden max-w-3xl">
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-neutral-200">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Output Block · Email Campaign</div>
          <h3 className="text-sm font-semibold truncate">Q3 Email Campaign</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-600"><Copy className="h-3.5 w-3.5" /></button>
          <button className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-600"><Share2 className="h-3.5 w-3.5" /></button>
          <button className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-600"><MoreHorizontal className="h-3.5 w-3.5" /></button>
        </div>
      </header>
      <div className="px-4 py-3 space-y-3 text-sm text-neutral-800">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Subject Line</div>
          <p className="font-medium">Your Q3 starts here — three moves to ship this quarter.</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Body Preview</div>
          <p className="text-neutral-700 leading-relaxed">
            Hi {"{first_name}"}, we lined up the Q3 launch around three pillars from your brand guide: tone,
            audience, and proof. Here's the recommended cadence and the first send copy, ready to review.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Metric n="3" label="Sends" />
          <Metric n="12.4k" label="Audience" />
          <Metric n="A/B" label="Variant" />
        </div>
      </div>
      <footer className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {collaborators.map((c) => (
              <div
                key={c.initials}
                className={`h-6 w-6 rounded-full ring-2 ring-neutral-50 ${c.tone} text-white text-[9px] font-semibold flex items-center justify-center`}
                title={c.initials}
              >
                {c.initials}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-neutral-500">3 collaborators · edited 4m ago</span>
        </div>
        <button className="text-[11px] font-medium text-neutral-700 hover:text-neutral-900">Open</button>
      </footer>
    </article>
  );
}

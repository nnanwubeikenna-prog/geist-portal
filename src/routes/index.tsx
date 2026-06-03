import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Briefcase, MessageSquare, Link2, FileEdit, Calendar, LayoutGrid, User,
  X, Send, Paperclip, Plus, MoreHorizontal, ArrowLeft, AtSign, FileText, Copy, Share2,
  Upload, Trash2,
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

  const jumpToCanvas = () => {
    setActive("work");
    setWorkTab("files");
    if (isMobile) setChatOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-900 grid grid-cols-[60px_1fr] md:grid-cols-[75px_320px_1fr]">
      <Rail active={active} onChange={setActive} />
      <ContextColumn active={active} workTab={workTab} setWorkTab={setWorkTab} onJumpToCanvas={jumpToCanvas} />
      <main className="hidden md:flex min-w-0 border-l border-neutral-200 bg-white">
        <Canvas active={active} />
      </main>

      {isMobile && !chatOpen && active === "work" && (
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
  active, workTab, setWorkTab, onJumpToCanvas,
}: { active: RailKey; workTab: WorkTab; setWorkTab: (t: WorkTab) => void; onJumpToCanvas: () => void }) {
  return (
    <aside className="flex flex-col min-w-0 bg-white border-r border-neutral-200 overflow-hidden">
      <div className="h-12 flex items-center justify-between px-4 border-b border-neutral-200">
        <h2 className="text-sm font-semibold capitalize">{active}</h2>
        <button className="p-1 rounded hover:bg-neutral-100"><Plus className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {active === "work" && <WorkPanel tab={workTab} setTab={setWorkTab} />}
        {active === "chat" && <ChatListPanel onJumpToCanvas={onJumpToCanvas} />}
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
  const [fileView, setFileView] = useState<"dashboard" | "manager">("dashboard");
  const [selectedPerson, setSelectedPerson] = useState<null | { name: string; role: string; initials: string }>(null);
  const [files, setFiles] = useState([
    { name: "Brand_Guide.pdf", date: "Mar 12, 2026" },
    { name: "Q4_Strategy.docx", date: "May 28, 2026" },
    { name: "Audience_Research.xlsx", date: "May 30, 2026" },
  ]);
  const people = [
    { name: "Jason M.", role: "Head of Q3 Launch", initials: "JM" },
    { name: "Alex Reed", role: "Brand Lead", initials: "AR" },
    { name: "Jordan Kim", role: "Content Strategist", initials: "JK" },
    { name: "Sam Patel", role: "Performance Marketing", initials: "SP" },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex gap-1 border-b border-neutral-200 px-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setFileView("dashboard"); setSelectedPerson(null); }}
            className={`px-3 py-2 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >{t}</button>
        ))}
      </div>
      <div className="p-3">
        {tab === "files" && fileView === "dashboard" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setFileView("manager")} className="text-left">
                <Metric n="12" label="Files" interactive />
              </button>
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
          </div>
        )}
        {tab === "files" && fileView === "manager" && (
          <div className="space-y-3">
            <button
              onClick={() => setFileView("dashboard")}
              className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">File Manager</h3>
              <span className="text-[10px] text-neutral-500">{files.length} files</span>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700">
              <Upload className="h-3.5 w-3.5" /> Upload New File
            </button>
            <div className="space-y-1">
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50">
                  <div className="h-7 w-7 shrink-0 rounded bg-neutral-200 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-neutral-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-neutral-500 truncate">Uploaded {f.date}</div>
                  </div>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                    title="Delete"
                    className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "people" && !selectedPerson && (
          <div className="space-y-1">
            {people.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelectedPerson(p)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50 text-left"
              >
                <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-semibold text-neutral-700">{p.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{p.role}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {tab === "people" && selectedPerson && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedPerson(null)}
              className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="flex flex-col items-center text-center gap-2 pt-2">
              <div className="h-20 w-20 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-semibold text-neutral-700">
                {selectedPerson.initials}
              </div>
              <div>
                <div className="text-sm font-semibold">{selectedPerson.name}</div>
                <div className="text-[11px] text-neutral-500">{selectedPerson.role}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Marketing Brain · Acme Co.</div>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700">
              <AtSign className="h-3.5 w-3.5" /> Tag in Canvas
            </button>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500 px-1">Details</p>
              <DetailRow k="Role" v={selectedPerson.role} />
              <DetailRow k="Status" v="Active" />
              <DetailRow k="Timezone" v="PT" />
            </div>
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

function ChatListPanel({ onJumpToCanvas }: { onJumpToCanvas: () => void }) {
  const [openDM, setOpenDM] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Record<string, { from: "me" | "them"; text: string }[]>>({});
  const [dmInput, setDmInput] = useState("");
  const dms = [
    { name: "Jason M.", initials: "JM", unread: 1 },
    { name: "Alex Reed", initials: "AR", unread: 0 },
    { name: "Jordan Kim", initials: "JK", unread: 0 },
    { name: "Sam Patel", initials: "SP", unread: 0 },
  ];

  if (openDM) {
    const person = dms.find((d) => d.name === openDM)!;
    const myMsgs = dmMessages[openDM] ?? [];
    const sendDM = () => {
      const t = dmInput.trim();
      if (!t) return;
      setDmMessages((prev) => ({
        ...prev,
        [openDM]: [...(prev[openDM] ?? []), { from: "me", text: t }],
      }));
      setDmInput("");
    };
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200">
          <button
            onClick={() => setOpenDM(null)}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="ml-2 flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-neutral-800 text-white text-[9px] font-semibold flex items-center justify-center">
              {person.initials}
            </div>
            <span className="text-xs font-semibold truncate">{person.name}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          <DMBubble initials={person.initials}>Hey — got a sec to look at the Q3 outline?</DMBubble>
          <DMBubble initials={person.initials}>I dropped the latest pass into the canvas.</DMBubble>
          <div className="flex gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-800 text-white text-[10px] font-semibold flex items-center justify-center">
              {person.initials}
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-3 max-w-[85%] space-y-2">
              <p className="text-xs text-neutral-800 leading-snug">
                I just tagged you in this workflow:{" "}
                <span className="font-medium">[Q3 Campaign Outline]</span>
              </p>
              <button
                onClick={onJumpToCanvas}
                className="w-full px-3 py-1.5 rounded-md bg-neutral-900 text-white text-[11px] font-medium hover:bg-neutral-700"
              >
                View in Canvas
              </button>
            </div>
          </div>
          {myMsgs.map((m, i) => (
            <div key={i} className="flex justify-end">
              <div className="rounded-md bg-neutral-900 text-white px-3 py-2 max-w-[85%] text-xs leading-snug">
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-200 p-2">
          <div className="flex items-end gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1.5">
            <button className="p-1 text-neutral-500 hover:text-neutral-800" aria-label="Attach">
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendDM();
                }
              }}
              rows={1}
              placeholder={`Message ${person.name}…`}
              className="flex-1 resize-none bg-transparent outline-none text-sm placeholder:text-neutral-400 max-h-24 py-1"
            />
            <button
              onClick={sendDM}
              className="px-2.5 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 flex items-center gap-1"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {dms.map((d) => (
          <button
            key={d.name}
            onClick={() => setOpenDM(d.name)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50 text-left"
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-semibold text-neutral-700">
              {d.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{d.name}</div>
              <div className="text-[10px] text-neutral-500 truncate">Active</div>
            </div>
            {d.unread > 0 && (
              <span className="shrink-0 text-[10px] font-semibold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                Unread ({d.unread})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function DMBubble({ initials, children }: { initials: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-800 text-white text-[10px] font-semibold flex items-center justify-center">
        {initials}
      </div>
      <div className="rounded-md bg-neutral-100 px-3 py-2 max-w-[85%] text-xs text-neutral-800 leading-snug">
        {children}
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

function Metric({ n, label, interactive }: { n: string; label: string; interactive?: boolean }) {
  return (
    <div className={`rounded-md border border-neutral-200 p-3 ${interactive ? "hover:bg-neutral-50 transition-colors" : ""}`}>
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
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((prev) => [...prev, t]);
    setInput("");
  };
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
        {messages.map((m, i) => (
          <div key={i} className="max-w-3xl flex justify-end">
            <div className="rounded-md bg-neutral-900 text-white px-3 py-2 text-sm max-w-[85%] leading-snug">
              {m}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-200 p-3">
        <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
          <button className="p-1 text-neutral-500 hover:text-neutral-800"><Paperclip className="h-4 w-4" /></button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Describe an output to generate…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400"
          />
          <button
            onClick={send}
            className="px-2.5 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 flex items-center gap-1"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
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

import React, { useState } from "react";
import { Database, FileText, GitBranch, Search, Layers, Loader2, ArrowRight } from "lucide-react";

const DEFAULTS = {
  postgresql: { host: "localhost", port: 5432 },
  sqlserver:  { host: "localhost", port: 1433 },
};

const FEATURES = [
  { icon: <Layers size={16} />,    label: "Tables & Columns",  desc: "Every column, type, constraint, and default" },
  { icon: <GitBranch size={16} />, label: "Foreign Keys",      desc: "Relationships mapped across your schema" },
  { icon: <Search size={16} />,    label: "Indexes",           desc: "All indexes with uniqueness and coverage" },
  { icon: <FileText size={16} />,  label: "Views",             desc: "View definitions in one place" },
];

export default function ConnectionForm({ onResult }) {
  const [form, setForm] = useState({
    db_type: "postgresql", host: "localhost", port: 5432,
    database: "", username: "", password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function switchDb(type) {
    setForm(f => ({ ...f, db_type: type, ...DEFAULTS[type] }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/schema/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Connection failed");
      onResult(data, form.db_type);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inp = `w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100
    focus:outline-none focus:border-blue-500 transition placeholder-gray-700`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Database size={14} color="white" />
            </div>
            <span className="text-sm font-bold text-white">DB Documenter</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            PostgreSQL · SQL Server
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 grid lg:grid-cols-2 gap-20 items-center min-h-screen">

        {/* Left — hero */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-950/50 border border-blue-800/40 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span className="text-xs text-blue-300 font-medium">Self-hosted · No data leaves your machine</span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight mb-4">
            Auto-document<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              any database
            </span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed mb-10">
            Connect to your PostgreSQL or SQL Server database and instantly generate
            clean, browseable documentation — tables, columns, indexes, foreign keys, and views.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-3 bg-gray-900/40 border border-gray-800/60 rounded-xl p-4">
                <div className="w-7 h-7 rounded-lg bg-blue-900/40 border border-blue-800/40 text-blue-400 flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{f.label}</p>
                  <p className="text-xs text-gray-500 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — connection form */}
        <div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
            <h2 className="text-lg font-bold text-white mb-1">Connect your database</h2>
            <p className="text-xs text-gray-500 mb-6">Your credentials are used only for this session and never stored.</p>

            <form onSubmit={submit} className="space-y-4">
              {/* DB type */}
              <div className="flex rounded-xl overflow-hidden border border-gray-800 p-1 gap-1 bg-gray-950">
                {["postgresql", "sqlserver"].map(t => (
                  <button key={t} type="button" onClick={() => switchDb(t)}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition ${
                      form.db_type === t
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-500 hover:text-gray-300"
                    }`}>
                    {t === "postgresql" ? "PostgreSQL" : "SQL Server"}
                  </button>
                ))}
              </div>

              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">Host</label>
                  <input className={inp} value={form.host}
                    onChange={e => set("host", e.target.value)} placeholder="localhost" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Port</label>
                  <input className={inp} type="number" value={form.port}
                    onChange={e => set("port", e.target.value)} required />
                </div>
              </div>

              {/* Database */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Database name</label>
                <input className={inp} value={form.database}
                  onChange={e => set("database", e.target.value)} placeholder="my_database" required />
              </div>

              {/* User + Pass */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Username</label>
                  <input className={inp} value={form.username}
                    onChange={e => set("username", e.target.value)} placeholder="postgres" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Password</label>
                  <input className={inp} type="password" value={form.password}
                    onChange={e => set("password", e.target.value)} placeholder="••••••••" />
                </div>
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                  text-white font-bold rounded-xl text-sm transition
                  flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Scanning schema…</>
                  : <><span>Generate Documentation</span><ArrowRight size={15} /></>
                }
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

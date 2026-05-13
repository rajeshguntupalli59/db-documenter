import React, { useState, useEffect } from "react";
import { Database, Search, ChevronRight, Download, ArrowLeft, Eye } from "lucide-react";
import ConnectionForm from "./components/ConnectionForm";
import TableDetail from "./components/TableDetail";
import Activate from "./components/Activate";

export default function App() {
  const [licensed, setLicensed] = useState(null); // null=loading, true/false
  const [schema,   setSchema]   = useState(null);
  const [dbType,   setDbType]   = useState("");
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");
  const [view,     setView]     = useState("tables"); // "tables" | "views"

  useEffect(() => {
    fetch("/api/license")
      .then(r => r.json())
      .then(d => setLicensed(d.activated))
      .catch(() => setLicensed(false));
  }, []);

  if (licensed === null) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#030712" }}>
      <div style={{ width:28, height:28, border:"3px solid #1d4ed8", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!licensed) return <Activate onActivated={() => setLicensed(true)} />;

  function handleResult(data, type) {
    setSchema(data);
    setDbType(type);
    setSelected(data.tables[0] || null);
    setSearch("");
    setView("tables");
  }

  function reset() {
    setSchema(null);
    setSelected(null);
  }

  function exportPDF() {
    window.print();
  }

  if (!schema) return <ConnectionForm onResult={handleResult} />;

  const dbLabel   = dbType === "postgresql" ? "PostgreSQL" : "SQL Server";
  const filtered  = view === "tables"
    ? schema.tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : schema.views.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top bar */}
      <header style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 20px", height: "52px", borderBottom: "1px solid #1f2937",
        background: "#030712", flexShrink: 0,
      }}>
        <button onClick={reset} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", color: "#6b7280",
          cursor: "pointer", fontSize: "13px", padding: "6px 8px", borderRadius: "8px",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#f9fafb"}
          onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Database size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{schema.database}</span>
          <span style={{
            padding: "2px 8px", borderRadius: "99px", fontSize: "11px",
            background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8",
          }}>{dbLabel}</span>
        </div>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            ["Tables", schema.summary.table_count],
            ["Views",  schema.summary.view_count],
            ["Columns", schema.summary.column_count],
            ["Indexes", schema.summary.index_count],
            ["FKs",    schema.summary.fk_count],
          ].map(([label, val]) => (
            <span key={label} style={{ fontSize: "11px", color: "#9ca3af" }}>
              <span style={{ color: "#f9fafb", fontWeight: 600 }}>{val}</span> {label}
            </span>
          ))}
        </div>

        <button onClick={exportPDF} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 14px", background: "#1f2937", border: "1px solid #374151",
          borderRadius: "10px", color: "#d1d5db", fontSize: "12px",
          fontWeight: 600, cursor: "pointer",
        }}>
          <Download size={13} /> Export PDF
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{
          width: "240px", borderRight: "1px solid #1f2937",
          background: "#060c18", display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          {/* Search */}
          <div style={{ padding: "12px", borderBottom: "1px solid #1f2937" }}>
            <div style={{ position: "relative" }}>
              <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width: "100%", background: "#111827", border: "1px solid #1f2937",
                  borderRadius: "10px", padding: "7px 10px 7px 28px",
                  fontSize: "12px", color: "#f9fafb", outline: "none",
                }}
              />
            </div>
          </div>

          {/* Tab */}
          <div style={{ display: "flex", padding: "8px", gap: "4px", borderBottom: "1px solid #1f2937" }}>
            {["tables", "views"].map(t => (
              <button key={t} onClick={() => { setView(t); setSelected(null); }} style={{
                flex: 1, padding: "5px", borderRadius: "8px", fontSize: "11px",
                fontWeight: 600, border: "none", cursor: "pointer",
                background: view === t ? "#1e3a5f" : "transparent",
                color: view === t ? "#93c5fd" : "#6b7280",
              }}>
                {t === "tables" ? `Tables (${schema.summary.table_count})` : `Views (${schema.summary.view_count})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
            {filtered.map(item => {
              const isActive = selected?.name === item.name && selected?.schema === item.schema;
              return (
                <button key={`${item.schema}.${item.name}`}
                  onClick={() => setSelected(item)}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 10px",
                    borderRadius: "10px", border: "none", cursor: "pointer",
                    background: isActive ? "#1e3a5f" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: "2px",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#111827"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#93c5fd" : "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: "10px", color: "#4b5563", marginTop: "1px" }}>{item.schema}</p>
                  </div>
                  {view === "tables" && <span style={{ fontSize: "10px", color: "#4b5563", flexShrink: 0 }}>{item.columns?.length}c</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ fontSize: "12px", color: "#4b5563", textAlign: "center", padding: "24px 0" }}>No results</p>
            )}
          </div>
        </aside>

        {/* Main content */}
        {view === "tables"
          ? <TableDetail table={selected} />
          : selected
            ? (
              <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
                <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{selected.schema}</p>
                <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "16px" }}>{selected.name}</h2>
                <pre style={{
                  background: "#111827", border: "1px solid #1f2937", borderRadius: "12px",
                  padding: "20px", fontSize: "12px", color: "#9ca3af",
                  overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: "1.6",
                }}>{selected.definition}</pre>
              </div>
            )
            : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: "13px" }}>
                Select a view to see its definition
              </div>
            )
        }
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, aside { display: none !important; }
          body { background: white; color: black; }
        }
      `}</style>
    </div>
  );
}

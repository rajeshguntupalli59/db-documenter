import React from "react";
import { Key, Link, Hash, ArrowUpRight } from "lucide-react";

function Badge({ children, color = "gray" }) {
  const c = {
    blue:   "bg-blue-900/40 border-blue-800/40 text-blue-300",
    green:  "bg-green-900/40 border-green-800/40 text-green-300",
    yellow: "bg-yellow-900/40 border-yellow-800/40 text-yellow-300",
    gray:   "bg-gray-800/60 border-gray-700/40 text-gray-400",
  }[color];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${c}`}>{children}</span>;
}

export default function TableDetail({ table }) {
  if (!table) return (
    <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
      Select a table to view its documentation
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Table header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-xs text-gray-500 mb-1">{table.schema}</p>
            <h2 className="text-2xl font-bold text-white">{table.name}</h2>
          </div>
          <div className="flex gap-2 shrink-0 mt-1">
            <Badge color="gray">{table.columns.length} columns</Badge>
            <Badge color="gray">{Number(table.row_estimate).toLocaleString()} rows</Badge>
          </div>
        </div>
        {table.description && <p className="text-sm text-gray-400 mt-2">{table.description}</p>}
      </div>

      {/* Columns */}
      <section className="mb-10">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Columns</h3>
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Nullable</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Default</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col, i) => (
                <tr key={col.name} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-900/20"}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-100 flex items-center gap-2">
                    {col.primary_key && <Key size={11} className="text-yellow-400 shrink-0" />}
                    {col.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-300">{col.type}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{col.nullable ? "YES" : <span className="text-gray-200 font-medium">NO</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{col.default || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{col.description || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Indexes */}
      {table.indexes.length > 0 && (
        <section className="mb-10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Indexes</h3>
          <div className="flex flex-col gap-2">
            {table.indexes.map(idx => (
              <div key={idx.name} className="flex items-center gap-3 bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-3">
                <Hash size={13} className="text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-gray-200">{idx.name}</span>
                  <span className="text-gray-600 mx-2 text-xs">on</span>
                  <span className="font-mono text-xs text-blue-300">{idx.columns}</span>
                </div>
                <div className="flex gap-1.5">
                  {idx.primary && <Badge color="yellow">PRIMARY</Badge>}
                  {idx.unique && !idx.primary && <Badge color="green">UNIQUE</Badge>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Foreign keys */}
      {table.foreign_keys.length > 0 && (
        <section className="mb-10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Foreign Keys</h3>
          <div className="flex flex-col gap-2">
            {table.foreign_keys.map((fk, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-3">
                <Link size={13} className="text-gray-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-mono text-gray-200">{fk.column}</span>
                  <span className="text-gray-600 mx-2">→</span>
                  <span className="font-mono text-blue-300">{fk.ref_schema}.{fk.ref_table}({fk.ref_column})</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

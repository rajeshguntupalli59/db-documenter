import React, { useState } from "react";
import { Database, KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function Activate({ onActivated }) {
  const [key, setKey]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.activated) {
        onActivated();
      } else {
        setError(data.error || "Activation failed. Please check your key.");
      }
    } catch {
      setError("Could not reach the activation server. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Database size={20} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">DB Documenter</h1>
            <p className="text-xs text-gray-500">License Activation</p>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <KeyRound size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">Enter your license key</h2>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Your license key was emailed to you after purchase.
            Enter it below to activate DB Documenter on this machine.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <input
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-gray-100
                focus:outline-none focus:border-blue-500 transition tracking-widest placeholder-gray-700"
              required
            />

            {error && (
              <div className="bg-red-950/50 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Activating…</>
                : <><ShieldCheck size={15} /> Activate License</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-5">
            Don't have a license?{" "}
            <a href="https://rajeshguntupalli59.github.io/website/products.html"
               target="_blank" rel="noreferrer"
               className="text-blue-400 hover:text-blue-300 transition">
              Purchase here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

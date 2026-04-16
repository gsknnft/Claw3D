"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";

type ProviderId = "OPENAI" | "ANTHROPIC";

export function ManagedByokStep({
  onReadyChange,
}: {
  onReadyChange: (ready: boolean) => void;
}) {
  const [provider, setProvider] = useState<ProviderId>("OPENAI");
  const [value, setValue] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<ProviderId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/managed/byok", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load BYOK status.");
        }
        if (cancelled) return;
        const nextProviders = Array.isArray(result.configuredProviders)
          ? (result.configuredProviders.filter(
              (entry: unknown): entry is ProviderId =>
                entry === "OPENAI" || entry === "ANTHROPIC",
            ) as ProviderId[])
          : [];
        setConfiguredProviders(nextProviders);
        onReadyChange(nextProviders.length > 0);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load BYOK status.");
          onReadyChange(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [onReadyChange]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/managed/byok", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          value: value.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save BYOK credentials.");
      }

      setConfiguredProviders((current) =>
        current.includes(provider) ? current : [...current, provider],
      );
      setValue("");
      setMessage(
        "Provider key saved. The managed workspace may restart briefly while the new secret is applied.",
      );
      onReadyChange(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save BYOK credentials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <KeyRound className="h-5 w-5 text-amber-300" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Bring your own model key</p>
            <p className="text-xs leading-5 text-white/60">
              Managed Claw3D runs the runtime for the user, but model providers still need your
              API key. Save one provider key here to continue into company generation.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking provider key status.
        </div>
      ) : configuredProviders.length > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          Provider key configured: {configuredProviders.join(", ")}.
        </div>
      ) : null}

      <form className="space-y-3" onSubmit={handleSave}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/80">Provider</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as ProviderId)}
            className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-400/50"
          >
            <option value="OPENAI">OpenAI</option>
            <option value="ANTHROPIC">Anthropic</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/80">API key</span>
          <input
            className="h-9 rounded-md border border-white/10 bg-white/5 px-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={provider === "OPENAI" ? "sk-..." : "sk-ant-..."}
            autoComplete="off"
          />
        </label>

        <button
          type="submit"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 text-xs font-semibold text-[#1a1206] transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saving || !value.trim()}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Save key
        </button>
      </form>

      {message ? (
        <p className="rounded-md bg-white/[0.03] px-3 py-2 text-xs text-white/70">{message}</p>
      ) : null}
    </div>
  );
}

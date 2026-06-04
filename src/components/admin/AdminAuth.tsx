import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminAuth({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        // Try to claim first-admin role right after sign-up (auto-confirm is on).
        await supabase.rpc("claim_first_admin");
        toast.success("Conta criada! Bem-vindo(a).");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.rpc("claim_first_admin");
        toast.success("Login efetuado");
      }
      onAuthed();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Painel</p>
        <h1 className="mt-2 font-display text-3xl text-card-foreground">
          {mode === "login" ? "Entrar" : "Criar conta de admin"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Acesse o painel da Meissa Vieira Confeitaria."
            : "A primeira conta criada vira administradora automaticamente."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha (mín. 6 caracteres)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          {mode === "login" ? "Primeira vez? Criar conta de admin" : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}

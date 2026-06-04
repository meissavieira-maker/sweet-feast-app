import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("pwned") || m.includes("known to be weak") || m.includes("weak_password"))
    return "Esta senha aparece em vazamentos públicos. Escolha uma senha mais forte (combine letras, números e símbolos).";
  if (m.includes("password should be at least") || m.includes("at least 6"))
    return "A senha deve ter no mínimo 6 caracteres.";
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Use 'Já tenho conta — entrar'.";
  if (m.includes("invalid email")) return "E-mail inválido.";
  if (m.includes("email rate limit") || m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns segundos e tente novamente.";
  return msg;
}

export function AdminAuth({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      const m = "Informe e-mail e senha.";
      setErrorMsg(m);
      toast.error(m);
      return;
    }
    if (password.length < 6) {
      const m = "A senha deve ter no mínimo 6 caracteres.";
      setErrorMsg(m);
      toast.error(m);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (!data.session) {
          const m = "Conta criada. Verifique seu e-mail para confirmar antes de entrar.";
          setErrorMsg(m);
          toast.info(m);
          setMode("login");
          return;
        }
        await supabase.rpc("claim_first_admin");
        toast.success("Conta criada! Bem-vindo(a).");
        onAuthed();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        await supabase.rpc("claim_first_admin");
        toast.success("Login efetuado");
        onAuthed();
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = translateAuthError(raw);
      console.error("[AdminAuth]", err);
      setErrorMsg(friendly);
      toast.error(friendly);
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
            : "A primeira conta criada vira administradora automaticamente. Use uma senha forte (mín. 6 caracteres, evite datas/sequências)."}
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha (mín. 6 caracteres)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            required
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
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setErrorMsg(null);
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          {mode === "login" ? "Primeira vez? Criar conta de admin" : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}

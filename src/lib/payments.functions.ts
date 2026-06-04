import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PixInputSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive().max(100000),
  payer_name: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
});

async function getAccessToken() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "mp_access_token")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const token = data?.value?.trim();
  if (!token) {
    throw new Error(
      "Credenciais do Mercado Pago não configuradas. Peça ao admin para cadastrar em Configurações.",
    );
  }
  return token;
}

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => PixInputSchema.parse(input))
  .handler(async ({ data }) => {
    const accessToken = await getAccessToken();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const idempotencyKey = `${data.order_id}-pix-${Date.now()}`;
    const nameParts = data.payer_name.trim().split(/\s+/);
    const first_name = nameParts[0] ?? "Cliente";
    const last_name = nameParts.slice(1).join(" ") || "Doceria";

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: Number(data.amount.toFixed(2)),
        description: data.description,
        payment_method_id: "pix",
        external_reference: data.order_id,
        payer: {
          email: `pedido-${data.order_id.slice(0, 8)}@meissavieira.com.br`,
          first_name,
          last_name,
        },
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body && (body.message || body.error)) || `Mercado Pago retornou ${res.status}`;
      throw new Error(typeof msg === "string" ? msg : "Falha ao gerar PIX");
    }

    const tx = body?.point_of_interaction?.transaction_data ?? {};
    const paymentId = String(body?.id ?? "");

    if (paymentId) {
      await supabaseAdmin.from("orders").update({ mp_payment_id: paymentId }).eq("id", data.order_id);
    }

    return {
      payment_id: paymentId,
      status: String(body?.status ?? "pending"),
      qr_code: String(tx?.qr_code ?? ""),
      qr_code_base64: String(tx?.qr_code_base64 ?? ""),
      ticket_url: String(tx?.ticket_url ?? ""),
    };
  });

export const checkPixPayment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ payment_id: z.string().min(1), order_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const accessToken = await getAccessToken();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message || `MP ${res.status}`);

    const status = String(body?.status ?? "pending");
    if (status === "approved") {
      await supabaseAdmin.rpc("mark_order_paid", {
        _order_id: data.order_id,
        _mp_payment_id: data.payment_id,
      });
    }
    return { status };
  });

const CardInputSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive().max(100000),
  description: z.string().min(1).max(500),
  token: z.string().min(1).max(500),
  payment_method_id: z.string().min(1).max(100),
  issuer_id: z.string().max(100).optional().nullable(),
  installments: z.number().int().min(1).max(24),
  payer: z.object({
    email: z.string().email().max(200),
    identification: z
      .object({
        type: z.string().min(1).max(20),
        number: z.string().min(1).max(40),
      })
      .optional()
      .nullable(),
  }),
});

export const createCardPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => CardInputSchema.parse(input))
  .handler(async ({ data }) => {
    const accessToken = await getAccessToken();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const idempotencyKey = `${data.order_id}-card-${Date.now()}`;

    const payload: Record<string, unknown> = {
      transaction_amount: Number(data.amount.toFixed(2)),
      token: data.token,
      description: data.description,
      installments: data.installments,
      payment_method_id: data.payment_method_id,
      external_reference: data.order_id,
      payer: {
        email: data.payer.email,
        ...(data.payer.identification
          ? { identification: data.payer.identification }
          : {}),
      },
    };
    if (data.issuer_id) payload.issuer_id = data.issuer_id;

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body && (body.message || body.error)) || `Mercado Pago retornou ${res.status}`;
      throw new Error(typeof msg === "string" ? msg : "Falha ao processar cartão");
    }

    const paymentId = String(body?.id ?? "");
    const status = String(body?.status ?? "pending");
    const statusDetail = String(body?.status_detail ?? "");

    if (paymentId) {
      await supabaseAdmin.from("orders").update({ mp_payment_id: paymentId }).eq("id", data.order_id);
    }
    if (status === "approved") {
      await supabaseAdmin.rpc("mark_order_paid", {
        _order_id: data.order_id,
        _mp_payment_id: paymentId,
      });
    }

    return { payment_id: paymentId, status, status_detail: statusDetail };
  });

export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "mp_public_key")
    .maybeSingle();
  return { mp_public_key: data?.value?.trim() ?? "" };
});

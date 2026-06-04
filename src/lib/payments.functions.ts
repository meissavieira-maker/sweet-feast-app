import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive().max(100000),
  payer_name: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
});

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("app_settings")
      .select("key,value")
      .eq("key", "mp_access_token")
      .maybeSingle();

    if (error) throw new Error(error.message);
    const accessToken = rows?.value?.trim();
    if (!accessToken) {
      throw new Error(
        "Credenciais do Mercado Pago não configuradas. Peça ao admin para cadastrar em Configurações.",
      );
    }

    const idempotencyKey = `${data.order_id}-${Date.now()}`;
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
      const msg =
        (body && (body.message || body.error)) ||
        `Mercado Pago retornou ${res.status}`;
      throw new Error(typeof msg === "string" ? msg : "Falha ao gerar PIX");
    }

    const tx = body?.point_of_interaction?.transaction_data ?? {};
    const paymentId = String(body?.id ?? "");

    if (paymentId) {
      await supabaseAdmin
        .from("orders")
        .update({ mp_payment_id: paymentId })
        .eq("id", data.order_id);
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "mp_access_token")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const accessToken = row?.value?.trim();
    if (!accessToken) throw new Error("Credenciais do Mercado Pago ausentes");

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

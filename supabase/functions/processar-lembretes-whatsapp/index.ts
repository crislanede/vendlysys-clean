import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const body = await req.json();

    const paymentId =
      body?.data?.id ||
      body?.id ||
      new URL(req.url).searchParams.get("data.id") ||
      new URL(req.url).searchParams.get("id");

    if (!paymentId) {
      return new Response(JSON.stringify({ ok: true, message: "Sem payment id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!mpToken || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Variáveis de ambiente ausentes" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpToken}`,
        },
      }
    );

    const pagamento = await mpResponse.json();

    const status = pagamento?.status;
    const externalReference = pagamento?.external_reference;
    const valor = pagamento?.transaction_amount;

    await supabase
      .from("pagamentos_saas")
      .update({
        status,
        valor,
        pago_em: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("payment_id", String(paymentId));

    if (status === "approved" && externalReference) {
      const hoje = new Date();
      const vencimento = new Date();
      vencimento.setDate(hoje.getDate() + 30);

      await supabase
        .from("empresas")
        .update({
          bloqueada: false,
          plano: "mensal",
          status_assinatura: "ativo",
          licenca_vitalicia: false,
          trial_fim: vencimento.toISOString(),
          observacao_licenca: "Liberado automaticamente via Mercado Pago Pix.",
        })
        .eq("id", externalReference);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
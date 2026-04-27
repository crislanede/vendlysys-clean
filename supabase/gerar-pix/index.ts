import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { empresa_id, valor } = await req.json();

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    const webhookUrl = Deno.env.get("MP_WEBHOOK_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!mpToken || !webhookUrl || !supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({
          error: "Variáveis de ambiente não configuradas",
        }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 🔥 CRIA PAGAMENTO PIX
    const mpResponse = await fetch(
      "https://api.mercadopago.com/v1/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_amount: Number(valor),
          description: "Assinatura VendlySys",
          payment_method_id: "pix",

          // 🔗 VINCULA EMPRESA AO PAGAMENTO
          external_reference: empresa_id,

          payer: {
            email: "cliente@vendlysys.com",
          },

          // 🚀 WEBHOOK DINÂMICO
          notification_url: webhookUrl,
        }),
      }
    );

    const data = await mpResponse.json();

    if (!data.id) {
      return new Response(
        JSON.stringify({
          error: "Erro ao gerar Pix",
          detalhe: data,
        }),
        { status: 400 }
      );
    }

    const qr =
      data.point_of_interaction?.transaction_data?.qr_code || null;

    const qrBase64 =
      data.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    // 💾 SALVA PAGAMENTO NO BANCO
    await supabase.from("pagamentos_saas").insert({
      empresa_id,
      valor,
      status: data.status || "pendente",
      payment_id: String(data.id),
      qr_code: qr,
      qr_code_base64: qrBase64,
    });

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Erro interno",
        detalhe: String(error),
      }),
      { status: 500 }
    );
  }
});
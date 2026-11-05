
import crypto from "node:crypto";

const PRICES = {
  "Tarot": 15000,
  "Registros Akáshicos": 25000,
  "Propósito Álmico": 25000,
  "Orientación Espiritual": 30000,
  "Barras de Access": 45000,
  "MTVSS": 40000,
  "Masaje relajante": 45000,
  "Masaje terapéutico": 40000,
  "Masaje descontracturante": 45000
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido." });
  }

  const access = process.env.MP_ACCESS_TOKEN;
  const secret = process.env.AKASHA_SESSION_SECRET;
  const site = process.env.URL || process.env.SITE_URL;

  if (!access || !secret || !site) {
    return json(500, {
      error: "Falta configurar MP_ACCESS_TOKEN, AKASHA_SESSION_SECRET o URL en Netlify."
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Solicitud inválida." });
  }

  const { service, customer } = body;
  const amount = PRICES[service];

  if (
    !amount ||
    !customer ||
    !customer.nombre ||
    !customer.fecha ||
    !customer.telefono ||
    !customer.pais ||
    !customer.consentimiento
  ) {
    return json(400, {
      error: "Faltan datos o el servicio no admite pago online."
    });
  }

  const sessionId = crypto.randomUUID();

  const token =
    Buffer.from(JSON.stringify({
      sessionId,
      service,
      amount,
      exp: Date.now() + 30 * 60 * 1000
    })).toString("base64url") +
    "." +
    sign(sessionId + "." + service + "." + amount, secret);

  const base = site.replace(/\/$/, "");

  const preference = {
    items: [{
      title: "Akasha Arcano — " + service,
      quantity: 1,
      currency_id: "ARS",
      unit_price: amount
    }],
    external_reference: sessionId,
    metadata: { akasha_session: sessionId, service },
    back_urls: {
      success: base + "/pago-exitoso.html",
      failure: base + "/pago-fallido.html",
      pending: base + "/pago-pendiente.html"
    },
    auto_return: "approved",
    notification_url: base + "/.netlify/functions/mercadopago-webhook",
    statement_descriptor: "AKASHA ARCANO"
  };

  try {
    const r = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + access,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preference)
      }
    );

    const result = await r.json();

    if (!r.ok) {
      return json(502, {
        error: result.message || "Mercado Pago no pudo crear el checkout."
      });
    }

    return json(200, {
      checkoutUrl: result.init_point,
      sessionToken: token
    });
  } catch {
    return json(502, {
      error: "No se pudo conectar con Mercado Pago."
    });
  }
}

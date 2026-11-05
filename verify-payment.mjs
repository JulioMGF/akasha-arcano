import crypto from "node:crypto";
const json=(statusCode,body)=>({statusCode,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(body)});
function safeEqual(a,b){const x=Buffer.from(a||"");const y=Buffer.from(b||"");return x.length===y.length&&crypto.timingSafeEqual(x,y)}
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Método no permitido."});
 const access=process.env.MP_ACCESS_TOKEN,secret=process.env.AKASHA_SESSION_SECRET;
 if(!access||!secret)return json(500,{error:"Configuración incompleta."});
 let body;try{body=JSON.parse(event.body||"{}")}catch{return json(400,{error:"Solicitud inválida."})}
 const {paymentId,sessionToken}=body;
 if(!/^\d+$/.test(String(paymentId||"")))return json(400,{error:"Identificador de pago inválido."});
 const parts=String(sessionToken||"").split(".");
 if(parts.length!==2)return json(401,{error:"Sesión inválida."});
 let session;try{session=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"))}catch{return json(401,{error:"Sesión inválida."})}
 if(!session.sessionId||!session.service||!session.amount||session.exp<Date.now())return json(401,{error:"La sesión venció. Iniciá una nueva solicitud."});
 const expected=crypto.createHmac("sha256",secret).update(session.sessionId+"."+session.service+"."+session.amount).digest("hex");
 if(!safeEqual(expected,parts[1]))return json(401,{error:"Firma de sesión inválida."});
 try{
  const r=await fetch("https://api.mercadopago.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{"Authorization":"Bearer "+access}});
  const p=await r.json();
  if(!r.ok)return json(502,{error:"No se pudo consultar el estado del pago."});
  const approved=p.status==="approved"&&p.external_reference===session.sessionId&&Number(p.transaction_amount)===Number(session.amount)&&p.currency_id==="ARS";
  return json(200,{approved,status:p.status});
 }catch{return json(502,{error:"No se pudo verificar el pago."})}
}
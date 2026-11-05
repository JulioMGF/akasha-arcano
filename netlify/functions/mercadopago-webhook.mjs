export async function handler(event){
 if(event.httpMethod!=="POST")return {statusCode:405,body:"Method not allowed"};
 // La confirmación que habilita WhatsApp se realiza consultando directamente
 // el pago a la API de Mercado Pago en verify-payment, no confiando en este aviso.
 // Este endpoint queda disponible para registrar notificaciones y ampliar el flujo.
 try{
  const payload=JSON.parse(event.body||"{}");
  console.log("Mercado Pago webhook recibido",JSON.stringify({type:payload.type,action:payload.action,data_id:payload.data?.id}));
 }catch(e){console.log("Webhook recibido con cuerpo no JSON");}
 return {statusCode:200,body:"OK"};
}

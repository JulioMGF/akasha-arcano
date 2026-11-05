const online=[
 {name:"Tarot",description:"Lectura simbólica para explorar tu presente y tus posibles caminos.",ars:15000,usd:20},
 {name:"Registros Akáshicos",description:"Experiencia espiritual de introspección y conexión con tu propósito.",ars:25000,usd:35},
 {name:"Propósito Álmico",description:"Exploración de tu camino personal, aprendizajes y sentido interior.",ars:25000,usd:35},
 {name:"Orientación Espiritual",description:"Espacio personalizado para explorar inquietudes y recibir orientación.",ars:30000,usd:45}
];
const extras=[
 {name:"Biodescodificación emocional",usd:40},{name:"Hipnosis terapéutica",usd:50},
 {name:"Matriz del Destino",usd:30},{name:"Compatibilidad energética de pareja",usd:40},
 {name:"Tarot evolutivo y terapéutico",usd:25},{name:"Lectura de sueños",usd:25},
 {name:"Acompañamiento espiritual personalizado",usd:50}
];
const onsite=[
 {name:"Barras de Access",ars:45000},{name:"MTVSS",ars:40000},
 {name:"Masaje relajante",ars:45000},{name:"Masaje terapéutico",ars:40000},
 {name:"Masaje descontracturante",ars:45000}
];
let currency="ars";
const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n).toLocaleString("es-AR");
function allServices(){return [...online.map(x=>({...x,group:"online"})),...extras.map(x=>({...x,ars:null,group:"extra"})),...onsite.map(x=>({...x,group:"onsite"}))]}
function card(item,price,desc){
 const el=document.createElement("article");el.className="service-card";
 const h=document.createElement("h3");h.textContent=item.name;
 const p=document.createElement("p");p.textContent=desc;
 const v=document.createElement("div");v.className="price";v.textContent=price;
 const a=document.createElement("a");a.className="button";a.href="#solicitud";a.textContent="Solicitar consulta";
 a.addEventListener("click",()=>{ $("serviceSelect").value=item.name; updatePrice(); });
 el.append(h,p,v,a);return el;
}
function render(){
 $("catalog").replaceChildren(...online.map(x=>card(x,currency==="ars"?money(x.ars):`USD ${x.usd}`,x.description)));
 $("extras").replaceChildren(...extras.map(x=>card(x,"Consultar tarifa","Experiencia personalizada. Modalidad y disponibilidad a coordinar.")));
 $("onsite").replaceChildren(...onsite.map(x=>card(x,money(x.ars),"Sesión presencial en Villa María o Villa Nueva. Turno a coordinar.")));
}
function populateSelect(){
 const select=$("serviceSelect");
 select.replaceChildren(new Option("Seleccionar",""));
 allServices().forEach(x=>select.add(new Option(x.name,x.name)));
}
function selectedService(){return allServices().find(x=>x.name===$("serviceSelect").value)}
function updatePrice(){
 const item=selectedService();
 if(!item){$("priceSummary").textContent="Seleccioná un servicio para ver el importe.";return}
 if(item.group==="extra"){$("priceSummary").textContent="Tarifa a coordinar. Por el momento, esta experiencia requiere confirmación previa.";return}
 $("priceSummary").textContent=`Importe a pagar: ${money(item.ars)} ARS`;
}
document.querySelectorAll("[data-currency]").forEach(b=>b.addEventListener("click",()=>{
 currency=b.dataset.currency;
 document.querySelectorAll("[data-currency]").forEach(x=>x.classList.toggle("active",x===b));
 render();
}));
populateSelect();render();
$("serviceSelect").addEventListener("change",updatePrice);
$("requestForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const form=e.currentTarget,button=$("payButton"),message=$("formMessage");
 const item=selectedService();
 if(!item){message.textContent="Seleccioná un servicio.";return}
 if(item.group==="extra"){message.textContent="Esta experiencia requiere coordinación de tarifa. Escribinos por WhatsApp.";return}
 const data=Object.fromEntries(new FormData(form).entries());
 button.disabled=true;button.textContent="Preparando pago…";message.textContent="";
 try{
  const response=await fetch("/.netlify/functions/create-preference",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({service:item.name,customer:data})
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||"No se pudo iniciar el pago.");
  sessionStorage.setItem("akasha_payment_session",result.sessionToken);
  sessionStorage.setItem("akasha_customer",JSON.stringify(data));
  window.location.href=result.checkoutUrl;
 }catch(err){message.textContent=err.message||"No se pudo iniciar el pago. Intentá nuevamente.";button.disabled=false;button.textContent="Pagar ahora";}
});

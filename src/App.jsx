import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   E L E V O  —  COMMAND CENTER v6.1  ·  Production Build
   ═══════════════════════════════════════════════════════════════════════
   Module: Dashboard · Pipeline · Kontakte · Cold Outreach · Google Ads
           Projekte · Websites · Tasks · SOPs · Finanzen · Notizen · Settings
   ═══════════════════════════════════════════════════════════════════════ */

const C={bg:"#0A0A0C",panel:"#111113",card:"#19191D",cardH:"#1F1F24",border:"#2A2A30",borderL:"#35353D",accent:"#D4A853",accentH:"#E8C97A",accentDim:"#D4A85315",accentSoft:"#D4A85330",white:"#F4F4F5",off:"#A1A1AA",muted:"#71717A",dim:"#3F3F46",green:"#34D399",red:"#FB7185",blue:"#60A5FA",orange:"#FBBF24",purple:"#A78BFA",cyan:"#22D3EE"};

const STAGES=["Lead","Erstgespräch","Angebot","Verhandlung","Gewonnen"];
const STAGE_C={Lead:C.blue,"Erstgespräch":C.orange,Angebot:C.accent,Verhandlung:C.purple,Gewonnen:C.green,Verloren:C.red,Pausiert:C.muted};
const PROJ_C={Planung:C.blue,"In Arbeit":C.accent,Review:C.orange,Abgeschlossen:C.green,Pausiert:C.muted};
const WEB_C={Live:C.green,Entwicklung:C.blue,Wartung:C.orange,Offline:C.red,Entwurf:C.muted};

const eur=v=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v||0);
const pct=v=>`${Math.round(v||0)}%`;
const fdt=d=>d?new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):"–";
const fdtLong=d=>d?new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}):"–";
const nid=()=>Date.now()+Math.random()*1000|0;

/* ═══ INITIAL DATA ═══ */
const INIT={
  pin:"",
  pipeline:[{id:1,company:"Beispiel GmbH",contact:"Max Mustermann",email:"max@beispiel.de",phone:"0171 1234567",source:"Empfehlung",status:"Lead",service:"Website",volume:1500,followUp:"2026-03-22",notes:"Erstkontakt über Netzwerk",created:"2026-03-16"}],
  contacts:[{id:1,firstName:"Max",lastName:"Mustermann",company:"Beispiel GmbH",email:"max@beispiel.de",phone:"0171 1234567",source:"Netzwerk",tags:["KMU"],lastContact:"2026-03-15",notes:""}],
  projects:[
    {id:1,name:"Website Bar Lighthouse",client:"Bar Lighthouse",status:"In Arbeit",deadline:"2026-03-19",progress:75,notes:"Referenz-Website #1"},
    {id:2,name:"Website Ristorante Luigi",client:"Ristorante Luigi",status:"In Arbeit",deadline:"2026-03-19",progress:60,notes:"Referenz-Website #2"},
    {id:3,name:"Website Heilpraxis Weber",client:"Heilpraxis Weber",status:"Planung",deadline:"2026-03-19",progress:30,notes:"Referenz-Website #3 (Remote)"},
  ],
  websites:[
    {id:1,name:"Bar Lighthouse",url:"lighthouse-bar.de",status:"Entwicklung",hosting:"Hetzner/Coolify",footerLink:true},
    {id:2,name:"Ristorante Luigi",url:"ristorante-luigi.de",status:"Entwicklung",hosting:"Hetzner/Coolify",footerLink:true},
    {id:3,name:"Heilpraxis Weber",url:"heilpraxis-weber.de",status:"Entwicklung",hosting:"Hetzner/Coolify",footerLink:true},
  ],
  outreach:{
    domains:[
      {id:1,domain:"elevo-digital.de",provider:"Google Workspace",status:"Nicht eingerichtet",warmupDay:0,warmupTarget:21,dns:{spf:false,dkim:false,dmarc:false},mailboxes:[{email:"hey@elevo-digital.de",health:0,dailyLimit:0,sent:0},{email:"info@elevo-digital.de",health:0,dailyLimit:0,sent:0}]},
      {id:2,domain:"elevo-aachen.de",provider:"Google Workspace",status:"Nicht eingerichtet",warmupDay:0,warmupTarget:21,dns:{spf:false,dkim:false,dmarc:false},mailboxes:[{email:"hey@elevo-aachen.de",health:0,dailyLimit:0,sent:0},{email:"info@elevo-aachen.de",health:0,dailyLimit:0,sent:0}]},
      {id:3,domain:"elevo-web.de",provider:"Google Workspace",status:"Nicht eingerichtet",warmupDay:0,warmupTarget:21,dns:{spf:false,dkim:false,dmarc:false},mailboxes:[{email:"hey@elevo-web.de",health:0,dailyLimit:0,sent:0},{email:"info@elevo-web.de",health:0,dailyLimit:0,sent:0}]},
    ],
    sequences:[
      {id:1,name:"Webdesign Cold Outreach",status:"Entwurf",delay:"3-5 Tage",emails:[
        {step:1,subject:"Kurze Frage zu {company}",body:"Hi {firstName},\n\nich habe mir die Website von {company} angeschaut und mir sind ein paar Dinge aufgefallen, die euch Kunden kosten könnten.\n\nIch habe 2-3 konkrete Verbesserungen identifiziert – darf ich sie dir kurz zeigen?\n\nBeste Grüße"},
        {step:2,subject:"Nochmal kurz – {company}",body:"Hi {firstName},\n\nwollte nur sichergehen, dass meine letzte Nachricht nicht untergegangen ist.\n\nKurz zusammengefasst: Ich sehe konkretes Potenzial bei eurem Online-Auftritt und würde dir gerne in 5 Minuten zeigen, was ich meine.\n\nKein Verkaufsgespräch, nur ein kurzer Impuls.\n\nBeste Grüße"},
        {step:3,subject:"Letzte Nachricht – {company}",body:"Hi {firstName},\n\nich melde mich nicht nochmal. Falls der Zeitpunkt gerade nicht passt, kein Problem.\n\nFalls du irgendwann eure digitale Präsenz anpacken willst – hier ist mein Kalender: [LINK]\n\nAlles Gute!"},
      ]},
    ],
    contactLists:[
      {id:1,name:"Gastro Aachen",count:0,source:"Outscraper",created:"2026-03-16",status:"Leer"},
      {id:2,name:"Handwerker Aachen",count:0,source:"Outscraper",created:"2026-03-16",status:"Leer"},
      {id:3,name:"Praxen & Studios Aachen",count:0,source:"Outscraper",created:"2026-03-16",status:"Leer"},
      {id:4,name:"Friseure & Beauty Aachen",count:0,source:"Outscraper",created:"2026-03-16",status:"Leer"},
    ],
    stats:{totalSent:0,opened:0,replied:0,bounced:0,leads:0},
    looms:{sent:0,viewed:0,replied:0,avgLength:"0:00"},
  },
  ads:{
    budget:150,spent:0,
    campaigns:[
      {id:1,name:"Website erstellen Aachen",status:"Entwurf",type:"Search",budget:75,spent:0,impressions:0,clicks:0,ctr:0,cpc:0,conversions:0,keywords:[
        {keyword:"website erstellen lassen aachen",matchType:"Phrase",bid:4.5,impressions:0,clicks:0},
        {keyword:"webdesign agentur aachen",matchType:"Phrase",bid:5.0,impressions:0,clicks:0},
        {keyword:"homepage erstellen aachen",matchType:"Phrase",bid:3.8,impressions:0,clicks:0},
        {keyword:"webdesigner aachen",matchType:"Exact",bid:5.5,impressions:0,clicks:0},
        {keyword:"professionelle website kosten",matchType:"Broad",bid:3.0,impressions:0,clicks:0},
      ]},
      {id:2,name:"Digitalisierung KMU",status:"Entwurf",type:"Search",budget:75,spent:0,impressions:0,clicks:0,ctr:0,cpc:0,conversions:0,keywords:[
        {keyword:"digitalisierung kleinunternehmen",matchType:"Phrase",bid:3.2,impressions:0,clicks:0},
        {keyword:"digitale transformation mittelstand aachen",matchType:"Phrase",bid:4.0,impressions:0,clicks:0},
        {keyword:"online präsenz verbessern",matchType:"Broad",bid:2.8,impressions:0,clicks:0},
        {keyword:"firma website erstellen lassen",matchType:"Phrase",bid:4.2,impressions:0,clicks:0},
      ]},
    ],
    settings:{region:"Aachen + 30km Umkreis",excluded:"Geilenkirchen",schedule:"Mo-Fr 7:00-20:00",startDate:""},
    negativeKeywords:["kostenlos","gratis","selber machen","template","baukasten","wix","jimdo","wordpress theme"],
  },
  tasks:[
    {id:1,text:"Domains kaufen (elevo-digital.de, elevo-aachen.de, elevo-web.de)",done:false,priority:"Hoch",category:"Outreach",due:"2026-03-16"},
    {id:2,text:"Google Workspace einrichten (6 Postfächer)",done:false,priority:"Hoch",category:"Outreach",due:"2026-03-16"},
    {id:3,text:"DNS-Einträge setzen (SPF, DKIM, DMARC) in Cloudflare",done:false,priority:"Hoch",category:"Outreach",due:"2026-03-16"},
    {id:4,text:"Instantly.ai Account anlegen + Warmup starten",done:false,priority:"Hoch",category:"Outreach",due:"2026-03-16"},
    {id:5,text:"Outscraper Account anlegen + erste Kontakte ziehen",done:false,priority:"Mittel",category:"Outreach",due:"2026-03-17"},
    {id:6,text:"Website Bar Lighthouse fertigstellen & ausliefern",done:false,priority:"Hoch",category:"Projekte",due:"2026-03-19"},
    {id:7,text:"Website Ristorante Luigi fertigstellen & ausliefern",done:false,priority:"Hoch",category:"Projekte",due:"2026-03-19"},
    {id:8,text:"Website Heilpraxis Weber fertigstellen & ausliefern",done:false,priority:"Hoch",category:"Projekte",due:"2026-03-19"},
    {id:9,text:"Google Ads Konto einrichten",done:false,priority:"Mittel",category:"Ads",due:"2026-03-18"},
    {id:10,text:"Google Ads Keywords & Anzeigentexte erstellen",done:false,priority:"Mittel",category:"Ads",due:"2026-03-19"},
    {id:11,text:"Google Ads Kampagnen live schalten",done:false,priority:"Mittel",category:"Ads",due:"2026-03-20"},
    {id:12,text:"E-Mail-Vorlagen für Cold Outreach finalisieren",done:false,priority:"Mittel",category:"Outreach",due:"2026-03-20"},
    {id:13,text:"Loom-Routine & Skript festlegen",done:false,priority:"Niedrig",category:"Outreach",due:"2026-03-21"},
    {id:14,text:"Erste 5-10 Looms an Top-Prospects senden",done:false,priority:"Mittel",category:"Outreach",due:"2026-03-19"},
    {id:15,text:"'Website by ELEVO' Footer-Link in alle 3 Referenz-Sites einbauen",done:false,priority:"Niedrig",category:"Projekte",due:"2026-03-19"},
    {id:16,text:"Loom Account einrichten",done:false,priority:"Niedrig",category:"Outreach",due:"2026-03-17"},
    {id:17,text:"Empfehlungs-Briefing an 3 Referenzkunden formulieren",done:false,priority:"Mittel",category:"Vertrieb",due:"2026-03-20"},
  ],
  sops:[
    {id:1,name:"Neuer Lead – Erstansprache",category:"Vertrieb",steps:[
      {id:1,text:"Website des Leads analysieren (Mobile, Speed, Design, SEO)",done:false},
      {id:2,text:"2-3 konkrete Verbesserungspunkte identifizieren",done:false},
      {id:3,text:"Entscheiden: Cold Mail oder Loom?",done:false},
      {id:4,text:"Personalisierte Nachricht / Loom versenden",done:false},
      {id:5,text:"Kontakt im CRM anlegen + Follow-up Datum setzen",done:false},
      {id:6,text:"Nach 3-5 Tagen Follow-up wenn keine Antwort",done:false},
    ]},
    {id:2,name:"Website-Projekt – Ablauf",category:"Delivery",steps:[
      {id:1,text:"Erstgespräch: Bedarf, Ziele, Branche, Konkurrenz klären",done:false},
      {id:2,text:"Angebot erstellen und versenden",done:false},
      {id:3,text:"50% Anzahlung einholen",done:false},
      {id:4,text:"Content & Bilder vom Kunden einfordern",done:false},
      {id:5,text:"Design-Entwurf erstellen + Feedback einholen",done:false},
      {id:6,text:"Website entwickeln (Responsive, SEO-Basics, Speed)",done:false},
      {id:7,text:"Kunde-Review + Korrekturrunde",done:false},
      {id:8,text:"Go-Live + DNS umstellen",done:false},
      {id:9,text:"50% Restzahlung einholen",done:false},
      {id:10,text:"'Website by ELEVO' Footer-Link einbauen",done:false},
      {id:11,text:"Empfehlungs-Briefing an Kunden geben",done:false},
    ]},
    {id:3,name:"Wöchentliche Review",category:"Operations",steps:[
      {id:1,text:"Pipeline durchgehen – offene Deals prüfen + Follow-ups",done:false},
      {id:2,text:"Outreach-Stats checken (Öffnungsrate, Antworten, Leads)",done:false},
      {id:3,text:"Google Ads Performance prüfen (CTR, CPC, Conversions)",done:false},
      {id:4,text:"Finanzen: Einnahmen vs. Ausgaben",done:false},
      {id:5,text:"Tasks für nächste Woche planen",done:false},
      {id:6,text:"Kontaktlisten auffüllen wenn < 100 unberührt",done:false},
    ]},
    {id:4,name:"Tägliche Outreach-Routine",category:"Outreach",steps:[
      {id:1,text:"Instantly Dashboard checken – Antworten bearbeiten",done:false},
      {id:2,text:"5-10 Top-Prospects identifizieren für Looms",done:false},
      {id:3,text:"Looms aufnehmen und versenden",done:false},
      {id:4,text:"Neue Leads in Pipeline eintragen",done:false},
      {id:5,text:"Follow-ups für heute abarbeiten",done:false},
    ]},
  ],
  finances:{monthly:{ads:150,workspace:36,instantly:28,domains:2,outscraper:25,loom:0},revenue:0,invoices:[]},
  notes:[],
};

/* ═══ STORAGE ═══ */
const SK="elevo_v61";
const load=()=>{try{const s=localStorage.getItem(SK);return s?JSON.parse(s):null}catch{return null}};
const save=d=>{try{localStorage.setItem(SK,JSON.stringify(d))}catch{}};

/* ═══ UI COMPONENTS ═══ */
const Btn=({children,onClick,sm,ghost,danger,accent,disabled,full,sx})=>(
  <button onClick={onClick} disabled={disabled} style={{
    padding:sm?"5px 12px":"8px 18px",fontSize:sm?11:12,fontWeight:600,width:full?"100%":undefined,
    background:danger?C.red+"20":ghost?"transparent":accent?C.accent:C.accentDim,
    color:danger?C.red:accent?C.bg:C.accent,
    border:`1px solid ${danger?C.red+"40":ghost?C.border:accent?C.accent:C.accentSoft}`,
    borderRadius:6,cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",
    opacity:disabled?.4:1,transition:"all .15s",lineHeight:1.4,...sx,
  }}>{children}</button>
);

const Badge=({color,children})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:color+"18",color,fontSize:11,fontWeight:600}}>
    <span style={{width:6,height:6,borderRadius:3,background:color}}/>{children}
  </span>
);

const Card=({children,onClick,sx})=>(
  <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,cursor:onClick?"pointer":"default",transition:"all .15s",...sx}}>{children}</div>
);

const Stat=({label,value,sub,color,icon})=>(
  <Card sx={{flex:1,minWidth:120}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{label}</div>
        <div style={{color:color||C.white,fontSize:22,fontWeight:700,fontFamily:"'Cormorant Garamond',serif"}}>{value}</div>
        {sub&&<div style={{color:C.dim,fontSize:11,marginTop:4}}>{sub}</div>}
      </div>
      {icon&&<div style={{fontSize:18,opacity:.3}}>{icon}</div>}
    </div>
  </Card>
);

const Progress=({value,color,h=6})=>(
  <div style={{width:"100%",height:h,background:C.border,borderRadius:h/2,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,value||0)}%`,height:"100%",background:color||C.accent,borderRadius:h/2,transition:"width .5s ease"}}/>
  </div>
);

const Section=({title,right,children})=>(
  <div style={{marginBottom:24}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{color:C.off,fontSize:13,fontWeight:600,letterSpacing:".02em"}}>{title}</div>{right}
    </div>{children}
  </div>
);

const Empty=({text})=>(<div style={{textAlign:"center",padding:40,color:C.dim,fontSize:13}}><div style={{fontSize:28,marginBottom:8,opacity:.3}}>◇</div>{text}</div>);

const Modal=({open,onClose,title,children,wide})=>{
  if(!open)return null;
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,width:"100%",maxWidth:wide?720:500,maxHeight:"88vh",overflow:"auto",padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{color:C.white,fontSize:16,fontWeight:700}}>{title}</div>
        <div onClick={onClose} style={{cursor:"pointer",color:C.muted,fontSize:18,padding:4}}>✕</div>
      </div>{children}
    </div>
  </div>);
};

const Field=({label,value,onChange,type="text",options,placeholder,rows})=>(
  <div style={{marginBottom:14}}>
    <div style={{color:C.muted,fontSize:11,marginBottom:5,fontWeight:500}}>{label}</div>
    {options?<select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"8px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:6,color:C.white,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
      <option value="">Auswählen...</option>{options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>:rows?<textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{width:"100%",padding:"8px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:6,color:C.white,fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/>
    :<input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"8px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:6,color:C.white,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}/>}
  </div>
);


/* ═══════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App(){
  const[D,setD]=useState(()=>load()||INIT);
  const[tab,setTab]=useState("dashboard");
  const[modal,setModal]=useState(null);
  const[md,setMd]=useState({});
  const[mob,setMob]=useState(false);
  const[locked,setLocked]=useState(()=>{const d=load();return d&&d.pin?true:false});
  const[pinInput,setPinInput]=useState("");
  const[sideOpen,setSideOpen]=useState(false);

  useEffect(()=>{save(D)},[D]);
  useEffect(()=>{const c=()=>setMob(window.innerWidth<768);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c)},[]);

  const upd=useCallback((k,v)=>setD(p=>({...p,[k]:typeof v==="function"?v(p[k]):v})),[]);
  const openM=(t,data)=>{setModal(t);setMd(data||{})};
  const closeM=()=>{setModal(null);setMd({})};

  const pVal=D.pipeline.filter(d=>!["Verloren","Pausiert"].includes(d.status)).reduce((s,d)=>s+(d.volume||0),0);
  const wonVal=D.pipeline.filter(d=>d.status==="Gewonnen").reduce((s,d)=>s+(d.volume||0),0);
  const monthlyCost=Object.values(D.finances.monthly).reduce((s,v)=>s+v,0);
  const totalWarmup=D.outreach.domains.reduce((s,d)=>s+d.warmupDay,0);
  const totalWarmupTarget=D.outreach.domains.reduce((s,d)=>s+d.warmupTarget,0);
  const warmupPct=totalWarmupTarget>0?(totalWarmup/totalWarmupTarget)*100:0;

  /* ─── PIN LOCK ─── */
  if(locked){
    return(
      <div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:"'DM Sans',sans-serif"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
        <div style={{color:C.accent,fontFamily:"'Cormorant Garamond',serif",fontSize:28,letterSpacing:".3em",fontWeight:700,marginBottom:8}}>E L E V O</div>
        <div style={{color:C.dim,fontSize:11,letterSpacing:".1em",marginBottom:32}}>COMMAND CENTER</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&pinInput===D.pin){setLocked(false);setPinInput("")}}} placeholder="PIN" maxLength={8} style={{width:180,padding:"10px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.white,fontSize:16,textAlign:"center",letterSpacing:".3em",fontFamily:"'DM Sans',sans-serif"}}/>
        </div>
        <Btn accent onClick={()=>{if(pinInput===D.pin){setLocked(false);setPinInput("")}}}>Entsperren</Btn>
        {pinInput&&pinInput!==D.pin&&pinInput.length>=D.pin.length&&<div style={{color:C.red,fontSize:11,marginTop:12}}>Falscher PIN</div>}
      </div>
    );
  }

  /* ═══ DASHBOARD ═══ */
  const DashboardPage=()=>{
    const openTasks=D.tasks.filter(t=>!t.done);
    const urgentTasks=openTasks.filter(t=>t.priority==="Hoch");
    const adsSpent=D.ads.campaigns.reduce((s,c)=>s+c.spent,0);
    const adsClicks=D.ads.campaigns.reduce((s,c)=>s+c.clicks,0);
    const liveSites=D.websites.filter(w=>w.status==="Live").length;

    return(<div className="fade">
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <Stat label="Pipeline" value={eur(pVal)} sub={`${D.pipeline.length} Deals`} color={C.accent} icon="◈"/>
        <Stat label="Gewonnen" value={eur(wonVal)} color={C.green} icon="✓"/>
        <Stat label="Monatl. Kosten" value={eur(monthlyCost)} color={C.orange} icon="◇"/>
        <Stat label="Offene Tasks" value={openTasks.length} sub={`${urgentTasks.length} dringend`} color={urgentTasks.length>0?C.red:C.blue} icon="☐"/>
      </div>

      <Section title="AKQUISE-KANÄLE">
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{color:C.white,fontSize:13,fontWeight:600}}>✉ Cold Outreach</span>
              <Badge color={D.outreach.stats.totalSent>0?C.green:C.orange}>{D.outreach.stats.totalSent>0?"Aktiv":"Setup"}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{color:C.dim,fontSize:10}}>Gesendet</div><div style={{color:C.white,fontSize:18,fontWeight:700}}>{D.outreach.stats.totalSent}</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Antworten</div><div style={{color:C.green,fontSize:18,fontWeight:700}}>{D.outreach.stats.replied}</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Leads</div><div style={{color:C.accent,fontSize:18,fontWeight:700}}>{D.outreach.stats.leads}</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Looms</div><div style={{color:C.purple,fontSize:18,fontWeight:700}}>{D.outreach.looms.sent}</div></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}><span>E-Mail Warmup</span><span>{pct(warmupPct)}</span></div>
            <Progress value={warmupPct} color={warmupPct>=100?C.green:C.orange}/>
          </Card>

          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{color:C.white,fontSize:13,fontWeight:600}}>◎ Google Ads</span>
              <Badge color={adsSpent>0?C.green:C.orange}>{adsSpent>0?"Live":"Setup"}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{color:C.dim,fontSize:10}}>Ausgegeben</div><div style={{color:C.white,fontSize:18,fontWeight:700}}>{eur(adsSpent)}</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Klicks</div><div style={{color:C.blue,fontSize:18,fontWeight:700}}>{adsClicks}</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Conversions</div><div style={{color:C.green,fontSize:18,fontWeight:700}}>{D.ads.campaigns.reduce((s,c)=>s+c.conversions,0)}</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Budget</div><div style={{color:C.accent,fontSize:18,fontWeight:700}}>{eur(D.ads.budget)}/Mo</div></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}><span>Budget verbraucht</span><span>{D.ads.budget>0?pct((adsSpent/D.ads.budget)*100):"0%"}</span></div>
            <Progress value={D.ads.budget>0?(adsSpent/D.ads.budget)*100:0} color={C.blue}/>
          </Card>

          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{color:C.white,fontSize:13,fontWeight:600}}>◐ Referenz-Websites</span>
              <Badge color={C.blue}>{liveSites}/{D.websites.length} Live</Badge>
            </div>
            {D.websites.map(w=><div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.off,fontSize:12}}>{w.name}</span><Badge color={WEB_C[w.status]||C.muted}>{w.status}</Badge>
            </div>)}
          </Card>

          <Card>
            <span style={{color:C.white,fontSize:13,fontWeight:600}}>♦ Mundpropaganda</span>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
              <div><div style={{color:C.dim,fontSize:10}}>Empfehlungsgeber</div><div style={{color:C.white,fontSize:18,fontWeight:700}}>3</div></div>
              <div><div style={{color:C.dim,fontSize:10}}>Empfehlungen erhalten</div><div style={{color:C.accent,fontSize:18,fontWeight:700}}>0</div></div>
            </div>
            <div style={{color:C.dim,fontSize:11,marginTop:12,fontStyle:"italic"}}>Aktiviert sich sobald Referenz-Websites live gehen.</div>
          </Card>
        </div>
      </Section>

      <Section title="DRINGENDE AUFGABEN" right={<Btn sm onClick={()=>setTab("tasks")}>Alle →</Btn>}>
        {urgentTasks.length===0?<div style={{color:C.dim,fontSize:12,padding:12}}>Keine dringenden Tasks – gut so!</div>:
          urgentTasks.slice(0,6).map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:4}}>
            <div onClick={()=>upd("tasks",ts=>ts.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={{width:18,height:18,borderRadius:4,border:`2px solid ${C.accent}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.green,flexShrink:0}}/>
            <span style={{flex:1,color:C.off,fontSize:12}}>{t.text}</span>
            <Badge color={t.category==="Outreach"?C.cyan:t.category==="Ads"?C.blue:t.category==="Vertrieb"?C.purple:C.accent}>{t.category}</Badge>
          </div>)
        }
      </Section>

      <Section title="TIMELINE">
        <div style={{position:"relative",paddingLeft:20}}>
          <div style={{position:"absolute",left:6,top:0,bottom:0,width:2,background:C.border}}/>
          {[
            {d:"16. März",l:"Heute Abend",t:"Infrastruktur: Domains, Workspace, DNS, Instantly, Warmup starten",c:C.accent,a:true},
            {d:"17-19. März",l:"Diese Woche",t:"3 Referenz-Websites fertigstellen & ausliefern",c:C.blue},
            {d:"18-20. März",l:"Diese Woche",t:"Google Ads einrichten & live schalten",c:C.blue},
            {d:"Ab 19. März",l:"Ab Mittwoch",t:"Erste Looms an Top-Prospects (5-10/Tag)",c:C.purple},
            {d:"~6. April",l:"In 3 Wochen",t:"Cold E-Mails gehen live nach Warmup",c:C.green},
            {d:"April",l:"Ziel",t:"Erster zahlender Kunde → 1.200–1.500€",c:C.accent},
          ].map((it,i)=><div key={i} style={{display:"flex",gap:14,marginBottom:16,position:"relative"}}>
            <div style={{width:14,height:14,borderRadius:7,background:it.a?it.c:C.card,border:`2px solid ${it.c}`,flexShrink:0,marginTop:2,position:"relative",zIndex:1}}/>
            <div><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
              <span style={{color:it.c,fontSize:11,fontWeight:700}}>{it.d}</span><span style={{color:C.dim,fontSize:10}}>{it.l}</span>
            </div><div style={{color:C.off,fontSize:12}}>{it.t}</div></div>
          </div>)}
        </div>
      </Section>
    </div>);
  };

  /* ═══ PIPELINE ═══ */
  const PipelinePage=()=>(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{color:C.muted,fontSize:12}}>{D.pipeline.length} Deals · {eur(pVal)}</span>
      <Btn sm onClick={()=>openM("deal")}>+ Deal</Btn>
    </div>
    <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
      {STAGES.map(stage=>{const deals=D.pipeline.filter(p=>p.status===stage);const sv=deals.reduce((s,d)=>s+(d.volume||0),0);
        return(<div key={stage} style={{flex:mob?"0 0 250px":1,minWidth:180}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"0 4px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:4,background:STAGE_C[stage]}}/><span style={{color:C.off,fontSize:12,fontWeight:600}}>{stage}</span></div>
            <span style={{color:C.dim,fontSize:11}}>{eur(sv)}</span>
          </div>
          <div style={{minHeight:80,background:C.panel,borderRadius:8,padding:6,border:`1px solid ${C.border}`}}>
            {deals.length===0?<div style={{color:C.dim,fontSize:11,textAlign:"center",padding:20}}>Leer</div>:
              deals.map(d=><Card key={d.id} onClick={()=>openM("deal",d)} sx={{marginBottom:6,padding:12}}>
                <div style={{color:C.white,fontSize:13,fontWeight:600,marginBottom:4}}>{d.company}</div>
                <div style={{color:C.muted,fontSize:11,marginBottom:6}}>{d.service} · {d.contact}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:C.accent,fontSize:14,fontWeight:700}}>{eur(d.volume)}</span>
                  {d.followUp&&<span style={{color:C.dim,fontSize:10}}>FU: {fdt(d.followUp)}</span>}
                </div>
              </Card>)
            }
          </div>
        </div>);
      })}
    </div>
  </div>);

  /* ═══ CONTACTS ═══ */
  const ContactsPage=()=>(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{color:C.muted,fontSize:12}}>{D.contacts.length} Kontakte</span><Btn sm onClick={()=>openM("contact")}>+ Kontakt</Btn>
    </div>
    {D.contacts.length===0?<Empty text="Noch keine Kontakte"/>:D.contacts.map(c=><Card key={c.id} onClick={()=>openM("contact",c)} sx={{marginBottom:6,padding:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:19,background:C.accentDim,display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontSize:13,fontWeight:700,flexShrink:0}}>{c.firstName?.[0]}{c.lastName?.[0]}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:C.white,fontSize:13,fontWeight:600}}>{c.firstName} {c.lastName}</div>
          <div style={{color:C.muted,fontSize:11}}>{c.company}{c.email?` · ${c.email}`:""}</div>
        </div>
        {c.lastContact&&<span style={{color:C.dim,fontSize:10,flexShrink:0}}>{fdt(c.lastContact)}</span>}
      </div>
    </Card>)}
  </div>);

  /* ═══ OUTREACH ═══ */
  const OutreachPage=()=>{
    const[sub,setSub]=useState("warmup");const O=D.outreach;
    const subs=[{id:"warmup",l:"Warmup & Domains"},{id:"seq",l:"Sequenzen"},{id:"lists",l:"Kontaktlisten"},{id:"looms",l:"Looms"}];

    return(<div className="fade">
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto"}}>
        {subs.map(s=><button key={s.id} onClick={()=>setSub(s.id)} style={{padding:"6px 14px",fontSize:11,fontWeight:600,borderRadius:6,cursor:"pointer",background:sub===s.id?C.accentDim:"transparent",color:sub===s.id?C.accent:C.muted,border:`1px solid ${sub===s.id?C.accentSoft:C.border}`,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>{s.l}</button>)}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <Stat label="Gesendet" value={O.stats.totalSent} color={C.cyan} icon="✉"/>
        <Stat label="Geöffnet" value={O.stats.opened} sub={O.stats.totalSent>0?`${pct((O.stats.opened/O.stats.totalSent)*100)} Rate`:""} color={C.blue}/>
        <Stat label="Antworten" value={O.stats.replied} color={C.green}/>
        <Stat label="Leads" value={O.stats.leads} color={C.accent} icon="★"/>
      </div>

      {sub==="warmup"&&<Section title="E-MAIL DOMAINS & WARMUP STATUS">
        {O.domains.map(dom=>{const wp=dom.warmupTarget>0?(dom.warmupDay/dom.warmupTarget)*100:0;const sc=dom.status==="Bereit"?C.green:dom.status==="Warmup"?C.orange:C.red;
          return(<Card key={dom.id} sx={{marginBottom:10,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div><div style={{color:C.white,fontSize:14,fontWeight:600}}>{dom.domain}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{dom.provider} · {dom.mailboxes.length} Postfächer</div></div>
              <Badge color={sc}>{dom.status}</Badge>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {["SPF","DKIM","DMARC"].map(r=><div key={r} style={{flex:1,background:C.panel,borderRadius:6,padding:"6px 10px",textAlign:"center"}}>
                <div style={{color:C.dim,fontSize:9}}>{r}</div>
                <div style={{color:dom.dns?.[r.toLowerCase()]?C.green:C.dim,fontSize:12,fontWeight:600}}>{dom.dns?.[r.toLowerCase()]?"✓":"—"}</div>
              </div>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}><span>Warmup: Tag {dom.warmupDay}/{dom.warmupTarget}</span><span>{pct(wp)}</span></div>
            <Progress value={wp} color={wp>=100?C.green:C.orange} h={8}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10}}>
              {dom.mailboxes.map((mb,i)=><div key={i} style={{background:C.panel,borderRadius:6,padding:"8px 10px"}}>
                <div style={{color:C.off,fontSize:11,marginBottom:3}}>{mb.email}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}><span style={{color:C.dim}}>Health: <span style={{color:mb.health>80?C.green:mb.health>50?C.orange:C.dim}}>{mb.health||"—"}%</span></span><span style={{color:C.dim}}>Limit: {mb.dailyLimit||"—"}/Tag</span></div>
              </div>)}
            </div>
            <div style={{display:"flex",gap:6,marginTop:10}}>
              {dom.status==="Nicht eingerichtet"&&<Btn sm onClick={()=>upd("outreach",o=>({...o,domains:o.domains.map(d=>d.id===dom.id?{...d,status:"Warmup",warmupDay:1,dns:{spf:true,dkim:true,dmarc:true},mailboxes:d.mailboxes.map(m=>({...m,health:15,dailyLimit:10}))}:d)}))}>DNS eingerichtet ✓ Warmup starten</Btn>}
              {dom.status==="Warmup"&&<Btn sm onClick={()=>upd("outreach",o=>({...o,domains:o.domains.map(d=>d.id===dom.id?{...d,warmupDay:Math.min(d.warmupDay+1,d.warmupTarget),status:d.warmupDay+1>=d.warmupTarget?"Bereit":"Warmup",mailboxes:d.mailboxes.map(m=>({...m,health:Math.min(98,m.health+4),dailyLimit:Math.min(50,m.dailyLimit+2)}))}:d)}))}>+1 Warmup Tag</Btn>}
              {dom.status==="Bereit"&&<Badge color={C.green}>Versandbereit ✓</Badge>}
            </div>
          </Card>);
        })}
      </Section>}

      {sub==="seq"&&<Section title="E-MAIL SEQUENZEN">
        {O.sequences.map(seq=><Card key={seq.id} sx={{marginBottom:10,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{color:C.white,fontSize:14,fontWeight:600}}>{seq.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{seq.emails.length} Steps · Delay: {seq.delay}</div></div>
            <Badge color={seq.status==="Aktiv"?C.green:C.orange}>{seq.status}</Badge>
          </div>
          {seq.emails.map((em,i)=><div key={i} style={{background:C.panel,borderRadius:8,padding:12,marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:24,height:24,borderRadius:12,background:C.accentDim,display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontSize:11,fontWeight:700}}>{em.step}</div>
              <span style={{color:C.off,fontSize:12,fontWeight:600}}>{em.subject}</span>
            </div>
            <div style={{color:C.dim,fontSize:11,whiteSpace:"pre-wrap",lineHeight:1.5,paddingLeft:32}}>{em.body}</div>
          </div>)}
        </Card>)}
      </Section>}

      {sub==="lists"&&<Section title="KONTAKTLISTEN (Outscraper)" right={<Btn sm onClick={()=>openM("list")}>+ Liste</Btn>}>
        {O.contactLists.map(cl=><Card key={cl.id} sx={{marginBottom:8,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{color:C.white,fontSize:13,fontWeight:600}}>{cl.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{cl.count} Kontakte · {cl.source} · {fdt(cl.created)}</div></div>
            <Badge color={cl.count>0?C.green:C.orange}>{cl.status}</Badge>
          </div>
        </Card>)}
      </Section>}

      {sub==="looms"&&<div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
          <Card><div style={{color:C.dim,fontSize:10}}>Gesendet</div><div style={{color:C.purple,fontSize:20,fontWeight:700}}>{O.looms.sent}</div></Card>
          <Card><div style={{color:C.dim,fontSize:10}}>Angesehen</div><div style={{color:C.blue,fontSize:20,fontWeight:700}}>{O.looms.viewed}</div></Card>
          <Card><div style={{color:C.dim,fontSize:10}}>Geantwortet</div><div style={{color:C.green,fontSize:20,fontWeight:700}}>{O.looms.replied}</div></Card>
          <Card><div style={{color:C.dim,fontSize:10}}>Ø Länge</div><div style={{color:C.off,fontSize:20,fontWeight:700}}>{O.looms.avgLength}</div></Card>
        </div>
        <Card sx={{padding:16}}>
          <div style={{color:C.white,fontSize:14,fontWeight:600,marginBottom:12}}>Loom-Skript (2-3 Min.)</div>
          <div style={{color:C.off,fontSize:12,lineHeight:1.8}}>
            <div style={{color:C.accent,fontWeight:600,marginBottom:2}}>0:00 — Begrüßung (10s)</div>
            <div style={{paddingLeft:16,marginBottom:8}}>"Hi, ich bin [Name] von ELEVO. Ich habe mir die Website von [Firma] angeschaut und mir sind ein paar Dinge aufgefallen."</div>
            <div style={{color:C.accent,fontWeight:600,marginBottom:2}}>0:10 — Analyse am Bildschirm (90s)</div>
            <div style={{paddingLeft:16,marginBottom:8}}>Website aufrufen → 2-3 konkrete Schwachstellen zeigen (Mobile, Speed, Design, fehlende Elemente). Keine generischen Tipps, nur spezifische Beobachtungen.</div>
            <div style={{color:C.accent,fontWeight:600,marginBottom:2}}>1:40 — Angebot (20s)</div>
            <div style={{paddingLeft:16,marginBottom:8}}>"Wenn das interessant klingt, meld dich einfach. Ich zeig dir gerne in einem kurzen Gespräch, was möglich wäre. Kein Verkaufsdruck."</div>
            <div style={{background:C.accentDim,borderRadius:6,padding:10,marginTop:8}}>
              <div style={{color:C.accent,fontSize:11,fontWeight:600}}>Regel: Erste Aufnahme = Finale Aufnahme. Nicht perfektionieren!</div>
            </div>
          </div>
        </Card>
      </div>}
    </div>);
  };

  /* ═══ GOOGLE ADS ═══ */
  const AdsPage=()=>{
    const A=D.ads;const ts=A.campaigns.reduce((s,c)=>s+c.spent,0);const tc=A.campaigns.reduce((s,c)=>s+c.clicks,0);
    const ti=A.campaigns.reduce((s,c)=>s+c.impressions,0);const tv=A.campaigns.reduce((s,c)=>s+c.conversions,0);
    return(<div className="fade">
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <Stat label="Ausgegeben" value={eur(ts)} sub={`von ${eur(A.budget)}`} color={C.blue}/>
        <Stat label="Klicks" value={tc} sub={ti>0?`CTR: ${pct((tc/ti)*100)}`:""} color={C.cyan}/>
        <Stat label="Ø CPC" value={tc>0?eur(ts/tc):"–"} color={C.orange}/>
        <Stat label="Conversions" value={tv} color={C.green} icon="★"/>
      </div>
      <Section title="EINSTELLUNGEN">
        <Card sx={{padding:16,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr 1fr",gap:16}}>
            <div><div style={{color:C.dim,fontSize:10}}>Region</div><div style={{color:C.off,fontSize:13}}>{A.settings.region}</div></div>
            <div><div style={{color:C.dim,fontSize:10}}>Ausgeschlossen</div><div style={{color:C.red,fontSize:13}}>{A.settings.excluded}</div></div>
            <div><div style={{color:C.dim,fontSize:10}}>Zeitplan</div><div style={{color:C.off,fontSize:13}}>{A.settings.schedule}</div></div>
            <div><div style={{color:C.dim,fontSize:10}}>Budget/Monat</div><div style={{color:C.accent,fontSize:13,fontWeight:700}}>{eur(A.budget)}</div></div>
          </div>
        </Card>
      </Section>
      <Section title="NEGATIVE KEYWORDS">
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>
          {A.negativeKeywords.map((k,i)=><span key={i} style={{padding:"3px 10px",borderRadius:20,background:C.red+"15",color:C.red,fontSize:11}}>-{k}</span>)}
        </div>
      </Section>
      <Section title="KAMPAGNEN" right={<Btn sm onClick={()=>openM("adCamp")}>+ Kampagne</Btn>}>
        {A.campaigns.map(camp=><Card key={camp.id} sx={{marginBottom:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{color:C.white,fontSize:14,fontWeight:600}}>{camp.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{camp.type} · {eur(camp.budget)}/Monat</div></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Badge color={camp.status==="Live"?C.green:camp.status==="Pausiert"?C.orange:C.muted}>{camp.status}</Badge>
              {camp.status==="Entwurf"&&<Btn sm onClick={()=>upd("ads",a=>({...a,campaigns:a.campaigns.map(c=>c.id===camp.id?{...c,status:"Live"}:c)}))}>Aktivieren</Btn>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12}}>
            {[{l:"Spent",v:eur(camp.spent)},{l:"Impr.",v:camp.impressions},{l:"Klicks",v:camp.clicks},{l:"CTR",v:pct(camp.ctr)},{l:"Conv.",v:camp.conversions}].map((s,i)=>
              <div key={i} style={{background:C.panel,borderRadius:6,padding:"5px 6px",textAlign:"center"}}><div style={{color:C.dim,fontSize:9}}>{s.l}</div><div style={{color:C.off,fontSize:12,fontWeight:600}}>{s.v}</div></div>
            )}
          </div>
          <div style={{color:C.muted,fontSize:11,fontWeight:600,marginBottom:6}}>Keywords</div>
          {camp.keywords.map((kw,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:C.panel,borderRadius:6,marginBottom:3}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:C.off,fontSize:12}}>{kw.keyword}</span><Badge color={C.dim}>{kw.matchType}</Badge></div>
            <span style={{color:C.dim,fontSize:11}}>Bid: {eur(kw.bid)}</span>
          </div>)}
        </Card>)}
      </Section>
    </div>);
  };

  /* ═══ PROJECTS ═══ */
  const ProjectsPage=()=>(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{color:C.muted,fontSize:12}}>{D.projects.length} Projekte</span><Btn sm onClick={()=>openM("project")}>+ Projekt</Btn>
    </div>
    {D.projects.map(p=><Card key={p.id} onClick={()=>openM("project",p)} sx={{marginBottom:8,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div><div style={{color:C.white,fontSize:14,fontWeight:600}}>{p.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{p.client} · Deadline: {fdt(p.deadline)}</div></div>
        <Badge color={PROJ_C[p.status]||C.muted}>{p.status}</Badge>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}><Progress value={p.progress} color={PROJ_C[p.status]||C.accent}/><span style={{color:C.muted,fontSize:11,flexShrink:0}}>{p.progress}%</span></div>
    </Card>)}
  </div>);

  /* ═══ WEBSITES ═══ */
  const WebsitesPage=()=>(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{color:C.muted,fontSize:12}}>{D.websites.length} Websites</span><Btn sm onClick={()=>openM("website")}>+ Website</Btn>
    </div>
    {D.websites.map(w=><Card key={w.id} onClick={()=>openM("website",w)} sx={{marginBottom:8,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{color:C.white,fontSize:14,fontWeight:600}}>{w.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{w.url} · {w.hosting}{w.footerLink?" · Footer-Link ✓":""}</div></div>
        <Badge color={WEB_C[w.status]||C.muted}>{w.status}</Badge>
      </div>
    </Card>)}
  </div>);

  /* ═══ TASKS ═══ */
  const TasksPage=()=>{
    const cats=["Alle",...new Set(D.tasks.map(t=>t.category))];const[filter,setFilter]=useState("Alle");
    const filtered=filter==="Alle"?D.tasks:D.tasks.filter(t=>t.category===filter);
    const toggle=id=>upd("tasks",ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
    const done=filtered.filter(t=>t.done).length;
    return(<div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:4,overflowX:"auto"}}>{cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:"5px 12px",fontSize:11,borderRadius:6,cursor:"pointer",background:filter===c?C.accentDim:"transparent",color:filter===c?C.accent:C.muted,border:`1px solid ${filter===c?C.accentSoft:C.border}`,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>{c}</button>)}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:C.muted,fontSize:11}}>{done}/{filtered.length} erledigt</span>
          <Btn sm onClick={()=>openM("task")}>+ Task</Btn>
        </div>
      </div>
      {[...filtered.filter(t=>!t.done),...filtered.filter(t=>t.done)].map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:4,opacity:t.done?.5:1}}>
        <div onClick={()=>toggle(t.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${t.done?C.green:t.priority==="Hoch"?C.red:C.accent}`,background:t.done?C.green+"30":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.green,flexShrink:0}}>{t.done&&"✓"}</div>
        <div style={{flex:1}}><div style={{color:t.done?C.dim:C.off,fontSize:12,textDecoration:t.done?"line-through":"none"}}>{t.text}</div>{t.due&&<span style={{color:C.dim,fontSize:10}}>Bis: {fdt(t.due)}</span>}</div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          <Badge color={t.priority==="Hoch"?C.red:t.priority==="Mittel"?C.orange:C.dim}>{t.priority}</Badge>
          <Badge color={t.category==="Outreach"?C.cyan:t.category==="Ads"?C.blue:t.category==="Vertrieb"?C.purple:C.accent}>{t.category}</Badge>
        </div>
      </div>)}
    </div>);
  };

  /* ═══ SOPs ═══ */
  const SOPsPage=()=>{
    const[active,setActive]=useState(null);
    const toggleStep=(sopId,stepId)=>upd("sops",ss=>ss.map(s=>s.id===sopId?{...s,steps:s.steps.map(st=>st.id===stepId?{...st,done:!st.done}:st)}:s));
    const resetSop=id=>upd("sops",ss=>ss.map(s=>s.id===id?{...s,steps:s.steps.map(st=>({...st,done:false}))}:s));
    return(<div className="fade">
      <Section title="STANDARD-PROZESSE (SOPs)">
        <div style={{color:C.dim,fontSize:11,marginBottom:16}}>Wiederholbare Checklisten für konsistente Qualität. Nutze "Reset" um sie für den nächsten Durchlauf zurückzusetzen.</div>
        {D.sops.map(sop=>{const done=sop.steps.filter(s=>s.done).length;const total=sop.steps.length;const isOpen=active===sop.id;
          return(<Card key={sop.id} sx={{marginBottom:8,padding:0,overflow:"hidden"}}>
            <div onClick={()=>setActive(isOpen?null:sop.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:16,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{color:C.off,fontSize:14,fontWeight:600}}>{sop.name}</div>
                <Badge color={sop.category==="Vertrieb"?C.purple:sop.category==="Delivery"?C.accent:sop.category==="Outreach"?C.cyan:C.blue}>{sop.category}</Badge>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:done===total?C.green:C.muted,fontSize:11}}>{done}/{total}</span>
                <span style={{color:C.dim,fontSize:14,transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>
            </div>
            {isOpen&&<div style={{borderTop:`1px solid ${C.border}`,padding:16}}>
              <div style={{marginBottom:12}}><Progress value={(done/total)*100} color={done===total?C.green:C.accent}/></div>
              {sop.steps.map(st=><div key={st.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0"}}>
                <div onClick={()=>toggleStep(sop.id,st.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${st.done?C.green:C.border}`,background:st.done?C.green+"30":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.green,flexShrink:0}}>{st.done&&"✓"}</div>
                <span style={{color:st.done?C.dim:C.off,fontSize:12,textDecoration:st.done?"line-through":"none"}}>{st.text}</span>
              </div>)}
              <div style={{marginTop:12}}><Btn sm ghost onClick={()=>resetSop(sop.id)}>↻ Reset für nächsten Durchlauf</Btn></div>
            </div>}
          </Card>);
        })}
      </Section>
    </div>);
  };

  /* ═══ FINANCES ═══ */
  const FinancesPage=()=>{
    const F=D.finances;const tc=Object.values(F.monthly).reduce((s,v)=>s+v,0);
    return(<div className="fade">
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <Stat label="Kosten/Monat" value={eur(tc)} color={C.red} icon="◇"/>
        <Stat label="Umsatz" value={eur(F.revenue)} color={C.green} icon="★"/>
        <Stat label="Ergebnis" value={eur(F.revenue-tc)} color={F.revenue-tc>=0?C.green:C.red}/>
        <Stat label="Break-Even" value={`${Math.ceil(tc/1500*30)} Tage`} sub="bei 1.500€/Auftrag" color={C.accent}/>
      </div>
      <Section title="MONATLICHE FIXKOSTEN">
        {Object.entries(F.monthly).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:4}}>
          <span style={{color:C.off,fontSize:13}}>{k==="ads"?"Google Ads":k==="workspace"?"Google Workspace":k==="instantly"?"Instantly.ai":k==="domains"?"Domains (3x)":k==="outscraper"?"Outscraper":k==="loom"?"Loom":"—"}</span>
          <span style={{color:C.accent,fontSize:14,fontWeight:700}}>{eur(v)}</span>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",background:C.accentDim,borderRadius:8,marginTop:8}}>
          <span style={{color:C.accent,fontSize:13,fontWeight:700}}>Gesamt</span>
          <span style={{color:C.accent,fontSize:16,fontWeight:700}}>{eur(tc)}/Monat</span>
        </div>
      </Section>
      <Section title="BREAK-EVEN">
        <Card sx={{padding:16}}>
          <div style={{color:C.off,fontSize:12,lineHeight:2}}>
            Monatliche Kosten: <strong style={{color:C.red}}>{eur(tc)}</strong><br/>
            Ø Auftragswert: <strong style={{color:C.accent}}>~{eur(1500)}</strong><br/>
            → <strong style={{color:C.green}}>1 Auftrag deckt ~{Math.round(1500/tc)} Monate</strong> Betriebskosten<br/>
            → Erster Kunde = sofort profitabel
          </div>
        </Card>
      </Section>
    </div>);
  };

  /* ═══ NOTES ═══ */
  const NotesPage=()=>{
    const[text,setText]=useState("");
    const add=()=>{if(!text.trim())return;upd("notes",n=>[...n,{id:nid(),text,date:new Date().toISOString()}]);setText("")};
    return(<div className="fade">
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Notiz hinzufügen..." rows={2} onKeyDown={e=>{if(e.key==="Enter"&&e.metaKey)add()}} style={{flex:1,padding:"10px 14px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.white,fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/>
        <Btn onClick={add} sx={{alignSelf:"flex-end"}}>Speichern</Btn>
      </div>
      {D.notes.length===0?<Empty text="Keine Notizen"/>:[...D.notes].reverse().map(n=><Card key={n.id} sx={{marginBottom:6,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{color:C.dim,fontSize:10}}>{new Date(n.date).toLocaleString("de-DE")}</span>
          <div onClick={()=>upd("notes",ns=>ns.filter(x=>x.id!==n.id))} style={{cursor:"pointer",color:C.dim,fontSize:12}}>✕</div>
        </div>
        <div style={{color:C.off,fontSize:12,whiteSpace:"pre-wrap"}}>{n.text}</div>
      </Card>)}
    </div>);
  };

  /* ═══ SETTINGS ═══ */
  const SettingsPage=()=>{
    const[newPin,setNewPin]=useState("");
    return(<div className="fade">
      <Section title="SICHERHEIT">
        <Card sx={{padding:16}}>
          <div style={{color:C.off,fontSize:12,marginBottom:10}}>PIN-Schutz: {D.pin?"Aktiv ✓":"Nicht gesetzt"}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="password" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder={D.pin?"Neuer PIN":"PIN setzen"} maxLength={8} style={{width:150,padding:"8px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:6,color:C.white,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}/>
            <Btn sm onClick={()=>{if(newPin.length>=4){upd("pin",()=>newPin);setNewPin("")}}}>{D.pin?"Ändern":"Setzen"}</Btn>
            {D.pin&&<Btn sm danger onClick={()=>upd("pin",()=>"")}>Entfernen</Btn>}
          </div>
          {newPin&&newPin.length<4&&<div style={{color:C.orange,fontSize:10,marginTop:4}}>Mindestens 4 Zeichen</div>}
        </Card>
      </Section>
      <Section title="DATEN">
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn ghost onClick={()=>{const b=new Blob([JSON.stringify(D,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`elevo-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()}}>Backup exportieren</Btn>
          <Btn ghost onClick={()=>{const i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);setD(d)}catch{alert("Ungültige Datei")}};r.readAsText(f)}};i.click()}}>Backup importieren</Btn>
          <Btn danger onClick={()=>{if(confirm("Alle Daten zurücksetzen? Das kann nicht rückgängig gemacht werden.")){setD(INIT)}}}>Zurücksetzen</Btn>
        </div>
      </Section>
      <Section title="ÜBER">
        <Card sx={{padding:16}}>
          <div style={{color:C.accent,fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,letterSpacing:".2em",marginBottom:8}}>E L E V O</div>
          <div style={{color:C.off,fontSize:12,lineHeight:1.8}}>
            Command Center v6.1 · Production Build<br/>
            11 Module: Dashboard · Pipeline · Kontakte · Cold Outreach · Google Ads · Projekte · Websites · Tasks · SOPs · Finanzen · Notizen<br/>
            Deployed via Coolify auf Hetzner CX33
          </div>
        </Card>
      </Section>
    </div>);
  };


  /* ═══ MODALS ═══ */
  const DealModal=()=>{const[f,sF]=useState(md.id?{...md}:{company:"",contact:"",email:"",phone:"",status:"Lead",service:"Website",volume:"",followUp:"",notes:"",source:"",created:new Date().toISOString().slice(0,10)});
    const sv=()=>{if(!f.company)return;const d={...f,volume:parseFloat(f.volume)||0,id:f.id||nid()};upd("pipeline",p=>f.id?p.map(x=>x.id===f.id?d:x):[...p,d]);closeM()};
    return(<Modal open title={f.id?"Deal bearbeiten":"Neuer Deal"} onClose={closeM}>
      <Field label="Unternehmen" value={f.company} onChange={v=>sF(p=>({...p,company:v}))} placeholder="Firmenname"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Kontaktperson" value={f.contact} onChange={v=>sF(p=>({...p,contact:v}))}/><Field label="E-Mail" value={f.email} onChange={v=>sF(p=>({...p,email:v}))}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Status" value={f.status} onChange={v=>sF(p=>({...p,status:v}))} options={[...STAGES,"Verloren","Pausiert"]}/><Field label="Service" value={f.service} onChange={v=>sF(p=>({...p,service:v}))} options={["Website","Digitaler Audit","Strategie-Session","Komplettpaket","Sonstiges"]}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}><Field label="Volumen (€)" value={f.volume} onChange={v=>sF(p=>({...p,volume:v}))} type="number" placeholder="1500"/><Field label="Follow-up" value={f.followUp} onChange={v=>sF(p=>({...p,followUp:v}))} type="date"/><Field label="Quelle" value={f.source} onChange={v=>sF(p=>({...p,source:v}))} options={["Cold E-Mail","Loom","Google Ads","Empfehlung","Direktansprache","Website","Sonstige"]}/></div>
      <Field label="Notizen" value={f.notes} onChange={v=>sF(p=>({...p,notes:v}))} rows={3}/>
      <div style={{display:"flex",gap:8,marginTop:16}}><Btn accent onClick={sv}>Speichern</Btn>{f.id&&<Btn danger onClick={()=>{upd("pipeline",p=>p.filter(d=>d.id!==f.id));closeM()}}>Löschen</Btn>}</div>
    </Modal>);
  };

  const ContactModal=()=>{const[f,sF]=useState(md.id?{...md}:{firstName:"",lastName:"",company:"",email:"",phone:"",source:"",tags:[],notes:""});
    const sv=()=>{if(!f.firstName)return;upd("contacts",cs=>f.id?cs.map(x=>x.id===f.id?f:x):[...cs,{...f,id:nid(),lastContact:new Date().toISOString().slice(0,10)}]);closeM()};
    return(<Modal open title={f.id?"Kontakt bearbeiten":"Neuer Kontakt"} onClose={closeM}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Vorname" value={f.firstName} onChange={v=>sF(p=>({...p,firstName:v}))}/><Field label="Nachname" value={f.lastName} onChange={v=>sF(p=>({...p,lastName:v}))}/></div>
      <Field label="Unternehmen" value={f.company} onChange={v=>sF(p=>({...p,company:v}))}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="E-Mail" value={f.email} onChange={v=>sF(p=>({...p,email:v}))}/><Field label="Telefon" value={f.phone} onChange={v=>sF(p=>({...p,phone:v}))}/></div>
      <Field label="Quelle" value={f.source} onChange={v=>sF(p=>({...p,source:v}))} options={["Netzwerk","Cold Outreach","Google Ads","Empfehlung","Loom","Sonstige"]}/>
      <Field label="Notizen" value={f.notes} onChange={v=>sF(p=>({...p,notes:v}))} rows={2}/>
      <div style={{display:"flex",gap:8,marginTop:16}}><Btn accent onClick={sv}>Speichern</Btn>{f.id&&<Btn danger onClick={()=>{upd("contacts",cs=>cs.filter(x=>x.id!==f.id));closeM()}}>Löschen</Btn>}</div>
    </Modal>);
  };

  const TaskModal=()=>{const[f,sF]=useState(md.id?{...md}:{text:"",priority:"Mittel",category:"Allgemein",due:""});
    const sv=()=>{if(!f.text)return;upd("tasks",ts=>f.id?ts.map(x=>x.id===f.id?f:x):[...ts,{...f,id:nid(),done:false}]);closeM()};
    return(<Modal open title="Task" onClose={closeM}>
      <Field label="Aufgabe" value={f.text} onChange={v=>sF(p=>({...p,text:v}))}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <Field label="Priorität" value={f.priority} onChange={v=>sF(p=>({...p,priority:v}))} options={["Hoch","Mittel","Niedrig"]}/>
        <Field label="Kategorie" value={f.category} onChange={v=>sF(p=>({...p,category:v}))} options={["Outreach","Ads","Projekte","Vertrieb","Allgemein"]}/>
        <Field label="Fällig" value={f.due} onChange={v=>sF(p=>({...p,due:v}))} type="date"/>
      </div>
      <div style={{display:"flex",gap:8,marginTop:16}}><Btn accent onClick={sv}>Speichern</Btn></div>
    </Modal>);
  };

  const ProjectModal=()=>{const[f,sF]=useState(md.id?{...md}:{name:"",client:"",status:"Planung",deadline:"",progress:0,notes:""});
    const sv=()=>{if(!f.name)return;upd("projects",ps=>f.id?ps.map(x=>x.id===f.id?{...f,progress:parseInt(f.progress)||0}:x):[...ps,{...f,id:nid(),progress:parseInt(f.progress)||0}]);closeM()};
    return(<Modal open title={f.id?"Projekt bearbeiten":"Neues Projekt"} onClose={closeM}>
      <Field label="Name" value={f.name} onChange={v=>sF(p=>({...p,name:v}))}/><Field label="Kunde" value={f.client} onChange={v=>sF(p=>({...p,client:v}))}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <Field label="Status" value={f.status} onChange={v=>sF(p=>({...p,status:v}))} options={["Planung","In Arbeit","Review","Abgeschlossen","Pausiert"]}/>
        <Field label="Deadline" value={f.deadline} onChange={v=>sF(p=>({...p,deadline:v}))} type="date"/><Field label="Fortschritt %" value={f.progress} onChange={v=>sF(p=>({...p,progress:v}))} type="number"/>
      </div>
      <Field label="Notizen" value={f.notes} onChange={v=>sF(p=>({...p,notes:v}))} rows={2}/>
      <div style={{display:"flex",gap:8,marginTop:16}}><Btn accent onClick={sv}>Speichern</Btn>{f.id&&<Btn danger onClick={()=>{upd("projects",ps=>ps.filter(x=>x.id!==f.id));closeM()}}>Löschen</Btn>}</div>
    </Modal>);
  };

  const WebsiteModal=()=>{const[f,sF]=useState(md.id?{...md}:{name:"",url:"",status:"Entwurf",hosting:"Hetzner/Coolify",footerLink:true});
    const sv=()=>{if(!f.name)return;upd("websites",ws=>f.id?ws.map(x=>x.id===f.id?f:x):[...ws,{...f,id:nid()}]);closeM()};
    return(<Modal open title={f.id?"Website bearbeiten":"Neue Website"} onClose={closeM}>
      <Field label="Name" value={f.name} onChange={v=>sF(p=>({...p,name:v}))}/><Field label="Domain" value={f.url} onChange={v=>sF(p=>({...p,url:v}))}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Status" value={f.status} onChange={v=>sF(p=>({...p,status:v}))} options={["Entwurf","Entwicklung","Live","Wartung","Offline"]}/><Field label="Hosting" value={f.hosting} onChange={v=>sF(p=>({...p,hosting:v}))}/></div>
      <div style={{display:"flex",gap:8,marginTop:16}}><Btn accent onClick={sv}>Speichern</Btn>{f.id&&<Btn danger onClick={()=>{upd("websites",ws=>ws.filter(x=>x.id!==f.id));closeM()}}>Löschen</Btn>}</div>
    </Modal>);
  };


  /* ═══ NAVIGATION ═══ */
  const TABS=[
    {id:"dashboard",icon:"◆",label:"Dashboard"},
    {id:"pipeline",icon:"◈",label:"Pipeline"},
    {id:"contacts",icon:"♦",label:"Kontakte"},
    {id:"outreach",icon:"✉",label:"Outreach"},
    {id:"ads",icon:"◎",label:"Ads"},
    {id:"projects",icon:"▣",label:"Projekte"},
    {id:"websites",icon:"◐",label:"Websites"},
    {id:"tasks",icon:"☐",label:"Tasks"},
    {id:"sops",icon:"✓",label:"SOPs"},
    {id:"finances",icon:"◇",label:"Finanzen"},
    {id:"notes",icon:"✎",label:"Notizen"},
    {id:"settings",icon:"⚙",label:"Settings"},
  ];

  const pages={dashboard:DashboardPage,pipeline:PipelinePage,contacts:ContactsPage,outreach:OutreachPage,ads:AdsPage,projects:ProjectsPage,websites:WebsitesPage,tasks:TasksPage,sops:SOPsPage,finances:FinancesPage,notes:NotesPage,settings:SettingsPage};
  const MOBTABS=["dashboard","pipeline","outreach","tasks","sops"];
  const Page=pages[tab]||DashboardPage;
  const ct=TABS.find(t=>t.id===tab);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'DM Sans',sans-serif",background:C.bg,color:C.white,overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}.fade{animation:fi .2s ease}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}select option{background:${C.panel};color:${C.white}}input:focus,select:focus,textarea:focus{outline:none;border-color:${C.accent}!important}`}</style>

      {/* SIDEBAR Desktop */}
      {!mob&&<div style={{position:"fixed",left:0,top:0,bottom:0,width:200,background:C.panel,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",zIndex:10}}>
        <div style={{padding:"20px 18px 16px"}}>
          <div style={{color:C.accent,fontFamily:"'Cormorant Garamond',serif",fontSize:19,letterSpacing:".28em",fontWeight:700}}>E L E V O</div>
          <div style={{color:C.dim,fontSize:9,letterSpacing:".1em",marginTop:3}}>COMMAND CENTER</div>
        </div>
        <div style={{height:1,background:C.border,margin:"0 16px 8px"}}/>
        <nav style={{flex:1,padding:"0 8px",overflowY:"auto"}}>
          {TABS.map(t=><div key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:6,marginBottom:2,cursor:"pointer",background:tab===t.id?C.accentDim:"transparent",color:tab===t.id?C.accent:C.muted,transition:"all .15s"}}>
            <span style={{fontSize:13,width:18,textAlign:"center"}}>{t.icon}</span>
            <span style={{fontSize:12,fontWeight:tab===t.id?600:400}}>{t.label}</span>
          </div>)}
        </nav>
        <div style={{padding:16,borderTop:`1px solid ${C.border}`}}>
          <div style={{color:C.dim,fontSize:10,textAlign:"center"}}>Kosten: <span style={{color:C.orange}}>{eur(monthlyCost)}</span>/Mo</div>
          <div style={{color:C.dim,fontSize:10,textAlign:"center",marginTop:2}}>Pipeline: <span style={{color:C.accent}}>{eur(pVal)}</span></div>
        </div>
      </div>}

      {/* MAIN */}
      <div style={{flex:1,marginLeft:mob?0:200,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:mob?"12px 16px":"12px 24px",borderBottom:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {mob&&<span onClick={()=>setSideOpen(!sideOpen)} style={{cursor:"pointer",fontSize:18,color:C.muted}}>☰</span>}
            {mob&&<span style={{color:C.accent,fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:700,letterSpacing:".2em"}}>ELEVO</span>}
            <span style={{color:C.white,fontSize:14,fontWeight:600}}>{ct?.icon} {ct?.label}</span>
          </div>
          <Badge color={C.green}>{D.pipeline.filter(d=>!["Verloren","Pausiert"].includes(d.status)).length} Deals</Badge>
        </div>
        <div style={{flex:1,overflow:"auto",padding:mob?16:24}}><Page/></div>
      </div>

      {/* MOBILE NAV */}
      {mob&&<div style={{display:"flex",borderTop:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
        {TABS.filter(t=>MOBTABS.includes(t.id)).map(t=><div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,textAlign:"center",padding:"10px 0",cursor:"pointer"}}>
          <div style={{fontSize:15,color:tab===t.id?C.accent:C.dim}}>{t.icon}</div>
          <div style={{fontSize:8,color:tab===t.id?C.accent:C.dim,marginTop:2}}>{t.label}</div>
        </div>)}
        <div onClick={()=>setSideOpen(true)} style={{flex:1,textAlign:"center",padding:"10px 0",cursor:"pointer"}}>
          <div style={{fontSize:15,color:C.dim}}>≡</div><div style={{fontSize:8,color:C.dim,marginTop:2}}>Mehr</div>
        </div>
      </div>}

      {/* MOBILE SLIDE MENU */}
      {mob&&sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:50}}>
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:0,top:0,bottom:0,width:220,background:C.panel,padding:16,overflowY:"auto"}}>
          <div style={{color:C.accent,fontFamily:"'Cormorant Garamond',serif",fontSize:18,letterSpacing:".25em",fontWeight:700,marginBottom:16}}>E L E V O</div>
          {TABS.map(t=><div key={t.id} onClick={()=>{setTab(t.id);setSideOpen(false)}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,marginBottom:2,cursor:"pointer",background:tab===t.id?C.accentDim:"transparent",color:tab===t.id?C.accent:C.muted}}>
            <span style={{fontSize:13}}>{t.icon}</span><span style={{fontSize:12}}>{t.label}</span>
          </div>)}
        </div>
      </div>}

      {/* MODALS */}
      {modal==="deal"&&<DealModal/>}
      {modal==="contact"&&<ContactModal/>}
      {modal==="task"&&<TaskModal/>}
      {modal==="project"&&<ProjectModal/>}
      {modal==="website"&&<WebsiteModal/>}
    </div>
  );
}

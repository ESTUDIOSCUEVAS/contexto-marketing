const STORAGE_KEY = "marketing-context-activity-v1";
const dimensions = [
  "Social","Emocional","Económico","Cultural","Digital","Competencia",
  "Temporal","Geográfico","Tendencias","Hábitos","Experiencia","Académico"
];

let currentStep = 1;
const totalSteps = 6;
const form = document.getElementById("activityForm");
const steps = [...document.querySelectorAll(".step")];
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progressBar = document.getElementById("progressBar");
const progressPct = document.getElementById("progressPct");
const stepLabel = document.getElementById("stepLabel");
const saveStatus = document.getElementById("saveStatus");

const state = {
  selectedDimensions: [],
  dimensionNotes: {},
  facts: ["","",""],
  assumptions: ["","",""],
  questions: ["","","","",""]
};

function el(id){ return document.getElementById(id); }

function renderDots(){
  const wrap = el("stepDots");
  wrap.innerHTML = "";
  for(let i=1;i<=totalSteps;i++){
    const dot = document.createElement("span");
    dot.className = "step-dot" + (i < currentStep ? " done" : i === currentStep ? " current" : "");
    wrap.appendChild(dot);
  }
}

function updateStep(){
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === currentStep));
  prevBtn.disabled = currentStep === 1;
  nextBtn.style.display = currentStep === totalSteps ? "none" : "";
  const pct = Math.round((currentStep/totalSteps)*100);
  progressBar.style.width = pct + "%";
  progressPct.textContent = pct + "%";
  stepLabel.textContent = `Paso ${currentStep} de ${totalSteps}`;
  renderDots();
  window.scrollTo({top:0, behavior:"smooth"});
}

function markInvalid(node, message){
  node.classList.add("invalid");
  let note = node.parentElement.querySelector(".error-note");
  if(!note){
    note = document.createElement("div");
    note.className = "error-note";
    node.parentElement.appendChild(note);
  }
  note.textContent = message;
}
function clearErrors(){
  document.querySelectorAll(".invalid").forEach(n => n.classList.remove("invalid"));
  document.querySelectorAll(".error-note").forEach(n => n.remove());
}

function validateStep(step){
  clearErrors();
  if(step === 1){
    const s = el("situation");
    const c = el("initialChallenge");
    if(!s.value.trim()){ markInvalid(s,"Describe brevemente la situación."); return false; }
    if(!c.value.trim()){ markInvalid(c,"Define el reto inicial."); return false; }
  }
  if(step === 2){
    if(state.selectedDimensions.length < 5){
      const picker = el("dimensionPicker");
      let note = picker.parentElement.querySelector(".error-note");
      if(!note){ note = document.createElement("div"); note.className="error-note"; picker.insertAdjacentElement("afterend",note); }
      note.textContent = "Selecciona al menos 5 dimensiones.";
      return false;
    }
    const empty = state.selectedDimensions.find(d => !(state.dimensionNotes[d]||"").trim());
    if(empty){
      const ta = document.querySelector(`[data-dimension="${CSS.escape(empty)}"]`);
      if(ta) markInvalid(ta,"Explica qué ocurre en esta dimensión.");
      return false;
    }
  }
  if(step === 4){
    syncQuestionState();
    const filled = state.questions.filter(q => q.trim());
    if(filled.length < 5){
      markInvalid(document.querySelector(".question-row input"),"Escribe al menos 5 preguntas clave.");
      return false;
    }
  }
  if(step === 5){
    if(!el("businessObjective").value.trim()){ markInvalid(el("businessObjective"),"Define el objetivo del negocio."); return false; }
    if(!el("marketingObjective").value.trim()){ markInvalid(el("marketingObjective"),"Define el objetivo de marketing."); return false; }
  }
  return true;
}

prevBtn.addEventListener("click", () => {
  if(currentStep > 1){ currentStep--; updateStep(); }
});
nextBtn.addEventListener("click", () => {
  syncDynamicState();
  if(validateStep(currentStep) && currentStep < totalSteps){
    currentStep++;
    updateStep();
    save();
  }
});

function renderDimensionPicker(){
  const wrap = el("dimensionPicker");
  wrap.innerHTML = "";
  dimensions.forEach(d => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.selectedDimensions.includes(d) ? " selected" : "");
    b.textContent = d;
    b.addEventListener("click", () => {
      if(state.selectedDimensions.includes(d)){
        state.selectedDimensions = state.selectedDimensions.filter(x => x !== d);
      } else {
        state.selectedDimensions.push(d);
      }
      renderDimensionPicker();
      renderDimensionFields();
      save();
    });
    wrap.appendChild(b);
  });
  el("dimensionCount").textContent = state.selectedDimensions.length;
}
function renderDimensionFields(){
  const wrap = el("dimensionFields");
  wrap.innerHTML = "";
  state.selectedDimensions.forEach(d => {
    const card = document.createElement("label");
    card.className = "dimension-card";
    const strong = document.createElement("strong");
    strong.textContent = d;
    const ta = document.createElement("textarea");
    ta.rows = 4;
    ta.dataset.dimension = d;
    ta.placeholder = "¿Qué está ocurriendo aquí que podría influir en el resultado?";
    ta.value = state.dimensionNotes[d] || "";
    ta.addEventListener("input", () => {
      state.dimensionNotes[d] = ta.value;
      save();
    });
    card.append(strong, ta);
    wrap.appendChild(card);
  });
}

function makeRepeatRow(value, kind, index){
  const row = document.createElement("div");
  row.className = "repeat-row";
  const input = document.createElement("input");
  input.value = value || "";
  input.placeholder = kind === "fact" ? "Hecho / dato disponible" : "Suposición / hipótesis";
  input.dataset.kind = kind;
  input.dataset.index = index;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-row";
  remove.textContent = "×";
  remove.setAttribute("aria-label","Eliminar fila");
  remove.addEventListener("click", () => {
    const arr = kind === "fact" ? state.facts : state.assumptions;
    arr.splice(index,1);
    renderRepeaters();
    save();
  });
  input.addEventListener("input", syncRepeatState);
  row.append(input, remove);
  return row;
}
function renderRepeaters(){
  const facts = el("factsList");
  const ass = el("assumptionsList");
  facts.innerHTML = ""; ass.innerHTML = "";
  state.facts.forEach((v,i) => facts.appendChild(makeRepeatRow(v,"fact",i)));
  state.assumptions.forEach((v,i) => ass.appendChild(makeRepeatRow(v,"assumption",i)));
}
function syncRepeatState(){
  document.querySelectorAll('input[data-kind="fact"]').forEach(i => state.facts[Number(i.dataset.index)] = i.value);
  document.querySelectorAll('input[data-kind="assumption"]').forEach(i => state.assumptions[Number(i.dataset.index)] = i.value);
  save();
}
document.querySelectorAll(".add-row").forEach(btn => {
  btn.addEventListener("click", () => {
    syncRepeatState();
    const kind = btn.dataset.kind;
    (kind === "fact" ? state.facts : state.assumptions).push("");
    renderRepeaters();
    save();
  });
});

function renderQuestions(){
  const wrap = el("questionsList");
  wrap.innerHTML = "";
  state.questions.forEach((q,i) => {
    const row = document.createElement("div");
    row.className = "question-row";
    const idx = document.createElement("div");
    idx.className = "question-index";
    idx.textContent = i+1;
    const input = document.createElement("input");
    input.value = q;
    input.placeholder = "Escribe una pregunta que todavía necesites responder…";
    input.dataset.qindex = i;
    input.addEventListener("input", () => { state.questions[i] = input.value; save(); });
    const remove = document.createElement("button");
    remove.type="button"; remove.className="remove-row"; remove.textContent="×";
    remove.setAttribute("aria-label","Eliminar pregunta");
    remove.addEventListener("click", () => {
      if(state.questions.length <= 5) return;
      state.questions.splice(i,1);
      renderQuestions(); save();
    });
    row.append(idx,input,remove);
    wrap.appendChild(row);
  });
}
function syncQuestionState(){
  document.querySelectorAll("[data-qindex]").forEach(i => state.questions[Number(i.dataset.qindex)] = i.value);
}
el("addQuestionBtn").addEventListener("click", () => {
  if(state.questions.length < 8){
    syncQuestionState(); state.questions.push(""); renderQuestions(); save();
  }
});

function collectStaticFields(){
  const ids = [
    "projectName","projectType","situation","initialChallenge",
    "businessObjective","marketingObjective",
    "closureContext","closureChallenge","closureObjective","closureNeed"
  ];
  const out = {};
  ids.forEach(id => out[id] = el(id).value);
  return out;
}
function syncDynamicState(){
  syncRepeatState();
  syncQuestionState();
  state.selectedDimensions.forEach(d => {
    const ta = document.querySelector(`[data-dimension="${CSS.escape(d)}"]`);
    if(ta) state.dimensionNotes[d] = ta.value;
  });
}
function save(){
  syncQuestionState();
  const payload = {
    currentStep,
    fields: collectStaticFields(),
    selectedDimensions: state.selectedDimensions,
    dimensionNotes: state.dimensionNotes,
    facts: state.facts,
    assumptions: state.assumptions,
    questions: state.questions
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  saveStatus.textContent = "Guardado";
  clearTimeout(save._t);
  save._t = setTimeout(() => saveStatus.textContent = "Guardado automático", 900);
}
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const p = JSON.parse(raw);
    if(p.fields) Object.entries(p.fields).forEach(([id,v]) => { if(el(id)) el(id).value = v || ""; });
    state.selectedDimensions = Array.isArray(p.selectedDimensions) ? p.selectedDimensions : [];
    state.dimensionNotes = p.dimensionNotes || {};
    state.facts = Array.isArray(p.facts) && p.facts.length ? p.facts : ["","",""];
    state.assumptions = Array.isArray(p.assumptions) && p.assumptions.length ? p.assumptions : ["","",""];
    state.questions = Array.isArray(p.questions) && p.questions.length ? p.questions : ["","","","",""];
    currentStep = Math.min(Math.max(Number(p.currentStep)||1,1),6);
  }catch(e){}
}

form.addEventListener("input", e => {
  if(e.target.id === "situation") el("situationCount").textContent = e.target.value.length;
  save();
});

el("resetBtn").addEventListener("click", () => {
  if(!confirm("¿Quieres borrar toda la actividad y comenzar de nuevo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

el("exampleBtn").addEventListener("click", () => {
  if(!confirm("¿Cargar el ejemplo Reset Night? Reemplazará la información actual.")) return;
  const ex = {
    projectName:"Reset Night",
    projectType:"Evento",
    situation:"Promocionar una fiesta universitaria de fin de semestre en diciembre, con múltiples opciones de entretenimiento compitiendo por el tiempo y presupuesto del público.",
    initialChallenge:"Lograr alta asistencia y evitar que Reset Night sea percibida como “una fiesta más”.",
    businessObjective:"Vender al menos 280 accesos antes del evento.",
    marketingObjective:"Lograr que Reset Night sea percibida como una experiencia relevante de cierre de semestre y generar intención de compra.",
    closureContext:"El cierre de semestre combina cansancio, necesidad de desconexión, convivencia y competencia con otros planes.",
    closureChallenge:"Hacer que Reset Night sea relevante y valga el tiempo y dinero del estudiante.",
    closureObjective:"Posicionar la fiesta como una recompensa de fin de semestre que motive la compra anticipada.",
    closureNeed:"Qué motiva realmente la asistencia y cuáles barreras pesan más en la decisión."
  };
  Object.entries(ex).forEach(([id,v]) => el(id).value = v);
  state.selectedDimensions = ["Académico","Social","Económico","Temporal","Competencia"];
  state.dimensionNotes = {
    Académico:"Cierre de semestre, exámenes, entregas, cansancio y necesidad de liberar estrés.",
    Social:"La salida se vive en grupo; influye saber quién más asistirá.",
    Económico:"Presupuesto limitado y comparación con otras formas de gastar.",
    Temporal:"Diciembre concentra posadas, cierres, vacaciones y otros eventos.",
    Competencia:"Otras fiestas, antros, reuniones privadas y la opción de descansar."
  };
  state.facts = [
    "El evento se realizará el 12 de diciembre.",
    "La preventa cuesta $180 y el precio el día del evento es $250.",
    "La capacidad del venue es de 350 personas."
  ];
  state.assumptions = [
    "El precio podría ser una barrera importante.",
    "Los estudiantes podrían decidir principalmente en grupo.",
    "El público podría buscar una recompensa después de finales."
  ];
  state.questions = [
    "¿Qué los motiva realmente a asistir?",
    "¿Qué podría hacer que el evento se sienta imperdible?",
    "¿Contra qué otras opciones compite?",
    "¿Qué tan importante es el precio en la decisión?",
    "¿Qué experiencias o promociones valoran más?"
  ];
  currentStep = 1;
  renderAll();
  save();
  updateStep();
});

function renderAll(){
  renderDimensionPicker();
  renderDimensionFields();
  renderRepeaters();
  renderQuestions();
  el("situationCount").textContent = el("situation").value.length;
}

function addWrappedText(doc, text, x, y, width, lineHeight=5.2, fontSize=10){
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text || "—", width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}
function pdfSection(doc, title, y){
  if(y > 260){ doc.addPage(); y = 20; }
  doc.setFillColor(240,232,255);
  doc.roundedRect(15,y-5,180,10,3,3,"F");
  doc.setTextColor(89,35,145);
  doc.setFont("helvetica","bold");
  doc.setFontSize(12);
  doc.text(title,20,y+1.5);
  doc.setTextColor(20,22,42);
  return y+13;
}
function ensurePage(doc, y, needed=25){
  if(y + needed > 282){ doc.addPage(); return 20; }
  return y;
}

el("downloadPdfBtn").addEventListener("click", () => {
  syncDynamicState();
  save();
  const status = el("pdfStatus");
  if(!window.jspdf || !window.jspdf.jsPDF){
    status.textContent = "No se pudo cargar el generador de PDF. Usa Imprimir → Guardar como PDF.";
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"mm",format:"a4"});
  const purple = [109,40,217];
  let y = 20;

  doc.setFillColor(...purple);
  doc.rect(0,0,210,34,"F");
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold");
  doc.setFontSize(20);
  doc.text("Análisis de Contexto y Objetivo",15,16);
  doc.setFont("helvetica","normal");
  doc.setFontSize(10);
  doc.text((el("projectName").value || "Actividad de Marketing").slice(0,80),15,24);
  doc.setTextColor(20,22,42);
  y = 47;

  y = pdfSection(doc,"1. Situación",y);
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text("Tipo:",20,y);
  doc.setFont("helvetica","normal"); doc.text(el("projectType").value || "—",33,y); y += 7;
  doc.setFont("helvetica","bold"); doc.text("¿Qué está ocurriendo?",20,y); y += 5;
  doc.setFont("helvetica","normal"); y = addWrappedText(doc,el("situation").value,20,y,170);
  y += 4;
  doc.setFont("helvetica","bold"); doc.text("Reto inicial",20,y); y += 5;
  doc.setFont("helvetica","normal"); y = addWrappedText(doc,el("initialChallenge").value,20,y,170);
  y += 7;

  y = ensurePage(doc,y,35);
  y = pdfSection(doc,"2. Contexto",y);
  state.selectedDimensions.forEach(d => {
    y = ensurePage(doc,y,18);
    doc.setFont("helvetica","bold"); doc.setTextColor(89,35,145); doc.text(d,20,y);
    doc.setTextColor(20,22,42); doc.setFont("helvetica","normal");
    y = addWrappedText(doc,state.dimensionNotes[d] || "—",52,y,138,5,9.5) + 4;
  });
  y += 3;

  y = ensurePage(doc,y,35);
  y = pdfSection(doc,"3. Hechos vs. suposiciones",y);
  const facts = state.facts.filter(x=>x.trim());
  const ass = state.assumptions.filter(x=>x.trim());
  doc.setFont("helvetica","bold"); doc.setTextColor(22,101,52); doc.text("Lo que sabemos",20,y); y += 5;
  doc.setTextColor(20,22,42); doc.setFont("helvetica","normal");
  (facts.length?facts:["—"]).forEach((t,i)=>{ y=ensurePage(doc,y,10); y=addWrappedText(doc,`${i+1}. ${t}`,22,y,168,5,9.5)+2; });
  y += 3;
  doc.setFont("helvetica","bold"); doc.setTextColor(180,83,9); doc.text("Lo que creemos",20,y); y += 5;
  doc.setTextColor(20,22,42); doc.setFont("helvetica","normal");
  (ass.length?ass:["—"]).forEach((t,i)=>{ y=ensurePage(doc,y,10); y=addWrappedText(doc,`${i+1}. ${t}`,22,y,168,5,9.5)+2; });
  y += 5;

  y = ensurePage(doc,y,35);
  y = pdfSection(doc,"4. Preguntas clave",y);
  state.questions.filter(x=>x.trim()).forEach((q,i)=>{
    y=ensurePage(doc,y,10);
    y=addWrappedText(doc,`${i+1}. ${q}`,20,y,170,5,9.5)+2;
  });
  y += 5;

  y = ensurePage(doc,y,45);
  y = pdfSection(doc,"5. Objetivos",y);
  doc.setFont("helvetica","bold"); doc.setTextColor(...purple); doc.text("Objetivo del negocio",20,y); y+=5;
  doc.setFont("helvetica","normal"); doc.setTextColor(20,22,42);
  y=addWrappedText(doc,el("businessObjective").value,20,y,170,5,9.5)+5;
  doc.setFont("helvetica","bold"); doc.setTextColor(168,31,130); doc.text("Objetivo de marketing / comunicación",20,y); y+=5;
  doc.setFont("helvetica","normal"); doc.setTextColor(20,22,42);
  y=addWrappedText(doc,el("marketingObjective").value,20,y,170,5,9.5)+7;

  y = ensurePage(doc,y,55);
  y = pdfSection(doc,"6. Cierre del análisis",y);
  const closure = [
    ["El contexto nos muestra que…", el("closureContext").value],
    ["Nuestro reto principal parece ser…", el("closureChallenge").value],
    ["Nuestro objetivo será…", el("closureObjective").value],
    ["Antes de crear una solución necesitamos entender mejor…", el("closureNeed").value]
  ];
  closure.forEach(([label,val])=>{
    y=ensurePage(doc,y,17);
    doc.setFont("helvetica","bold"); doc.setTextColor(89,35,145); doc.text(label,20,y); y+=5;
    doc.setFont("helvetica","normal"); doc.setTextColor(20,22,42);
    y=addWrappedText(doc,val,20,y,170,5,9.5)+4;
  });

  const pages = doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(130,130,145);
    doc.text(`Marketing Lab · Página ${i} de ${pages}`,15,290);
  }

  const safe = (el("projectName").value || "analisis-contexto")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9-_]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();
  doc.save(`${safe || "analisis-contexto"}.pdf`);
  status.textContent = "PDF generado correctamente.";
});

load();
renderAll();
updateStep();

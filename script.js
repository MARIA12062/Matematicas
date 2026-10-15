// ==========================================
// ESTADO GLOBAL (Progreso, Economía, Dificultad)
// ==========================================
let totalSecciones = 11;
let seccionesVisitadas = JSON.parse(localStorage.getItem('mates_progreso')) || [];
let medallasGanadas = JSON.parse(localStorage.getItem('mates_medallas')) || [];
let nombreUsuario = localStorage.getItem('mates_usuario') || null;
let monedas = parseInt(localStorage.getItem('mates_monedas')) || 0;
let inventario = JSON.parse(localStorage.getItem('mates_inventario')) || [];
let accesorioEquipado = localStorage.getItem('mates_equipado') || null;

// Variables del Juego de Operaciones Aleatorias
let num1Global, num2Global, den1Global, den2Global;
let operacionActual; // Guardará '+', '-', '×', o '÷'
let respuestaCorrectaStr; 
let aciertosSeguidos = 0; 
let nivelActual = 1; 
let intentosFallidos = 0;

// Base de datos de la tienda virtual
const TIENDA = [
    { id: 'sombrero', nombre: 'Sombrero Mágico', emoji: '🎩', precio: 30, clase: 'accesorio-sombrero' },
    { id: 'gafas', nombre: 'Gafas Inteligentes', emoji: '🤓', precio: 50, clase: 'accesorio-gafas' },
    { id: 'corona', nombre: 'Corona de Rey', emoji: '👑', precio: 100, clase: 'accesorio-corona' }
];

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener("DOMContentLoaded", () => {
    totalSecciones = document.querySelectorAll('.menu-item').length || 11;
    if (localStorage.getItem('mates_theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    actualizarProgreso();
    mostrarDatosUsuario();
    calcularRacha();
    aplicarAccesorio();
    generarNuevoReto(); 
});

// Registrar Service Worker para soporte PWA Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
            .catch(err => console.log('Error al registrar Service Worker:', err));
    });
}

// ==========================================
// NAVEGACIÓN Y CONFIGURACIÓN BÁSICA
// ==========================================
function toggleMenu() { document.getElementById('sidebar').classList.toggle('abierto'); }

function mostrarSeccion(idSeccion) {
    document.getElementById('sidebar').classList.remove('abierto');
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
    
    const targetSec = document.getElementById(idSeccion);
    if(targetSec) {
        targetSec.classList.add('active');
    }
    
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active-menu'));
    let menuBtn = Array.from(document.querySelectorAll('.menu-item')).find(btn => btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(idSeccion));
    if(menuBtn) menuBtn.classList.add('active-menu');
    
    if (!seccionesVisitadas.includes(idSeccion)) {
        seccionesVisitadas.push(idSeccion); 
        localStorage.setItem('mates_progreso', JSON.stringify(seccionesVisitadas));
        actualizarProgreso();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actualizarProgreso() { 
    const barra = document.getElementById('barra-progreso');
    if(barra) {
        barra.style.width = ((seccionesVisitadas.length / totalSecciones) * 100) + "%"; 
    }
}

function toggleDarkMode() {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') { 
        body.removeAttribute('data-theme'); 
        localStorage.setItem('mates_theme', 'light'); 
    } else { 
        body.setAttribute('data-theme', 'dark'); 
        localStorage.setItem('mates_theme', 'dark'); 
    }
}

// ==========================================
// GAMIFICACIÓN: RACHA, PERFIL, ECONOMÍA Y MEDALLAS
// ==========================================
function calcularRacha() {
    let racha = parseInt(localStorage.getItem('mates_racha')) || 0;
    let ultimoIngreso = localStorage.getItem('mates_ultimo_ingreso');
    let hoy = new Date().toDateString(); 
    if (ultimoIngreso !== hoy) {
        let ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
        if (ultimoIngreso === ayer.toDateString()) racha++; else if (ultimoIngreso) racha = 1; else racha = 1; 
        localStorage.setItem('mates_racha', racha); localStorage.setItem('mates_ultimo_ingreso', hoy);
    }
    document.getElementById('mi-racha').innerText = `🔥 ${racha}`;
}

function mostrarDatosUsuario() { 
    document.getElementById('mis-medallas').innerText = `🏆 ${medallasGanadas.length}`; 
    document.getElementById('mis-monedas').innerText = `🪙 ${monedas}`;
    let btnPerfil = document.getElementById('btn-usuario');
    if(nombreUsuario) { 
        btnPerfil.innerText = `👤 ${nombreUsuario}`; 
        btnPerfil.style.background = '#2ecc71'; 
        btnPerfil.style.color = 'white';
    }
}

function sumarMonedas(c) { 
    monedas += c; 
    localStorage.setItem('mates_monedas', monedas); 
    mostrarDatosUsuario(); 
}

function ganarMedalla(n) { 
    if (!medallasGanadas.includes(n)) { 
        medallasGanadas.push(n); 
        localStorage.setItem('mates_medallas', JSON.stringify(medallasGanadas)); 
        mostrarDatosUsuario(); 
    } 
}

function abrirPerfil() { document.getElementById('modal-perfil').classList.remove('oculto'); }
function cerrarModal(id) { document.getElementById(id).classList.add('oculto'); }

function guardarPerfil() {
    let input = document.getElementById('nombre-usuario').value.trim();
    if(input !== "") { 
        nombreUsuario = input; 
        localStorage.setItem('mates_usuario', nombreUsuario); 
        mostrarDatosUsuario(); 
        cerrarModal('modal-perfil'); 
        llamarTutor(`¡Listo, ${nombreUsuario}!`); 
    }
}

// ==========================================
// TIENDA VIRTUAL
// ==========================================
function abrirTienda() {
    let contenedor = document.getElementById('productos-tienda');
    contenedor.innerHTML = "";
    TIENDA.forEach(prod => {
        let comprado = inventario.includes(prod.id);
        let equipado = accesorioEquipado === prod.id;
        let html = `<div class="producto-card">
                        <div class="producto-emoji">${prod.emoji}</div>
                        <h4>${prod.nombre}</h4>
                        <p>${comprado ? 'Tuyo' : `🪙 ${prod.precio}`}</p>
                        <button class="btn" style="background:${comprado ? '#27ae60' : '#3498db'}; width:100%;" 
                            onclick="${comprado ? `equipar('${prod.id}')` : `comprar('${prod.id}',${prod.precio})`}">
                            ${equipado ? 'Puesto ✅' : comprado ? 'Ponerse' : 'Comprar'}
                        </button>
                    </div>`;
        contenedor.innerHTML += html;
    });
    document.getElementById('modal-tienda').classList.remove('oculto');
}

function comprar(id, precio) {
    if (monedas >= precio) { 
        sumarMonedas(-precio); 
        inventario.push(id); 
        localStorage.setItem('mates_inventario', JSON.stringify(inventario)); 
        reproducirSonidoExito(); 
        llamarTutor("¡Gracias por mi regalo! 🎁"); 
        abrirTienda(); 
    } else {
        llamarTutor(`Necesitas ${precio} monedas. ¡Estudia más!`, 4000);
    }
}

function equipar(id) { 
    accesorioEquipado = (accesorioEquipado === id) ? null : id; 
    localStorage.setItem('mates_equipado', accesorioEquipado); 
    aplicarAccesorio(); 
    abrirTienda(); 
}

function aplicarAccesorio() {
    let capa = document.getElementById('tutor-accesorio'); 
    capa.className = "accesorio"; capa.innerText = "";
    if (accesorioEquipado) { 
        let p = TIENDA.find(t => t.id === accesorioEquipado); 
        if(p) { capa.innerText = p.emoji; capa.classList.add(p.clase); } 
    }
}

// ==========================================
// BÚHO: TUTOR VIRTUAL
// ==========================================
function llamarTutor(msg, dur = 5000) { 
    let b = document.getElementById('tutor-burbuja'); 
    b.innerText = msg; b.classList.remove('burbuja-oculta'); 
    setTimeout(() => b.classList.add('burbuja-oculta'), dur); 
}
function saludarTutor() { llamarTutor("¡Anímate! Cada operación matemática tiene su truco. 🦉"); }

// ==========================================
// JUEGO 1: EL MAESTRO PIZZERO
// ==========================================
function pintarRebanada(e) { 
    e.classList.toggle('activa'); 
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); osc.connect(ctx.destination); 
        osc.frequency.value = 400; osc.start(); osc.stop(ctx.currentTime + 0.05); 
    } catch(err){}
}

function verificarPizza() {
    if (document.querySelectorAll('.rebanada.activa').length === 3) { 
        document.getElementById('resCajas').innerHTML = "¡EXCELENTE! 🍕 (+10 🪙)"; 
        document.getElementById('resCajas').className = "resultado correcto"; 
        sumarMonedas(10); lanzarConfeti(); reproducirSonidoExito(); ganarMedalla('Maestro Pizzero'); 
    } else { 
        document.getElementById('resCajas').innerHTML = "¡Ups! Intenta de nuevo."; 
        document.getElementById('resCajas').className = "resultado incorrecto"; 
        llamarTutor("Pinta exactamente 3 rebanadas de pizza.");
    }
}

// ==========================================
// JUEGO 2: MULTI-OPERACIONES ALEATORIAS
// ==========================================
function generarNuevoReto() {
    if (aciertosSeguidos >= 3) { 
        nivelActual = 2; 
        document.getElementById('nivel-etiqueta').innerText = "Nivel 2 🔥"; 
        document.getElementById('nivel-etiqueta').style.background = "#e74c3c"; 
    } else if (aciertosSeguidos === 0 && nivelActual === 2 && intentosFallidos > 2) { 
        nivelActual = 1; 
        document.getElementById('nivel-etiqueta').innerText = "Nivel 1"; 
        document.getElementById('nivel-etiqueta').style.background = "#f39c12"; 
    }

    const operaciones = ['+', '-', '×', '÷'];
    operacionActual = operaciones[Math.floor(Math.random() * operaciones.length)];

    num1Global = Math.floor(Math.random() * 5) + 1;
    num2Global = Math.floor(Math.random() * 5) + 1;
    den1Global = Math.floor(Math.random() * 6) + 3; 
    
    if (nivelActual === 1 && (operacionActual === '+' || operacionActual === '-')) {
        den2Global = den1Global; 
    } else {
        den2Global = Math.floor(Math.random() * 6) + 3; 
        if(den1Global === den2Global) den2Global++;
    }

    if (operacionActual === '-') {
        let val1 = num1Global / den1Global;
        let val2 = num2Global / den2Global;
        if (val2 > val1) {
            let tempNum = num1Global; num1Global = num2Global; num2Global = tempNum;
            let tempDen = den1Global; den1Global = den2Global; den2Global = tempDen;
        }
    }

    let numFinal, denFinal;

    if (operacionActual === '+') {
        if(den1Global === den2Global) { numFinal = num1Global + num2Global; denFinal = den1Global; }
        else { numFinal = (num1Global * den2Global) + (num2Global * den1Global); denFinal = den1Global * den2Global; }
    } 
    else if (operacionActual === '-') {
        if(den1Global === den2Global) { numFinal = num1Global - num2Global; denFinal = den1Global; }
        else { numFinal = (num1Global * den2Global) - (num2Global * den1Global); denFinal = den1Global * den2Global; }
    }
    else if (operacionActual === '×') {
        numFinal = num1Global * num2Global;
        denFinal = den1Global * den2Global;
    }
    else if (operacionActual === '÷') {
        numFinal = num1Global * den2Global;
        denFinal = den1Global * num2Global;
    }

    respuestaCorrectaStr = `${numFinal}/${denFinal}`;

    document.getElementById('ejercicio-dinamico').innerText = `${num1Global}/${den1Global} ${operacionActual} ${num2Global}/${den2Global}`;
    document.getElementById('respuesta1').value = ""; 
    document.getElementById('resTexto').innerHTML = ""; 
}

function sonFraccionesEquivalentes(respUser, respEsperada) {
    let cleanUser = respUser.replace(/\s+/g, '');
    let cleanEsp = respEsperada.replace(/\s+/g, '');
    if (cleanUser === cleanEsp) return true;

    let pUser = cleanUser.split('/');
    let pEsp = cleanEsp.split('/');

    if (pUser.length === 2 && pEsp.length === 2) {
        let nU = parseInt(pUser[0], 10), dU = parseInt(pUser[1], 10);
        let nE = parseInt(pEsp[0], 10), dE = parseInt(pEsp[1], 10);
        if (!isNaN(nU) && !isNaN(dU) && dU !== 0) {
            return (nU * dE) === (nE * dU);
        }
    }
    return false;
}

function verificarTexto() {
    let respuesta = document.getElementById('respuesta1').value.trim();
    let mensaje = document.getElementById('resTexto');
    
    if(sonFraccionesEquivalentes(respuesta, respuestaCorrectaStr)) {
        mensaje.innerHTML = "¡ERES UN GENIO! 🎉 (+10 🪙)";
        mensaje.className = "resultado correcto";
        aciertosSeguidos++; intentosFallidos = 0; sumarMonedas(10); lanzarConfeti(); reproducirSonidoExito(); ganarMedalla('Rayo Matemático');
        llamarTutor("¡Correcto! Entendiste perfecto cómo hacer esta operación.", 4000);
    } else {
        aciertosSeguidos = 0; intentosFallidos++;
        mensaje.innerHTML = "Uy, revisa tu cálculo. ¡Mira al búho! 🦉";
        mensaje.className = "resultado incorrecto";
        
        if(operacionActual === '+') llamarTutor(den1Global === den2Global ? "En la suma de igual base, el número de abajo no cambia." : "Para sumar con diferente base, multiplica los de abajo y luego cruza.");
        else if(operacionActual === '-') llamarTutor(den1Global === den2Global ? "En la resta de igual base, solo resta los de arriba." : "Multiplica los de abajo, luego cruza y ¡resta los resultados!");
        else if(operacionActual === '×') llamarTutor("La multiplicación es en línea recta: arriba por arriba y abajo por abajo.");
        else if(operacionActual === '÷') llamarTutor("La división es cruzada (Efecto rebote): El primero de arriba por el segundo de abajo va ARRIBA.");
    }
}

// ==========================================
// RECONOCIMIENTO DE VOZ API
// ==========================================
function activarMicrofono() {
    let btn = document.getElementById('btn-mic'); let input = document.getElementById('respuesta1');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { llamarTutor("Tu navegador no soporta comandos de voz."); return; }
    
    const recognition = new SpeechRecognition(); recognition.lang = 'es-ES';
    
    recognition.onstart = function() { btn.classList.add('mic-escuchando'); input.placeholder = "Escuchando..."; };
    recognition.onresult = function(e) {
        let voz = e.results[0][0].transcript.toLowerCase().replace(/sobre/g, '/').replace(/barra/g, '/').replace(/entre/g, '/').replace(/\s+/g, '');
        input.value = voz; btn.classList.remove('mic-escuchando'); input.placeholder = "Ej: 5/8";
        llamarTutor(`¡Escuché "${voz}"! Si está bien, dale a Comprobar.`);
    };
    recognition.onerror = function() { btn.classList.remove('mic-escuchando'); input.placeholder = "Ej: 5/8"; };
    recognition.start();
}

// ==========================================
// GENERADOR PDF (Operaciones Aleatorias)
// ==========================================
function generarPDF() {
    if (!window.jspdf) { llamarTutor("Cargando el creador de PDF..."); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text("Reto Supremo: Operaciones con Fracciones", 20, 20);
    doc.setFontSize(14); doc.setFont("helvetica", "normal");
    doc.text(`Estudiante: ${nombreUsuario ? nombreUsuario : "___________________"}`, 20, 30);
    
    let y = 50;
    const operaciones = ['+', '-', 'x', '÷'];
    
    for(let i = 1; i <= 10; i++) {
        let op = operaciones[Math.floor(Math.random() * operaciones.length)];
        let n1 = Math.floor(Math.random() * 5) + 1;
        let n2 = Math.floor(Math.random() * 5) + 1;
        let d1 = Math.floor(Math.random() * 6) + 3; 
        let d2 = Math.floor(Math.random() * 6) + 3;
        
        if (op === '-') {
            if ((n1/d1) < (n2/d2)) { let tn=n1; n1=n2; n2=tn; let td=d1; d1=d2; d2=td; }
        }
        
        doc.text(`${i})   ${n1}/${d1}   ${op}   ${n2}/${d2}   =   _______`, 30, y);
        y += 18; 
    }
    doc.setFontSize(12); doc.text("¡Recuerda revisar los apuntes si tienes dudas! - Tu Tutor Búho 🦉", 20, y + 10);
    doc.save(`Examen_Fracciones_${nombreUsuario ? nombreUsuario : 'Alumno'}.pdf`);
    llamarTutor("¡Hoja PDF generada con 10 ejercicios surtidos! 🖨️");
}

// ==========================================
// EFECTOS DE SONIDO Y CONFETI
// ==========================================
function reproducirSonidoExito() { 
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        if(!ctx) return; 
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); 
        osc.connect(gain); gain.connect(ctx.destination); 
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); 
        gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); 
        osc.start(); osc.stop(ctx.currentTime + 0.5); 
    } catch(e){}
}

function lanzarConfeti() { 
    const contenedor = document.getElementById('confeti-container'); 
    const emojis = ['🎉', '🍕', '⭐', '🚀', '🏆', '🪙']; 
    for (let i = 0; i < 40; i++) { 
        setTimeout(() => { 
            let confeti = document.createElement('div'); confeti.className = 'emoji-confeti'; 
            confeti.innerText = emojis[Math.floor(Math.random() * emojis.length)]; 
            confeti.style.left = Math.random() * 100 + 'vw'; 
            confeti.style.animationDuration = (Math.random() * 2 + 2) + 's'; 
            contenedor.appendChild(confeti); 
            setTimeout(() => confeti.remove(), 4000); 
        }, i * 40); 
    } 
}

// Encuesta
function enviarEncuesta() { 
    document.getElementById('resultadoEncuesta').innerHTML = "¡Gracias! ❤️ (+5 🪙)"; 
    document.getElementById('resultadoEncuesta').className = "resultado correcto"; 
    sumarMonedas(5); lanzarConfeti(); 
}
// === LÓGICA Y ESTADO DE LA APP ===
const horas = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];
let indiceHoraActual = 0;

// Estado de la producción
let datosProduccion = [];
let historialAcciones = [];

// Referencias al DOM
const displayHora = document.getElementById('displayHora');
const inputKilos = document.getElementById('inputKilos');
const inputMerma = document.getElementById('inputMerma');
const tablaHoras = document.getElementById('tablaHoras');
const btnDeshacer = document.getElementById('btnDeshacer');
const modalReset = document.getElementById('modalReset');

// === NUEVO: SISTEMA DE GUARDADO PERSISTENTE ===
function inicializarDatos() {
    const datosGuardados = localStorage.getItem('inagrimex_produccion');
    const historialGuardado = localStorage.getItem('inagrimex_historial');

    if (datosGuardados) {
        // Si hay datos guardados de una sesión anterior, los recupera
        datosProduccion = JSON.parse(datosGuardados);
        historialAcciones = historialGuardado ? JSON.parse(historialGuardado) : [];
    } else {
        // Si es la primera vez, crea la estructura en cero
        datosProduccion = horas.map(h => ({ hora: h, kg: 0, rollos: 0, merma: 0 }));
        historialAcciones = [];
    }
}

function guardarEnMemoriaLocal() {
    localStorage.setItem('inagrimex_produccion', JSON.stringify(datosProduccion));
    localStorage.setItem('inagrimex_historial', JSON.stringify(historialAcciones));
}

// Arranque de la app
inicializarDatos();
actualizarUI();

// === FUNCIONES DE INTERACCIÓN ===
function cambiarHora(delta) {
    indiceHoraActual += delta;
    if (indiceHoraActual < 0) indiceHoraActual = 0;
    if (indiceHoraActual >= horas.length) indiceHoraActual = horas.length - 1;
    
    displayHora.classList.remove('animar-cambio-hora');
    void displayHora.offsetWidth; 
    displayHora.classList.add('animar-cambio-hora');
    displayHora.innerText = horas[indiceHoraActual];
    
    actualizarUI(); 
}

function guardarLogico() {
    const kg = parseFloat(inputKilos.value) || 0;
    const merma = parseFloat(inputMerma.value) || 0;

    if (kg === 0 && merma === 0) return; 

    const rollosGenerados = kg > 0 ? 1 : 0;

    datosProduccion[indiceHoraActual].kg += kg;
    datosProduccion[indiceHoraActual].merma += merma;
    datosProduccion[indiceHoraActual].rollos += rollosGenerados;

    historialAcciones.push({
        horaIndex: indiceHoraActual,
        kg: kg,
        merma: merma,
        rollos: rollosGenerados
    });

    // Guardar en el dispositivo
    guardarEnMemoriaLocal();

    inputKilos.value = "";
    inputMerma.value = "";

    actualizarUI("guardar"); 
}

function deshacerLogico() {
    if (historialAcciones.length === 0) return;

    const ultimaAccion = historialAcciones.pop();
    
    datosProduccion[ultimaAccion.horaIndex].kg -= ultimaAccion.kg;
    datosProduccion[ultimaAccion.horaIndex].merma -= ultimaAccion.merma;
    datosProduccion[ultimaAccion.horaIndex].rollos -= ultimaAccion.rollos;

    if (datosProduccion[ultimaAccion.horaIndex].kg < 0.01) datosProduccion[ultimaAccion.horaIndex].kg = 0;
    if (datosProduccion[ultimaAccion.horaIndex].merma < 0.01) datosProduccion[ultimaAccion.horaIndex].merma = 0;
    if (datosProduccion[ultimaAccion.horaIndex].rollos < 0) datosProduccion[ultimaAccion.horaIndex].rollos = 0;

    // Guardar el cambio en el dispositivo
    guardarEnMemoriaLocal();

    if (indiceHoraActual !== ultimaAccion.horaIndex) {
        indiceHoraActual = ultimaAccion.horaIndex;
        displayHora.innerText = horas[indiceHoraActual];
    }

    actualizarUI("deshacer");
}

// === FUNCIONES MODAL VACIAR ===
function abrirModalReset() { modalReset.classList.add('active'); }
function cerrarModalReset() { modalReset.classList.remove('active'); }
function ejecutarVaciadoTotal() {
    // Limpia la memoria local por completo
    localStorage.removeItem('inagrimex_produccion');
    localStorage.removeItem('inagrimex_historial');
    
    inicializarDatos(); 
    cerrarModalReset();
    actualizarUI("reset"); 
}

// === MOTOR DE RENDERIZADO Y ANIMACIONES ===
function actualizarUI(tipoAccion = "ninguna") {
    btnDeshacer.disabled = historialAcciones.length === 0;

    tablaHoras.innerHTML = "";
    let sumKg = 0, sumRollos = 0, sumMerma = 0;

    datosProduccion.forEach((dato, index) => {
        if (dato.kg > 0 || dato.merma > 0) {
            const tr = document.createElement('tr');
            
            if(index === indiceHoraActual) {
                tr.style.background = "rgba(0,255,255,0.05)"; 
                if (tipoAccion === "guardar") tr.classList.add('fila-guardada');
                if (tipoAccion === "deshacer") tr.classList.add('fila-deshecha');
            }

            tr.innerHTML = `
                <td>${dato.hora}</td>
                <td class="emissive-green">${dato.kg.toFixed(1)}</td>
                <td class="emissive-cyan">${dato.rollos}</td>
                <td class="emissive-red">${dato.merma.toFixed(1)}</td>
            `;
            tablaHoras.appendChild(tr);
        }
        
        sumKg += dato.kg;
        sumRollos += dato.rollos;
        sumMerma += dato.merma;
    });

    if (sumKg === 0 && sumMerma === 0) {
        tablaHoras.innerHTML = `<tr><td colspan="4" style="text-align:center;">Sin registros en la base de datos</td></tr>`;
    }

    animarOdometer('totalKg', sumKg, false);
    animarOdometer('totalRollos', sumRollos, true);
    animarOdometer('totalMerma', sumMerma, false);
}

// ANIMACIÓN: Ruleta Numérica (Odometer)
function animarOdometer(elementoId, valorFinal, esEntero = false) {
    const elemento = document.getElementById(elementoId);
    let valorActual = parseFloat(elemento.innerText.replace(/[^0-9.-]+/g,"")) || 0;
    
    if(valorActual === valorFinal) return;

    const duracion = 400; 
    const frames = 20; 
    const incremento = (valorFinal - valorActual) / frames;
    let frameActual = 0;

    clearInterval(elemento.dataset.timer); 

    const timer = setInterval(() => {
        valorActual += incremento;
        frameActual++;
        
        let texto = esEntero ? Math.round(valorActual) : valorActual.toFixed(1);
        elemento.innerText = elementoId === 'totalRollos' ? texto : `${texto} KG`;

        if (frameActual >= frames) {
            clearInterval(timer);
            let textoFinal = esEntero ? valorFinal : valorFinal.toFixed(1);
            elemento.innerText = elementoId === 'totalRollos' ? textoFinal : `${textoFinal} KG`;
        }
    }, duracion / frames);

    elemento.dataset.timer = timer; 
}
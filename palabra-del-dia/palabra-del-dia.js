/* ============================================================
   LA PALABRA DEL DÍA — JavaScript (vanilla, sin dependencias)
   ------------------------------------------------------------
   - Calcula la fecha y el día del año (con años bisiestos).
   - Carga las lecturas desde lecturas.json (sin texto bíblico).
   - Obtiene el texto del pasaje en tiempo real desde la API
     bíblica libre bible.helloao.org (sin clave, con CORS):
       * Canon: Reina Valera 1909 (dominio público)
       * Deuterocanónicos: Biblia Libre
     La fuente se puede cambiar editando las constantes al inicio.
   - Navegación entre días, calendario, compartir y enlaces.
   - Sin variables globales (todo en una IIFE).
   ============================================================ */

(function () {
  "use strict";

  /********** Configuración de la fuente bíblica **********/
  var API_BASE = "https://bible.helloao.org/api/";
  var TRADUCCION_CANON = "spa_r09"; // Reina Valera 1909 (dominio público)
  var TRADUCCION_DEUTEROCANONICOS = "spa_blm"; // Biblia Libre (incluye deuterocanónicos)
  var NOMBRE_CANON = "Reina Valera 1909 (dominio público)";
  var NOMBRE_DEUTEROCANONICOS = "Biblia Libre";

  // Enlace de respaldo "Leer el pasaje completo" (fuente autorizada configurable)
  var FUENTE_COMPLETA_BASE = "https://www.biblegateway.com/passage/?search=";
  var FUENTE_COMPLETA_VERSION = "&version=RVR1960";

  /********** Catálogo de libros (id de la API) **********/
  var LIBROS = {
    GENESIS: { id: "GEN", canon: true },
    EXODO: { id: "EXO", canon: true },
    LEVITICO: { id: "LEV", canon: true },
    NUMEROS: { id: "NUM", canon: true },
    DEUTERONOMIO: { id: "DEU", canon: true },
    JOSUE: { id: "JOS", canon: true },
    JUECES: { id: "JDG", canon: true },
    RUT: { id: "RUT", canon: true },
    "1 SAMUEL": { id: "1SA", canon: true },
    "2 SAMUEL": { id: "2SA", canon: true },
    "1 REYES": { id: "1KI", canon: true },
    "2 REYES": { id: "2KI", canon: true },
    "1 CRONICAS": { id: "1CH", canon: true },
    "2 CRONICAS": { id: "2CH", canon: true },
    ESDRAS: { id: "EZR", canon: true },
    NEHEMIAS: { id: "NEH", canon: true },
    ESTER: { id: "EST", canon: true },
    JOB: { id: "JOB", canon: true },
    SALMO: { id: "PSA", canon: true },
    SALMOS: { id: "PSA", canon: true },
    PROVERBIOS: { id: "PRO", canon: true },
    ECLESIASTES: { id: "ECC", canon: true },
    "CANTAR DE LOS CANTARES": { id: "SNG", canon: true },
    CANTARES: { id: "SNG", canon: true },
    ISAIAS: { id: "ISA", canon: true },
    JEREMIAS: { id: "JER", canon: true },
    LAMENTACIONES: { id: "LAM", canon: true },
    EZEQUIEL: { id: "EZK", canon: true },
    DANIEL: { id: "DAN", canon: true },
    OSEAS: { id: "HOS", canon: true },
    JOEL: { id: "JOL", canon: true },
    AMOS: { id: "AMO", canon: true },
    ABDIAS: { id: "OBA", canon: true },
    JONAS: { id: "JON", canon: true },
    MIQUEAS: { id: "MIC", canon: true },
    NAHUM: { id: "NAM", canon: true },
    HABACUC: { id: "HAB", canon: true },
    SOFONIAS: { id: "ZEP", canon: true },
    HAGEO: { id: "HAG", canon: true },
    ZACARIAS: { id: "ZEC", canon: true },
    MALAQUIAS: { id: "MAL", canon: true },
    MATEO: { id: "MAT", canon: true },
    MARCOS: { id: "MRK", canon: true },
    LUCAS: { id: "LUK", canon: true },
    JUAN: { id: "JHN", canon: true },
    HECHOS: { id: "ACT", canon: true },
    ROMANOS: { id: "ROM", canon: true },
    "1 CORINTIOS": { id: "1CO", canon: true },
    "2 CORINTIOS": { id: "2CO", canon: true },
    GALATAS: { id: "GAL", canon: true },
    EFESIOS: { id: "EPH", canon: true },
    FILIPENSES: { id: "PHP", canon: true },
    COLOSENSES: { id: "COL", canon: true },
    "1 TESALONICENSES": { id: "1TH", canon: true },
    "2 TESALONICENSES": { id: "2TH", canon: true },
    "1 TIMOTEO": { id: "1TI", canon: true },
    "2 TIMOTEO": { id: "2TI", canon: true },
    TITO: { id: "TIT", canon: true },
    FILEMON: { id: "PHM", canon: true },
    HEBREOS: { id: "HEB", canon: true },
    SANTIAGO: { id: "JAS", canon: true },
    "1 PEDRO": { id: "1PE", canon: true },
    "2 PEDRO": { id: "2PE", canon: true },
    "1 JUAN": { id: "1JN", canon: true },
    "2 JUAN": { id: "2JN", canon: true },
    "3 JUAN": { id: "3JN", canon: true },
    JUDAS: { id: "JUD", canon: true },
    APOCALIPSIS: { id: "REV", canon: true },
    // Deuterocanónicos (Biblia Libre)
    TOBIAS: { id: "TOB", canon: false },
    JUDIT: { id: "JDT", canon: false },
    SABIDURIA: { id: "WIS", canon: false },
    ECLESIASTICO: { id: "SIR", canon: false },
    SIRACIDE: { id: "SIR", canon: false },
    BARUC: { id: "BAR", canon: false },
    "1 MACABEOS": { id: "1MA", canon: false },
    "2 MACABEOS": { id: "2MA", canon: false }
  };

  /********** Estado **********/
  var datos = null; // lecturas.json completo
  var diaActual = null; // día seleccionado (1..365)
  var fechaHoy = new Date();
  fechaHoy.setHours(0, 0, 0, 0);
  var mesCalendario = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), 1);
  var cacheCapitulos = {}; // clave: traduccion/libro/cap -> Promise<versos>

  /********** Utilidades DOM **********/
  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  function $id(id) {
    return document.getElementById(id);
  }

  /********** Cálculo de fecha **********/
  function normalizar(fecha) {
    var f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    return f;
  }

  // Día del año (1..365/366) con manejo de años bisiestos
  function diaDelAnio(fecha) {
    var f = normalizar(fecha);
    var inicio = new Date(f.getFullYear(), 0, 0);
    var diff =
      f.getTime() -
      inicio.getTime() +
      (inicio.getTimezoneOffset() - f.getTimezoneOffset()) * 60000;
    return Math.floor(diff / 86400000);
  }

  function esBisiesto(anio) {
    return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  }

  function fechaDesdeDia(anio, dia) {
    return new Date(anio, 0, dia);
  }

  function formatearFecha(fecha) {
    var texto = fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /********** Carga de lecturas.json **********/
  function cargarLecturas() {
    return fetch("lecturas.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        datos = json;
      });
  }

  /********** Parseo de la referencia bíblica **********/
  // "Génesis 1, 1-31" -> {libro, capitulo, desde, hasta}
  // "Isaías 52, 13-53, 12" -> {libro, capitulo, desde, capituloFin, hasta}
  function normalizarNombre(s) {
    return s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parsearReferencia(ref) {
    if (!ref) return null;
    // Multi-capitulo: "Libro 52, 13-53, 12"
    var m = ref.match(/^\s*(.+?)\s*(\d+),\s*(\d+)\s*-\s*(\d+),\s*(\d+)\s*$/);
    if (m) {
      var nombre = normalizarNombre(m[1]);
      var libro = LIBROS[nombre];
      if (!libro) return null;
      return {
        nombre: m[1].trim(),
        libro: libro,
        capitulo: parseInt(m[2], 10),
        desde: parseInt(m[3], 10),
        capituloFin: parseInt(m[4], 10),
        hasta: parseInt(m[5], 10)
      };
    }
    // Un capitulo: "Libro 3, 1-21" o "Libro 3, 16"
    m = ref.match(/^\s*(.+?)\s*(\d+),\s*(\d+)(?:\s*-\s*(\d+))?\s*$/);
    if (m) {
      nombre = normalizarNombre(m[1]);
      libro = LIBROS[nombre];
      if (!libro) return null;
      return {
        nombre: m[1].trim(),
        libro: libro,
        capitulo: parseInt(m[2], 10),
        desde: parseInt(m[3], 10),
        capituloFin: null,
        hasta: m[4] ? parseInt(m[4], 10) : parseInt(m[3], 10)
      };
    }
    return null;
  }

  /********** Obtención del texto bíblico (API libre) **********/
  function claveCapitulo(traduccion, idLibro, capitulo) {
    return traduccion + "/" + idLibro + "/" + capitulo;
  }

  function obtenerCapitulo(libroInfo, capitulo) {
    var traduccion = libroInfo.canon
      ? TRADUCCION_CANON
      : TRADUCCION_DEUTEROCANONICOS;
    var clave = claveCapitulo(traduccion, libroInfo.id, capitulo);
    if (!cacheCapitulos[clave]) {
      cacheCapitulos[clave] = fetch(
        API_BASE + traduccion + "/" + libroInfo.id + "/" + capitulo + ".json"
      )
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(extraerVersos);
    }
    return cacheCapitulos[clave];
  }

  // Convierte el contenido del capítulo en una lista {numero, texto}
  function extraerVersos(data) {
    var versos = [];
    var contenido = data && data.chapter && data.chapter.content;
    if (!contenido) return versos;
    for (var i = 0; i < contenido.length; i++) {
      var item = contenido[i];
      if (!item || item.type !== "verse") continue;
      var texto = "";
      var partes = item.content || [];
      for (var j = 0; j < partes.length; j++) {
        var p = partes[j];
        if (typeof p === "string") texto += p + " ";
        else if (p && typeof p.text === "string") texto += p.text + " ";
      }
      texto = texto.replace(/\s+/g, " ").trim();
      if (texto) versos.push({ numero: item.number, texto: texto });
    }
    return versos;
  }

  function versosEnRango(versos, desde, hasta) {
    var resultado = [];
    for (var i = 0; i < versos.length; i++) {
      var v = versos[i];
      if (v.numero >= desde && v.numero <= hasta) resultado.push(v);
    }
    return resultado;
  }

  function obtenerTextoPasaje(parsed) {
    if (!parsed) return Promise.resolve(null);
    var libroInfo = parsed.libro;
    var primera = obtenerCapitulo(libroInfo, parsed.capitulo);
    if (!parsed.capituloFin) {
      return primera.then(function (versos) {
        return versosEnRango(versos, parsed.desde, parsed.hasta);
      });
    }
    var segunda = obtenerCapitulo(libroInfo, parsed.capituloFin);
    return Promise.all([primera, segunda]).then(function (resultados) {
      return versosEnRango(resultados[0], parsed.desde, 999)
        .concat(versosEnRango(resultados[1], 1, parsed.hasta));
    });
  }

  function nombreTraduccion(parsed) {
    return parsed && parsed.libro && !parsed.libro.canon
      ? NOMBRE_DEUTEROCANONICOS
      : NOMBRE_CANON;
  }

  /********** Enlace "Leer el pasaje completo" **********/
  function buscarParaEnlace(ref) {
    // "Génesis 1, 1-31" -> "Génesis 1:1-31" ; "Isaías 52, 13-53, 12" -> "Isaías 52:13-53:12"
    return ref
      .replace(/\s*,\s*/g, ":")
      .replace(/:\s*(\d+)\s*:\s*(\d+)/g, ":$1-$2")
      .replace(/\s+/g, " ")
      .trim();
  }

  /********** Renderizado **********/
  function renderFecha() {
    $id("palabra-fecha").textContent = formatearFecha(fechaHoy);
  }

  function renderLectura(dia) {
    var contenedor = $id("palabra-lectura");
    contenedor.textContent = "";
    diaActual = dia;

    if (!datos) {
      contenedor.appendChild(
        el("p", "palabra-error", "En este momento no podemos cargar la lectura del día. Por favor, inténtalo nuevamente.")
      );
      return;
    }

    var lectura = datos.dias && datos.dias[String(dia)];
    if (!lectura) {
      var aviso = el("div", "palabra-card");
      aviso.appendChild(
        el("p", "palabra-badge", "Día " + dia + " de 365")
      );
      aviso.appendChild(
        el(
          "p",
          "palabra-error",
          "Este día no tiene lectura asignada en el plan anual. Puedes volver al día de hoy con el botón HOY."
        )
      );
      contenedor.appendChild(aviso);
      return;
    }

    var parsed = parsearReferencia(lectura.referencia);

    // Encabezado de la tarjeta
    contenedor.appendChild(el("span", "palabra-badge", "Día " + dia + " de 365"));
    contenedor.appendChild(el("h2", "palabra-lectura-titulo", lectura.titulo));
    contenedor.appendChild(
      el("p", "palabra-lectura-ref", lectura.referencia)
    );
    if (lectura.tema) {
      contenedor.appendChild(
        el("span", "palabra-tema", "Tema: " + lectura.tema)
      );
    }
    if (lectura.tiempoLiturgico) {
      contenedor.appendChild(
        el("span", "palabra-tiempo-liturgico", lectura.tiempoLiturgico)
      );
    }

    // Texto del pasaje (se carga en tiempo real)
    var cajaTexto = el("div", "palabra-lectura-texto");
    cajaTexto.setAttribute("aria-live", "polite");
    contenedor.appendChild(cajaTexto);
    var notaFuente = el("p", "palabra-lectura-fuente");
    contenedor.appendChild(notaFuente);

    if (parsed) {
      cajaTexto.appendChild(el("p", "palabra-cargando", "Cargando la lectura…"));
      obtenerTextoPasaje(parsed)
        .then(function (versos) {
          if (diaActual !== dia) return; // el usuario ya navegó a otro día
          cajaTexto.textContent = "";
          if (!versos || versos.length === 0) {
            cajaTexto.appendChild(
              el(
                "p",
                "palabra-error",
                "No pudimos encontrar el texto de este pasaje en la fuente actual."
              )
            );
          } else {
            for (var i = 0; i < versos.length; i++) {
              var v = versos[i];
              var p = el("p", "palabra-verso");
              var sup = el("sup", null, String(v.numero));
              p.appendChild(sup);
              p.appendChild(document.createTextNode(" " + v.texto));
              cajaTexto.appendChild(p);
            }
          }
          notaFuente.textContent =
            "Texto: " + nombreTraduccion(parsed) + " · Bible API libre (bible.helloao.org)";
        })
        .catch(function () {
          if (diaActual !== dia) return;
          cajaTexto.textContent = "";
          cajaTexto.appendChild(
            el(
              "p",
              "palabra-error",
              "En este momento no podemos cargar el texto de la lectura. Por favor, inténtalo nuevamente."
            )
          );
          notaFuente.textContent = "";
        });
    } else {
      cajaTexto.appendChild(
        el(
          "p",
          "palabra-error",
          "No pudimos interpretar la referencia de este pasaje. Puedes leerlo con el botón de abajo."
        )
      );
    }

    // Reflexión
    contenedor.appendChild(el("h3", "palabra-seccion", "Reflexión"));
    var reflexion = el("div", "palabra-reflexion");
    reflexion.appendChild(el("p", null, lectura.reflexion));
    contenedor.appendChild(reflexion);

    // Oración
    contenedor.appendChild(el("h3", "palabra-seccion", "Oración"));
    var oracion = el("div", "palabra-oracion");
    oracion.appendChild(el("p", null, lectura.oracion));
    contenedor.appendChild(oracion);

    // Botón "Leer el pasaje completo"
    if (lectura.referencia) {
      var enlace = el(
        "a",
        "palabra-btn-leer",
        "📖 Leer el pasaje completo"
      );
      enlace.href =
        FUENTE_COMPLETA_BASE +
        encodeURIComponent(buscarParaEnlace(lectura.referencia)) +
        FUENTE_COMPLETA_VERSION;
      enlace.target = "_blank";
      enlace.rel = "noopener";
      contenedor.appendChild(enlace);
    }

    actualizarHash(dia);
    renderCalendario();
  }

  /********** Navegación entre días **********/
  function irDia(dia) {
    if (dia < 1) dia = 1;
    if (dia > 366) dia = 366;
    renderLectura(dia);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irHoy() {
    renderLectura(diaDelAnio(fechaHoy));
  }

  /********** Calendario **********/
  function nombreMes(anio, mes) {
    return new Date(anio, mes, 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric"
    });
  }

  function renderCalendario() {
    var anio = mesCalendario.getFullYear();
    var mes = mesCalendario.getMonth();
    $id("cal-mes").textContent =
      nombreMes(anio, mes).charAt(0).toUpperCase() +
      nombreMes(anio, mes).slice(1);

    var grilla = $id("cal-grilla");
    grilla.textContent = "";

    var diasSemana = ["L", "M", "X", "J", "V", "S", "D"];
    for (var d = 0; d < 7; d++) {
      grilla.appendChild(el("div", "palabra-cal-dia-cabeza", diasSemana[d]));
    }

    var primerDia = new Date(anio, mes, 1);
    var diaSemanaInicio = (primerDia.getDay() + 6) % 7; // lunes = 0
    var totalDias = new Date(anio, mes + 1, 0).getDate();
    var hoyAnio = fechaHoy.getFullYear();
    var hoyDiaAnio = diaDelAnio(fechaHoy);
    var seleccionado = diaActual;

    for (var i = 0; i < diaSemanaInicio; i++) {
      grilla.appendChild(el("div", "palabra-cal-vacio"));
    }

    for (var dia = 1; dia <= totalDias; dia++) {
      var fecha = new Date(anio, mes, dia);
      var nDia = diaDelAnio(fecha);
      var esHoy = anio === hoyAnio && nDia === hoyDiaAnio;
      var tieneLectura = datos && datos.dias && datos.dias[String(nDia)];

      var celda = el("button", "palabra-cal-dia", String(dia));
      celda.type = "button";
      celda.setAttribute("aria-label", String(dia));

      if (esHoy) celda.classList.add("palabra-cal-hoy");
      if (seleccionado === nDia && anio === fecha.getFullYear())
        celda.classList.add("palabra-cal-seleccionado");

      if (tieneLectura) {
        celda.addEventListener("click", (function (n) {
          return function () {
            mesCalendario = new Date(anio, mes, 1);
            renderLectura(n);
          };
        })(nDia));
      } else {
        celda.classList.add("palabra-cal-sin-lectura");
        celda.disabled = true;
        celda.title = "Sin lectura en el plan anual";
      }

      grilla.appendChild(celda);
    }
  }

  /********** Compartir **********/
  function textoCompartir() {
    var dia = diaActual || diaDelAnio(fechaHoy);
    var lectura = datos && datos.dias && datos.dias[String(dia)];
    if (!lectura) return "";
    var url = location.href.split("#")[0] + "#dia-" + dia;
    return (
      "📖 La Palabra del Día\n" +
      lectura.titulo + "\n" +
      lectura.referencia + (lectura.tema ? " · " + lectura.tema : "") + "\n" +
      url
    );
  }

  // Abre una URL en otra pestaña de forma fiable: los bloqueadores de
  // ventanas emergentes (y algunos visores embebidos) bloquean window.open
  // directo; un enlace real con target="_blank" + click() funciona en más casos.
  function abrirNuevaPestana(url) {
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function compartirWhatsApp() {
    var texto = textoCompartir();
    if (!texto) return;
    // En móvil, la hoja nativa de compartir (con WhatsApp entre las opciones)
    // evita por completo el bloqueo de api.whatsapp.com en visores embebidos.
    if (navigator.share) {
      navigator
        .share({ title: "La Palabra del Día", text: texto })
        .catch(function () {
          /* el usuario canceló */
        });
      return;
    }
    // Escritorio: WhatsApp Web directo, sin pasar por api.whatsapp.com
    abrirNuevaPestana(
      "https://web.whatsapp.com/send?text=" + encodeURIComponent(texto)
    );
  }

  function compartirFacebook() {
    var url = location.href.split("#")[0] + "#dia-" + (diaActual || diaDelAnio(fechaHoy));
    abrirNuevaPestana(
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)
    );
  }

  function copiarEnlace() {
    var texto = textoCompartir();
    var aviso = $id("share-aviso");
    function ok() {
      aviso.textContent = "✅ Enlace copiado al portapapeles.";
    }
    function err() {
      aviso.textContent = "No se pudo copiar. Copia la URL manualmente.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok, err);
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
      } catch (e) {
        err();
      }
    }
  }

  /********** Enlaces profundos (#dia-N) **********/
  function actualizarHash(dia) {
    // No pisar el hash #emociones (acceso directo a la sección emocional)
    if (location.hash === "#emociones") return;
    if (location.hash !== "#dia-" + dia) {
      try {
        history.replaceState(null, "", "#dia-" + dia);
      } catch (e) {
        /* sin soporte de history: ignorar */
      }
    }
  }

  function leerHash() {
    var m = location.hash.match(/^#dia-(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }

  /********** Eventos **********/
  function configurarEventos() {
    $id("btn-prev").addEventListener("click", function () {
      irDia(diaActual - 1);
    });
    $id("btn-hoy").addEventListener("click", irHoy);
    $id("btn-next").addEventListener("click", function () {
      irDia(diaActual + 1);
    });
    $id("cal-prev").addEventListener("click", function () {
      mesCalendario = new Date(
        mesCalendario.getFullYear(),
        mesCalendario.getMonth() - 1,
        1
      );
      renderCalendario();
    });
    $id("cal-next").addEventListener("click", function () {
      mesCalendario = new Date(
        mesCalendario.getFullYear(),
        mesCalendario.getMonth() + 1,
        1
      );
      renderCalendario();
    });
    $id("share-whatsapp").addEventListener("click", compartirWhatsApp);
    $id("share-facebook").addEventListener("click", compartirFacebook);
    $id("share-copiar").addEventListener("click", copiarEnlace);

    document.addEventListener("keydown", function (e) {
      var menuAbierto =
        $id("menu-toggle") &&
        $id("menu-toggle").getAttribute("aria-expanded") === "true";
      if (menuAbierto) return; // no cambiar de día mientras se navega el menú
      if (e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) {
        if (e.target.tagName === "BUTTON" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          // permitir flechas sobre botones del calendario
        } else {
          return;
        }
      }
      if (e.key === "ArrowLeft") {
        irDia(diaActual - 1);
      } else if (e.key === "ArrowRight") {
        irDia(diaActual + 1);
      }
    });
  }

  /********** Menú lateral **********/
  function abrirMenu() {
    var toggle = $id("menu-toggle");
    var lateral = $id("menu-lateral");
    var overlay = $id("menu-overlay");
    toggle.setAttribute("aria-expanded", "true");
    lateral.setAttribute("aria-hidden", "false");
    lateral.classList.add("abierto");
    overlay.hidden = false;
    requestAnimationFrame(function () {
      overlay.classList.add("abierto");
    });
    document.body.style.overflow = "hidden";
    $id("menu-cerrar").focus();
  }

  function cerrarMenu() {
    var toggle = $id("menu-toggle");
    var lateral = $id("menu-lateral");
    var overlay = $id("menu-overlay");
    toggle.setAttribute("aria-expanded", "false");
    lateral.setAttribute("aria-hidden", "true");
    lateral.classList.remove("abierto");
    overlay.classList.remove("abierto");
    setTimeout(function () {
      overlay.hidden = true;
    }, 260);
    document.body.style.overflow = "";
    toggle.focus();
  }

  function configurarMenu() {
    var toggle = $id("menu-toggle");
    var cerrar = $id("menu-cerrar");
    var overlay = $id("menu-overlay");

    toggle.addEventListener("click", function () {
      if (toggle.getAttribute("aria-expanded") === "true") {
        cerrarMenu();
      } else {
        abrirMenu();
      }
    });
    cerrar.addEventListener("click", cerrarMenu);
    overlay.addEventListener("click", cerrarMenu);

    // Cerrar al seleccionar una opción (y navegar suavemente)
    var enlaces = $id("menu-lateral").querySelectorAll("a[data-menu-ir]");
    for (var i = 0; i < enlaces.length; i++) {
      enlaces[i].addEventListener("click", function (e) {
        e.preventDefault();
        var destino = this.getAttribute("data-menu-ir");
        cerrarMenu();
        var seccion = $id(destino);
        if (seccion) {
          setTimeout(function () {
            seccion.scrollIntoView({ behavior: "smooth", block: "start" });
            if (destino === "buscador-biblia") {
              setTimeout(function () {
                $id("buscador-input").focus();
              }, 350);
            }
          }, 300);
        }
      });
    }

    // Cerrar con Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        cerrarMenu();
      }
    });
  }

  /********** Biblia según cómo te sientes **********/
  var emocionesData = null;
  var emocionActual = null; // { id, icono, titulo, descripcion, pasajes }
  var pasajeIndex = 0;
  var CLAVE_FAVORITOS = "palabra_favoritos_v1";

  function cargarFavoritos() {
    try {
      var raw = localStorage.getItem(CLAVE_FAVORITOS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function guardarFavoritos(lista) {
    try {
      localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(lista));
    } catch (e) {
      /* almacenamiento no disponible */
    }
  }

  function esFavorito(id) {
    return cargarFavoritos().some(function (f) {
      return f.id === id;
    });
  }

  function cargarEmociones() {
    return fetch("data/emociones.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        emocionesData = (json && json.emociones) || [];
        renderEmociones();
      })
      .catch(function () {
        var grid = $id("emociones-grid");
        grid.appendChild(
          el(
            "p",
            "palabra-error",
            "En este momento no podemos cargar las situaciones. Por favor, inténtalo nuevamente."
          )
        );
      });
  }

  function renderEmociones() {
    var grid = $id("emociones-grid");
    grid.textContent = "";
    if (!emocionesData || emocionesData.length === 0) return;
    for (var i = 0; i < emocionesData.length; i++) {
      (function (emocion) {
        var card = el("button", "emocion-card");
        card.type = "button";
        card.setAttribute("aria-label", emocion.titulo);
        var icono = el("span", "emocion-icon", emocion.icono);
        var titulo = el("span", "emocion-titulo", emocion.titulo);
        card.appendChild(icono);
        card.appendChild(titulo);
        card.addEventListener("click", function () {
          abrirEmocion(emocion.id);
        });
        grid.appendChild(card);
      })(emocionesData[i]);
    }
  }

  function emocionPorId(id) {
    if (!emocionesData) return null;
    for (var i = 0; i < emocionesData.length; i++) {
      if (emocionesData[i].id === id) return emocionesData[i];
    }
    return null;
  }

  function abrirEmocion(id) {
    var emocion = emocionPorId(id);
    if (!emocion || !emocion.pasajes || emocion.pasajes.length === 0) return;
    emocionActual = emocion;
    pasajeIndex = 0;
    var view = $id("pasaje-view");
    view.hidden = false;
    renderPasaje();
    view.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPasaje() {
    if (!emocionActual || !emocionActual.pasajes[pasajeIndex]) return;
    var pasaje = emocionActual.pasajes[pasajeIndex];
    var view = $id("pasaje-view");
    view.textContent = "";

    var card = el("article", "pasaje-card");

    var encabezado = el("div", "pasaje-encabezado");
    encabezado.appendChild(el("span", "pasaje-emoji", emocionActual.icono));
    var titulo = el("h3", "pasaje-titulo");
    titulo.textContent =
      emocionActual.titulo.charAt(0).toUpperCase() + emocionActual.titulo.slice(1);
    encabezado.appendChild(titulo);
    card.appendChild(encabezado);

    // Texto bíblico (se trae en tiempo real desde la API, como la lectura diaria)
    var cajaTexto = el("div");
    cajaTexto.setAttribute("aria-live", "polite");
    cajaTexto.appendChild(el("p", "palabra-cargando", "Cargando el pasaje…"));
    card.appendChild(cajaTexto);
    var notaFuente = el("p", "pasaje-fuente");
    card.appendChild(notaFuente);

    var parsed = parsearReferencia(pasaje.referencia);
    if (parsed) {
      obtenerTextoPasaje(parsed)
        .then(function (versos) {
          if (emocionActual.id !== pasajeActualId()) return;
          cajaTexto.textContent = "";
          if (versos && versos.length > 0) {
            for (var i = 0; i < versos.length; i++) {
              var v = versos[i];
              var p = el("p", "pasaje-texto");
              var sup = el("sup", null, String(v.numero));
              p.appendChild(sup);
              p.appendChild(document.createTextNode(" " + v.texto));
              cajaTexto.appendChild(p);
            }
          } else {
            cajaTexto.appendChild(
              el(
                "p",
                "palabra-error",
                "No pudimos encontrar el texto de este pasaje en la fuente actual."
              )
            );
          }
          notaFuente.textContent =
            "Texto: " + nombreTraduccion(parsed) + " · Bible API libre (bible.helloao.org)";
        })
        .catch(function () {
          if (emocionActual.id !== pasajeActualId()) return;
          cajaTexto.textContent = "";
          cajaTexto.appendChild(
            el(
              "p",
              "palabra-error",
              "En este momento no podemos cargar el texto del pasaje. Puedes leer la referencia: " +
                pasaje.referencia +
                "."
            )
          );
        });
    } else {
      cajaTexto.textContent = "";
      cajaTexto.appendChild(el("p", "pasaje-texto", pasaje.referencia));
    }

    card.appendChild(
      el("p", "pasaje-reference", pasaje.referencia)
    );

    card.appendChild(el("h4", "pasaje-seccion", "Reflexión"));
    var reflexion = el("div", "pasaje-reflexion");
    reflexion.appendChild(el("p", null, pasaje.reflexion));
    card.appendChild(reflexion);

    card.appendChild(el("h4", "pasaje-seccion", "Oración"));
    var oracion = el("div", "pasaje-oracion");
    oracion.appendChild(el("p", null, pasaje.oracion));
    card.appendChild(oracion);

    // Acciones
    var acciones = el("div", "pasaje-acciones");
    var btnOtro = el("button", "pasaje-btn", "🔄 Otro pasaje");
    btnOtro.type = "button";
    if (emocionActual.pasajes.length < 2) btnOtro.disabled = true;
    btnOtro.addEventListener("click", otroPasaje);
    acciones.appendChild(btnOtro);

    var idFav = pasajeId(emocionActual.id, pasajeIndex);
    var aviso = el("p", "pasaje-aviso");
    aviso.setAttribute("aria-live", "polite");

    var btnGuardar = el(
      "button",
      "pasaje-btn" + (esFavorito(idFav) ? " pasaje-btn-guardado" : ""),
      esFavorito(idFav) ? "♥ Guardado" : "♡ Guardar"
    );
    btnGuardar.type = "button";
    btnGuardar.setAttribute("aria-pressed", esFavorito(idFav) ? "true" : "false");
    btnGuardar.addEventListener("click", function () {
      alternarFavorito(btnGuardar, aviso);
    });
    acciones.appendChild(btnGuardar);

    var btnCompartir = el("button", "pasaje-btn", "📤 Compartir");
    btnCompartir.type = "button";
    btnCompartir.addEventListener("click", function () {
      compartirPasaje(aviso);
    });
    acciones.appendChild(btnCompartir);
    card.appendChild(acciones);

    card.appendChild(aviso);

    var btnVolver = el(
      "button",
      "pasaje-btn pasaje-volver",
      "← Volver a las situaciones"
    );
    btnVolver.type = "button";
    btnVolver.addEventListener("click", function () {
      emocionActual = null;
      var view = $id("pasaje-view");
      view.hidden = true;
      view.textContent = "";
      $id("emociones").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    card.appendChild(btnVolver);

    view.appendChild(card);
  }

  // Guarda el id de la emoción actual para evitar renderizados obsoletos
  function pasajeActualId() {
    return emocionActual ? emocionActual.id : null;
  }

  function pasajeId(emocionId, index) {
    return emocionId + "__" + index;
  }

  function otroPasaje() {
    if (!emocionActual || emocionActual.pasajes.length < 2) return;
    var anterior = pasajeIndex;
    var nuevo;
    do {
      nuevo = Math.floor(Math.random() * emocionActual.pasajes.length);
    } while (nuevo === anterior);
    pasajeIndex = nuevo;
    renderPasaje();
  }

  function alternarFavorito(btnGuardar, aviso) {
    if (!emocionActual || !emocionActual.pasajes[pasajeIndex]) return;
    var pasaje = emocionActual.pasajes[pasajeIndex];
    var id = pasajeId(emocionActual.id, pasajeIndex);
    var favoritos = cargarFavoritos();
    var idx = -1;
    for (var i = 0; i < favoritos.length; i++) {
      if (favoritos[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      favoritos.splice(idx, 1);
      guardarFavoritos(favoritos);
      btnGuardar.textContent = "♡ Guardar";
      btnGuardar.classList.remove("pasaje-btn-guardado");
      btnGuardar.setAttribute("aria-pressed", "false");
      if (aviso) aviso.textContent = "Se quitó de tus favoritos.";
    } else {
      favoritos.push({
        id: id,
        emocionId: emocionActual.id,
        index: pasajeIndex,
        icono: emocionActual.icono,
        categoria: emocionActual.titulo,
        referencia: pasaje.referencia,
        texto: pasaje.reflexion,
        reflexion: pasaje.reflexion
      });
      guardarFavoritos(favoritos);
      btnGuardar.textContent = "♥ Guardado";
      btnGuardar.classList.add("pasaje-btn-guardado");
      btnGuardar.setAttribute("aria-pressed", "true");
      if (aviso) aviso.textContent = "Guardado en tus favoritos. ❤️";
    }
    renderFavoritos();
  }

  function renderFavoritos() {
    var favoritos = cargarFavoritos();
    var grid = $id("favoritos-grid");
    var vacio = $id("favoritos-vacio");
    grid.textContent = "";
    if (favoritos.length === 0) {
      vacio.hidden = false;
      return;
    }
    vacio.hidden = true;
    for (var i = 0; i < favoritos.length; i++) {
      (function (fav) {
        var card = el("article", "favorito-card");
        card.appendChild(
          el("div", "favorito-titulo", fav.icono + " " + fav.categoria)
        );
        card.appendChild(el("div", "favorito-ref", fav.referencia));
        card.appendChild(el("p", "favorito-texto", fav.texto));
        var acciones = el("div", "favorito-acciones");
        var btnLeer = el("button", "favorito-btn", "Leer");
        btnLeer.type = "button";
        btnLeer.addEventListener("click", function () {
          if (fav.tipo === "biblia") {
            // El texto completo ya se muestra en la tarjeta
            card.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
          var emocion = emocionPorId(fav.emocionId);
          if (emocion) {
            emocionActual = emocion;
            pasajeIndex = fav.index || 0;
            var view = $id("pasaje-view");
            view.hidden = false;
            renderPasaje();
            view.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
        acciones.appendChild(btnLeer);
        var btnQuitar = el("button", "favorito-btn", "Quitar");
        btnQuitar.type = "button";
        btnQuitar.addEventListener("click", function () {
          var lista = cargarFavoritos().filter(function (f) {
            return f.id !== fav.id;
          });
          guardarFavoritos(lista);
          renderFavoritos();
        });
        acciones.appendChild(btnQuitar);
        card.appendChild(acciones);
        grid.appendChild(card);
      })(favoritos[i]);
    }
  }

  function compartirPasaje(aviso) {
    if (!emocionActual || !emocionActual.pasajes[pasajeIndex]) return;
    var pasaje = emocionActual.pasajes[pasajeIndex];
    var texto =
      "❤️ Biblia según cómo te sientes\n" +
      emocionActual.titulo + "\n" +
      pasaje.referencia + "\n" +
      pasaje.reflexion + "\n" +
      location.href.split("#")[0] + "#emociones";
    if (navigator.share) {
      navigator.share({ title: "La Palabra de cada día", text: texto }).catch(function () {
        /* usuario canceló */
      });
    } else {
      var hecho = function () {
        if (aviso) aviso.textContent = "✅ Contenido copiado al portapapeles.";
      };
      var fallo = function () {
        if (aviso) aviso.textContent = "No se pudo copiar. Copia la URL manualmente.";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(hecho, fallo);
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = texto;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          hecho();
        } catch (e) {
          fallo();
        }
      }
    }
  }

  /********** Buscador de la Biblia **********/
  var bibliaData = null; // data/biblia-completa.json (se carga una sola vez)
  var busquedaActual = null; // { termino, resultados, mostrados, total, libroFiltro, testamentoFiltro }
  var PASOS = 20;
  var CLAVE_RECIENTES = "palabra_busquedas_v1";

  // Abreviaturas bíblicas comunes en español -> nombre canónico
  var ABREVIATURAS = {
    gn: "Génesis", gen: "Génesis", ex: "Éxodo", exo: "Éxodo", lv: "Levítico", lev: "Levítico",
    nm: "Números", num: "Números", dt: "Deuteronomio", deut: "Deuteronomio",
    jos: "Josué", jc: "Jueces", jue: "Jueces", rt: "Rut",
    "1s": "1 Samuel", "2s": "2 Samuel", "1sam": "1 Samuel", "2sam": "2 Samuel",
    "1r": "1 Reyes", "2r": "2 Reyes", "1cr": "1 Crónicas", "2cr": "2 Crónicas",
    esd: "Esdras", neh: "Nehemías", est: "Ester", job: "Job",
    sal: "Salmos", salmo: "Salmos", salmos: "Salmos", pr: "Proverbios", prov: "Proverbios",
    ecl: "Eclesiastés", cnt: "Cantar de los Cantares", cantares: "Cantar de los Cantares",
    is: "Isaías", isa: "Isaías", jer: "Jeremías", lam: "Lamentaciones", ez: "Ezequiel",
    dn: "Daniel", dan: "Daniel", os: "Oseas", jl: "Joel", am: "Amós",
    abd: "Abdías", jon: "Jonás", miq: "Miqueas", nah: "Nahum", hab: "Habacuc",
    sof: "Sofonías", ag: "Hageo", zac: "Zacarías", mal: "Malaquías",
    mt: "Mateo", mateo: "Mateo", mc: "Marcos", marcos: "Marcos", lc: "Lucas", lucas: "Lucas",
    jn: "Juan", juan: "Juan", hch: "Hechos", hechos: "Hechos", rm: "Romanos", romanos: "Romanos",
    "1co": "1 Corintios", "2co": "2 Corintios", ga: "Gálatas", gal: "Gálatas",
    ef: "Efesios", efesios: "Efesios", flp: "Filipenses", fil: "Filipenses",
    col: "Colosenses", "1ts": "1 Tesalonicenses", "2ts": "2 Tesalonicenses",
    "1tm": "1 Timoteo", "2tm": "2 Timoteo", tt: "Tito", tito: "Tito",
    flm: "Filemón", heb: "Hebreos", hebreos: "Hebreos", st: "Santiago", sant: "Santiago",
    "1p": "1 Pedro", "2p": "2 Pedro", "1jn": "1 Juan", "2jn": "2 Juan", "3jn": "3 Juan",
    jud: "Judas", ap: "Apocalipsis", apoc: "Apocalipsis",
    // Deuterocanónicos
    tob: "Tobit", jdt: "Judit", sab: "Sabiduría", eclo: "Sirácide", sir: "Sirácide",
    bar: "Baruc", "1mac": "Primer libro de los Macabeos", "2mac": "Segundo libro de los Macabeos"
  };

  function normalizarTexto(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Auto-inicio del buscador: se conecta solo al cargar (no depende
  // de la llamada en iniciar(), así el buscador funciona aunque la
  // página se abra directamente en #buscador-biblia).
  function iniciarBuscador() {
    if (!$id("buscador-form")) return;
    configurarBuscador();
    mostrarBusquedasRecientes();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarBuscador);
  } else {
    iniciarBuscador();
  }

  function cargarBibliaCompleta() {
    if (bibliaData) return Promise.resolve(bibliaData);
    return fetch("data/biblia-completa.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        bibliaData = json;
        return bibliaData;
      });
  }

  function libroPorNombre(nombreNormalizado) {
    if (!bibliaData) return null;
    for (var i = 0; i < bibliaData.libros.length; i++) {
      var l = bibliaData.libros[i];
      if (normalizarTexto(l.nombre) === nombreNormalizado) return l;
    }
    // La fuente usa "San Mateo" / "San Lucas"; permitir buscarlos sin el prefijo
    var conSan = "san " + nombreNormalizado;
    for (var j = 0; j < bibliaData.libros.length; j++) {
      var l2 = bibliaData.libros[j];
      if (normalizarTexto(l2.nombre) === conSan) return l2;
    }
    return null;
  }

  // Detectar "Juan 3:16", "Juan 3", "Jn 3:16", "Sal 23", "Juan 3, 16"
  function parsearReferenciaBusqueda(termino) {
    var t = normalizarTexto(termino);
    var m = t.match(/^(.+?)\s*(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?$/);
    var cap = null, desde = null, hasta = null, libroNombre = null;
    if (m) {
      libroNombre = m[1]; cap = parseInt(m[2], 10); desde = parseInt(m[3], 10);
      hasta = m[4] ? parseInt(m[4], 10) : desde;
    } else {
      var m2 = t.match(/^(.+?)\s*(\d+)\s*$/);
      if (m2) {
        libroNombre = m2[1]; cap = parseInt(m2[2], 10); desde = 1; hasta = null;
      }
    }
    if (!libroNombre) return null;
    var nombre = ABREVIATURAS[libroNombre] ? normalizarTexto(ABREVIATURAS[libroNombre]) : libroNombre;
    var libro = libroPorNombre(nombre);
    if (!libro) return null;
    var capitulo = null;
    for (var i = 0; i < libro.capitulos.length; i++) {
      var numCapitulo = libro.capitulos[i].numero || i + 1;
      if (numCapitulo === cap) { capitulo = libro.capitulos[i]; break; }
    }
    if (!capitulo) return null;
    return { libro: libro, capitulo: capitulo, cap: cap, desde: desde, hasta: hasta };
  }

  function puntuarTexto(textoNorm, terminoNorm) {
    if (textoNorm === terminoNorm) return 4;
    if (textoNorm.indexOf(terminoNorm) === 0) return 3;
    var re = new RegExp("(^|\\s)" + terminoNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|\\s|[.,;:])");
    if (re.test(textoNorm)) return 2;
    return textoNorm.indexOf(terminoNorm) >= 0 ? 1 : 0;
  }

  function buscarPorTexto(termino, libroFiltro, testamentoFiltro) {
    var term = normalizarTexto(termino);
    if (!term) return [];
    var resultados = [];
    for (var li = 0; li < bibliaData.libros.length; li++) {
      var libro = bibliaData.libros[li];
      if (libroFiltro && normalizarTexto(libro.nombre) !== normalizarTexto(libroFiltro)) continue;
      if (testamentoFiltro && libro.testamento !== testamentoFiltro) continue;
      for (var ci = 0; ci < libro.capitulos.length; ci++) {
        var cap = libro.capitulos[ci];
        for (var vi = 0; vi < cap.versiculos.length; vi++) {
          var v = cap.versiculos[vi];
          var score = puntuarTexto(normalizarTexto(v.texto), term);
          if (score > 0) {
            resultados.push({
              libro: libro.nombre,
              capitulo: cap.numero || ci + 1,
              versiculo: v.numero,
              texto: v.texto,
              score: score
            });
          }
        }
      }
    }
    resultados.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var la = a.libro < b.libro ? -1 : (a.libro > b.libro ? 1 : 0);
      return la || a.capitulo - b.capitulo || a.versiculo - b.versiculo;
    });
    return resultados;
  }

  function nombreParaMostrar(nombre) {
    return nombre
      .replace(/^San /, "")
      .replace(/^Primer libro de los Macabeos/, "1 Macabeos")
      .replace(/^Segundo libro de los Macabeos/, "2 Macabeos");
  }

  function referenciaCorta(libro, cap, desde, hasta) {
    if (hasta && hasta !== desde)
      return nombreParaMostrar(libro) + " " + cap + ":" + desde + "-" + hasta;
    return nombreParaMostrar(libro) + " " + cap + ":" + desde;
  }

  function buscarPasajes(termino, libroFiltro, testamentoFiltro) {
    var ref = parsearReferenciaBusqueda(termino);
    var resultados = [];
    if (ref) {
      var vv = ref.hasta
        ? ref.capitulo.versiculos.filter(function (v) { return v.numero >= ref.desde && v.numero <= ref.hasta; })
        : ref.capitulo.versiculos;
      for (var i = 0; i < vv.length; i++) {
        resultados.push({
          libro: ref.libro.nombre,
          capitulo: ref.cap,
          versiculo: vv[i].numero,
          texto: vv[i].texto,
          score: 5
        });
      }
    } else {
      // ¿El término es el nombre exacto de un libro? → mostrar el capítulo 1
      var libroExacto = libroPorNombre(normalizarTexto(termino));
      if (libroExacto && libroExacto.capitulos.length > 0) {
        var cap = libroExacto.capitulos[0];
        for (var k = 0; k < cap.versiculos.length; k++) {
          resultados.push({
            libro: libroExacto.nombre,
            capitulo: cap.numero || 1,
            versiculo: cap.versiculos[k].numero,
            texto: cap.versiculos[k].texto,
            score: 6
          });
        }
      } else {
        resultados = buscarPorTexto(termino, libroFiltro, testamentoFiltro);
      }
    }
    return resultados;
  }

  function cargarBusquedasRecientes() {
    try {
      var raw = localStorage.getItem(CLAVE_RECIENTES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function guardarBusquedaReciente(termino) {
    var lista = cargarBusquedasRecientes();
    var t = String(termino || "").trim();
    if (!t) return;
    lista = lista.filter(function (x) { return normalizarTexto(x) !== normalizarTexto(t); });
    lista.unshift(t);
    if (lista.length > 5) lista = lista.slice(0, 5);
    try {
      localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
    } catch (e) { /* almacenamiento no disponible */ }
    mostrarBusquedasRecientes();
  }

  function mostrarBusquedasRecientes() {
    var cont = $id("buscador-recientes");
    var lista = cargarBusquedasRecientes();
    cont.textContent = "";
    if (!lista.length) { cont.hidden = true; return; }
    cont.hidden = false;
    cont.appendChild(el("h3", "buscador-recientes-titulo", "Búsquedas recientes"));
    var chips = el("div", "buscador-recientes-chips");
    for (var i = 0; i < lista.length; i++) {
      (function (termino) {
        var chip = el("button", "buscador-chip", "• " + termino);
        chip.type = "button";
        chip.addEventListener("click", function () {
          $id("buscador-input").value = termino;
          ejecutarBusqueda();
        });
        chips.appendChild(chip);
      })(lista[i]);
    }
    cont.appendChild(chips);
    var limpiar = el("button", "buscador-limpiar", "Limpiar historial");
    limpiar.type = "button";
    limpiar.addEventListener("click", function () {
      try { localStorage.removeItem(CLAVE_RECIENTES); } catch (e) {}
      mostrarBusquedasRecientes();
    });
    cont.appendChild(limpiar);
  }

  function rellenarFiltroLibros() {
    var sel = $id("buscador-libro");
    if (!bibliaData || sel.options.length > 1) return;
    for (var i = 0; i < bibliaData.libros.length; i++) {
      var op = document.createElement("option");
      op.value = bibliaData.libros[i].nombre;
      op.textContent = nombreParaMostrar(bibliaData.libros[i].nombre);
      sel.appendChild(op);
    }
  }

  function idFavoritoBusqueda(res) {
    return "bib__" + normalizarTexto(res.libro) + "__" + res.capitulo + "__" + res.versiculo;
  }

  function alternarFavoritoBusqueda(btn, res) {
    var id = idFavoritoBusqueda(res);
    var favoritos = cargarFavoritos();
    var idx = -1;
    for (var i = 0; i < favoritos.length; i++) {
      if (favoritos[i].id === id) { idx = i; break; }
    }
    if (idx >= 0) {
      favoritos.splice(idx, 1);
      btn.textContent = "♡ Guardar";
      btn.classList.remove("pasaje-btn-guardado");
      btn.setAttribute("aria-pressed", "false");
    } else {
      favoritos.push({
        id: id,
        tipo: "biblia",
        icono: "🔎",
        categoria: nombreParaMostrar(res.libro) + " " + res.capitulo + ":" + res.versiculo,
        referencia: referenciaCorta(res.libro, res.capitulo, res.versiculo, res.versiculo),
        texto: res.texto,
        libro: res.libro,
        capitulo: res.capitulo,
        versiculo: res.versiculo
      });
      btn.textContent = "♥ Guardado";
      btn.classList.add("pasaje-btn-guardado");
      btn.setAttribute("aria-pressed", "true");
    }
    guardarFavoritos(favoritos);
    renderFavoritos();
  }

  function compartirPasajeBusqueda(res) {
    var texto =
      "📖 Pasaje bíblico\n" +
      referenciaCorta(res.libro, res.capitulo, res.versiculo, res.versiculo) + "\n" +
      "\"" + res.texto + "\"\n" +
      "Encontrado en La Palabra de cada día.";
    var aviso = $id("buscador-estado");
    if (navigator.share) {
      navigator.share({ title: "Pasaje bíblico", text: texto }).catch(function () {});
    } else {
      var hecho = function () {
        aviso.textContent = "✅ Contenido copiado al portapapeles.";
      };
      var fallo = function () {
        aviso.textContent = "No se pudo copiar. Copia la URL manualmente.";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(hecho, fallo);
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = texto;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          hecho();
        } catch (e) { fallo(); }
      }
    }
  }

  function mostrarResultados() {
    var cont = $id("buscador-resultados");
    var estado = $id("buscador-estado");
    cont.textContent = "";
    if (!busquedaActual) return;
    var total = busquedaActual.total;
    if (total === 0) {
      estado.textContent = "";
      var vacio = el("div", "buscador-sin-resultados");
      vacio.appendChild(el("strong", null, "🔎 No encontramos ningún pasaje."));
      vacio.appendChild(
        el("p", null, "Prueba con otra palabra, libro o referencia bíblica.")
      );
      cont.appendChild(vacio);
      $id("buscador-mas").hidden = true;
      return;
    }
    estado.textContent =
      'Resultados para: "' + busquedaActual.termino + '" · ' + total + " resultado" + (total === 1 ? "" : "s");
    var limite = Math.min(busquedaActual.mostrados, total);
    for (var i = 0; i < limite; i++) {
      (function (res) {
        var card = el("article", "buscador-resultado");
        card.appendChild(
          el("div", "buscador-resultado-ref",
            "📖 " + referenciaCorta(res.libro, res.capitulo, res.versiculo, res.versiculo))
        );
        card.appendChild(el("p", "buscador-resultado-texto", "\"" + res.texto + "\""));
        var acciones = el("div", "buscador-resultado-acciones");
        var idFav = idFavoritoBusqueda(res);
        var btnGuardar = el("button", "pasaje-btn" + (esFavorito(idFav) ? " pasaje-btn-guardado" : ""),
          esFavorito(idFav) ? "♥ Guardado" : "♡ Guardar");
        btnGuardar.type = "button";
        btnGuardar.setAttribute("aria-pressed", esFavorito(idFav) ? "true" : "false");
        btnGuardar.addEventListener("click", function () { alternarFavoritoBusqueda(btnGuardar, res); });
        acciones.appendChild(btnGuardar);
        var btnCompartir = el("button", "pasaje-btn", "📤 Compartir");
        btnCompartir.type = "button";
        btnCompartir.addEventListener("click", function () { compartirPasajeBusqueda(res); });
        acciones.appendChild(btnCompartir);
        card.appendChild(acciones);
        cont.appendChild(card);
      })(busquedaActual.resultados[i]);
    }
    $id("buscador-mas").hidden = busquedaActual.mostrados >= total;
  }

  function cargarMasResultados() {
    if (!busquedaActual) return;
    busquedaActual.mostrados = Math.min(busquedaActual.mostrados + PASOS, busquedaActual.total);
    mostrarResultados();
  }

  function ejecutarBusqueda() {
    var input = $id("buscador-input");
    var termino = input.value;
    var libroFiltro = $id("buscador-libro").value;
    var testamentoFiltro = "";
    var radios = document.querySelectorAll('input[name="testamento"]:checked');
    if (radios.length) testamentoFiltro = radios[0].value;
    if (!normalizarTexto(termino)) return;
    $id("buscador-estado").textContent = "Buscando…";
    $id("buscador-resultados").textContent = "";
    $id("buscador-mas").hidden = true;
    cargarBibliaCompleta()
      .then(function () {
        rellenarFiltroLibros();
        var resultados = buscarPasajes(termino, libroFiltro, testamentoFiltro);
        busquedaActual = {
          termino: termino,
          resultados: resultados,
          mostrados: Math.min(PASOS, resultados.length),
          total: resultados.length,
          libroFiltro: libroFiltro,
          testamentoFiltro: testamentoFiltro
        };
        guardarBusquedaReciente(termino);
        mostrarResultados();
      })
      .catch(function () {
        $id("buscador-estado").textContent =
          "En este momento no podemos cargar la base bíblica. Por favor, inténtalo nuevamente.";
      });
  }

  function configurarBuscador() {
    $id("buscador-form").addEventListener("submit", function (e) {
      e.preventDefault();
      ejecutarBusqueda();
    });
    $id("buscador-libro").addEventListener("change", function () {
      if (busquedaActual) ejecutarBusqueda();
    });
    var radios = document.querySelectorAll('input[name="testamento"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", function () {
        if (busquedaActual) ejecutarBusqueda();
      });
    }
    $id("btn-cargar-mas").addEventListener("click", cargarMasResultados);

    // Sugerencias rápidas
    var sugerencias = [
      ["❤️ Amor", "amor"], ["🕊️ Paz", "paz"], ["🙏 Oración", "oración"],
      ["🌅 Esperanza", "esperanza"], ["💪 Fuerzas", "fuerza"], ["🤍 Consuelo", "consuelo"]
    ];
    var cont = $id("buscador-sugerencias");
    cont.appendChild(el("h3", "buscador-sugerencias-titulo", "Búsquedas rápidas"));
    var chips = el("div", "buscador-sugerencias-chips");
    for (var i = 0; i < sugerencias.length; i++) {
      (function (etiqueta, termino) {
        var chip = el("button", "buscador-chip", etiqueta);
        chip.type = "button";
        chip.addEventListener("click", function () {
          $id("buscador-input").value = termino;
          ejecutarBusqueda();
        });
        chips.appendChild(chip);
      })(sugerencias[i][0], sugerencias[i][1]);
    }
    cont.appendChild(chips);
  }

  /********** Hash #emociones y #buscador-biblia **********/
  function manejarHashInicial() {
    if (location.hash === "#emociones") {
      setTimeout(function () {
        var seccion = $id("emociones");
        if (seccion) seccion.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    } else if (location.hash === "#buscador-biblia") {
      setTimeout(function () {
        var seccion = $id("buscador-biblia");
        if (seccion) {
          seccion.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(function () {
            $id("buscador-input").focus();
          }, 500);
        }
      }, 400);
    }
  }

  /********** Inicio **********/
  function iniciar() {
    renderFecha();

    var diaInicial = leerHash();
    if (!diaInicial || diaInicial < 1 || diaInicial > 366) {
      diaInicial = diaDelAnio(fechaHoy);
    }
    diaActual = diaInicial;

    configurarMenu();
    configurarEventos();

    cargarLecturas()
      .then(function () {
        renderLectura(diaActual);
      })
      .catch(function () {
        renderLectura(diaActual); // mostrará el mensaje amigable
      });

    cargarEmociones();
    renderFavoritos();
    manejarHashInicial();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

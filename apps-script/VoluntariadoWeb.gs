/**
 * Voluntariado en la web de Método Kiru
 * --------------------------------------
 * Va pegado en la hoja de Google donde Jotform guarda las respuestas del
 * formulario «Añade oportunidades de voluntariado» (262994875550069).
 *
 * - instalar(): añade la columna «Publicar» con casillas (se ejecuta una vez).
 * - doGet(): la web lo llama y recibe SOLO las filas con la casilla marcada,
 *   y de esas filas SOLO los datos públicos. Nunca salen el correo, el
 *   teléfono, la dirección ni la persona de contacto de la entidad.
 *
 * No envía correos ni escribe nada en la hoja salvo la columna «Publicar».
 */

var COLUMNA_PUBLICAR = 'Publicar';

// Clave pública -> título de la pregunta en el formulario.
var CAMPOS_PUBLICOS = {
  id: 'Submission ID',
  nombre: 'Nombre público',
  nombreLegal: 'Nombre legal de la entidad',
  web: 'Sitio web',
  localidad: 'Localidad',
  mision: 'Breve descripción de la misión',
  titulo: 'Nombre o título de la oportunidad',
  tareas: 'Descripción de las tareas',
  colectivos: 'Colectivos con los que trabajará',
  actividad: 'Tipo de actividad',
  dias: 'Días de la semana',
  franjas: 'Franja horaria',
  inicio: 'Hora de inicio',
  fin: 'Hora de fin',
  frecuencia: 'Frecuencia',
  plazas: 'Plazas disponibles',
  edadMinima: 'Edad mínima',
  experiencia: 'Experiencia previa',
  formacion: 'Formación inicial',
  formacionDetalle: 'Detalles de la formación inicial',
  requisitos: 'Requisitos de incorporación',
  certificadoDelitos: 'Certificado negativo de delitos sexuales u otros certificados',
  certificadosDetalle: 'Detalles de certificados requeridos',
  compromiso: 'Compromiso mínimo',
  proceso: 'Proceso de selección e incorporación',
  contacto: 'Canal o enlace de contacto para jóvenes',
  documentacion: 'Documentación que entregan',
  condicionesDocumentacion: 'Condiciones para recibir la documentación',
  noRemunerado: '¿El voluntariado es no remunerado?',
  gastos: 'Gastos cubiertos, si los hubiera',
  permiso: 'Permiso para publicar nombre, logo y descripción de la oportunidad',
  fecha: 'Submission Date'
};

function hoja_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function normaliza_(t) {
  return String(t || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function columnas_(cabecera) {
  var mapa = {};
  cabecera.forEach(function (h, i) { mapa[normaliza_(h)] = i; });
  return mapa;
}

/** Ejecutar una vez: añade la columna «Publicar» con casillas. */
function instalar() {
  var sh = hoja_();
  var ultima = Math.max(sh.getLastColumn(), 1);
  var cabecera = sh.getRange(1, 1, 1, ultima).getValues()[0];
  var col = columnas_(cabecera)[normaliza_(COLUMNA_PUBLICAR)];
  if (col === undefined) {
    col = ultima; // índice 0 de la columna siguiente a la última
    sh.getRange(1, col + 1).setValue(COLUMNA_PUBLICAR).setFontWeight('bold');
  }
  var filas = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, col + 1, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build());
  SpreadsheetApp.getActiveSpreadsheet().toast('Columna «Publicar» lista. Marca la casilla de cada oportunidad que quieras en la web.');
}

function esVerdadero_(v) {
  return v === true || ['true', 'verdadero', 'sí', 'si', 'x', '1'].indexOf(normaliza_(v)) !== -1;
}

function leerPublicadas_() {
  var sh = hoja_();
  var datos = sh.getDataRange().getDisplayValues();
  var crudos = sh.getDataRange().getValues();
  if (datos.length < 2) return [];
  var col = columnas_(datos[0]);
  var colPublicar = col[normaliza_(COLUMNA_PUBLICAR)];
  if (colPublicar === undefined) return [];
  var salida = [];
  for (var f = 1; f < datos.length; f++) {
    if (!esVerdadero_(crudos[f][colPublicar])) continue;
    var ficha = {};
    Object.keys(CAMPOS_PUBLICOS).forEach(function (clave) {
      var i = col[normaliza_(CAMPOS_PUBLICOS[clave])];
      ficha[clave] = i === undefined ? '' : String(datos[f][i]).trim().slice(0, 1500);
    });
    // Sin permiso para publicar el nombre, la ficha no sale.
    if (ficha.permiso && normaliza_(ficha.permiso).indexOf('nombre') === -1) continue;
    // Sin permiso para la descripción, se quitan los textos libres.
    if (ficha.permiso && normaliza_(ficha.permiso).indexOf('descripcion') === -1) {
      ficha.mision = '';
      ficha.tareas = '';
    }
    delete ficha.permiso;
    salida.push(ficha);
  }
  return salida;
}

/** La web llama aquí. Respuesta en JSON, guardada 2 minutos. */
function doGet() {
  var cache = CacheService.getScriptCache();
  var json = cache.get('voluntariado');
  if (!json) {
    json = JSON.stringify({ oportunidades: leerPublicadas_() });
    if (json.length < 90000) cache.put('voluntariado', json, 120);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/** Para probar desde el editor: muestra en el registro lo que vería la web. */
function probar() {
  Logger.log(JSON.stringify(leerPublicadas_(), null, 2));
}

/**
 * Sync the most recent QUOTAS snapshot (.xlsx) from a Drive folder into a
 * destination Google Spreadsheet, as values only.
 *
 * Deployment: see apps-script/README.md.
 */

// ---- Config -----------------------------------------------------------

var SOURCE_FOLDER_ID = '1CEbP4AGyYByd-HG3hc0WG5hVljth_hZ9'; // "Quotas 2027 / Snapshots"
var DEST_SPREADSHEET_ID = '1W_1WQ3Zinj_JdtKFmVZOP_Mfc69OZXjAwPJTC_Z4RBQ';
var DEST_SHEET_GID = 0; // the tab shown at gid=0 in the destination link
var LAST_FILE_PROP_KEY = 'LAST_SYNCED_FILE_NAME';

// ---- Custom menu (manual "button" in the spreadsheet) -----------------

/**
 * Simple trigger: adds a "Quota Sync" menu to the spreadsheet UI on open,
 * with items to run the sync manually or (re)install the 15-minute
 * trigger, without needing to open the Apps Script editor.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quota Sync')
    .addItem('Sincronizar ahora', 'runManualSync')
    .addItem('Ejecutar configuración inicial', 'runInitialSetup')
    .addToUi();
}

/**
 * Menu item: forces a sync of the most recent snapshot right now,
 * regardless of whether it was already synced.
 */
function runManualSync() {
  var ui = SpreadsheetApp.getUi();
  var latestFile = getMostRecentFileByName_(SOURCE_FOLDER_ID);
  if (!latestFile) {
    ui.alert('No se encontraron archivos .xlsx en la carpeta de origen.');
    return;
  }

  syncFileToDestination_(latestFile);
  PropertiesService.getScriptProperties().setProperty(LAST_FILE_PROP_KEY, latestFile.getName());
  ui.alert('Sincronización manual completa: "' + latestFile.getName() + '".');
}

/**
 * Menu item: runs the initial setup (installs the 15-minute trigger) and
 * confirms it in a dialog. Safe to run more than once.
 */
function runInitialSetup() {
  setupTrigger();
  SpreadsheetApp.getUi().alert('Configuración inicial completa: el trigger de 15 minutos quedó instalado.');
}

// ---- Trigger entry point ----------------------------------------------

/**
 * Runs every 15 minutes (via setupTrigger). Cheaply checks whether the
 * most recent snapshot file (by name) has changed since the last sync;
 * only performs the copy when it has.
 */
function checkForNewFileAndSync() {
  var latestFile = getMostRecentFileByName_(SOURCE_FOLDER_ID);
  if (!latestFile) {
    console.log('No .xlsx files found in source folder; nothing to do.');
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var lastSyncedName = props.getProperty(LAST_FILE_PROP_KEY);

  if (lastSyncedName === latestFile.getName()) {
    console.log('No new file (still "' + lastSyncedName + '"). Exiting.');
    return;
  }

  console.log('New file detected: "' + latestFile.getName() + '" (previous: "' + lastSyncedName + '"). Syncing...');
  syncFileToDestination_(latestFile);
  props.setProperty(LAST_FILE_PROP_KEY, latestFile.getName());
  console.log('Sync complete.');
}

// ---- Setup helpers (run manually once) ---------------------------------

/**
 * Run this once manually from the Apps Script editor to install the
 * 15-minute trigger. Safe to re-run: it replaces any existing trigger
 * for checkForNewFileAndSync instead of duplicating it.
 */
function setupTrigger() {
  deleteExistingTriggers_();
  ScriptApp.newTrigger('checkForNewFileAndSync')
    .timeBased()
    .everyMinutes(15)
    .create();
  console.log('Trigger installed: checkForNewFileAndSync will run every 15 minutes.');
}

function deleteExistingTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'checkForNewFileAndSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

// ---- Core logic ---------------------------------------------------------

/**
 * Returns the .xlsx file in the folder whose name sorts last
 * (descending), i.e. the most recent snapshot by filename. Filenames are
 * expected in the "... YYMMDD HH:MM.xlsx" format seen in Snapshots, which
 * sorts chronologically as plain strings.
 */
function getMostRecentFileByName_(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var iterator = folder.getFilesByType(MimeType.MICROSOFT_EXCEL); // .xlsx
  var files = [];
  while (iterator.hasNext()) {
    files.push(iterator.next());
  }
  if (files.length === 0) return null;

  files.sort(function (a, b) {
    var an = a.getName();
    var bn = b.getName();
    if (an === bn) return 0;
    return an < bn ? 1 : -1; // descending: most recent name first
  });

  return files[0];
}

/**
 * Converts the xlsx to a temporary Google Sheet (required to read its
 * values via SpreadsheetApp), copies its single sheet's values into the
 * destination sheet (clearing it first), then deletes the temporary copy.
 */
function syncFileToDestination_(xlsxFile) {
  var tempFile = convertXlsxToGoogleSheet_(xlsxFile);
  try {
    var tempSpreadsheet = SpreadsheetApp.openById(tempFile.getId());
    var sourceSheet = tempSpreadsheet.getSheets()[0]; // source file has a single sheet
    var values = sourceSheet.getDataRange().getValues();

    var destSpreadsheet = SpreadsheetApp.openById(DEST_SPREADSHEET_ID);
    var destSheet = getSheetByGid_(destSpreadsheet, DEST_SHEET_GID);

    destSheet.clearContents();
    if (values.length > 0 && values[0].length > 0) {
      destSheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  } finally {
    DriveApp.getFileById(tempFile.getId()).setTrashed(true);
  }
}

/**
 * Requires the "Drive API" advanced service (v2) to be enabled — see
 * README. Copying with mimeType overridden to Google Sheets is what
 * triggers the xlsx -> Google Sheet conversion.
 */
function convertXlsxToGoogleSheet_(xlsxFile) {
  var resource = {
    title: 'TEMP_QUOTA_SYNC_' + xlsxFile.getId(),
    mimeType: MimeType.GOOGLE_SHEETS
  };
  var convertedFile = Drive.Files.copy(resource, xlsxFile.getId());
  return DriveApp.getFileById(convertedFile.id);
}

function getSheetByGid_(spreadsheet, gid) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) {
      return sheets[i];
    }
  }
  throw new Error('No sheet found in destination spreadsheet with gid=' + gid);
}

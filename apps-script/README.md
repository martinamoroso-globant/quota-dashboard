# Sync Quota Snapshot (Apps Script)

Copia los valores del `.xlsx` más reciente (por nombre) de la carpeta
`Quotas 2027 / Snapshots` al spreadsheet destino, cada 15 minutos, sin
volver a copiar si no apareció un archivo nuevo desde la última corrida.

- Carpeta origen: `1CEbP4AGyYByd-HG3hc0WG5hVljth_hZ9`
- Spreadsheet destino: `1W_1WQ3Zinj_JdtKFmVZOP_Mfc69OZXjAwPJTC_Z4RBQ` (hoja `gid=0`)

## Despliegue

1. Abrí el spreadsheet destino y ve a **Extensiones > Apps Script** para
   crear un proyecto vinculado a él.
2. Reemplazá el contenido de `Code.gs` por el de
   [`SyncQuotaSnapshot.gs`](./SyncQuotaSnapshot.gs) de este repo.
3. Habilitá el servicio avanzado **Drive API**:
   - En el editor, click en el `+` junto a **Servicios**.
   - Elegí **Drive API**, versión `v2`, y agregalo.
   - (Es necesario para convertir el `.xlsx` a Google Sheets al leerlo;
     `SpreadsheetApp` no puede abrir un `.xlsx` directamente.)
4. Guardá el proyecto.
5. En el selector de funciones, elegí `setupTrigger` y ejecutá (▶). La
   primera vez te va a pedir autorizar permisos de Drive y Sheets —
   aceptalos. Esto instala el trigger de 15 minutos sobre
   `checkForNewFileAndSync` (es seguro volver a ejecutar `setupTrigger`:
   reemplaza el trigger anterior en vez de duplicarlo).
6. (Opcional) Ejecutá `checkForNewFileAndSync` manualmente una vez para
   validar que sincroniza correctamente. La primera corrida siempre
   sincroniza (no hay archivo previo registrado); las siguientes solo
   sincronizan si apareció un archivo más nuevo en la carpeta.

## Comportamiento

- `checkForNewFileAndSync` (la función del trigger) busca el `.xlsx` cuyo
  nombre es "mayor" en orden de texto dentro de la carpeta Snapshots. Los
  nombres tienen el formato `QUOTAS - YYMMDD HH:MM.xlsx`, que ordena
  cronológicamente como texto.
- Compara ese nombre contra el último sincronizado (guardado en Script
  Properties bajo `LAST_SYNCED_FILE_NAME`). Si es el mismo, termina sin
  hacer nada.
- Si es distinto, convierte el archivo a Google Sheets de forma temporal,
  lee todos los valores de su única hoja, limpia por completo la hoja
  `gid=0` del destino y pega los valores desde `A1`. Borra la copia
  temporal al finalizar.

## Supuestos

- El archivo origen tiene una sola hoja (confirmado).
- El destino se sobrescribe por completo (clear + paste) en la hoja
  `gid=0` (confirmado).
- Solo se consideran archivos `.xlsx` (`MimeType.MICROSOFT_EXCEL`) dentro
  de la carpeta Snapshots.

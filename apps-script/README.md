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
4. Guardá el proyecto y volvé a la hoja de cálculo (recargá la pestaña del
   navegador si ya la tenías abierta) para que aparezca el menú **Quota
   Sync** en la barra superior.
5. En el menú **Quota Sync**, elegí **Ejecutar configuración inicial**. La
   primera vez va a pedir autorizar permisos de Drive y Sheets —
   aceptalos. Esto instala el trigger de 15 minutos sobre
   `checkForNewFileAndSync` (es seguro volver a ejecutarlo: reemplaza el
   trigger anterior en vez de duplicarlo).
6. (Opcional) Usá **Quota Sync > Sincronizar ahora** para validar que
   sincroniza correctamente en cualquier momento, de forma manual.

## Menú "Quota Sync" (botón manual)

El script agrega un menú **Quota Sync** en la hoja de cálculo destino
(vía `onOpen`), con dos opciones:

- **Sincronizar ahora**: corre la sincronización de inmediato, sin
  importar si el archivo ya se había sincronizado antes (a diferencia del
  trigger automático, que se salta la copia si no hay archivo nuevo).
- **Ejecutar configuración inicial**: instala (o reinstala) el trigger de
  15 minutos. Es lo mismo que ejecutar `setupTrigger` desde el editor,
  pero disponible directamente desde la hoja.

Si preferís correrlo desde el editor de Apps Script en vez del menú,
`setupTrigger` sigue estando disponible en el selector de funciones.

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

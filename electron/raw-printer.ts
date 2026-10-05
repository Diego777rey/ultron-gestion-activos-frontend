import { spawn } from 'node:child_process';

const PRINT_TIMEOUT_MS = 20000;

/**
 * Envía bytes ESC/POS en crudo a la cola local.
 * Linux/macOS: `lp -o raw`. Windows: winspool RAW.
 */
export function printRaw(printerName: string, data: Buffer): Promise<void> {
  if (!printerName.trim()) {
    return Promise.reject(new Error('Indicá el nombre de la impresora térmica'));
  }
  if (/[\r\n\0]/.test(printerName)) {
    return Promise.reject(new Error('El nombre de la impresora no es válido'));
  }
  if (data.length === 0) {
    return Promise.reject(new Error('El ticket está vacío'));
  }

  if (process.platform === 'win32') {
    return printWindows(printerName, data);
  }
  if (process.platform === 'linux' || process.platform === 'darwin') {
    return printCups(printerName, data);
  }
  return Promise.reject(new Error('Este sistema no tiene cola de impresión compatible'));
}

function printCups(printerName: string, data: Buffer): Promise<void> {
  return runCommand('lp', ['-d', printerName, '-o', 'raw'], data, (error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Error('No está instalado CUPS. En el equipo instalá el paquete cups.');
    }
    return error;
  });
}

function printWindows(printerName: string, data: Buffer): Promise<void> {
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Marshal = [Runtime.InteropServices.Marshal]

# Add-Type necesita csc.exe, que falta en algunos Windows 10: se declara winspool con Reflection.Emit.
$asmName = New-Object Reflection.AssemblyName 'UltronRawPrinter'
$asm = [AppDomain]::CurrentDomain.DefineDynamicAssembly($asmName, [Reflection.Emit.AssemblyBuilderAccess]::Run)
$typeBuilder = $asm.DefineDynamicModule('UltronRawPrinter').DefineType('UltronRawPrinter', 'Public, Class')
$dllImport = [Runtime.InteropServices.DllImportAttribute]
$dllImportCtor = $dllImport.GetConstructor([Type[]]@([string]))
$dllImportFields = [Reflection.FieldInfo[]]@(
  $dllImport.GetField('EntryPoint'),
  $dllImport.GetField('SetLastError'),
  $dllImport.GetField('CharSet')
)
function Add-Winspool([string]$Entry, [Type[]]$Params) {
  $method = $typeBuilder.DefineMethod($Entry, 'Public, Static, PinvokeImpl', [bool], $Params)
  for ($i = 0; $i -lt $Params.Length; $i++) {
    if ($Params[$i].IsByRef) {
      [void]$method.DefineParameter($i + 1, 'Out', $null)
    }
  }
  $values = [object[]]@($Entry, $true, [Runtime.InteropServices.CharSet]::Ansi)
  $attr = New-Object Reflection.Emit.CustomAttributeBuilder($dllImportCtor, [object[]]@('winspool.drv'), $dllImportFields, $values)
  $method.SetCustomAttribute($attr)
}
Add-Winspool 'OpenPrinterA' @([string], [IntPtr].MakeByRefType(), [IntPtr])
Add-Winspool 'ClosePrinter' @([IntPtr])
Add-Winspool 'StartDocPrinterA' @([IntPtr], [int], [IntPtr])
Add-Winspool 'EndDocPrinter' @([IntPtr])
Add-Winspool 'StartPagePrinter' @([IntPtr])
Add-Winspool 'EndPagePrinter' @([IntPtr])
Add-Winspool 'WritePrinter' @([IntPtr], [IntPtr], [int], [int].MakeByRefType())
$winspool = $typeBuilder.CreateType()

$name = $env:ULTRON_PRINTER_NAME
$b64 = [Console]::In.ReadToEnd().Trim()
$bytes = [Convert]::FromBase64String($b64)
$handle = [IntPtr]::Zero
if (-not $winspool::OpenPrinterA($name, [ref]$handle, [IntPtr]::Zero)) {
  $code = $Marshal::GetLastWin32Error()
  throw "No se pudo abrir la impresora $name (error $code). Instalá la térmica como Generic / Text Only."
}
$docName = $Marshal::StringToHGlobalAnsi('Ultron ticket')
$dataType = $Marshal::StringToHGlobalAnsi('RAW')
$ptrSize = [IntPtr]::Size
$docInfo = $Marshal::AllocHGlobal($ptrSize * 3)
$ptr = $Marshal::AllocHGlobal($bytes.Length)
try {
  # DOC_INFO_1A: pDocName, pOutputFile, pDatatype
  $Marshal::WriteIntPtr($docInfo, 0, $docName)
  $Marshal::WriteIntPtr($docInfo, $ptrSize, [IntPtr]::Zero)
  $Marshal::WriteIntPtr($docInfo, $ptrSize * 2, $dataType)
  if (-not $winspool::StartDocPrinterA($handle, 1, $docInfo)) {
    $code = $Marshal::GetLastWin32Error()
    throw "No se pudo iniciar la impresion (error $code)"
  }
  if (-not $winspool::StartPagePrinter($handle)) {
    throw "No se pudo iniciar la pagina"
  }
  $Marshal::Copy($bytes, 0, $ptr, $bytes.Length)
  $written = 0
  if (-not $winspool::WritePrinter($handle, $ptr, $bytes.Length, [ref]$written)) {
    $code = $Marshal::GetLastWin32Error()
    throw "No se pudo escribir en la impresora (error $code)"
  }
  [void]$winspool::EndPagePrinter($handle)
  [void]$winspool::EndDocPrinter($handle)
} finally {
  [void]$winspool::ClosePrinter($handle)
  $Marshal::FreeHGlobal($ptr)
  $Marshal::FreeHGlobal($docInfo)
  $Marshal::FreeHGlobal($docName)
  $Marshal::FreeHGlobal($dataType)
}
`;

  return runCommand(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    Buffer.from(data.toString('base64'), 'utf8'),
    (error) => error,
    { ULTRON_PRINTER_NAME: printerName },
  );
}

function runCommand(
  command: string,
  args: string[],
  stdin: Buffer,
  mapError: (error: Error) => Error,
  extraEnv?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, ...extraEnv },
    });
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('La impresora no respondió a tiempo'));
    }, PRINT_TIMEOUT_MS);

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => finish(mapError(error)));
    child.on('close', (code) => {
      if (code === 0) {
        finish();
        return;
      }
      const detail = stderr.trim();
      finish(new Error(detail || `La impresora rechazó el ticket (código ${code ?? 'desconocido'})`));
    });
    child.stdin.on('error', () => {
      // El proceso puede cerrar stdin si falla al arrancar.
    });
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

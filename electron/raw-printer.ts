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
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class UltronRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
"@
$name = $env:ULTRON_PRINTER_NAME
$b64 = [Console]::In.ReadToEnd().Trim()
$bytes = [Convert]::FromBase64String($b64)
$handle = [IntPtr]::Zero
if (-not [UltronRawPrinter]::OpenPrinter($name, [ref]$handle, [IntPtr]::Zero)) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "No se pudo abrir la impresora $name (error $code). Instalá la térmica como Generic / Text Only."
}
try {
  $info = New-Object UltronRawPrinter+DOCINFOA
  $info.pDocName = 'Ultron ticket'
  $info.pDataType = 'RAW'
  if (-not [UltronRawPrinter]::StartDocPrinter($handle, 1, $info)) {
    $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw "No se pudo iniciar la impresion (error $code)"
  }
  if (-not [UltronRawPrinter]::StartPagePrinter($handle)) {
    throw "No se pudo iniciar la pagina"
  }
  $ptr = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($bytes.Length)
  try {
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
    $written = 0
    if (-not [UltronRawPrinter]::WritePrinter($handle, $ptr, $bytes.Length, [ref]$written)) {
      $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
      throw "No se pudo escribir en la impresora (error $code)"
    }
  } finally {
    [Runtime.InteropServices.Marshal]::FreeCoTaskMem($ptr)
  }
  [UltronRawPrinter]::EndPagePrinter($handle) | Out-Null
  [UltronRawPrinter]::EndDocPrinter($handle) | Out-Null
} finally {
  [UltronRawPrinter]::ClosePrinter($handle) | Out-Null
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

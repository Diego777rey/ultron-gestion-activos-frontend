import { clipboard, shell } from 'electron';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const WHATSAPP_URL = 'https://web.whatsapp.com/';
const WINDOW_WAIT_MS = 20_000;
const CHAT_WAIT_SEC = 120;

/**
 * Cuando hay un clic en la lista de chats, enfoca el cuadro de mensaje
 * y pega el PDF como archivo. El envío queda en el botón de WhatsApp.
 */
const ATTACH_ON_CHAT_CLICK = `
import ctypes, pathlib, select, sys, time
from ctypes import c_char_p, c_int, c_long, c_uint, c_ulong, c_void_p, POINTER, byref, cast

window_id = int(sys.argv[1], 16)
timeout = float(sys.argv[2])
file_path = sys.argv[3]
uri = pathlib.Path(file_path).resolve().as_uri()
uri_list = (uri + "\\r\\n").encode()
gnome_list = ("copy\\n" + uri + "\\n").encode()
plain = file_path.encode()
button1 = 1 << 8

x11 = ctypes.CDLL("libX11.so.6")
xtst = ctypes.CDLL("libXtst.so.6")
x11.XOpenDisplay.restype = c_void_p
x11.XOpenDisplay.argtypes = [c_void_p]
x11.XDefaultScreen.argtypes = [c_void_p]
x11.XDefaultScreen.restype = c_int
x11.XRootWindow.argtypes = [c_void_p, c_int]
x11.XRootWindow.restype = c_ulong
x11.XCreateSimpleWindow.argtypes = [c_void_p, c_ulong, c_int, c_int, c_uint, c_uint, c_uint, c_ulong, c_ulong]
x11.XCreateSimpleWindow.restype = c_ulong
x11.XInternAtom.argtypes = [c_void_p, c_char_p, c_int]
x11.XInternAtom.restype = c_ulong
x11.XSetSelectionOwner.argtypes = [c_void_p, c_ulong, c_ulong, c_ulong]
x11.XFlush.argtypes = [c_void_p]
x11.XPending.argtypes = [c_void_p]
x11.XPending.restype = c_int
x11.XNextEvent.argtypes = [c_void_p, c_void_p]
x11.XConnectionNumber.argtypes = [c_void_p]
x11.XConnectionNumber.restype = c_int
x11.XChangeProperty.argtypes = [c_void_p, c_ulong, c_ulong, c_ulong, c_int, c_int, c_void_p, c_int]
x11.XSendEvent.argtypes = [c_void_p, c_ulong, c_int, c_long, c_void_p]
x11.XQueryPointer.restype = c_int
x11.XQueryPointer.argtypes = [
    c_void_p, c_ulong, POINTER(c_ulong), POINTER(c_ulong),
    POINTER(c_int), POINTER(c_int), POINTER(c_int), POINTER(c_int), POINTER(c_uint),
]
x11.XGetGeometry.restype = c_int
x11.XGetGeometry.argtypes = [
    c_void_p, c_ulong, POINTER(c_ulong),
    POINTER(c_int), POINTER(c_int), POINTER(c_uint), POINTER(c_uint),
    POINTER(c_uint), POINTER(c_uint),
]
x11.XTranslateCoordinates.restype = c_int
x11.XTranslateCoordinates.argtypes = [
    c_void_p, c_ulong, c_ulong, c_int, c_int,
    POINTER(c_int), POINTER(c_int), POINTER(c_ulong),
]
x11.XKeysymToKeycode.argtypes = [c_void_p, c_ulong]
x11.XKeysymToKeycode.restype = c_uint
x11.XCloseDisplay.argtypes = [c_void_p]
xtst.XTestFakeKeyEvent.argtypes = [c_void_p, c_uint, c_int, c_ulong]
xtst.XTestFakeMotionEvent.argtypes = [c_void_p, c_int, c_int, c_int, c_ulong]
xtst.XTestFakeButtonEvent.argtypes = [c_void_p, c_uint, c_int, c_ulong]

class XSelectionRequestEvent(ctypes.Structure):
    _fields_ = [
        ("type", c_int), ("serial", c_ulong), ("send_event", c_int), ("display", c_void_p),
        ("owner", c_ulong), ("requestor", c_ulong), ("selection", c_ulong),
        ("target", c_ulong), ("property", c_ulong), ("time", c_ulong),
    ]

class XSelectionEvent(ctypes.Structure):
    _fields_ = [
        ("type", c_int), ("serial", c_ulong), ("send_event", c_int), ("display", c_void_p),
        ("requestor", c_ulong), ("selection", c_ulong), ("target", c_ulong),
        ("property", c_ulong), ("time", c_ulong),
    ]

class XEvent(ctypes.Union):
    _fields_ = [
        ("type", c_int),
        ("xselectionrequest", XSelectionRequestEvent),
        ("xselection", XSelectionEvent),
        ("pad", c_long * 24),
    ]

display = x11.XOpenDisplay(None)
if not display:
    raise SystemExit(1)
screen = x11.XDefaultScreen(display)
root = x11.XRootWindow(display, screen)

def atom(name):
    return x11.XInternAtom(display, name.encode(), False)

CLIPBOARD = atom("CLIPBOARD")
TARGETS = atom("TARGETS")
URI = atom("text/uri-list")
GNOME = atom("x-special/gnome-copied-files")
UTF8 = atom("UTF8_STRING")
XA_ATOM = 4
owner = x11.XCreateSimpleWindow(display, root, 0, 0, 1, 1, 0, 0, 0)
fd = x11.XConnectionNumber(display)

def put(requestor, prop, prop_type, data, fmt, count):
    buf = ctypes.create_string_buffer(data)
    x11.XChangeProperty(display, requestor, prop, prop_type, fmt, 0, cast(buf, c_void_p), count)

def serve_event():
    ev = XEvent()
    x11.XNextEvent(display, byref(ev))
    if ev.type != 30:
        return
    req = ev.xselectionrequest
    prop = req.property or req.target
    if req.target == TARGETS:
        values = (c_ulong * 4)(TARGETS, URI, GNOME, UTF8)
        x11.XChangeProperty(display, req.requestor, prop, XA_ATOM, 32, 0, cast(values, c_void_p), 4)
    elif req.target == URI:
        put(req.requestor, prop, URI, uri_list, 8, len(uri_list))
    elif req.target == GNOME:
        put(req.requestor, prop, GNOME, gnome_list, 8, len(gnome_list))
    elif req.target == UTF8:
        put(req.requestor, prop, UTF8, plain, 8, len(plain))
    else:
        prop = 0
    notify = XEvent()
    notify.xselection.type = 31
    notify.xselection.send_event = 1
    notify.xselection.display = display
    notify.xselection.requestor = req.requestor
    notify.xselection.selection = req.selection
    notify.xselection.target = req.target
    notify.xselection.property = prop
    notify.xselection.time = req.time
    x11.XSendEvent(display, req.requestor, 0, 0, byref(notify))
    x11.XFlush(display)

def drain(seconds):
    end = time.time() + seconds
    while time.time() < end:
        while x11.XPending(display):
            serve_event()
        select.select([fd], [], [], 0.02)

def geometry():
    unused = c_ulong()
    x = c_int(); y = c_int()
    width = c_uint(); height = c_uint()
    border = c_uint(); depth = c_uint()
    if not x11.XGetGeometry(display, window_id, byref(unused), byref(x), byref(y), byref(width), byref(height), byref(border), byref(depth)):
        return None
    abs_x = c_int(); abs_y = c_int(); child = c_ulong()
    if not x11.XTranslateCoordinates(display, window_id, root, 0, 0, byref(abs_x), byref(abs_y), byref(child)):
        return None
    return abs_x.value, abs_y.value, width.value, height.value

def pointer():
    root_ret = c_ulong(); child = c_ulong()
    root_x = c_int(); root_y = c_int(); win_x = c_int(); win_y = c_int(); mask = c_uint()
    if not x11.XQueryPointer(display, root, byref(root_ret), byref(child), byref(root_x), byref(root_y), byref(win_x), byref(win_y), byref(mask)):
        return None
    return root_x.value, root_y.value, mask.value

def click_on_chat(px, py):
    geo = geometry()
    if not geo:
        return False
    x, y, width, height = geo
    if width < 200 or height < 200:
        return False
    return x <= px <= (x + width) and (y + 96) <= py <= (y + height - 8)

deadline = time.time() + timeout
was_down = False
chosen = False
while time.time() < deadline:
    while x11.XPending(display):
        serve_event()
    info = pointer()
    if info:
        px, py, mask = info
        down = bool(mask & button1)
        if down and not was_down and click_on_chat(px, py):
            chosen = True
        was_down = down
        if chosen and not down:
            break
    select.select([fd], [], [], 0.03)
else:
    raise SystemExit(2)

time.sleep(0.45)
geo = geometry()
spot = pointer()
if geo:
    x, y, width, height = geo
    compose_x = x + int(width * 0.72)
    compose_y = y + height - 56
    xtst.XTestFakeMotionEvent(display, -1, compose_x, compose_y, 0)
    x11.XFlush(display)
    time.sleep(0.05)
    xtst.XTestFakeButtonEvent(display, 1, 1, 0)
    xtst.XTestFakeButtonEvent(display, 1, 0, 0)
    x11.XFlush(display)
    time.sleep(0.12)
if spot:
    xtst.XTestFakeMotionEvent(display, -1, spot[0], spot[1], 0)
    x11.XFlush(display)

x11.XSetSelectionOwner(display, CLIPBOARD, owner, 0)
x11.XFlush(display)
time.sleep(0.05)

def tap(code, pressed):
    xtst.XTestFakeKeyEvent(display, code, 1 if pressed else 0, 0)
    x11.XFlush(display)

control = x11.XKeysymToKeycode(display, 0xFFE3)
letter_v = x11.XKeysymToKeycode(display, 0x76)
tap(control, True)
tap(letter_v, True)
tap(letter_v, False)
tap(control, False)
drain(2.0)
x11.XCloseDisplay(display)
`;

let watchToken = 0;
let watcher: ChildProcess | undefined;

/**
 * Abre WhatsApp en el navegador. Al elegir un chat, el PDF queda cargado
 * en el mensaje para enviarlo con el botón de WhatsApp.
 */
export async function sharePdfOnWhatsApp(pdf: Buffer, filename: string): Promise<void> {
  if (!pdf.length) {
    throw new Error('El PDF está vacío');
  }
  const filePath = await writeTempPdf(pdf, filename);
  await shell.openExternal(WHATSAPP_URL);
  void attachAfterChatClick(filePath);
}

async function attachAfterChatClick(filePath: string): Promise<void> {
  const token = ++watchToken;
  stopWatcher();
  const windowId = await waitForWhatsAppWindow(token);
  if (!windowId || token !== watchToken || !/^0x[0-9a-fA-F]+$/.test(windowId)) return;

  const previousText = clipboard.readText();
  const child = spawn('python3', ['-c', ATTACH_ON_CHAT_CLICK, windowId, String(CHAT_WAIT_SEC), filePath], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  watcher = child;
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    console.error(`[whatsapp] ${chunk.trim()}`);
  });
  child.once('exit', (code) => {
    if (watcher === child) watcher = undefined;
    if (code === 0 && previousText) {
      setTimeout(() => clipboard.writeText(previousText), 2500);
    }
  });
}

function stopWatcher(): void {
  if (!watcher || watcher.killed) return;
  watcher.kill();
  watcher = undefined;
}

async function waitForWhatsAppWindow(token: number): Promise<string | null> {
  const deadline = Date.now() + WINDOW_WAIT_MS;
  while (Date.now() < deadline && token === watchToken) {
    const id = await whatsAppWindowId();
    if (id) return id;
    await wait(250);
  }
  return null;
}

async function whatsAppWindowId(): Promise<string | null> {
  try {
    const activeId = await activeWindowId();
    if (activeId && (await isWhatsAppWindow(activeId))) return activeId;
    const list = await execFileAsync('xprop', ['-root', '_NET_CLIENT_LIST']);
    for (const id of list.stdout.match(/0x[0-9a-fA-F]+/g) ?? []) {
      if (await isWhatsAppWindow(id)) return id;
    }
  } catch {
    return null;
  }
  return null;
}

async function activeWindowId(): Promise<string | null> {
  const active = await execFileAsync('xprop', ['-root', '_NET_ACTIVE_WINDOW']);
  const id = active.stdout.match(/0x[0-9a-fA-F]+/)?.[0];
  if (!id || id === '0x0') return null;
  return id;
}

async function isWhatsAppWindow(id: string): Promise<boolean> {
  if (!/^0x[0-9a-fA-F]+$/.test(id)) return false;
  try {
    const named = await execFileAsync('xprop', ['-id', id, 'WM_NAME', '_NET_WM_NAME']);
    return named.stdout.toLowerCase().includes('whatsapp');
  } catch {
    return false;
  }
}

async function writeTempPdf(pdf: Buffer, filename: string): Promise<string> {
  const dir = path.join(os.tmpdir(), 'ultron-whatsapp');
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safePdfName(filename));
  await writeFile(filePath, pdf);
  return filePath;
}

function safePdfName(filename: string): string {
  const base = path.basename(filename).replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]+/g, '_');
  const withPdf = base.toLowerCase().endsWith('.pdf') ? base : `${base || 'presupuesto'}.pdf`;
  return withPdf.slice(0, 120);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

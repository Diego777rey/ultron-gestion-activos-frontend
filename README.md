# Ultron Gestión de Activos — Frontend

## Acerca del proyecto

**Ultron** es un sistema de gestión pensado **principalmente para talleres** (mecánicos, de servicios u otros), orientado a administrar órdenes de trabajo, vehículos, servicios, clientes y el personal del negocio.

---

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 21.2.17.

## Development server

`npm start` abre la app en una ventana de escritorio (Electron). Arranca Angular y espera a `http://localhost:4200/` antes de lanzar Electron.

```bash
npm start
```

Si solo quieres el navegador, sin ventana de escritorio:

```bash
npm run start:web
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Aplicación de escritorio (Electron)

La misma UI de Angular se empaqueta con Electron para Linux (AppImage) y Windows (instalador `.exe`). El backend GraphQL sigue corriendo aparte (por defecto `http://localhost:8081`).

Desarrollo con recarga de Angular dentro de la ventana de Electron:

```bash
npm start
```

Empaquetado local:

```bash
npm run electron:build:linux   # AppImage
npm run electron:build:win     # instalador NSIS (.exe), requiere Windows o CI
```

Para apuntar a otro backend sin recompilar, crear `config.json` en el directorio de datos de usuario de Electron (ver `electron/resources/config.example.json`) o definir `ULTRON_API_BASE_URL`.

Cada merge a `main` dispara el workflow de release: versiona según la rama y publica ambos ejecutables en el GitHub Release.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

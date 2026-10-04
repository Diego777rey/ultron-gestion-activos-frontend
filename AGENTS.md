
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## Styles and Dark Theme

The app is dark-only. All colors come from the CSS variables in `src/styles.scss` (`:root`).

- Use only those tokens: `--bg-color`, `--surface-color`, `--surface-raised`, `--surface-raised-hover`, `--border-color`, `--border-strong`, `--border-strong-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--primary-color`, `--primary-color-dark`, `--active-bg`, `--hover-color`, `--on-primary-color`, `--danger-color`, `--danger-bg`, `--danger-border`, `--success-color`, `--success-bg`, `--radius-md`.
- Do NOT invent token names and do NOT write light fallbacks like `var(--surface-card, #fff)`. If a token is missing, add it to `src/styles.scss`.
- Do NOT hardcode white or light backgrounds (`#fff`, `#f8f9fa`, `white`). Text is white, so a light background makes it unreadable.
- Dialogs use `app-modal` (background `--surface-color`). Inside, cards/options/inputs use `--surface-raised` with `--border-strong`; selected state uses `--active-bg` with `--primary-color` border. See `pago-dialog` as reference.
- Native inputs inside custom containers need `background: transparent` (or `--surface-raised`), `color: var(--text-primary)` and `font: inherit`.
- Small text must use `--text-secondary` or `--text-muted`; never `--primary-color` text on `--surface-raised` (fails AA contrast).

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

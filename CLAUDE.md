You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Project

Public portfolio repo. Fictional app **"Ledgerly"** — B2B banking dashboard. Audience: international recruiters / tech leads.

- Everything in English: code, comments, commits, README.
- NO real client code, data, or names. All data is mock/invented.
- Commits follow Conventional Commits (enforced by commitlint).

### Stack

- Angular 22 standalone, Signals, zoneless, OnPush by default, new control flow (`@if`, `@for`, `@defer`)
- Tailwind CSS v4 (PostCSS), Angular CDK (virtual scroll, overlays)
- Mock API: MSW (Mock Service Worker)
- Tests: Vitest (unit) + Playwright (e2e)
- ESLint (angular-eslint) + Prettier; Husky + lint-staged + commitlint
- CI: GitHub Actions — lint → test → build → e2e → deploy (Cloudflare Pages or Vercel)

### MVP features

- Fake JWT login (access + refresh), token interceptor, auto refresh, logout
- Role guards: `admin` / `analyst` / `viewer`
- Dashboard: KPIs + chart
- Customers / transactions: large virtualized table, filters, sorting, server-side pagination, state in URL
- Complex form: Signal Forms, schema validation + custom validators, input mask
- i18n EN/PT, dark mode
- Global error handler + toasts; loading states with `@defer`
- Accessibility: keyboard nav, ARIA, Lighthouse ≥ 90

### Folder structure

```
src/app/
  core/            # auth, interceptors, guards, error handler, config
    auth/
    http/
  shared/          # ui components, pipes, directives, utils
    ui/
  features/        # lazy-loaded
    dashboard/
    customers/
    transactions/
    settings/
  layout/          # shell, sidebar, topbar
  app.routes.ts
  app.config.ts
src/mocks/         # MSW handlers + fixtures
e2e/               # Playwright
.github/workflows/ci.yml
```

### Build order

Tooling (Tailwind, ESLint, Husky) → git + CI (lint/test/build) → core auth → layout → features.
README must include: live demo, GIF, stack, architecture decisions (why Signals, why standalone, state strategy), how to run, scripts, test coverage.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

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
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

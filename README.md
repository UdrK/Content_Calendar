# Content Calendar

A modern, offline-first desktop editorial calendar built with **Electron**, **React**, **TypeScript**, and **Tailwind CSS**.

Unlike traditional cloud calendars, **Content Calendar** is crafted specifically for content creators, writers, and editorial teams who want direct, seamless integration between their schedule and local files stored on their computer.

---

## Key Features

- **Offline-First & Privacy-Focused**: All your data is stored locally on your machine in an embedded SQLite database using **Drizzle ORM** and **libSQL**. No mandatory cloud accounts or subscriptions.
- **Local File Attachments**: Attach any file type (`.mp4`, `.psd`, `.png`, `.docx`, `.fig`, `.pdf`, `.zip`, etc.) directly to your calendar events.
- **One-Click "Show in Folder"**: Instantly reveal and highlight attached files inside Windows File Explorer or macOS Finder with a single click.
- **Interactive Calendar View**: Clean weekly planner grid with quick day selection and intuitive navigation (Previous, Next, Today).
- **Master-Detail Layout**: Persistent inspection panel at the bottom for instant overview of event details, status toggles (Done / In Progress), and attachment shortcuts.
- **Custom Tags & Visual Organization**:
  - Create and manage custom tags with custom hex colors.
  - Live reactive color updates across all calendar event badges.
  - Quick multi-tag filtering bar to isolate campaigns, platforms, or content categories.
- **Cross-Platform**: Tailored for both **Windows 10/11** and **macOS** (Apple Silicon & Intel).

---

## Tech Stack

| Category | Technology |
|---|---|
| **Runtime & Shell** | [Electron 33](https://www.electronjs.org/) |
| **Bundler & Tooling** | [electron-vite](https://electron-vite.org/) + [Vite 5](https://vitejs.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (strict type-checking across all processes) |
| **Frontend Framework** | [React 18](https://react.dev/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + PostCSS |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Date Manipulation** | [date-fns v4](https://date-fns.org/) |
| **Database & ORM** | [SQLite](https://sqlite.org/) via [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) & [Drizzle ORM](https://orm.drizzle.team/) |
| **Testing** | [Vitest](https://vitest.dev/) |
| **Packaging** | [electron-builder](https://www.electron.build/) |

---

## Project Structure

```text
Content_Calendar/
├── .github/
│   └── workflows/
│       └── build-mac.yml          # GitHub Actions CI for macOS DMG/ZIP builds
├── docs/                          # Technical specifications and architectural docs
│   ├── architecture.md
│   └── mvp-requisites.md
├── src/
│   ├── core/                      # Headless domain logic (Pure TypeScript)
│   │   ├── calendar/              # Calendar grid & matrix calculation engines
│   │   ├── events/                # Polymorphic event models & factories
│   │   ├── filesystem/            # File system & path normalization helpers
│   │   └── filters/               # Event filter engine
│   ├── main/                      # Electron Main process
│   │   ├── db/                    # Drizzle schema, SQLite connection & migrations
│   │   ├── ipc/                   # IPC router & handler registration
│   │   ├── services/              # Event and tag database services
│   │   └── index.ts               # Main application entry point & window management
│   ├── preload/                   # Preload script (contextIsolation & secure bridge)
│   │   ├── index.d.ts
│   │   └── index.ts
│   ├── renderer/                  # React Presentation layer
│   │   ├── src/
│   │   │   ├── components/        # UI components (Calendar views, modals, panels)
│   │   │   ├── hooks/             # Custom React hooks (useEvents, useTags)
│   │   │   ├── App.tsx            # Main application layout
│   │   │   └── main.tsx           # React DOM root entry
│   │   └── index.html
│   └── shared/                    # End-to-end shared TypeScript interfaces & types
├── tests/                         # Vitest unit & integration test suites
├── drizzle.config.ts              # Drizzle ORM configuration
├── electron.vite.config.ts        # electron-vite build configuration
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later recommended
- **npm**: `v10.x` or later

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/content-calendar.git
   cd content-calendar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running in Development

Start the Electron app in development mode with Hot Module Replacement (HMR):

```bash
npm run dev
```

### Running Tests

Execute the comprehensive unit test suite powered by Vitest:

```bash
npm test
```

### Type Checking

Run TypeScript type checks for both the Node processes (Main & Preload) and Web process (Renderer):

```bash
npm run typecheck
```

---

## Building & Distribution

Compile and bundle production-ready executables and installers using `electron-builder`:

- **Windows**:
  ```bash
  npm run build:win
  ```
  Generates a standalone portable 64-bit `.exe` in the `dist/` directory.

- **macOS**:
  ```bash
  npm run build:mac
  ```
  Generates `.dmg` and `.zip` installers for both Apple Silicon (`arm64`) and Intel (`x64`) in the `dist/` directory.

- **Unpackaged Directory Build**:
  ```bash
  npm run pack
  ```

---

## Documentation

For in-depth technical details, please refer to the documentation in the [`docs/`](docs/) directory:
- [Technical Architecture](docs/architecture.md) – Clean architecture patterns, domain engines, IPC data flows, SQLite schemas, security, and storage strategies.
- [MVP Requirements](docs/mvp-requisites.md) – Functional & non-functional requirements and roadmap.

---

## License

This project is licensed under the [MIT License](LICENSE).

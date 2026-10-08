# AetherStudy — System Architecture & Blueprint (Liquid Glass & Server Storage)

```
aetherstudy/
├── .gitignore
├── index.html                           # Liquid glass base & dark theme bootstrap
├── package.json                         # Client & server concurrent orchestration
├── postcss.config.cjs
├── tailwind.config.js                   # Liquid glass tokens, specular borders & blurs
├── tsconfig.json                        # Strict compiler rules with Node & Vite typings
├── tsconfig.node.json
├── vite.config.ts                       # Reverse-proxy routes to backend server
├── server/
│   ├── server.js                        # Express REST & File Storage API Engine
│   ├── data/                            # Persistent JSON database
│   │   ├── documents.json               # Document metadata registry
│   │   ├── notes.json                   # Markdown notes database
│   │   ├── syllabus.json                # Mastery curriculum tree
│   │   ├── timetable.json               # Weekly scheduling blocks
│   │   └── pomodoro.json                # Focus intervals & session logs
│   └── uploads/                         # Real stored PDF and academic monographs
├── electron/
│   ├── main.js                          # Native desktop shell window controller
│   └── preload.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                         # Bootstrap with ThemeProvider & PomodoroProvider
    ├── App.tsx                          # Master Liquid Glass dashboard coordinator
    ├── index.css                        # Glassmorphism 2.0, specular reflection pills
    ├── types/
    │   ├── timetable.ts
    │   ├── syllabus.ts
    │   └── pomodoro.ts
    ├── context/
    │   ├── ThemeContext.tsx             # Persistent Light / Dark mode switcher
    │   └── PomodoroContext.tsx          # Focus timers & synthesized audio alerts
    ├── hooks/
    │   └── useServerStorage.ts          # Continuous debounced backend sync & health hook
    ├── services/
    │   └── api.ts                       # REST client for documents, notes, schedule & tree
    ├── utils/
    │   └── timeUtils.ts                 # Time formatter & Web Audio synthesis
    └── components/
        ├── layout/
        │   ├── Header.tsx               # Top glass bar with light/dark switch & server status
        │   ├── Sidebar.tsx              # Collapsible glass navigation with active glow
        │   └── LiquidBackground.tsx     # Animated organic floating glass mesh & orbs
        ├── workspace/
        │   ├── SplitWorkspace.tsx        # Drag-resizable split workspace with ratio memory
        │   ├── DocumentViewer.tsx        # Server document catalog, PDF streaming & uploader
        │   └── MarkdownEditor.tsx        # Live markdown workspace with server sync indicator
        ├── timetable/
        │   └── Timetable.tsx            # Weekly schedule matrix with server persistence
        ├── syllabus/
        │   ├── SyllabusTracker.tsx      # Hierarchical mastery roadmap & server sync
        │   └── CircularProgress.tsx     # Animated SVG radial progress indicator
        └── pomodoro/
            └── PomodoroFloatingWidget.tsx # Floating glass focus widget with session streak
```

### Server API Endpoints
- `GET /api/health`: Health status & storage diagnostics
- `GET /api/documents`: List uploaded academic documents and PDFs
- `POST /api/documents/upload`: Multer stream saving files directly to server filesystem
- `DELETE /api/documents/:id`: Remove file from server storage
- `GET /api/notes` / `PUT /api/notes`: Real-time markdown notes persistence
- `GET /api/syllabus` / `PUT /api/syllabus`: Topic tree structure & completed chapters
- `GET /api/timetable` / `PUT /api/timetable`: Weekly academic blocks
- `GET /api/pomodoro` / `PUT /api/pomodoro`: Timer preferences & session counts

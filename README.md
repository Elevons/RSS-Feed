# RSS Feed Reader

A modern RSS feed reader application built with React, TypeScript, and Tauri. This application allows users to subscribe to and read RSS feeds in a clean, efficient interface.

## Features

- Subscribe to and manage multiple RSS feeds
- Clean and modern user interface
- Cross-platform desktop application (Windows, macOS, Linux)
- Drag-and-drop feed organization
- Real-time feed updates

## Tech Stack

- **Frontend:**
  - React 18
  - TypeScript
  - TailwindCSS
  - Zustand (State Management)
  - DND Kit (Drag and Drop)
  - Lucide React (Icons)
  - date-fns (Date formatting)

- **Desktop:**
  - Tauri 2.0
  - Rust (Backend)

## Prerequisites

- Node.js (Latest LTS version)
- Rust (Latest stable version)
- Platform-specific build tools:
  - Windows: Microsoft Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: GCC, libgtk-3-dev, libwebkit2gtk-4.0-dev

## Installation

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd rss-feed
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run tauri:dev
   ```

## Building for Production

To create a production build:

```bash
npm run tauri:build
```

The built application will be available in the `src-tauri/target/release` directory.

## Development

- `npm run dev` - Start the development server
- `npm run tauri:dev` - Start the Tauri development environment
- `npm run build` - Build the frontend
- `npm run tauri:build` - Build the complete application
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build

## License

[Your chosen license]

## Contributing

[Your contribution guidelines] 


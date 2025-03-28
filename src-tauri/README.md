# RSS Feed Reader Tauri App

This is the Tauri configuration for the RSS Feed Reader application.

## Icons

Before building the app, you need to add icon files to the `icons` directory:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (for macOS)
- icon.ico (for Windows)

You can generate these icons using tools like:
- [Tauri Icons](https://tauri.app/v1/guides/features/icons/)
- [App Icon Generator](https://appicon.co/)

## Development

To run the app in development mode:

```bash
npm run tauri:dev
```

## Building

To build the app for production:

```bash
npm run tauri:build
```

## Requirements

Make sure you have all the Tauri prerequisites installed:
- [Tauri Prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites) 
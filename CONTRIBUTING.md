# Contributing to Trading Bot v5

Thank you for your interest in contributing to this project! This guide will help you get started.

## Quick Start

1. **Setup Environment**:

   ```bash
   npm install
   npm run dev
   ```

2. **Project Structure**:
   - `src/`: Frontend React components
   - `local_modules/`: Backend utilities and modules
   - `server.ts`: Main Express server

## 📝 Documentation Guidelines

⚠️ **IMPORTANT**: All new `.md` files must be created within the `/docs` directory structure.

### Documentation Structure

```
/docs/
├── milestones/     # Major achievements and project status updates
├── features/       # Feature implementations and enhancements
└── fixes/          # Bug fixes and cleanup documentation
```

### Creating Documentation

- **DO**: Create new `.md` files in appropriate `/docs` subdirectories
- **DON'T**: Create `.md` files in the project root (except README.md)
- **Reference**: See [Documentation Index](docs/DOCUMENTATION-INDEX.md)

## Development Workflow

1. **Read**: Check [Copilot Instructions](.github/copilot-instructions.md) for detailed guidelines
2. **Plan**: Review [Project Status](docs/milestones/CURRENT-STATUS-SUMMARY.md)
3. **Code**: Follow TypeScript best practices
4. **Document**: Add `.md` files to `/docs` for significant changes

## Architecture Notes

- **WebSocket-Only**: All OHLCV data flows through WebSocket (no REST fallback)
- **Single Source of Truth**: Backend handles all data fetching
- **Strategy-Centric**: Frontend uses selected strategy for symbol/timeframe
- **Modular**: Clean separation between components

## Questions?

Check the [Documentation Index](docs/DOCUMENTATION-INDEX.md) or review existing issues.

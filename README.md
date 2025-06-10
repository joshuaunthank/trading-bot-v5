# Trading Bot Project (June 2025)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Binance API key and secret (add to `.env`)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Binance credentials
4. Start the development server: `npm run dev`

## Project Structure

### Backend

- `server.ts`: Express server with WebSocket setup
- `local_modules/`: Server-side modules
  - `routes/`: API routes and endpoints
  - `utils/`: Utility functions (WebSocket, file handling)
  - `strategies/`: JSON strategy definitions
  - `types/`: TypeScript type definitions
  - `schemas/`: JSON schemas for validation
  - `scripts/`: Utility scripts for strategy management

### Frontend

- `src/`: React frontend
  - `components/`: UI components
    - `builder/`: Strategy builder components
    - `ui/`: Reusable UI components
  - `context/`: React context providers
  - `hooks/`: Custom React hooks
  - `pages/`: Page components

## Development Workflow

### Creating a New Strategy

1. Use the Strategy Builder UI
2. Or manually create a JSON file in `local_modules/strategies/`
3. Ensure it follows the schema in `local_modules/schemas/strategy.schema.json`

### Running a Strategy

1. Use the Strategy Config Selector in the UI
2. Or call the API directly: `POST /api/v1/strategies/:name/run`
3. View results in real-time via WebSocket or REST endpoints

## Strategy Validation

We've implemented comprehensive strategy validation capabilities:

- JSON schema validation for strategy files
- Detailed error reporting and formatting
- Auto-fixing of common validation issues
- CLI and API endpoints for validation

### Validating Strategies

Using the command line:

```bash
# Validate a specific strategy
node local_modules/scripts/validateStrategy.js test1

# Validate all strategies
node local_modules/scripts/validateStrategy.js --all
```

Using the API:

- `GET /strategies/validate/all` - Validate all strategies
- `GET /strategies/:id/validate` - Validate a specific strategy
- `POST /strategies/:id/fix` - Fix common issues in a strategy

See [Validation Documentation](local_modules/utils/README-validation.md) for more details.

## Known Issues

- Some strategy JSON files may be malformed
- WebSocket reconnection needs improvement
- Error handling for file operations is basic

## Recent Improvements

### JSON-Based Strategy Store

We've implemented a robust file-based strategy storage system:

- Full CRUD operations for strategy files
- Atomic writes and improved error handling
- Automatic backup before deletion
- Seamless integration with existing code

See [Strategy Store Documentation](local_modules/utils/README-strategy-store.md) and [Strategy Store Improvements](STRATEGY-STORE-IMPROVEMENTS.md) for details.

## Roadmap

See the Copilot instructions file for detailed future plans.

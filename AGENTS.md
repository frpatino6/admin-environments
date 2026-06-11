# Repository Guidelines

## Project Structure & Module Organization

This is a full-stack Admin Environments app. The backend lives in `backend/` and uses Node.js, Express, Mongoose, Socket.IO, and Slack webhooks. Key paths are `backend/server.js`, `backend/routes/`, `backend/models/`, `backend/services/`, and `backend/config/`.

The frontend lives in `frontend/` and is an Angular 17 app. Application code is under `frontend/src/app/`, with components in `components/`, services in `services/`, models in `models/`, and directives in `directives/`. Global styles are in `frontend/src/styles.scss`; environment config is in `frontend/src/environments/`.

Project documentation is kept at the root, including `README.md`, `SETUP.md`, `COMMANDS.md`, `TESTING.md`, and deployment guides.

## Build, Test, and Development Commands

Install dependencies separately:

```sh
cd backend && npm install
cd ../frontend && npm install
```

Backend commands:

```sh
cd backend
npm run dev    # start Express with nodemon auto-reload
npm start      # start Express with node
```

Frontend commands:

```sh
cd frontend
npm start      # run Angular dev server at http://localhost:4200
npm run build  # build production assets into dist/
npm run watch  # development build in watch mode
npm test       # run Angular tests
```

Root helpers `start.ps1`, `start.sh`, and `start-frontend.bat` provide local startup shortcuts.

## Coding Style & Naming Conventions

Use JavaScript CommonJS in the backend and TypeScript Angular style in the frontend. Prefer 2-space indentation, clear function names, and small route/service/model modules. Angular files should follow CLI naming patterns such as `dashboard.component.ts`, `environment.service.ts`, and `environment.model.ts`.

Keep API endpoints RESTful under `/api`, return appropriate HTTP status codes, and keep Slack or database logic in services or config modules.

## Testing Guidelines

Frontend unit tests run with Angular's test runner via `npm test` in `frontend/`. Backend testing is primarily manual/API-based; follow `TESTING.md` and use `thunder-collection.json` for Thunder Client or equivalent Postman/curl checks. Before a PR, verify deployment, release, occupied-environment errors, Slack notifications when relevant, and real-time UI updates.

## Commit & Pull Request Guidelines

Use Conventional Commits, matching the existing history: `feat: ...`, `fix(frontend): ...`, `test: ...`, `docs: ...`. Keep commits focused and descriptive.

Pull requests should target `main`, explain the change, list tests performed, link related issues when applicable, and include screenshots or short recordings for UI changes. Note environment variables, deployment steps, or breaking changes explicitly.

## Security & Configuration Tips

Do not commit secrets. Keep `MONGODB_URI`, Slack webhook URLs, and deployment credentials in local `.env` files or platform configuration. Review `SLACK_SETUP.md`, `DEPLOYMENT.md`, and `FIREBASE_DEPLOY.md` before changing integration or deployment behavior.

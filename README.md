# Northstar user details form

A responsive Angular form that collects a person's name, mobile number, email address, and interest preference. A small Node.js API validates submissions and saves them to a JSON file.

## Project structure

```text
user_details_form/
├── public/                     # Static public assets (for example, favicon)
├── server/
│   ├── data/                   # Local submission data (created when first saved; Git-ignored)
│   └── index.js                # Node.js HTTP API: validation and JSON-file storage
├── src/
│   ├── app/
│   │   ├── app.ts              # Main standalone Angular component, form and API calls
│   │   ├── app.html            # Form and saved-customer-details template
│   │   ├── app.css             # Component styles
│   │   ├── app.config.ts       # Angular providers, HTTP client and router
│   │   └── app.routes.ts       # Angular route definitions
│   ├── index.html              # Browser entry HTML
│   ├── main.ts                 # Angular application bootstrap
│   └── styles.css              # Global styles
├── angular.json                # Angular workspace/build configuration
├── package.json                # Dependencies and npm scripts
├── package-lock.json           # Locked npm dependency versions
├── proxy.conf.json             # Local /api proxy to the Node server
├── tsconfig*.json              # TypeScript configuration
└── README.md                   # Project, development and deployment notes
```

Generated or local-only folders such as `node_modules/`, `.angular/`, and `dist/` are not source code. `server/data/` is also Git-ignored because it contains personal information.

## Technology stack

- **Frontend:** Angular 21, standalone components, TypeScript 5.9, HTML, and CSS.
- **Forms and UI state:** Angular Reactive Forms and Angular signals; the component uses `OnPush` change detection and Angular's built-in template control flow.
- **HTTP:** Angular `HttpClient` and RxJS.
- **Backend:** Node.js built-in `http` and filesystem modules; this project does not use Express.
- **Storage:** A local JSON file at `server/data/users.json`; this project does not currently use a database.
- **Tooling:** npm 11.6.2 is the declared package manager. Use Node.js 20.19 or later.

## Run locally

Install dependencies once:

```bash
npm install
```

Open two terminals in the project directory:

```bash
npm run start:server
```

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200). Angular's development server forwards `/api` requests to `http://127.0.0.1:3000` using `proxy.conf.json`.

The API accepts `POST /api/users` to save a validated submission. `GET /api/users` returns saved submissions only when the caller supplies the `CUSTOMER_DETAILS_PASSWORD` configured on the server; the **View customer details** section prompts for that password.

## Build and test

```bash
npm run build
npm test
```

The production frontend build is written under `dist/user-details-form/browser`. `npm run build` builds the Angular frontend; `npm start` runs the Node server, which serves that build and the API from the same origin.

## Deployment

The Angular app uses relative `/api` URLs, so the frontend and API should be served from the same origin or connected through a reverse proxy. The local Angular development proxy is not included in the production build. On Hostinger, run the Node application with `npm start` so `server/index.js` serves both the built frontend and the API; deploying only the Angular output will leave `/api/users` unavailable. Configure `CUSTOMER_DETAILS_PASSWORD` as a server-side environment variable before enabling access to saved customer details. The endpoint fails closed if the variable is missing and rejects requests without the matching password.

Submissions are currently stored in `server/data/users.json`. This is file-based storage rather than a database, so confirm the hosting filesystem persists across restarts and deployments and arrange backups before relying on it for customer records. For production use, a persistent database is preferable. The form-submission endpoint is public and should be monitored and protected against abuse if needed.

## Context to give another AI assistant

Paste this with your question, adding the task or error at the end:

> This repository is a responsive user-details form named Northstar. Its frontend is Angular 21 with TypeScript 5.9, standalone components, Reactive Forms, signals, `OnPush`, Angular `HttpClient`, and RxJS. The main frontend component is `src/app/app.ts`, its template and styles are `src/app/app.html` and `src/app/app.css`, and Angular starts from `src/main.ts`. The backend is a small Node.js HTTP server using built-in modules (not Express) in `server/index.js`. It exposes `POST /api/users` to validate and save submissions and protects `GET /api/users` with the `CUSTOMER_DETAILS_PASSWORD` environment variable. Data is stored in the Git-ignored `server/data/users.json`, not a database. For local development, run `npm run start:server` and `npm start` in separate terminals; the Angular dev proxy forwards `/api` to port 3000. Build the frontend with `npm run build`; run the production app with `npm start`. Hosting must run the Node server and set `CUSTOMER_DETAILS_PASSWORD`; publishing Angular output alone will not provide the API. File-based data may not persist on hosted platforms. [Describe the change, question, or error here.] Please inspect relevant project files before proposing changes, keep frontend and backend API behavior consistent, and do not assume a production database or hosting provider has already been configured.

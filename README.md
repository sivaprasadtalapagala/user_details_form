# Northstar user details form

A responsive Angular form submits a name, mobile number, email address, and interest preference to a small Node.js API. The API validates each submission and stores it in `server/data/users.json`.

## Run locally

Use Node.js 20.19+ and npm. From this project directory, open two terminals:

```bash
npm run start:server
```

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200). Angular forwards `/api` requests to the Node server on port 3000. Set the `PORT` environment variable to change the API port; if you do, update the target in `proxy.conf.json` to match.

## Stored data

Each successful submission is appended to `server/data/users.json` with a `createdAt` timestamp. The data directory and file are created automatically when the first form is submitted. The **View customer details** button loads saved entries using `GET /api/users`. Keep this file private; it contains personal information.

This API is intended for local development only. Do not expose customer records on a public network without adding authentication and access controls.

To create a production frontend bundle, run:

```bash
npm run build
```

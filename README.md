# Run and deploy

This project uses:
- `server.ts` at the repo root for the active Express/MongoDB backend
- `src/` for the React frontend source
- `backend/main.py` as a reference-only FastAPI blueprint that is not part of `npm run dev`

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Configure environment variables in `.env`
3. Run the app:
   `npm run dev`

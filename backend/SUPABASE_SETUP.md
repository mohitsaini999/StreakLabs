# Connect StreakLabs to Supabase

1. In Supabase, open **SQL Editor**, create a query, paste the contents of `supabase/schema.sql`, and run it.
2. Keep `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `backend/.env`. The secret key belongs only on the backend; never add it to React or commit `.env`.
3. Stop and restart the backend from the `backend` folder with `npm run dev`.
4. Open `http://localhost:3001/api/health`. The response should include `"database":"supabase"`.

Uploaded note files still live in `backend/uploads`; app records are persisted in Supabase, but file contents are not moved into Supabase Storage.

## Current scope

The app now supports Supabase email/password accounts. Before starting the updated app:

1. In Supabase **Project Settings → API Keys**, copy the **Publishable key**. Add it to `VITE_SUPABASE_PUBLISHABLE_KEY` in the project root `.env.local` and `SUPABASE_PUBLISHABLE_KEY` in `backend/.env`. The publishable key may be used in the frontend; keep the secret key backend-only.
2. In **SQL Editor**, run `supabase/auth-migration.sql`. This replaces the shared state access with Row Level Security so each account can access only its own row. Existing data in the `default` row is moved to the first account that signs in.
3. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:5173` and add it to the allowed redirect URLs.
4. Restart both Vite and the backend. Create an account or sign in. If email confirmation is enabled, follow the confirmation link before signing in.

The app keeps a local JSON backup per account. Uploaded note files still live in `backend/uploads`; add Supabase Storage separately if you need those files available across devices.

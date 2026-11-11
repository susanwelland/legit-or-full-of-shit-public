# Going live at legitorfullofshit.com

Three accounts are involved: GitHub (the code), Render (hosting) and wherever the domain is
registered (DNS). Nothing here needs the repository to be public.

## 1. Create the services on Render

1. Sign in at render.com with GitHub and give Render access to the `legit-or-full-of-shit` repository.
2. New > Blueprint > choose the repository. Render reads `render.yaml` and lists a static site,
   an API service and a database, all on free plans.
3. It asks for three values. Paste the PayPal sandbox client ID and secret. Leave
   `ANTHROPIC_API_KEY` empty unless you have a key with a spending limit.
4. Apply. The first build takes a few minutes.

## 2. Point the domain

In the Render dashboard each service's Settings > Custom Domains page shows the exact records to
add. At the domain registrar, add what Render shows. It will be along these lines:

| Name | Type | Points to |
|---|---|---|
| `legitorfullofshit.com` | ALIAS/ANAME or A | the value Render shows for the static site |
| `www` | CNAME | `legitorfullofshit.onrender.com` |
| `api` | CNAME | `legitorfullofshit-api.onrender.com` |

Render issues the HTTPS certificates itself once the records resolve, usually within an hour.

## 3. Check it

- `https://legitorfullofshit.com` shows the home page; `/utah` opens Utah; reloading `/utah/top20` works.
- `https://api.legitorfullofshit.com/api/health` answers `{"ok":true}`.
- Make a call on any person: the tally appears.
- Build an evidence file and pay as the sandbox buyer.

## 4. Before real traffic

- Upgrade the database before day 30 or it is deleted, tallies included.
- Upgrade the API service so the first visitor does not wait a minute for it to wake.
- Terms and privacy pages are drafts. Corrections form is not live. See README section 11.
- `ADMIN_TOKEN` (Render dashboard > API service > Environment) reads the research list:
  `curl -H "X-Admin: <token>" https://api.legitorfullofshit.com/api/admin/research`

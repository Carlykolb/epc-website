# EPC Website Backend

This is the real backend for the EPC site: customer accounts with secure
login, a product catalog backed by a database, and checkout powered by
Stripe. It replaces the placeholder login that was on the static version of
the site (that one accepted any username/password since nothing was
actually checking it).

## What you'll need to set up (one-time)

1. **A database.** In DigitalOcean, create a Managed Database (choose
   PostgreSQL). Once it's created, copy its "Connection String" - you'll
   use this as `DATABASE_URL`. You do **not** need to manually create any
   tables - this app builds its own database tables automatically the
   first time it starts up.

2. **A Stripe account.** Sign up free at stripe.com. From the Dashboard,
   go to Developers > API keys and copy the **Secret key** - this is your
   `STRIPE_SECRET_KEY`. Start with the test key (starts with `sk_test_`)
   so you can run test purchases before going live.

3. **A Stripe webhook.** Still in the Stripe Dashboard, go to Developers >
   Webhooks > Add endpoint. The URL should be:
   `https://your-domain.com/api/webhooks/stripe`
   For the event to listen for, choose `checkout.session.completed`. After
   creating it, Stripe shows you a "Signing secret" - that's your
   `STRIPE_WEBHOOK_SECRET`.

4. **A JWT secret and an admin password.** `JWT_SECRET` secures customer
   logins; `ADMIN_IMPORT_KEY` is the password you'll type into the product
   import page (see below). Both can just be any long, random string you
   make up - they're not used anywhere else.

5. **Your website files.** Move your existing `index.html` (and any images
   it uses) into the `public/` folder in this project, replacing the
   placeholder text file that's there now.

6. **Your product data.** Once this app is deployed (see below), open
   `https://your-domain.com/admin-import.html` in your browser, enter your
   admin password, choose your product CSV file, and click Import. No
   command line needed. The file should have columns named `sku, brand,
   model, description, price, stock_quantity` - if your spreadsheet uses
   different column names, send it to me and I'll adjust the import code
   to match.

## Deploying this on DigitalOcean

Your current site is deployed as a **Static Site** component, which can
only serve flat files - it can't run this backend. You'll need to either
create a new app or edit the existing one and change the component type to
a **Web Service** instead. The easiest path:

1. Push this whole folder to your `epc-website` GitHub repo (replacing what's
   there now), the same way you uploaded the HTML file earlier.
2. In DigitalOcean's App Platform, edit your app and change the component
   type from Static Site to Web Service (or create a fresh app pointed at
   the same repo - either works).
3. Under the app's Settings > Environment Variables, add every value from
   `.env.example` (DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY,
   STRIPE_WEBHOOK_SECRET, APP_URL, NODE_ENV). Mark the secret-looking ones
   as "Encrypted."
4. Deploy. DigitalOcean will run `npm install` and `npm start`
   automatically.

I'm happy to walk through any of these steps with you when you get there -
just send a screenshot of whatever screen you're on.

## A note on what's left to connect

This backend is fully functional on its own (you can test it with tools
like Postman), but your actual HTML page's JavaScript still needs a few
updates to talk to it - specifically, the login form needs to call
`POST /api/auth/login`, a signup form needs to call `POST /api/auth/signup`,
the product page needs to load real data from `GET /api/products` instead
of the embedded list, and a cart/checkout button needs to call
`POST /api/checkout/create-session` and redirect to the URL it returns.
I can write that front-end JavaScript with you once the backend above is
deployed and you've confirmed the database and Stripe pieces are working.

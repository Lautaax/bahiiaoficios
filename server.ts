import express from "express";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference } from 'mercadopago';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Mercado Pago Configuration
  // Initialize only if token is available to avoid startup crash
  let mpClient: MercadoPagoConfig | null = null;
  
  let accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken && process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET) {
    try {
      console.log("Fetching MP Access Token using Client Credentials...");
      const response = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          client_id: process.env.MP_CLIENT_ID,
          client_secret: process.env.MP_CLIENT_SECRET,
          grant_type: "client_credentials"
        }).toString()
      });

      if (response.ok) {
        const data = await response.json();
        accessToken = data.access_token;
        console.log("MP Access Token fetched successfully.");
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch MP Access Token:", errorText);
      }
    } catch (error) {
      console.error("Error fetching MP Access Token:", error);
    }
  }

  if (accessToken) {
    mpClient = new MercadoPagoConfig({ accessToken: accessToken });
  } else {
    console.warn("MP_ACCESS_TOKEN not found (and failed to fetch with Client ID/Secret). Mercado Pago integration will not work.");
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create_preference", async (req, res) => {
    if (!mpClient) {
      return res.status(500).json({ error: "Mercado Pago not configured" });
    }

    try {
      const { title, price, quantity, userEmail, redirectUrl } = req.body;
      const baseUrl = redirectUrl || process.env.APP_URL || 'http://localhost:3000';
      
      const preference = new Preference(mpClient);
      const result = await preference.create({
        body: {
          items: [
            {
              title: title || "Membresía VIP",
              unit_price: Number(price) || 5000,
              quantity: Number(quantity) || 1,
              currency_id: "ARS",
            },
          ],
          payer: {
            email: userEmail || "test_user@test.com"
          },
          back_urls: {
            success: `${baseUrl}/profile?status=success`,
            failure: `${baseUrl}/profile?status=failure`,
            pending: `${baseUrl}/profile?status=pending`,
          },
          auto_return: "approved",
        }
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error("Error creating preference:", error);
      res.status(500).json({ error: "Failed to create preference" });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    const { type, data } = req.body;

    try {
      if (type === "payment") {
        if (!mpClient) {
            console.error("MP Client not initialized");
            return res.status(500).send("MP Client not initialized");
        }
        // Here you would typically fetch the payment from MP to verify it
        // const payment = await new Payment(mpClient).get({ id: data.id });
        // if (payment.status === 'approved') {
        //   // Update user in Firestore
        //   // You need firebase-admin for server-side firestore access
        // }
        console.log("Payment received:", data.id);
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving would go here if needed
    // But for this environment, we rely on Vite dev server mostly
    // Or we can serve dist folder if built
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

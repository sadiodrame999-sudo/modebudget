const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const Stripe = require('stripe');

if (fs.existsSync(path.join(__dirname, '.env'))) {
  dotenv.config({ path: path.join(__dirname, '.env') });
} else if (fs.existsSync(path.join(__dirname, '.env.example'))) {
  dotenv.config({ path: path.join(__dirname, '.env.example') });
}

const app = express();
const port = Number(process.env.PORT || 4242);
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(500).json({
      error: 'STRIPE_SECRET_KEY manquante. Ajoutez votre clé de test Stripe dans l\'environnement.',
    });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const shippingFee = Math.max(0, Number(req.body?.shippingFee) || 0);
  const delivery = req.body?.delivery || null;

  if (!items.length) {
    return res.status(400).json({ error: 'Le panier est vide.' });
  }

  const lineItems = items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const amount = Math.max(1, Math.round(Number(item.amount) || 0));

    return {
      quantity,
      price_data: {
        currency: 'eur',
        product_data: {
          name: String(item.title || 'Produit ModeBudget'),
          description: String(item.category || 'Vêtement'),
        },
        unit_amount: amount,
      },
    };
  });

  if (shippingFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Frais de livraison',
          description: delivery?.estimate || 'Livraison standard',
        },
        unit_amount: shippingFee,
      },
    });
  }

  try {
    const metadata = {};
    if (delivery?.method) metadata.delivery_method = delivery.method;
    if (delivery?.estimate) metadata.delivery_estimate = delivery.estimate;
    if (delivery?.customer?.name) metadata.customer_name = delivery.customer.name;
    if (delivery?.customer?.city) metadata.customer_city = delivery.customer.city;
    items.forEach((item, index) => {
      if (item.size) {
        metadata[`item_${index}_size`] = item.size;
      }
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata,
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

app.get('/cancel.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'cancel.html'));
});

app.listen(port, () => {
  console.log(`ModeBudget server running on http://localhost:${port}`);
});

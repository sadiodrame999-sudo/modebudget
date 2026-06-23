const DELIVERY_KEY = 'modebudget_delivery_v1';
const CART_KEY = 'modebudget_cart_v1';

function getCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function formatCurrency(amountInCents) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

function getDeliveryData() {
  try {
    const stored = localStorage.getItem(DELIVERY_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveDeliveryData(data) {
  localStorage.setItem(DELIVERY_KEY, JSON.stringify(data));
}

function getSelectedDelivery() {
  const selected = document.querySelector('input[name="delivery-method"]:checked');
  if (!selected) return null;

  return {
    method: selected.value,
    price: Number(selected.dataset.price) || 0,
    estimate: selected.dataset.estimate || '',
  };
}

function getFormData() {
  const form = document.getElementById('delivery-form');
  if (!form) return null;

  const formData = new FormData(form);
  return {
    name: formData.get('name')?.toString().trim() || '',
    address: formData.get('address')?.toString().trim() || '',
    city: formData.get('city')?.toString().trim() || '',
    postal: formData.get('postal')?.toString().trim() || '',
    phone: formData.get('phone')?.toString().trim() || '',
  };
}

function renderDeliverySummary() {
  const container = document.getElementById('delivery-summary-content');
  if (!container) return;

  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const delivery = getSelectedDelivery();
  const deliveryFee = delivery ? delivery.price : 0;
  const total = subtotal + deliveryFee;

  if (!cart.length) {
    container.innerHTML = '<p class="delivery-empty">Votre panier est vide.</p>';
    return;
  }

  const itemsHtml = cart
    .map((item) => `
      <div class="delivery-item">
        <span>${item.title}${item.size ? ` (${item.size})` : ''} x${item.quantity}</span>
        <span>${formatCurrency(item.amount * item.quantity)}</span>
      </div>
    `)
    .join('');

  container.innerHTML = `
    <div class="delivery-items">${itemsHtml}</div>
    <div class="delivery-summary-row">
      <span>Sous-total</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    <div class="delivery-summary-row">
      <span>Livraison</span>
      <span>${delivery ? formatCurrency(deliveryFee) : '—'}</span>
    </div>
    <div class="delivery-summary-row delivery-total">
      <span>Total</span>
      <span>${formatCurrency(total)}</span>
    </div>
    <button type="button" id="delivery-submit" class="btn-primary delivery-submit">Payer</button>
    <a class="delivery-back" href="cart.html">Retour au panier</a>
  `;

  const submitButton = document.getElementById('delivery-submit');
  if (submitButton) {
    submitButton.addEventListener('click', handleDeliverySubmit);
  }
}

function handleDeliverySubmit() {
  const cart = getCart();
  if (!cart.length) {
    alert('Votre panier est vide.');
    return;
  }

  const formData = getFormData();
  if (!formData) {
    alert('Veuillez remplir le formulaire de livraison.');
    return;
  }

  const missing = Object.entries(formData).find(([, value]) => !value);
  if (missing) {
    alert(`Veuillez remplir le champ "${missing[0]}".`);
    return;
  }

  const delivery = getSelectedDelivery();
  if (!delivery) {
    alert('Veuillez sélectionner un mode de livraison.');
    return;
  }

  const payload = {
    customer: formData,
    delivery,
    cart,
  };

  saveDeliveryData(payload);

  const submitButton = document.getElementById('delivery-submit');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Redirection...';
  }

  const shippingFee = delivery.price;

  fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cart.map((item) => ({
        title: item.title,
        category: item.category,
        amount: item.amount,
        quantity: item.quantity,
        size: item.size || '',
      })),
      shippingFee,
      delivery: {
        method: delivery.method,
        estimate: delivery.estimate,
        customer: formData,
      },
    }),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de créer la session de paiement.');
      }
      window.location.href = data.url;
    })
    .catch((error) => {
      alert(error.message);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Payer';
      }
    });
}

function initDelivery() {
  const existing = getDeliveryData();
  if (existing) {
    const form = document.getElementById('delivery-form');
    if (form && existing.customer) {
      const fields = ['name', 'address', 'city', 'postal', 'phone'];
      fields.forEach((field) => {
        const input = form.elements[field];
        if (input && existing.customer[field]) {
          input.value = existing.customer[field];
        }
      });
      if (existing.delivery?.method) {
        const radio = document.querySelector(`input[name="delivery-method"][value="${existing.delivery.method}"]`);
        if (radio) radio.checked = true;
      }
    }
  }

  const cart = getCart();
  if (!cart.length) {
    window.location.href = 'cart.html';
    return;
  }

  document.querySelectorAll('input[name="delivery-method"]').forEach((radio) => {
    radio.addEventListener('change', renderDeliverySummary);
  });

  renderDeliverySummary();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDelivery);
} else {
  initDelivery();
}

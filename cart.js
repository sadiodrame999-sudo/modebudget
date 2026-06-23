const CART_KEY = 'modebudget_cart_v1';

function getCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  renderCartPage();
}

function formatCurrency(amountInCents) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

function getProductImageClass(card) {
  const imageElement = card.querySelector('.product-image');
  if (!imageElement) return '';

  return Array.from(imageElement.classList).find((className) =>
    /^(modebudget|nike|ralph|adidas|promo)-/.test(className)
  ) || '';
}

function getAvailableSizes(title, category) {
  const lowerTitle = title.toLowerCase();
  const lowerCategory = category.toLowerCase();

  const shoeTitleKeywords = [
    'air force', 'air max', 'dunk', 'p-6000', 'jordan', 'vapor',
    'blazer', 'cortex', 'stan smith', 'gazelle', 'samba', 'forum',
    'superstar', 'nmd', 'ultraboost', 'yeezy',
  ];

  const isShoeByTitle = shoeTitleKeywords.some((keyword) =>
    lowerTitle.includes(keyword)
  );

  if (
    isShoeByTitle ||
    lowerCategory.includes('basket') ||
    lowerCategory.includes('chaussures')
  ) {
    return ['37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
  }

  const clothingKeywords = [
    'sweat', 'jogging', 't-shirt', 'tee', 'polo', 'chemise', 'pull', 'gilet',
    'veste', 'manteau', 'doudoune', 'short', 'ensemble', 'jean', 'pantalon',
    'robe', 'jupe', 'haut', 'sans manche', 'bonnet', 'casquette',
  ];

  const isClothing =
    clothingKeywords.some((keyword) => lowerTitle.includes(keyword)) ||
    clothingKeywords.some((keyword) => lowerCategory.includes(keyword));

  if (!isClothing) {
    return [];
  }

  if (lowerTitle.includes('casquette') || lowerTitle.includes('bonnet')) {
    return ['Taille unique'];
  }

  return ['S', 'M', 'L', 'XL'];
}

function getProductData(card) {
  const title = card.querySelector('.product-info h3')?.textContent?.trim() || 'Produit';
  const category = card.querySelector('.product-category')?.textContent?.trim() || 'Vêtement';
  const priceElement = card.querySelector('.price');
  const priceMatches = priceElement?.textContent?.match(/[\d]+(?:[.,]\d+)?/g) || [];
  const priceText = priceMatches.length ? priceMatches[priceMatches.length - 1] : '0';
  const amount = Math.max(1, Math.round(Number(priceText.replace(',', '.')) * 100));
  const imageClass = getProductImageClass(card);
  const sizeSelector = card.querySelector('.size-selector');
  const selectedSize = sizeSelector?.value || '';

  return {
    id: [title, category, amount, imageClass, selectedSize].join('|'),
    title,
    category,
    amount,
    imageClass,
    size: selectedSize,
  };
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
}

function changeQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === productId);

  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    saveCart(cart.filter((entry) => entry.id !== productId));
    return;
  }

  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function getTotalQuantity(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

const SHIPPING_FEE = 500;

function getTotalAmount(cart) {
  return cart.reduce((sum, item) => sum + item.amount * item.quantity, 0);
}

function getShippingFee(cart) {
  return cart.length ? SHIPPING_FEE : 0;
}

function ensureCartLauncher() {
  if (window.location.pathname.endsWith('/cart.html')) {
    return;
  }

  if (document.querySelector('.cart-launcher')) {
    return;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cart-launcher';
  button.innerHTML = '<span>Panier</span><span class="cart-launcher-badge">0</span>';
  button.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
  document.body.appendChild(button);
}

function updateCartBadge() {
  const badge = document.querySelector('.cart-launcher-badge');
  if (!badge) return;

  badge.textContent = String(getTotalQuantity(getCart()));
}

function createSizeSelector(card) {
  const title = card.querySelector('.product-info h3')?.textContent?.trim() || '';
  const category = card.querySelector('.product-category')?.textContent?.trim() || '';
  const sizes = getAvailableSizes(title, category);

  if (!sizes.length) {
    return null;
  }

  const selector = document.createElement('select');
  selector.className = 'size-selector';
  selector.innerHTML = sizes
    .map((size) => `<option value="${size}">${size}</option>`)
    .join('');

  return selector;
}

function injectAddButtons() {
  document.querySelectorAll('.product-card').forEach((card) => {
    const info = card.querySelector('.product-info');
    if (!info || info.querySelector('.buy-button')) return;

    const sizeSelector = createSizeSelector(card);
    if (sizeSelector) {
      info.appendChild(sizeSelector);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'buy-button';
    button.textContent = 'Ajouter au panier';
    button.addEventListener('click', () => addToCart(getProductData(card)));
    info.appendChild(button);
  });
}

function renderEmptyCart(root) {
  root.innerHTML = `
    <div class="cart-empty">
      <p class="eyebrow">Panier vide</p>
      <h2>Votre panier est vide</h2>
      <p>Ajoutez des produits depuis les pages des marques ou depuis l'accueil.</p>
      <a class="btn-primary" href="index.html">Continuer les achats</a>
    </div>
  `;
}

function renderCartPage() {
  const root = document.getElementById('cart-root');
  if (!root) return;

  const cart = getCart();

  if (!cart.length) {
    renderEmptyCart(root);
    return;
  }

  const itemsHtml = cart
    .map(
      (item) => `
        <article class="cart-item">
          <div class="cart-item-image ${item.imageClass || ''}"></div>
          <div>
            <div class="cart-item-top">
              <div>
                <p class="product-category">${item.category}</p>
                <h3>${item.title}${item.size ? ` <span class="item-size">— ${item.size}</span>` : ''}</h3>
              </div>
              <strong>${formatCurrency(item.amount)}</strong>
            </div>
            <div class="cart-item-actions">
              <div class="qty-controls">
                <button type="button" data-action="decrease" data-id="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="increase" data-id="${item.id}">+</button>
              </div>
              <button type="button" class="remove-button" data-action="remove" data-id="${item.id}">Supprimer</button>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  const shippingFee = getShippingFee(cart);
  const subtotal = getTotalAmount(cart);

  root.innerHTML = `
    <div class="cart-list">${itemsHtml}</div>
    <aside class="cart-summary">
      <h3>Résumé</h3>
      <div class="cart-summary-row"><span>Articles</span><span>${getTotalQuantity(cart)}</span></div>
      <div class="cart-summary-row"><span>Sous-total</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="cart-summary-row"><span>Livraison</span><span>${formatCurrency(shippingFee)}</span></div>
      <div class="cart-total"><span>Total</span><span>${formatCurrency(subtotal + shippingFee)}</span></div>
      <a class="btn-primary" href="index.html">Continuer les achats</a>
      <button type="button" class="secondary-action" data-action="clear-cart">Vider le panier</button>
      <p class="cart-note">Le paiement réel est géré par Stripe Checkout quand le serveur est lancé.</p>
    </aside>
  `;

  root.querySelectorAll('[data-action="increase"]').forEach((button) => {
    button.addEventListener('click', () => changeQuantity(button.dataset.id, 1));
  });

  root.querySelectorAll('[data-action="decrease"]').forEach((button) => {
    button.addEventListener('click', () => changeQuantity(button.dataset.id, -1));
  });

  root.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', () => removeFromCart(button.dataset.id));
  });

  const clearButton = root.querySelector('[data-action="clear-cart"]');
  if (clearButton) {
    clearButton.addEventListener('click', clearCart);
  }
}

function injectCheckoutFlow() {
  if (!document.querySelector('.cart-summary') || document.querySelector('[data-checkout-button]')) {
    return;
  }

  const summary = document.querySelector('.cart-summary');
  if (!summary) return;

  const checkoutButton = document.createElement('button');
  checkoutButton.type = 'button';
  checkoutButton.className = 'btn-primary';
  checkoutButton.setAttribute('data-checkout-button', 'true');
  checkoutButton.textContent = 'Passer la commande';
  checkoutButton.addEventListener('click', () => {
    window.location.href = 'delivery.html';
  });

  summary.appendChild(checkoutButton);
}

function initCart() {
  ensureCartLauncher();
  injectAddButtons();
  updateCartBadge();
  renderCartPage();
  injectCheckoutFlow();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCart);
} else {
  initCart();
}

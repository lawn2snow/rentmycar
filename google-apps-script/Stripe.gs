/**
 * RentMyCar - Stripe Payment Integration
 */

/**
 * Create a Stripe PaymentIntent
 */
function createPaymentIntent(amount, bookingId) {
  const url = 'https://api.stripe.com/v1/payment_intents';

  const payload = {
    'amount': Math.round(amount * 100), // Convert to cents
    'currency': 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[bookingId]': bookingId,
    'metadata[platform]': 'rentmycar'
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(STRIPE_SECRET_KEY + ':'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: Object.keys(payload).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(payload[key])
    ).join('&'),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

/**
 * Refund a payment
 */
function refundPayment(paymentIntentId) {
  const url = 'https://api.stripe.com/v1/refunds';

  const payload = {
    'payment_intent': paymentIntentId
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(STRIPE_SECRET_KEY + ':'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: Object.keys(payload).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(payload[key])
    ).join('&'),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

/**
 * Handle Stripe webhook events
 */
function handleStripeWebhook(event) {
  const eventType = event.type;
  const paymentIntent = event.data.object;

  switch (eventType) {
    case 'payment_intent.succeeded':
      return handlePaymentSuccess(paymentIntent);

    case 'payment_intent.payment_failed':
      return handlePaymentFailed(paymentIntent);

    default:
      return { received: true };
  }
}

/**
 * Handle successful payment
 */
function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    return { received: true, warning: 'No booking ID in metadata' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { received: true, warning: 'Booking not found' };
  }

  // Update payment status to paid
  bookingsSheet.getRange(bookingRow.rowIndex, 14).setValue('paid');

  // If instant book and was approved, set to active
  const currentStatus = bookingRow.data[11];
  if (currentStatus === 'approved') {
    // Check if rental period has started
    const startDate = new Date(bookingRow.data[4]);
    if (startDate <= new Date()) {
      bookingsSheet.getRange(bookingRow.rowIndex, 12).setValue('active');
    }
  }

  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  return { received: true, success: true };
}

/**
 * Handle failed payment
 */
function handlePaymentFailed(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    return { received: true };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { received: true };
  }

  // Update payment status to failed
  bookingsSheet.getRange(bookingRow.rowIndex, 14).setValue('failed');
  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  return { received: true };
}

/**
 * Verify Stripe webhook signature (optional but recommended)
 */
function verifyWebhookSignature(payload, signature) {
  // For production, implement proper signature verification
  // using STRIPE_WEBHOOK_SECRET
  // This is simplified for demo purposes
  return true;
}

/**
 * Create a Stripe customer (for future use with saved cards)
 */
function createStripeCustomer(email, name) {
  const url = 'https://api.stripe.com/v1/customers';

  const payload = {
    'email': email,
    'name': name
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(STRIPE_SECRET_KEY + ':'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: Object.keys(payload).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(payload[key])
    ).join('&'),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

/**
 * RentMyCar - Booking Management
 */

/**
 * Get bookings for a user (as renter or owner)
 */
function getBookings(role, status, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Filter by role
  if (role === 'renter') {
    bookings = bookings.filter(b => b.renterId === session.userId);
  } else if (role === 'owner') {
    bookings = bookings.filter(b => b.ownerId === session.userId);
  }

  // Filter by status if provided
  if (status) {
    bookings = bookings.filter(b => b.status === status);
  }

  // Enrich with car details
  const carsSheet = getSheet(SHEETS.CARS);
  const cars = sheetToObjects(carsSheet);
  const carsMap = {};
  cars.forEach(car => { carsMap[car.carId] = car; });

  // Enrich with user details
  const usersSheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(usersSheet);
  const usersMap = {};
  users.forEach(user => {
    usersMap[user.userId] = {
      id: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
  });

  bookings = bookings.map(b => {
    const car = carsMap[b.carId] || {};
    return {
      id: b.bookingId,
      carId: b.carId,
      car: {
        make: car.make,
        model: car.model,
        year: car.year,
        images: safeParseJSON(car.images, [])
      },
      renter: usersMap[b.renterId] || null,
      owner: usersMap[b.ownerId] || null,
      startDate: b.startDate,
      endDate: b.endDate,
      totalDays: b.totalDays,
      pricePerDay: b.pricePerDay,
      subtotal: b.subtotal,
      serviceFee: b.serviceFee,
      totalAmount: b.totalAmount,
      renterFee: b.renterFee || b.serviceFee,
      ownerFee: b.ownerFee || 0,
      platformEarnings: b.platformEarnings || b.serviceFee,
      ownerPayout: b.ownerPayout || b.subtotal,
      status: b.status,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    };
  });

  // Sort by createdAt descending
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, bookings: bookings };
}

/**
 * Get a single booking by ID
 */
function getBooking(bookingId, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { success: false, error: 'Booking not found' };
  }

  const b = rowToBooking(bookingRow.data);

  // Verify user has access to this booking
  if (b.renterId !== session.userId && b.ownerId !== session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  return { success: true, booking: b };
}

/**
 * Create a new booking
 */
function createBooking(data, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate required fields
  const required = ['carId', 'startDate', 'endDate'];
  const missing = validateRequired(data, required);
  if (missing.length > 0) {
    return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  // Get car details
  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, data.carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  const car = rowToCar(carRow.data);

  if (car.status !== 'active') {
    return { success: false, error: 'Car is not available for booking' };
  }

  // Can't book your own car
  if (car.ownerId === session.userId) {
    return { success: false, error: 'You cannot book your own car' };
  }

  // Check for overlapping bookings
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const existingBookings = sheetToObjects(bookingsSheet);
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const overlapping = existingBookings.filter(b => {
    if (b.carId !== data.carId) return false;
    if (!['pending', 'approved', 'active'].includes(b.status)) return false;

    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);

    return (startDate < bEnd && endDate > bStart);
  });

  if (overlapping.length > 0) {
    return { success: false, error: 'Car is not available for the selected dates' };
  }

  // Calculate pricing with platform fees
  const totalDays = daysBetween(startDate, endDate);
  const subtotal = totalDays * car.pricePerDay;

  // Platform fee structure:
  // - Renter pays: subtotal + renterFee (5%)
  // - Owner receives: subtotal - ownerFee (5%)
  // - Platform earns: renterFee + ownerFee (10% total)
  const renterFee = subtotal * (RENTER_FEE_PERCENT / 100);
  const ownerFee = subtotal * (OWNER_FEE_PERCENT / 100);
  const totalAmount = subtotal + renterFee;  // What renter pays
  const ownerPayout = subtotal - ownerFee;   // What owner receives
  const platformEarnings = renterFee + ownerFee;  // Platform revenue

  // Legacy field for backward compatibility
  const serviceFee = renterFee;

  // Create booking
  const bookingId = 'booking_' + generateUUID();
  const now = formatDate();

  // Determine initial status
  const initialStatus = car.instantBook ? 'approved' : 'pending';

  const bookingRow = [
    bookingId,
    data.carId,
    session.userId, // renterId
    car.ownerId,
    data.startDate,
    data.endDate,
    totalDays,
    car.pricePerDay,
    subtotal,
    serviceFee,
    totalAmount,
    initialStatus,
    '', // stripePaymentIntentId (will be set after Stripe call)
    'pending', // paymentStatus
    now, // createdAt
    now, // updatedAt
    renterFee,
    ownerFee,
    platformEarnings,
    ownerPayout
  ];

  // Create Stripe PaymentIntent
  let stripeResult = null;
  try {
    stripeResult = createPaymentIntent(totalAmount, bookingId);
    bookingRow[12] = stripeResult.id; // stripePaymentIntentId
  } catch (e) {
    return { success: false, error: 'Failed to create payment intent: ' + e.message };
  }

  bookingsSheet.appendRow(bookingRow);

  const booking = rowToBooking(bookingRow);

  return {
    success: true,
    booking: booking,
    stripeClientSecret: stripeResult ? stripeResult.client_secret : null
  };
}

/**
 * Update booking status (approve, decline, cancel)
 */
function updateBookingStatus(bookingId, newStatus, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const validStatuses = ['approved', 'declined', 'cancelled', 'completed'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid status' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { success: false, error: 'Booking not found' };
  }

  const booking = rowToBooking(bookingRow.data);

  // Check permissions
  const isOwner = booking.ownerId === session.userId;
  const isRenter = booking.renterId === session.userId;

  if (newStatus === 'approved' || newStatus === 'declined') {
    if (!isOwner) {
      return { success: false, error: 'Only the car owner can approve or decline bookings' };
    }
    if (booking.status !== 'pending') {
      return { success: false, error: 'Can only approve/decline pending bookings' };
    }
  }

  if (newStatus === 'cancelled') {
    if (!isRenter && !isOwner) {
      return { success: false, error: 'Unauthorized' };
    }
    if (!['pending', 'approved'].includes(booking.status)) {
      return { success: false, error: 'Cannot cancel this booking' };
    }

    // If cancelling after payment, initiate refund
    if (booking.paymentStatus === 'paid') {
      try {
        refundPayment(booking.stripePaymentIntentId);
        bookingsSheet.getRange(bookingRow.rowIndex, 14).setValue('refunded');
      } catch (e) {
        return { success: false, error: 'Failed to process refund: ' + e.message };
      }
    }
  }

  if (newStatus === 'completed') {
    if (!isOwner) {
      return { success: false, error: 'Only the car owner can mark bookings as completed' };
    }
    if (booking.status !== 'active') {
      return { success: false, error: 'Can only complete active bookings' };
    }
  }

  // Update status
  bookingsSheet.getRange(bookingRow.rowIndex, 12).setValue(newStatus);
  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  booking.status = newStatus;

  return { success: true, booking: booking };
}

/**
 * Convert row data to booking object
 */
function rowToBooking(rowData) {
  return {
    id: rowData[0],
    carId: rowData[1],
    renterId: rowData[2],
    ownerId: rowData[3],
    startDate: rowData[4],
    endDate: rowData[5],
    totalDays: rowData[6],
    pricePerDay: rowData[7],
    subtotal: rowData[8],
    serviceFee: rowData[9],
    totalAmount: rowData[10],
    status: rowData[11],
    stripePaymentIntentId: rowData[12],
    paymentStatus: rowData[13],
    createdAt: rowData[14],
    updatedAt: rowData[15],
    renterFee: rowData[16] || rowData[9], // fallback to serviceFee for old bookings
    ownerFee: rowData[17] || 0,
    platformEarnings: rowData[18] || rowData[9], // fallback to serviceFee
    ownerPayout: rowData[19] || rowData[8] // fallback to subtotal for old bookings
  };
}

/**
 * Get dashboard stats for owner
 */
function getOwnerStats(sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const ownerBookings = bookings.filter(b => b.ownerId === session.userId);

  const carsSheet = getSheet(SHEETS.CARS);
  const cars = sheetToObjects(carsSheet);
  const ownerCars = cars.filter(c => c.ownerId === session.userId);

  // Calculate stats - use ownerPayout (subtotal - 5% fee) for actual earnings
  const totalEarnings = ownerBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.ownerPayout || b.subtotal || 0), 0);

  const activeRentals = ownerBookings.filter(b => b.status === 'active').length;
  const pendingBookings = ownerBookings.filter(b => b.status === 'pending').length;
  const completedBookings = ownerBookings.filter(b => b.status === 'completed').length;

  const totalCars = ownerCars.length;
  const activeCars = ownerCars.filter(c => c.status === 'active').length;

  // Calculate average rating
  const ratings = ownerCars.map(c => c.rating || 0).filter(r => r > 0);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  return {
    success: true,
    stats: {
      totalEarnings: totalEarnings,
      activeRentals: activeRentals,
      pendingBookings: pendingBookings,
      completedBookings: completedBookings,
      totalCars: totalCars,
      activeCars: activeCars,
      averageRating: avgRating.toFixed(1)
    }
  };
}

/**
 * Get dashboard stats for renter
 */
function getRenterStats(sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const renterBookings = bookings.filter(b => b.renterId === session.userId);

  const activeRentals = renterBookings.filter(b => b.status === 'active').length;
  const upcomingBookings = renterBookings.filter(b =>
    ['pending', 'approved'].includes(b.status) &&
    new Date(b.startDate) > new Date()
  ).length;
  const completedTrips = renterBookings.filter(b => b.status === 'completed').length;

  const totalSpent = renterBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  return {
    success: true,
    stats: {
      activeRentals: activeRentals,
      upcomingBookings: upcomingBookings,
      completedTrips: completedTrips,
      totalSpent: totalSpent
    }
  };
}

/**
 * RentMyCar - Admin Functions
 * Admin-only endpoints for platform management
 */

/**
 * Get platform statistics for admin dashboard
 */
function getAdminStats(sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  const carsSheet = getSheet(SHEETS.CARS);
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);

  const users = sheetToObjects(usersSheet);
  const cars = sheetToObjects(carsSheet);
  const bookings = sheetToObjects(bookingsSheet);

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const renters = users.filter(u => u.role === 'renter' || u.role === 'both').length;
  const owners = users.filter(u => u.role === 'owner' || u.role === 'both').length;

  const totalCars = cars.length;
  const activeCars = cars.filter(c => c.status === 'active').length;

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'active').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;

  // Calculate platform revenue (sum of platformEarnings or serviceFee for paid bookings)
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
  const totalPlatformRevenue = paidBookings.reduce((sum, b) => {
    return sum + (parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0);
  }, 0);

  // Calculate total transaction volume
  const totalTransactionVolume = paidBookings.reduce((sum, b) => {
    return sum + (parseFloat(b.totalAmount) || 0);
  }, 0);

  // Today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBookings = bookings.filter(b => new Date(b.createdAt) >= today).length;
  const todayRevenue = paidBookings
    .filter(b => new Date(b.createdAt) >= today)
    .reduce((sum, b) => sum + (parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0), 0);

  // This month's stats
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyBookings = bookings.filter(b => new Date(b.createdAt) >= thisMonth).length;
  const monthlyRevenue = paidBookings
    .filter(b => new Date(b.createdAt) >= thisMonth)
    .reduce((sum, b) => sum + (parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0), 0);

  return {
    success: true,
    stats: {
      users: {
        total: totalUsers,
        active: activeUsers,
        renters: renters,
        owners: owners
      },
      cars: {
        total: totalCars,
        active: activeCars
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        pending: pendingBookings,
        completed: completedBookings,
        today: todayBookings,
        thisMonth: monthlyBookings
      },
      revenue: {
        total: totalPlatformRevenue,
        today: todayRevenue,
        thisMonth: monthlyRevenue,
        transactionVolume: totalTransactionVolume
      }
    }
  };
}

/**
 * Get all users (with optional filters)
 */
function getAdminUsers(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  let users = sheetToObjects(usersSheet);

  // Apply filters
  if (filters) {
    if (filters.status) {
      users = users.filter(u => u.status === filters.status);
    }
    if (filters.role) {
      users = users.filter(u => u.role === filters.role || u.role === 'both');
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u =>
        u.email.toLowerCase().includes(search) ||
        u.firstName.toLowerCase().includes(search) ||
        u.lastName.toLowerCase().includes(search) ||
        (u.businessName && u.businessName.toLowerCase().includes(search))
      );
    }
  }

  // Format users for response
  users = users.map(u => ({
    id: u.userId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    status: u.status,
    businessName: u.businessName || '',
    isAdmin: u.isAdmin === true || u.isAdmin === 'true',
    joinDate: u.joinDate,
    lastLogin: u.lastLogin
  }));

  // Sort by joinDate descending
  users.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));

  return { success: true, users: users };
}

/**
 * Update a user (status, role, admin)
 */
function updateAdminUser(userId, updates, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  const userRow = findRowByValue(usersSheet, 0, userId);

  if (!userRow) {
    return { success: false, error: 'User not found' };
  }

  // Update allowed fields
  if (updates.status && ['active', 'suspended'].includes(updates.status)) {
    usersSheet.getRange(userRow.rowIndex, 13).setValue(updates.status);
  }

  if (updates.role && ['renter', 'owner', 'both'].includes(updates.role)) {
    usersSheet.getRange(userRow.rowIndex, 7).setValue(updates.role);
  }

  if (updates.isAdmin !== undefined) {
    usersSheet.getRange(userRow.rowIndex, 15).setValue(updates.isAdmin);
  }

  return { success: true, message: 'User updated successfully' };
}

/**
 * Get all bookings (with optional filters)
 */
function getAdminBookings(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Get users and cars for enrichment
  const usersSheet = getSheet(SHEETS.USERS);
  const carsSheet = getSheet(SHEETS.CARS);
  const users = sheetToObjects(usersSheet);
  const cars = sheetToObjects(carsSheet);

  const usersMap = {};
  users.forEach(u => {
    usersMap[u.userId] = {
      id: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      businessName: u.businessName || ''
    };
  });

  const carsMap = {};
  cars.forEach(c => {
    carsMap[c.carId] = {
      id: c.carId,
      make: c.make,
      model: c.model,
      year: c.year
    };
  });

  // Apply filters
  if (filters) {
    if (filters.status) {
      bookings = bookings.filter(b => b.status === filters.status);
    }
    if (filters.paymentStatus) {
      bookings = bookings.filter(b => b.paymentStatus === filters.paymentStatus);
    }
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= new Date(filters.endDate));
    }
  }

  // Format bookings for response
  bookings = bookings.map(b => ({
    id: b.bookingId,
    car: carsMap[b.carId] || { id: b.carId },
    renter: usersMap[b.renterId] || { id: b.renterId },
    owner: usersMap[b.ownerId] || { id: b.ownerId },
    startDate: b.startDate,
    endDate: b.endDate,
    totalDays: b.totalDays,
    pricePerDay: parseFloat(b.pricePerDay),
    subtotal: parseFloat(b.subtotal),
    renterFee: parseFloat(b.renterFee) || parseFloat(b.serviceFee),
    ownerFee: parseFloat(b.ownerFee) || 0,
    platformEarnings: parseFloat(b.platformEarnings) || parseFloat(b.serviceFee),
    totalAmount: parseFloat(b.totalAmount),
    ownerPayout: parseFloat(b.ownerPayout) || parseFloat(b.subtotal),
    status: b.status,
    paymentStatus: b.paymentStatus,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  }));

  // Sort by createdAt descending
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, bookings: bookings };
}

/**
 * Get all cars (with optional filters)
 */
function getAdminCars(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  let cars = sheetToObjects(carsSheet);

  // Get owners for enrichment
  const usersSheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(usersSheet);
  const usersMap = {};
  users.forEach(u => {
    usersMap[u.userId] = {
      id: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName
    };
  });

  // Get booking counts
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const bookingCounts = {};
  bookings.forEach(b => {
    bookingCounts[b.carId] = (bookingCounts[b.carId] || 0) + 1;
  });

  // Apply filters
  if (filters) {
    if (filters.status) {
      cars = cars.filter(c => c.status === filters.status);
    }
    if (filters.ownerId) {
      cars = cars.filter(c => c.ownerId === filters.ownerId);
    }
  }

  // Format cars for response
  cars = cars.map(c => ({
    id: c.carId,
    owner: usersMap[c.ownerId] || { id: c.ownerId },
    make: c.make,
    model: c.model,
    year: c.year,
    type: c.type,
    pricePerDay: parseFloat(c.pricePerDay),
    location: c.location,
    status: c.status,
    rating: parseFloat(c.rating) || 0,
    reviewCount: parseInt(c.reviewCount) || 0,
    bookingCount: bookingCounts[c.carId] || 0,
    createdAt: c.createdAt
  }));

  // Sort by createdAt descending
  cars.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, cars: cars };
}

/**
 * Update a car's status (admin override)
 */
function updateAdminCar(carId, updates, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  // Update allowed fields
  if (updates.status && ['active', 'inactive', 'suspended'].includes(updates.status)) {
    carsSheet.getRange(carRow.rowIndex, 13).setValue(updates.status);
  }

  return { success: true, message: 'Car updated successfully' };
}

/**
 * Get revenue report (with date range)
 */
function getAdminRevenue(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Filter to paid bookings only
  bookings = bookings.filter(b => b.paymentStatus === 'paid');

  // Apply date filters
  if (filters) {
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= new Date(filters.endDate));
    }
  }

  // Calculate totals
  let totalRenterFees = 0;
  let totalOwnerFees = 0;
  let totalPlatformEarnings = 0;
  let totalTransactionVolume = 0;
  let totalOwnerPayouts = 0;

  bookings.forEach(b => {
    totalRenterFees += parseFloat(b.renterFee) || parseFloat(b.serviceFee) || 0;
    totalOwnerFees += parseFloat(b.ownerFee) || 0;
    totalPlatformEarnings += parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0;
    totalTransactionVolume += parseFloat(b.totalAmount) || 0;
    totalOwnerPayouts += parseFloat(b.ownerPayout) || parseFloat(b.subtotal) || 0;
  });

  // Group by day for chart data
  const dailyRevenue = {};
  bookings.forEach(b => {
    const date = new Date(b.createdAt).toISOString().split('T')[0];
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = {
        date: date,
        bookings: 0,
        revenue: 0,
        volume: 0
      };
    }
    dailyRevenue[date].bookings++;
    dailyRevenue[date].revenue += parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0;
    dailyRevenue[date].volume += parseFloat(b.totalAmount) || 0;
  });

  // Convert to array and sort by date
  const chartData = Object.values(dailyRevenue).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  return {
    success: true,
    revenue: {
      totalBookings: bookings.length,
      totalRenterFees: totalRenterFees,
      totalOwnerFees: totalOwnerFees,
      totalPlatformEarnings: totalPlatformEarnings,
      totalTransactionVolume: totalTransactionVolume,
      totalOwnerPayouts: totalOwnerPayouts
    },
    chartData: chartData
  };
}

/**
 * Export revenue data as CSV
 */
function exportAdminRevenue(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Filter to paid bookings only
  bookings = bookings.filter(b => b.paymentStatus === 'paid');

  // Apply date filters
  if (filters) {
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= new Date(filters.endDate));
    }
  }

  // Build CSV
  const headers = [
    'Booking ID',
    'Date',
    'Car ID',
    'Renter ID',
    'Owner ID',
    'Days',
    'Price/Day',
    'Subtotal',
    'Renter Fee',
    'Owner Fee',
    'Platform Earnings',
    'Total Amount',
    'Owner Payout'
  ];

  const rows = bookings.map(b => [
    b.bookingId,
    b.createdAt,
    b.carId,
    b.renterId,
    b.ownerId,
    b.totalDays,
    b.pricePerDay,
    b.subtotal,
    b.renterFee || b.serviceFee,
    b.ownerFee || 0,
    b.platformEarnings || b.serviceFee,
    b.totalAmount,
    b.ownerPayout || b.subtotal
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return { success: true, csv: csv };
}

/**
 * Update booking status (admin override)
 */
function updateAdminBookingStatus(bookingId, newStatus, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const validStatuses = ['pending', 'approved', 'declined', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid status' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { success: false, error: 'Booking not found' };
  }

  // Update status
  bookingsSheet.getRange(bookingRow.rowIndex, 12).setValue(newStatus);
  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  return { success: true, message: 'Booking status updated successfully' };
}

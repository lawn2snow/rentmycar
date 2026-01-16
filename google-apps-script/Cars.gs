/**
 * RentMyCar - Car CRUD Operations
 */

/**
 * Get all cars with optional filters
 */
function getCars(filters) {
  const carsSheet = getSheet(SHEETS.CARS);
  let cars = sheetToObjects(carsSheet);

  // Filter only active cars for public listing
  cars = cars.filter(car => car.status === 'active');

  // Apply filters
  if (filters) {
    if (filters.type && filters.type !== 'all') {
      cars = cars.filter(car => car.type === filters.type);
    }

    if (filters.minPrice) {
      cars = cars.filter(car => car.pricePerDay >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      cars = cars.filter(car => car.pricePerDay <= parseFloat(filters.maxPrice));
    }

    if (filters.instantBook === 'true') {
      cars = cars.filter(car => car.instantBook === true || car.instantBook === 'TRUE');
    }

    // Location-based filtering (if lat/lng provided)
    if (filters.lat && filters.lng && filters.radius) {
      const userLat = parseFloat(filters.lat);
      const userLng = parseFloat(filters.lng);
      const radius = parseFloat(filters.radius);

      cars = cars.filter(car => {
        if (!car.latitude || !car.longitude) return false;
        const distance = calculateDistance(userLat, userLng, car.latitude, car.longitude);
        return distance <= radius;
      });
    }

    // Search by make/model
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      cars = cars.filter(car =>
        car.make.toLowerCase().includes(searchLower) ||
        car.model.toLowerCase().includes(searchLower)
      );
    }
  }

  // Parse JSON fields and format response
  cars = cars.map(car => ({
    id: car.carId,
    ownerId: car.ownerId,
    make: car.make,
    model: car.model,
    year: car.year,
    type: car.type,
    pricePerDay: car.pricePerDay,
    location: car.location,
    latitude: car.latitude,
    longitude: car.longitude,
    images: safeParseJSON(car.images, []),
    features: safeParseJSON(car.features, []),
    instantBook: car.instantBook === true || car.instantBook === 'TRUE',
    status: car.status,
    rating: car.rating || 0,
    reviewCount: car.reviewCount || 0
  }));

  return { success: true, cars: cars };
}

/**
 * Get a single car by ID
 */
function getCar(carId) {
  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  const car = rowToCar(carRow.data);
  return { success: true, car: car };
}

/**
 * Get cars owned by a specific user
 */
function getOwnerCars(ownerId, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify user is requesting their own cars
  if (session.userId !== ownerId) {
    return { success: false, error: 'Unauthorized' };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  let cars = sheetToObjects(carsSheet);

  cars = cars.filter(car => car.ownerId === ownerId);
  cars = cars.map(car => rowToCar(Object.values(car)));

  return { success: true, cars: cars };
}

/**
 * Create a new car listing
 */
function createCar(data, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify user is an owner
  const userResult = getCurrentUser(sessionToken);
  if (!userResult.success) {
    return { success: false, error: 'Unauthorized' };
  }

  if (userResult.user.role !== 'owner' && userResult.user.role !== 'both') {
    return { success: false, error: 'Only owners can create car listings' };
  }

  // Validate required fields
  const required = ['make', 'model', 'year', 'type', 'pricePerDay', 'location'];
  const missing = validateRequired(data, required);
  if (missing.length > 0) {
    return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carId = 'car_' + generateUUID();
  const now = formatDate();

  const carRow = [
    carId,
    session.userId,
    data.make,
    data.model,
    parseInt(data.year),
    data.type,
    parseFloat(data.pricePerDay),
    data.location,
    data.latitude || 0,
    data.longitude || 0,
    JSON.stringify(data.images || []),
    JSON.stringify(data.features || []),
    data.instantBook || false,
    'active',
    0, // rating
    0, // reviewCount
    now, // createdAt
    now // updatedAt
  ];

  carsSheet.appendRow(carRow);

  const car = rowToCar(carRow);
  return { success: true, car: car };
}

/**
 * Update a car listing
 */
function updateCar(carId, data, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  // Verify ownership
  if (carRow.data[1] !== session.userId) {
    return { success: false, error: 'You can only edit your own cars' };
  }

  // Update fields
  const updatedRow = [...carRow.data];

  if (data.make !== undefined) updatedRow[2] = data.make;
  if (data.model !== undefined) updatedRow[3] = data.model;
  if (data.year !== undefined) updatedRow[4] = parseInt(data.year);
  if (data.type !== undefined) updatedRow[5] = data.type;
  if (data.pricePerDay !== undefined) updatedRow[6] = parseFloat(data.pricePerDay);
  if (data.location !== undefined) updatedRow[7] = data.location;
  if (data.latitude !== undefined) updatedRow[8] = data.latitude;
  if (data.longitude !== undefined) updatedRow[9] = data.longitude;
  if (data.images !== undefined) updatedRow[10] = JSON.stringify(data.images);
  if (data.features !== undefined) updatedRow[11] = JSON.stringify(data.features);
  if (data.instantBook !== undefined) updatedRow[12] = data.instantBook;
  if (data.status !== undefined) updatedRow[13] = data.status;

  updatedRow[17] = formatDate(); // updatedAt

  // Write back to sheet
  carsSheet.getRange(carRow.rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

  const car = rowToCar(updatedRow);
  return { success: true, car: car };
}

/**
 * Delete a car listing
 */
function deleteCar(carId, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  // Verify ownership
  if (carRow.data[1] !== session.userId) {
    return { success: false, error: 'You can only delete your own cars' };
  }

  // Check for active bookings
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const activeBookings = bookings.filter(b =>
    b.carId === carId &&
    ['pending', 'approved', 'active'].includes(b.status)
  );

  if (activeBookings.length > 0) {
    return { success: false, error: 'Cannot delete car with active bookings' };
  }

  // Delete the row
  carsSheet.deleteRow(carRow.rowIndex);

  return { success: true };
}

/**
 * Convert row data to car object
 */
function rowToCar(rowData) {
  return {
    id: rowData[0],
    ownerId: rowData[1],
    make: rowData[2],
    model: rowData[3],
    year: rowData[4],
    type: rowData[5],
    pricePerDay: rowData[6],
    location: rowData[7],
    latitude: rowData[8],
    longitude: rowData[9],
    images: safeParseJSON(rowData[10], []),
    features: safeParseJSON(rowData[11], []),
    instantBook: rowData[12] === true || rowData[12] === 'TRUE',
    status: rowData[13],
    rating: rowData[14] || 0,
    reviewCount: rowData[15] || 0,
    createdAt: rowData[16],
    updatedAt: rowData[17]
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

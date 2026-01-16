/**
 * List Cars Function
 * GET /cars-list
 */
const { supabase } = require('./utils/db');
const { jsonResponse, handleCors } = require('./utils/auth');

exports.handler = async (event) => {
  // Handle CORS
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  try {
    const params = event.queryStringParameters || {};

    // Build query
    let query = supabase
      .from('cars')
      .select(`
        *,
        owner:users!owner_id(id, first_name, last_name, business_name)
      `)
      .eq('status', 'active');

    // Filter by ID
    if (params.id) {
      query = query.eq('id', params.id);
    }

    // Filter by owner
    if (params.ownerId) {
      query = query.eq('owner_id', params.ownerId);
    }

    // Filter by type
    if (params.type) {
      query = query.eq('type', params.type);
    }

    // Filter by price range
    if (params.minPrice) {
      query = query.gte('price_per_day', parseFloat(params.minPrice));
    }
    if (params.maxPrice) {
      query = query.lte('price_per_day', parseFloat(params.maxPrice));
    }

    // Filter by location (partial match)
    if (params.location) {
      query = query.ilike('location', `%${params.location}%`);
    }

    // Sort
    const sortField = params.sort || 'created_at';
    const sortOrder = params.order === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });

    // Pagination
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    const offset = parseInt(params.offset) || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: cars, error, count } = await query;

    if (error) {
      console.error('List cars error:', error);
      return jsonResponse(500, { success: false, error: 'Failed to fetch cars' });
    }

    // Format response
    const formattedCars = cars.map(car => ({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      type: car.type,
      pricePerDay: car.price_per_day,
      location: car.location,
      description: car.description,
      features: car.features || [],
      images: car.images || [],
      rating: car.rating || 0,
      reviewCount: car.review_count || 0,
      available: car.available,
      owner: car.owner ? {
        id: car.owner.id,
        name: `${car.owner.first_name} ${car.owner.last_name}`,
        businessName: car.owner.business_name
      } : null
    }));

    return jsonResponse(200, {
      success: true,
      cars: formattedCars,
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error('List cars error:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
};

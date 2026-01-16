-- RentMyCar Database Schema for Supabase
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'renter' CHECK (role IN ('renter', 'owner', 'both', 'admin')),
  business_name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- CARS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  license_plate VARCHAR(20),
  vin VARCHAR(17),
  color VARCHAR(50),
  type VARCHAR(50) CHECK (type IN ('sedan', 'suv', 'truck', 'van', 'sports', 'luxury', 'electric', 'hybrid', 'other')),
  price_per_day DECIMAL(10, 2) NOT NULL,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  features TEXT[], -- Array of features like ['GPS', 'Bluetooth', 'Backup Camera']
  images TEXT[], -- Array of image URLs
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'maintenance')),
  instant_book BOOLEAN DEFAULT FALSE,
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
  renter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  service_fee DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  platform_earnings DECIMAL(10, 2) NOT NULL,
  owner_payout DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled', 'declined')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id VARCHAR(255),
  pickup_location TEXT,
  dropoff_location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  type VARCHAR(20) CHECK (type IN ('car', 'renter', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SESSIONS TABLE (for JWT refresh tokens)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_cars_owner ON cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_location ON cars(location);
CREATE INDEX IF NOT EXISTS idx_bookings_car ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reviews_car ON reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Cars policies (public read, owner write)
CREATE POLICY "Anyone can view active cars" ON cars
  FOR SELECT USING (status = 'active');

CREATE POLICY "Owners can manage their own cars" ON cars
  FOR ALL USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Service role has full access to cars" ON cars
  FOR ALL USING (auth.role() = 'service_role');

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    auth.uid()::text = renter_id::text OR
    auth.uid()::text = owner_id::text
  );

CREATE POLICY "Service role has full access to bookings" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

-- Reviews policies (public read)
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Service role has full access to reviews" ON reviews
  FOR ALL USING (auth.role() = 'service_role');

-- Sessions policies
CREATE POLICY "Service role has full access to sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cars_updated_at
  BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update car rating after review
CREATE OR REPLACE FUNCTION update_car_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cars
  SET
    rating = (SELECT AVG(rating) FROM reviews WHERE car_id = NEW.car_id AND type = 'car'),
    review_count = (SELECT COUNT(*) FROM reviews WHERE car_id = NEW.car_id AND type = 'car')
  WHERE id = NEW.car_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_car_rating_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  WHEN (NEW.type = 'car')
  EXECUTE FUNCTION update_car_rating();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Create a test admin user (password: Admin123!)
-- Note: In production, create users through the registration flow
INSERT INTO users (email, password_hash, first_name, last_name, role, is_admin, status)
VALUES (
  'admin@rentmycar.com',
  '$2b$10$rQZ5QXqGqG8xN5L5L5L5L5L5L5L5L5L5L5L5L5L5L5L5L5L5L5L', -- placeholder hash
  'Admin',
  'User',
  'admin',
  TRUE,
  'active'
) ON CONFLICT (email) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RentMyCar database schema created successfully!';
END $$;

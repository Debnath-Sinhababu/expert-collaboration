
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS experts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    photo_url TEXT,
    experience_years INTEGER, 
    qualifications TEXT,
    domain_expertise TEXT[],
    hourly_rate DECIMAL(10,2),
    resume_url TEXT,
    availability JSONB, -- Store weekly availability as JSON
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(50) DEFAULT 'pending',
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
     profile_photo_public_id VARCHAR(255), -- NEW
    profile_photo_thumbnail_url TEXT,     -- NEW
    profile_photo_small_url TEXT,  
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    type VARCHAR(100), -- university, college, research_institute, etc.
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.00,
     contact_person VARCHAR(255),
     pincode VARCHAR(20),
     accreditation VARCHAR(255), 
    student_count INTEGER,           
    established_year INTEGER,
    total_ratings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100), -- guest_lecture, fdp, workshop, curriculum_dev, etc.
    hourly_rate DECIMAL(10,2),
    total_budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    duration_hours INTEGER,
    required_expertise TEXT[],
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, completed, cancelled
    max_applications INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID REFERENCES experts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    cover_letter TEXT,
    proposed_rate DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, withdrawn
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(expert_id, project_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID REFERENCES experts(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount <= 5000), -- Max ₹5,000 limit
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_booked INTEGER,
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, in_progress, completed, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
    is_rated BOOLEAN DEFAULT FALSE, -- Track if booking has been rated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    expert_id UUID REFERENCES experts(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    rated_by VARCHAR(20) NOT NULL, -- 'expert' or 'institution'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id, rated_by)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL, -- Can be expert or institution user_id
    receiver_id UUID NOT NULL, -- Can be expert or institution user_id
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users(id)
    type VARCHAR(100) NOT NULL, -- application_received, booking_confirmed, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id UUID, -- Can reference any related entity (booking, application, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experts_user_id ON experts(user_id);
CREATE INDEX IF NOT EXISTS idx_experts_domain_expertise ON experts USING GIN(domain_expertise);
CREATE INDEX IF NOT EXISTS idx_institutions_user_id ON institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_institution_id ON projects(institution_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_applications_expert_id ON applications(expert_id);
CREATE INDEX IF NOT EXISTS idx_applications_project_id ON applications(project_id);
CREATE INDEX IF NOT EXISTS idx_bookings_expert_id ON bookings(expert_id);
CREATE INDEX IF NOT EXISTS idx_bookings_institution_id ON bookings(institution_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_experts_profile_photo ON experts(profile_photo_public_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_experts_updated_at BEFORE UPDATE ON experts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view their own profile" ON experts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Experts can update their own profile" ON experts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Experts can create their own profile" ON experts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view verified experts" ON experts FOR SELECT USING (is_verified = true);

CREATE POLICY "Institutions can view their own profile" ON institutions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Institutions can update their own profile" ON institutions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Institutions can create their own profile" ON institutions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view verified institutions" ON institutions FOR SELECT USING (is_verified = true);

CREATE POLICY "Anyone can view open projects" ON projects FOR SELECT USING (status = 'open');
CREATE POLICY "Institutions can manage their own projects" ON projects FOR ALL USING (auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id));
CREATE POLICY "Institutions can create projects" ON projects FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id));

CREATE POLICY "Experts can view their own applications" ON applications FOR SELECT USING (auth.uid() IN (SELECT user_id FROM experts WHERE id = expert_id));
CREATE POLICY "Institutions can view applications to their projects" ON applications FOR SELECT USING (auth.uid() IN (SELECT user_id FROM institutions WHERE id = (SELECT institution_id FROM projects WHERE id = project_id)));
CREATE POLICY "Experts can create applications" ON applications FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM experts WHERE id = expert_id));
CREATE POLICY "Institutions can update applications to their own projects"
  ON applications
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id
      FROM institutions
      WHERE id = (
        SELECT institution_id
        FROM projects
        WHERE projects.id = applications.project_id
      )
    )
  );


CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM experts WHERE id = expert_id) OR
    auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
);


CREATE POLICY "Institutions can create bookings for their projects" ON bookings FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
);

CREATE POLICY "Users can update their own bookings" ON bookings FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM experts WHERE id = expert_id) OR
    auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
);

CREATE POLICY "Users can delete their own bookings" ON bookings FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM experts WHERE id = expert_id) OR
    auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
);

CREATE POLICY "Users can view ratings" ON ratings FOR SELECT TO authenticated;
CREATE POLICY "Users can create ratings for their bookings" ON ratings FOR INSERT WITH CHECK (
    -- Allow institutions to create ratings
    auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
);
CREATE POLICY "Users can update their own ratings" ON ratings FOR UPDATE USING (
    -- Only institutions can update their own ratings
    auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
);

CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

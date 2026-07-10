-- Initial bootstrap schema (applied via Supabase dashboard, synced to repo for migration history)

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('university', 'expert');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create university profiles table
CREATE TABLE public.university_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_name TEXT NOT NULL,
  university_type TEXT, -- Government, Private, Research Institution, etc.
  location TEXT,
  established_year INTEGER,
  website_url TEXT,
  accreditation TEXT,
  student_count INTEGER,
  faculty_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expert profiles table
CREATE TABLE public.expert_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  experience_years INTEGER,
  hourly_rate DECIMAL(10,2),
  education TEXT,
  certifications TEXT[],
  skills TEXT[],
  languages TEXT[],
  availability_status TEXT DEFAULT 'available',
  resume_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job postings table
CREATE TABLE public.job_postings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_type TEXT NOT NULL, -- guest_faculty, workshop, fdp, industry_collaboration, integrated_program
  budget DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  duration_hours INTEGER,
  start_date DATE,
  end_date DATE,
  required_skills TEXT[],
  location TEXT,
  is_remote BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open', -- open, in_progress, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  proposed_rate DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, expert_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for university profiles
CREATE POLICY "Anyone can view university profiles" ON public.university_profiles FOR SELECT USING (true);
CREATE POLICY "Universities can insert their own profile" ON public.university_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid() AND role = 'university')
);
CREATE POLICY "Universities can update their own profile" ON public.university_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid() AND role = 'university')
);

-- RLS Policies for expert profiles
CREATE POLICY "Anyone can view expert profiles" ON public.expert_profiles FOR SELECT USING (true);
CREATE POLICY "Experts can insert their own profile" ON public.expert_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid() AND role = 'expert')
);
CREATE POLICY "Experts can update their own profile" ON public.expert_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid() AND role = 'expert')
);

-- RLS Policies for job postings
CREATE POLICY "Anyone can view open job postings" ON public.job_postings FOR SELECT USING (true);
CREATE POLICY "Universities can insert job postings" ON public.job_postings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = university_id AND user_id = auth.uid() AND role = 'university')
);
CREATE POLICY "Universities can update their own job postings" ON public.job_postings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = university_id AND user_id = auth.uid() AND role = 'university')
);

-- RLS Policies for job applications
CREATE POLICY "Job creators and applicants can view applications" ON public.job_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = expert_id AND user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.job_postings jp
    JOIN public.profiles p ON jp.university_id = p.id
    WHERE jp.id = job_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Experts can insert applications" ON public.job_applications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = expert_id AND user_id = auth.uid() AND role = 'expert')
);
CREATE POLICY "Experts can update their applications" ON public.job_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = expert_id AND user_id = auth.uid() AND role = 'expert')
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_university_profiles_updated_at BEFORE UPDATE ON public.university_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expert_profiles_updated_at BEFORE UPDATE ON public.expert_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

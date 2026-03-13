-- ==========================================
-- CR PORTAL - INITIAL SCHEMA MIGRATION
-- ==========================================

-- --------------------------------------------------------
-- 1. ENUMS
-- --------------------------------------------------------
CREATE TYPE user_role AS ENUM ('cr', 'student');
CREATE TYPE consent_status AS ENUM ('pending', 'verified', 'declined');
CREATE TYPE request_type AS ENUM ('attendance_discrepancy', 'course_material', 'complaint_feedback', 'exam_quiz_conflict');
CREATE TYPE request_status AS ENUM ('pending', 'reviewed', 'forwarded', 'resolved', 'rejected');
CREATE TYPE request_priority AS ENUM ('normal', 'high');
CREATE TYPE notification_type AS ENUM ('submission_confirmed', 'request_forwarded', 'request_resolved', 'request_rejected');
CREATE TYPE forward_channel AS ENUM ('email', 'whatsapp');

-- --------------------------------------------------------
-- 2. FUNCTIONS
-- --------------------------------------------------------
-- Generate an 8-character uppercase alphanumeric string using gen_random_uuid()
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
BEGIN
  RETURN upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 3. TABLES
-- --------------------------------------------------------

-- 1. users
CREATE TABLE users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text NOT NULL,
    roll_number text UNIQUE,
    role user_role NOT NULL,
    phone text,
    created_at timestamptz DEFAULT now()
);

-- 2. classes
CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    batch text,
    department text,
    university text,
    cr_id uuid REFERENCES users(id) ON DELETE SET NULL,
    invite_code text UNIQUE NOT NULL DEFAULT generate_invite_code(),
    created_at timestamptz DEFAULT now()
);

-- 3. class_members
CREATE TABLE class_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    student_id uuid REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    UNIQUE(class_id, student_id)
);

-- 4. teachers
CREATE TABLE teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    consent_status consent_status DEFAULT 'pending',
    consent_token text UNIQUE,
    consented_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 5. courses
CREATE TABLE courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
    course_name text NOT NULL,
    course_code text,
    created_at timestamptz DEFAULT now()
);

-- 6. requests
CREATE TABLE requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    student_id uuid REFERENCES users(id) ON DELETE SET NULL,
    course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
    type request_type NOT NULL,
    status request_status DEFAULT 'pending',
    is_anonymous boolean DEFAULT false,
    priority request_priority DEFAULT 'normal',
    payload jsonb NOT NULL,
    cr_note text,
    forwarded_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 7. request_attachments
CREATE TABLE request_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    uploaded_at timestamptz DEFAULT now()
);

-- 8. forwarding_log
CREATE TABLE forwarding_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
    forwarded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    channel forward_channel,
    recipient_email text,
    email_subject text,
    email_body text,
    forwarded_at timestamptz DEFAULT now()
);

-- 9. notifications
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
    type notification_type,
    channel text DEFAULT 'email',
    sent_at timestamptz DEFAULT now()
);

-- --------------------------------------------------------
-- 4. INDEXES
-- --------------------------------------------------------
CREATE INDEX idx_requests_class_id ON requests(class_id);
CREATE INDEX idx_requests_student_id ON requests(student_id);
CREATE INDEX idx_requests_type ON requests(type);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_priority ON requests(priority);

CREATE INDEX idx_class_members_class_id ON class_members(class_id);
CREATE INDEX idx_class_members_student_id ON class_members(student_id);

CREATE INDEX idx_teachers_class_id ON teachers(class_id);
CREATE INDEX idx_teachers_consent_token ON teachers(consent_token);

CREATE INDEX idx_courses_class_id ON courses(class_id);
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);

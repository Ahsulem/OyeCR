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

-- --------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forwarding_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- users table policies
-- --------------------------------------------------------
-- Users can read and update only their own row
CREATE POLICY "Users can view their own profile."
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- --------------------------------------------------------
-- classes table policies
-- --------------------------------------------------------
-- CRs can insert, select, update their own class
CREATE POLICY "CRs can insert their own class."
    ON classes FOR INSERT
    WITH CHECK (auth.uid() = cr_id);

CREATE POLICY "CRs can view their own class."
    ON classes FOR SELECT
    USING (auth.uid() = cr_id);

CREATE POLICY "CRs can update their own class."
    ON classes FOR UPDATE
    USING (auth.uid() = cr_id);

-- Students can select a class if they are a member
CREATE POLICY "Students can view classes they are members of."
    ON classes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = classes.id
        AND class_members.student_id = auth.uid()
    ));

-- --------------------------------------------------------
-- class_members table policies
-- --------------------------------------------------------
-- Students can insert their own membership
CREATE POLICY "Students can join a class."
    ON class_members FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can select their own membership rows
CREATE POLICY "Students can view their own memberships."
    ON class_members FOR SELECT
    USING (auth.uid() = student_id);

-- CRs can select all members of their class
CREATE POLICY "CRs can view all members in their class."
    ON class_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_members.class_id
        AND classes.cr_id = auth.uid()
    ));

-- --------------------------------------------------------
-- teachers table policies
-- --------------------------------------------------------
-- CRs can insert/update/select teachers for their own class
CREATE POLICY "CRs can insert teachers for their class."
    ON teachers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_id
        AND classes.cr_id = auth.uid()
    ));

CREATE POLICY "CRs can view teachers for their class."
    ON teachers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_id
        AND classes.cr_id = auth.uid()
    ));

CREATE POLICY "CRs can update teachers for their class."
    ON teachers FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_id
        AND classes.cr_id = auth.uid()
    ));

-- Public select allowed only by consent_token for the consent verification endpoint
CREATE POLICY "Public can view teacher by consent token."
    ON teachers FOR SELECT
    USING (consent_token IS NOT NULL);

-- --------------------------------------------------------
-- courses table policies
-- --------------------------------------------------------
-- CRs can insert/update/select courses for their own class
CREATE POLICY "CRs can insert courses for their class."
    ON courses FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_id
        AND classes.cr_id = auth.uid()
    ));

CREATE POLICY "CRs can view courses for their class."
    ON courses FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_id
        AND classes.cr_id = auth.uid()
    ));

CREATE POLICY "CRs can update courses for their class."
    ON courses FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_id
        AND classes.cr_id = auth.uid()
    ));

-- Students can select courses for their class (they are a member)
CREATE POLICY "Students can view courses for their class."
    ON courses FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = courses.class_id
        AND class_members.student_id = auth.uid()
    ));

-- --------------------------------------------------------
-- requests table policies
-- --------------------------------------------------------
-- Students can insert requests for their own class
CREATE POLICY "Students can create requests for their class."
    ON requests FOR INSERT
    WITH CHECK (auth.uid() = student_id AND EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = requests.class_id
        AND class_members.student_id = auth.uid()
    ));

-- Students can select only their own requests
CREATE POLICY "Students can view their own requests."
    ON requests FOR SELECT
    USING (auth.uid() = student_id);

-- CRs can select/update all requests for their class
CREATE POLICY "CRs can view all requests for their class."
    ON requests FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = requests.class_id
        AND classes.cr_id = auth.uid()
    ));

CREATE POLICY "CRs can update all requests for their class."
    ON requests FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = requests.class_id
        AND classes.cr_id = auth.uid()
    ));

-- --------------------------------------------------------
-- request_attachments table policies
-- --------------------------------------------------------
-- Students can insert attachments for their own requests
CREATE POLICY "Students can add attachments to their requests."
    ON request_attachments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM requests
        WHERE requests.id = request_id
        AND requests.student_id = auth.uid()
    ));

-- CRs can select all attachments for their class requests
CREATE POLICY "CRs can view attachments for their class requests."
    ON request_attachments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM requests
        WHERE requests.id = request_attachments.request_id
        AND EXISTS (
             SELECT 1 FROM classes
             WHERE classes.id = requests.class_id
             AND classes.cr_id = auth.uid()
        )
    ));

-- Students can select attachments for their own requests
CREATE POLICY "Students can view attachments for their own requests."
    ON request_attachments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM requests
        WHERE requests.id = request_attachments.request_id
        AND requests.student_id = auth.uid()
    ));

-- --------------------------------------------------------
-- forwarding_log table policies
-- --------------------------------------------------------
-- CRs can insert and select logs for their class
CREATE POLICY "CRs can log forwarded requests."
    ON forwarding_log FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM requests
        JOIN classes ON classes.id = requests.class_id
        WHERE requests.id = request_id
        AND classes.cr_id = auth.uid()
    ));

CREATE POLICY "CRs can view logs for their class requests."
    ON forwarding_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM requests
        JOIN classes ON classes.id = requests.class_id
        WHERE requests.id = forwarding_log.request_id
        AND classes.cr_id = auth.uid()
    ));

-- --------------------------------------------------------
-- notifications table policies
-- --------------------------------------------------------
-- Users can select their own notifications
CREATE POLICY "Users can view their own notifications."
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert (Edge Functions use service role key)
-- Bypasses RLS by default, but explicitly added for completeness
CREATE POLICY "Service role can insert notifications."
    ON notifications FOR INSERT
    WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');


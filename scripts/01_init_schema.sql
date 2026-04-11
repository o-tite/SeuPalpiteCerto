-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nickname VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  photo_url TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'blocked')),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table for single session per user
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- Only one active session per user
);

-- Create championships table
CREATE TABLE IF NOT EXISTS championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'finished', 'cancelled')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  description VARCHAR(255),
  closing_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(championship_id, round_number)
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  championship_id UUID NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(championship_id, name)
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  match_number INTEGER NOT NULL,
  description VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'finished', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, match_number)
);

-- Create results table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  result_type VARCHAR(50) DEFAULT 'draw' CHECK (result_type IN ('home_win', 'away_win', 'draw')),
  entered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE UNIQUE,
  points INTEGER DEFAULT 0,
  exact_match BOOLEAN DEFAULT FALSE,
  winner_match BOOLEAN DEFAULT FALSE,
  draw_match BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_championships table (join table with additional metadata)
CREATE TABLE IF NOT EXISTS user_championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, championship_id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_rounds_championship_id ON rounds(championship_id);
CREATE INDEX IF NOT EXISTS idx_rounds_closing_at ON rounds(closing_at);
CREATE INDEX IF NOT EXISTS idx_teams_championship_id ON teams(championship_id);
CREATE INDEX IF NOT EXISTS idx_matches_round_id ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_results_match_id ON results(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_match ON bets(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_scores_bet_id ON scores(bet_id);
CREATE INDEX IF NOT EXISTS idx_user_championships_user_id ON user_championships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_championships_championship_id ON user_championships(championship_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::uuid = id OR (SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::uuid = id);

-- RLS Policies for bets table
CREATE POLICY "Users can view their own bets" ON bets
  FOR SELECT USING (user_id = auth.uid()::uuid OR (SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

CREATE POLICY "Users can insert their own bets" ON bets
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own bets" ON bets
  FOR UPDATE USING (user_id = auth.uid()::uuid);

-- RLS Policies for audit_logs (admin only)
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS room_players CASCADE;
DROP TABLE IF EXISTS player_scores CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS online_status CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  experience INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_players INTEGER NOT NULL DEFAULT 4,
  num_questions INTEGER NOT NULL DEFAULT 10,
  time_limit INTEGER NOT NULL DEFAULT 30,
  category TEXT NOT NULL DEFAULT 'all',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on room code
CREATE INDEX rooms_code_idx ON rooms(code);

-- Create game_sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  is_multiplayer BOOLEAN NOT NULL DEFAULT FALSE,
  time_limit INTEGER NOT NULL,
  num_questions INTEGER NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_scores table
CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create room_players table
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_creator BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friends table
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', '  ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create online_status table
CREATE TABLE online_status (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'friend_request', 'room_invite', etc.
  content TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_seen timestamp
CREATE TRIGGER update_last_seen_trigger
BEFORE UPDATE ON online_status
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();

-- Create function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, experience, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    0,
    1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create a profile when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Questions policies
CREATE POLICY "Questions are viewable by everyone"
ON questions FOR SELECT
USING (true);

-- Game sessions policies
CREATE POLICY "Game sessions are viewable by everyone"
ON game_sessions FOR SELECT
USING (true);

CREATE POLICY "Users can create game sessions"
ON game_sessions FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own game sessions"
ON game_sessions FOR UPDATE
USING (auth.uid() = creator_id);

-- Player scores policies
CREATE POLICY "Player scores are viewable by everyone"
ON player_scores FOR SELECT
USING (true);

CREATE POLICY "Users can create player scores"
ON player_scores FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own player scores"
ON player_scores FOR UPDATE
USING (auth.uid() = user_id);

-- Rooms policies
CREATE POLICY "Rooms are viewable by everyone"
ON rooms FOR SELECT
USING (true);

CREATE POLICY "Users can create rooms"
ON rooms FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own rooms"
ON rooms FOR UPDATE
USING (auth.uid() = creator_id);

-- Room players policies
CREATE POLICY "Room players are viewable by everyone"
ON room_players FOR SELECT
USING (true);

CREATE POLICY "Users can add themselves to rooms"
ON room_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own room player status"
ON room_players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from rooms"
ON room_players FOR DELETE
USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Chat messages are viewable by everyone"
ON chat_messages FOR SELECT
USING (true);

CREATE POLICY "Users can create chat messages"
ON chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Friends policies
CREATE POLICY "Users can view their own friends"
ON friends FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
ON friends FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friend requests"
ON friends FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friends"
ON friends FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Online status policies
CREATE POLICY "Online status is viewable by everyone"
ON online_status FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own online status"
ON online_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own online status"
ON online_status FOR UPDATE
USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime subscriptions
BEGIN;
  -- Drop the publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create a new publication for all tables
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    rooms, 
    room_players, 
    chat_messages, 
    player_scores, 
    game_sessions,
    friends,
    online_status,
    notifications;
COMMIT;

-- Insert sample questions data
INSERT INTO questions (question, options, correct_answer, category, difficulty)
VALUES
-- Science Questions (Easy)
('What is the chemical symbol for water?', '["H2O", "CO2", "NaCl", "O2"]', 'H2O', 'science', 'easy'),
('Which planet is known as the Red Planet?', '["Venus", "Mars", "Jupiter", "Saturn"]', 'Mars', 'science', 'easy'),
('What is the largest organ in the human body?', '["Heart", "Liver", "Skin", "Brain"]', 'Skin', 'science', 'easy'),
('Which gas do plants absorb from the atmosphere?', '["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"]', 'Carbon Dioxide', 'science', 'easy'),
('What is the hardest natural substance on Earth?', '["Gold", "Iron", "Diamond", "Platinum"]', 'Diamond', 'science', 'easy'),

-- Science Questions (Medium)
('What is the atomic number of Carbon?', '["5", "6", "7", "8"]', '6', 'science', 'medium'),
('Which of these is NOT a type of electromagnetic radiation?', '["X-rays", "Gamma rays", "Sound waves", "Ultraviolet"]', 'Sound waves', 'science', 'medium'),
('What is the process by which plants make their own food called?', '["Respiration", "Photosynthesis", "Fermentation", "Digestion"]', 'Photosynthesis', 'science', 'medium'),
('Which element has the chemical symbol "Au"?', '["Silver", "Gold", "Aluminum", "Argon"]', 'Gold', 'science', 'medium'),
('What is the speed of light in a vacuum?', '["299,792 km/s", "150,000 km/s", "199,792 km/s", "300,000 km/s"]', '299,792 km/s', 'science', 'medium'),

-- Science Questions (Hard)
('Which of these is NOT one of the four fundamental forces of nature?', '["Gravity", "Electromagnetic force", "Centrifugal force", "Strong nuclear force"]', 'Centrifugal force', 'science', 'hard'),
('What is the half-life of Carbon-14?', '["5,730 years", "1,600 years", "10,000 years", "8,400 years"]', '5,730 years', 'science', 'hard'),
('Which scientist proposed the theory of general relativity?', '["Isaac Newton", "Niels Bohr", "Albert Einstein", "Stephen Hawking"]', 'Albert Einstein', 'science', 'hard'),

-- History Questions (Easy)
('Who was the first President of the United States?', '["Thomas Jefferson", "George Washington", "Abraham Lincoln", "John Adams"]', 'George Washington', 'history', 'easy'),
('In which year did World War II end?', '["1943", "1945", "1947", "1950"]', '1945', 'history', 'easy'),
('Which ancient civilization built the pyramids of Giza?', '["Romans", "Greeks", "Egyptians", "Mayans"]', 'Egyptians', 'history', 'easy'),

-- History Questions (Medium)
('Who painted the Mona Lisa?', '["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"]', 'Leonardo da Vinci', 'history', 'medium'),
('Which country was NOT part of the Allied Powers during World War II?', '["United States", "Soviet Union", "Japan", "United Kingdom"]', 'Japan', 'history', 'medium'),
('The French Revolution began in which year?', '["1789", "1776", "1804", "1812"]', '1789', 'history', 'medium'),

-- History Questions (Hard)
('Who was the last Emperor of Russia?', '["Nicholas II", "Alexander III", "Peter the Great", "Ivan the Terrible"]', 'Nicholas II', 'history', 'hard'),
('The Treaty of Versailles was signed in what year, officially ending World War I?', '["1918", "1919", "1920", "1921"]', '1919', 'history', 'hard'),

-- Geography Questions (Easy)
('What is the capital of France?', '["London", "Berlin", "Paris", "Rome"]', 'Paris', 'geography', 'easy'),
('Which is the largest ocean on Earth?', '["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"]', 'Pacific Ocean', 'geography', 'easy'),
('What is the largest desert in the world?', '["Gobi Desert", "Sahara Desert", "Antarctic Desert", "Arabian Desert"]', 'Antarctic Desert', 'geography', 'easy'),

-- Geography Questions (Medium)
('Which of these countries is NOT in Europe?', '["Spain", "Italy", "Brazil", "Germany"]', 'Brazil', 'geography', 'medium'),
('What is the capital of Japan?', '["Beijing", "Seoul", "Tokyo", "Bangkok"]', 'Tokyo', 'geography', 'medium'),
('Which mountain range runs along the border between Spain and France?', '["Alps", "Pyrenees", "Andes", "Carpathians"]', 'Pyrenees', 'geography', 'medium'),

-- Geography Questions (Hard)
('Which of these cities is NOT a national capital?', '["Sydney", "Ottawa", "Wellington", "Vienna"]', 'Sydney', 'geography', 'hard'),
('Lake Baikal, the deepest lake in the world, is located in which country?', '["Mongolia", "China", "Kazakhstan", "Russia"]', 'Russia', 'geography', 'hard'),

-- Entertainment Questions (Easy)
('Who played Iron Man in the Marvel Cinematic Universe?', '["Chris Evans", "Chris Hemsworth", "Robert Downey Jr.", "Mark Ruffalo"]', 'Robert Downey Jr.', 'entertainment', 'easy'),
('Which band performed the song "Bohemian Rhapsody"?', '["The Beatles", "Led Zeppelin", "Queen", "The Rolling Stones"]', 'Queen', 'entertainment', 'easy'),
('What is the name of the main character in the "Harry Potter" series?', '["Ron Weasley", "Hermione Granger", "Harry Potter", "Draco Malfoy"]', 'Harry Potter', 'entertainment', 'easy'),

-- Entertainment Questions (Medium)
('Who directed the movie "Jurassic Park"?', '["James Cameron", "Steven Spielberg", "George Lucas", "Christopher Nolan"]', 'Steven Spielberg', 'entertainment', 'medium'),
('Which of these is NOT one of the Friends characters?', '["Ross", "Monica", "Rachel", "Susan"]', 'Susan', 'entertainment', 'medium'),
('Who wrote the novel "Pride and Prejudice"?', '["Jane Austen", "Charlotte Brontë", "Emily Brontë", "Virginia Woolf"]', 'Jane Austen', 'entertainment', 'medium'),

-- Entertainment Questions (Hard)
('Which film won the Academy Award for Best Picture in 2020?', '["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"]', 'Parasite', 'entertainment', 'hard'),
('Who composed the opera "The Marriage of Figaro"?', '["Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Giuseppe Verdi"]', 'Wolfgang Amadeus Mozart', 'entertainment', 'hard'),

-- Sports Questions (Easy)
('In which sport would you perform a slam dunk?', '["Soccer", "Basketball", "Tennis", "Golf"]', 'Basketball', 'sports', 'easy'),
('How many players are there in a standard soccer team on the field?', '["9", "10", "11", "12"]', '11', 'sports', 'easy'),
('Which country won the FIFA World Cup in 2018?', '["Brazil", "Germany", "France", "Argentina"]', 'France', 'sports', 'easy'),

-- Sports Questions (Medium)
('In which city were the 2016 Summer Olympics held?', '["London", "Beijing", "Rio de Janeiro", "Tokyo"]', 'Rio de Janeiro', 'sports', 'medium'),
('Which tennis player has won the most Grand Slam titles in men\'s singles?', '["Roger Federer", "Rafael Nadal", "Novak Djokovic", "Andy Murray"]', 'Novak Djokovic', 'sports', 'medium'),
('How many points is a touchdown worth in American football?', '["3", "6", "7", "9"]', '6', 'sports', 'medium'),

-- Sports Questions (Hard)
('Which country hosted the first modern Olympic Games in 1896?', '["France", "United States", "Greece", "United Kingdom"]', 'Greece', 'sports', 'hard'),
('In cricket, what is the term for a bowler taking three wickets with consecutive deliveries?', '["Hat-trick", "Triple play", "Turkey", "Trifecta"]', 'Hat-trick', 'sports', 'hard');


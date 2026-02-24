-- ============================================
-- 树洞 - 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 用户资料（关联 Supabase Auth）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  age INTEGER CHECK (age >= 1 AND age <= 150),
  province TEXT,
  city TEXT,
  district TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMPTZ,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 私聊对话（含陌生人/好友状态）
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'stranger' CHECK (status IN ('stranger', 'friend')),
  initiator_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_order CHECK (user_a_id < user_b_id),
  UNIQUE(user_a_id, user_b_id)
);

-- 私聊消息
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'voice', 'file', 'video')),
  text_content TEXT,
  media_url TEXT,
  media_size INTEGER,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- 群聊
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'voice', 'file', 'video')),
  text_content TEXT,
  media_url TEXT,
  media_size INTEGER,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_messages ON group_messages(group_id, created_at DESC);

-- 漂流瓶
CREATE TABLE bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  max_picks INTEGER DEFAULT 10,
  pick_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'floating' CHECK (status IN ('floating', 'returned')),
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bottle_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pick_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bottle_daily_limits (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  throws INTEGER DEFAULT 0,
  catches INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- 树洞
CREATE TABLE treehole_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE treehole_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES treehole_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 拉黑
CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- 举报
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'bottle', 'treehole_post', 'treehole_comment')),
  reference_id UUID NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'warned', 'banned', 'dismissed')),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'bottle_reply', 'bottle_returned', 'treehole_comment', 'report_result', 'system')),
  title TEXT NOT NULL,
  content TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- VIP订单
CREATE TABLE vip_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('1day', '7day', '30day', '90day', '1year')),
  amount DECIMAL(10,2),
  payment_method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================
-- AI 角色区
-- ============================================

CREATE TABLE ai_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  personality TEXT,
  first_message TEXT,
  alternate_greetings TEXT[] DEFAULT '{}',
  creator_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  system_prompt TEXT,
  post_history_instructions TEXT,
  linked_world_book_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES ai_characters(id) ON DELETE CASCADE,
  persona_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  alternatives TEXT[] DEFAULT '{}',
  active_index INTEGER DEFAULT 0,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE world_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scan_depth INTEGER DEFAULT 10,
  context_percent INTEGER DEFAULT 100,
  token_budget INTEGER DEFAULT 2048,
  min_activations INTEGER DEFAULT 0,
  max_recursion INTEGER DEFAULT 0,
  insertion_strategy TEXT DEFAULT 'even',
  include_names BOOLEAN DEFAULT TRUE,
  recursive_scan BOOLEAN DEFAULT FALSE,
  case_sensitive BOOLEAN DEFAULT FALSE,
  match_whole_word BOOLEAN DEFAULT FALSE,
  use_group_scoring BOOLEAN DEFAULT FALSE,
  overflow_alert BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE world_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_book_id UUID NOT NULL REFERENCES world_books(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  title TEXT,
  status TEXT DEFAULT 'normal' CHECK (status IN ('constant', 'normal', 'vectorized')),
  position TEXT DEFAULT 'before_char',
  depth INTEGER DEFAULT 4,
  order_num INTEGER DEFAULT 100,
  trigger_percent INTEGER DEFAULT 100,
  primary_keywords TEXT[] DEFAULT '{}',
  keyword_logic TEXT DEFAULT 'AND_ANY',
  secondary_keywords TEXT[] DEFAULT '{}',
  content TEXT NOT NULL DEFAULT '',
  token_count INTEGER DEFAULT 0,
  recursion_option TEXT DEFAULT 'none',
  inclusion_group TEXT,
  group_prioritized BOOLEAN DEFAULT FALSE,
  group_weight INTEGER DEFAULT 100,
  sticky INTEGER DEFAULT 0,
  cooldown INTEGER DEFAULT 0,
  delay INTEGER DEFAULT 0,
  bound_characters UUID[] DEFAULT '{}',
  bound_tags TEXT[] DEFAULT '{}',
  exclude_mode BOOLEAN DEFAULT FALSE,
  override_scan_depth INTEGER,
  override_case_sensitive BOOLEAN,
  override_match_whole BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regex_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'character')),
  character_id UUID REFERENCES ai_characters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  find_regex TEXT NOT NULL,
  replace_with TEXT DEFAULT '',
  trim_text TEXT DEFAULT '',
  target_user_input BOOLEAN DEFAULT FALSE,
  target_ai_output BOOLEAN DEFAULT TRUE,
  target_slash_commands BOOLEAN DEFAULT FALSE,
  target_world_info BOOLEAN DEFAULT FALSE,
  target_reasoning BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  run_on_edit BOOLEAN DEFAULT FALSE,
  min_depth INTEGER,
  max_depth INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  temperature DECIMAL(4,2) DEFAULT 1.0,
  frequency_penalty DECIMAL(4,2) DEFAULT 0.0,
  presence_penalty DECIMAL(4,2) DEFAULT 0.0,
  top_k INTEGER DEFAULT 0,
  top_p DECIMAL(4,2) DEFAULT 1.0,
  min_p DECIMAL(4,2) DEFAULT 0.0,
  repetition_penalty DECIMAL(4,2) DEFAULT 1.0,
  seed INTEGER,
  max_tokens INTEGER DEFAULT 2048,
  context_length INTEGER DEFAULT 4096,
  stream BOOLEAN DEFAULT TRUE,
  system_prompt TEXT,
  prompt_order JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'claude', 'deepseek', 'gemini', 'grok', 'doubao', 'custom')),
  api_key TEXT,
  base_url TEXT,
  model TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  auto_connect BOOLEAN DEFAULT FALSE,
  additional_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  insertion_position TEXT DEFAULT 'in_story',
  chat_depth INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  bound_characters UUID[] DEFAULT '{}',
  bound_chats UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}',
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  git_url TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  version TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security（行级安全策略）
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE treehole_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treehole_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regex_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;

-- profiles: 自己可读写，其他人可读
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- conversations: 参与者可读写
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- messages: 对话参与者可读，发送者可写
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id)
  ));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- groups: 成员可读，群主可改
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()));
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "groups_update" ON groups FOR UPDATE USING (auth.uid() = owner_id);

-- group_members: 成员可读
CREATE POLICY "gm_select" ON group_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()));
CREATE POLICY "gm_insert" ON group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "gm_delete" ON group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()) OR auth.uid() = user_id);

-- group_messages: 群成员可读写
CREATE POLICY "gmsg_select" ON group_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));
CREATE POLICY "gmsg_insert" ON group_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

-- bottles: 所有已登录用户可读漂流中的瓶子
CREATE POLICY "bottles_select" ON bottles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bottles_insert" ON bottles FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "bottles_update" ON bottles FOR UPDATE USING (auth.uid() IS NOT NULL);

-- bottle_replies
CREATE POLICY "br_select" ON bottle_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "br_insert" ON bottle_replies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- bottle_daily_limits
CREATE POLICY "bdl_all" ON bottle_daily_limits FOR ALL USING (auth.uid() = user_id);

-- treehole: 已登录可读，自己可写
CREATE POLICY "tp_select" ON treehole_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tp_insert" ON treehole_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_delete" ON treehole_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "tc_select" ON treehole_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tc_insert" ON treehole_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- blocks
CREATE POLICY "blocks_all" ON blocks FOR ALL USING (auth.uid() = blocker_id);
CREATE POLICY "blocks_check" ON blocks FOR SELECT USING (auth.uid() = blocked_id);

-- reports
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "reports_admin" ON reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- notifications: 自己的通知
CREATE POLICY "notif_all" ON notifications FOR ALL USING (auth.uid() = user_id);

-- vip_orders: 自己的订单
CREATE POLICY "vip_all" ON vip_orders FOR ALL USING (auth.uid() = user_id);

-- AI区所有表：自己的数据
CREATE POLICY "ai_char_all" ON ai_characters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ai_conv_all" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ai_msg_all" ON ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM ai_conversations ac WHERE ac.id = ai_messages.conversation_id AND ac.user_id = auth.uid()));
CREATE POLICY "wb_all" ON world_books FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wbe_all" ON world_book_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM world_books wb WHERE wb.id = world_book_entries.world_book_id AND wb.user_id = auth.uid()));
CREATE POLICY "regex_all" ON regex_scripts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "presets_all" ON presets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "api_all" ON api_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "personas_all" ON personas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "themes_all" ON themes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ext_all" ON extensions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 开启实时消息推送
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

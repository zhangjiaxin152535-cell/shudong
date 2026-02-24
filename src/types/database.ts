export interface Profile {
  id: string
  nickname: string | null
  avatar_url: string | null
  gender: 'male' | 'female' | 'other' | null
  age: number | null
  province: string | null
  city: string | null
  district: string | null
  is_vip: boolean
  vip_expires_at: string | null
  role: 'user' | 'admin'
  is_online: boolean
  last_seen: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_a_id: string
  user_b_id: string
  status: 'stranger' | 'friend'
  initiator_id: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content_type: 'text' | 'image' | 'voice' | 'file' | 'video'
  text_content: string | null
  media_url: string | null
  media_size: number | null
  file_name: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  joined_at: string
}

export interface GroupMessage {
  id: string
  group_id: string
  sender_id: string
  content_type: 'text' | 'image' | 'voice' | 'file' | 'video'
  text_content: string | null
  media_url: string | null
  media_size: number | null
  file_name: string | null
  created_at: string
}

export interface Bottle {
  id: string
  creator_id: string
  content: string
  max_picks: number
  pick_count: number
  status: 'floating' | 'returned'
  returned_at: string | null
  created_at: string
}

export interface BottleReply {
  id: string
  bottle_id: string
  user_id: string
  content: string
  pick_number: number
  created_at: string
}

export interface TreeholePost {
  id: string
  user_id: string
  text_content: string
  image_urls: string[]
  created_at: string
}

export interface TreeholeComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string
  type: 'message' | 'bottle' | 'treehole_post' | 'treehole_comment'
  reference_id: string
  reason: string | null
  status: 'pending' | 'warned' | 'banned' | 'dismissed'
  admin_note: string | null
  processed_at: string | null
  processed_by: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'message' | 'bottle_reply' | 'bottle_returned' | 'treehole_comment' | 'report_result' | 'system'
  title: string
  content: string | null
  reference_type: string | null
  reference_id: string | null
  is_read: boolean
  created_at: string
}

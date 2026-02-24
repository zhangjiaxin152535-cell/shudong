import { supabase } from './supabase'

export async function getOrCreateConversation(myId: string, otherId: string): Promise<string | null> {
  const [userA, userB] = myId < otherId ? [myId, otherId] : [otherId, myId]

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a_id', userA)
    .eq('user_b_id', userB)
    .single()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_a_id: userA, user_b_id: userB, status: 'stranger', initiator_id: myId })
    .select('id')
    .single()

  if (error) { console.error('创建对话失败:', error); return null }
  return created?.id ?? null
}

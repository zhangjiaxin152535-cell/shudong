-- ============================================
-- 测试种子数据（开发用，上线前清掉）
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 创建测试用户（5个）
-- 密码统一为 shudong123

DO $$
DECLARE
  uid1 uuid := 'a1111111-1111-1111-1111-111111111111';
  uid2 uuid := 'b2222222-2222-2222-2222-222222222222';
  uid3 uuid := 'c3333333-3333-3333-3333-333333333333';
  uid4 uuid := 'd4444444-4444-4444-4444-444444444444';
  uid5 uuid := 'e5555555-5555-5555-5555-555555555555';
  conv1 uuid := 'f1111111-aaaa-bbbb-cccc-111111111111';
  conv2 uuid := 'f2222222-aaaa-bbbb-cccc-222222222222';
  conv3 uuid := 'f3333333-aaaa-bbbb-cccc-333333333333';
  bottle1 uuid := 'b0b0b0b0-1111-1111-1111-111111111111';
  bottle2 uuid := 'b0b0b0b0-2222-2222-2222-222222222222';
  post1 uuid := 'dddddddd-1111-1111-1111-111111111111';
  post2 uuid := 'dddddddd-2222-2222-2222-222222222222';
  post3 uuid := 'dddddddd-3333-3333-3333-333333333333';
  group1 uuid := 'aa999999-1111-1111-1111-111111111111';
BEGIN

  -- ===== 注册5个用户到 auth.users =====
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES
    (uid1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@shudong.test', crypt('shudong123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', ''),
    (uid2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'xiaoming@test.com', crypt('shudong123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', ''),
    (uid3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'xiaohong@test.com', crypt('shudong123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', ''),
    (uid4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zhangsan@test.com', crypt('shudong123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', ''),
    (uid5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lisi@test.com',     crypt('shudong123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '');

  -- auth.identities（登录必需）
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (uid1, uid1, 'admin@shudong.test', jsonb_build_object('sub', uid1::text, 'email', 'admin@shudong.test'), 'email', NOW(), NOW(), NOW()),
    (uid2, uid2, 'xiaoming@test.com',  jsonb_build_object('sub', uid2::text, 'email', 'xiaoming@test.com'),  'email', NOW(), NOW(), NOW()),
    (uid3, uid3, 'xiaohong@test.com',  jsonb_build_object('sub', uid3::text, 'email', 'xiaohong@test.com'),  'email', NOW(), NOW(), NOW()),
    (uid4, uid4, 'zhangsan@test.com',  jsonb_build_object('sub', uid4::text, 'email', 'zhangsan@test.com'),  'email', NOW(), NOW(), NOW()),
    (uid5, uid5, 'lisi@test.com',      jsonb_build_object('sub', uid5::text, 'email', 'lisi@test.com'),      'email', NOW(), NOW(), NOW());

  -- ===== 用户资料 =====
  -- (trigger 已经自动创建了空 profile，这里更新)
  UPDATE profiles SET nickname='树洞管理员', gender='male',   age=28, province='北京', city='北京', district='朝阳', is_vip=true, vip_expires_at='2099-12-31', role='admin', is_online=true WHERE id=uid1;
  UPDATE profiles SET nickname='小明',       gender='male',   age=22, province='广东', city='广州', district='天河', is_vip=false, is_online=true  WHERE id=uid2;
  UPDATE profiles SET nickname='小红',       gender='female', age=20, province='上海', city='上海', district='浦东', is_vip=true, vip_expires_at='2026-06-01', is_online=true WHERE id=uid3;
  UPDATE profiles SET nickname='张三',       gender='male',   age=25, province='浙江', city='杭州', district='西湖', is_vip=false, is_online=false WHERE id=uid4;
  UPDATE profiles SET nickname='李四',       gender='female', age=23, province='四川', city='成都', district='武侯', is_vip=false, is_online=false WHERE id=uid5;

  -- ===== 好友对话 =====
  -- 规则：user_a_id < user_b_id
  INSERT INTO conversations (id, user_a_id, user_b_id, status, initiator_id, created_at)
  VALUES
    (conv1, uid1, uid2, 'friend', uid1, NOW() - interval '3 days'),
    (conv2, uid1, uid3, 'friend', uid3, NOW() - interval '1 day'),
    (conv3, uid1, uid4, 'stranger', uid4, NOW() - interval '2 hours');

  -- ===== 聊天消息 =====
  -- 管理员 和 小明 的对话
  INSERT INTO messages (conversation_id, sender_id, content_type, text_content, created_at) VALUES
    (conv1, uid2, 'text', '你好！你也喜欢看书吗？', NOW() - interval '3 days'),
    (conv1, uid1, 'text', '是啊，最近在看《三体》', NOW() - interval '3 days' + interval '5 minutes'),
    (conv1, uid2, 'text', '太巧了！我也刚看完第一部', NOW() - interval '3 days' + interval '10 minutes'),
    (conv1, uid1, 'text', '第二部更好看，推荐你继续', NOW() - interval '2 days'),
    (conv1, uid2, 'text', '好的谢谢推荐～', NOW() - interval '2 days' + interval '3 minutes');

  -- 管理员 和 小红 的对话
  INSERT INTO messages (conversation_id, sender_id, content_type, text_content, created_at) VALUES
    (conv2, uid3, 'text', '嗨～我看到你的树洞了', NOW() - interval '1 day'),
    (conv2, uid1, 'text', '哈哈是哪一条？', NOW() - interval '1 day' + interval '8 minutes'),
    (conv2, uid3, 'text', '就是那条关于旅行的，我也特别想去大理', NOW() - interval '23 hours'),
    (conv2, uid1, 'text', '大理真的很美，什么时候去？', NOW() - interval '22 hours'),
    (conv2, uid3, 'text', '下个月请了年假！', NOW() - interval '22 hours' + interval '2 minutes'),
    (conv2, uid1, 'text', '那可以帮你推荐几个地方', NOW() - interval '20 hours');

  -- 张三 给管理员发了2条消息（陌生人状态，还没成为好友）
  INSERT INTO messages (conversation_id, sender_id, content_type, text_content, created_at) VALUES
    (conv3, uid4, 'text', '你好，看到你的资料觉得很有缘', NOW() - interval '2 hours'),
    (conv3, uid4, 'text', '可以认识一下吗？', NOW() - interval '1 hour' + interval '50 minutes');

  -- ===== 群聊 =====
  INSERT INTO groups (id, name, owner_id) VALUES (group1, '读书交流群', uid1);
  INSERT INTO group_members (group_id, user_id) VALUES
    (group1, uid1), (group1, uid2), (group1, uid3);
  INSERT INTO group_messages (group_id, sender_id, content_type, text_content, created_at) VALUES
    (group1, uid1, 'text', '欢迎大家加入读书群！', NOW() - interval '1 day'),
    (group1, uid2, 'text', '谢谢邀请～', NOW() - interval '23 hours'),
    (group1, uid3, 'text', '最近有什么好书推荐？', NOW() - interval '22 hours');

  -- ===== 漂流瓶 =====
  INSERT INTO bottles (id, creator_id, content, pick_count, status, created_at) VALUES
    (bottle1, uid3, '如果你看到这个瓶子，说明缘分让我们相遇了。今天下雨了，我一个人在咖啡店里发呆，你在做什么呢？', 2, 'floating', NOW() - interval '6 hours'),
    (bottle2, uid5, '有没有人和我一样，深夜睡不着的时候特别想找个人聊天？不聊什么正经的，就随便说说话就好。', 0, 'floating', NOW() - interval '3 hours');

  INSERT INTO bottle_replies (bottle_id, user_id, content, pick_number, created_at) VALUES
    (bottle1, uid4, '缘分真奇妙，我也在咖啡店呢哈哈，不过是在杭州的一家', 1, NOW() - interval '4 hours'),
    (bottle1, uid2, '广州暴雨，我也在躲雨，这瓶子好应景', 2, NOW() - interval '2 hours');

  -- ===== 树洞帖子 =====
  INSERT INTO treehole_posts (id, user_id, text_content, image_urls, created_at) VALUES
    (post1, uid3, '终于攒够钱买了梦想中的相机📷 虽然是入门款，但拍出来的照片已经让我很满足了。分享第一张作品，窗外的夕阳。', '{}', NOW() - interval '2 days'),
    (post2, uid5, '今天被老板夸了，虽然只是一句"做得不错"，但开心了一整天。小小的认可原来这么有力量。', '{}', NOW() - interval '1 day'),
    (post3, uid2, '推荐一部纪录片《人生果实》，讲一对老夫妇的慢生活。看完之后觉得好治愈，特别适合焦虑的时候看。', '{}', NOW() - interval '5 hours');

  INSERT INTO treehole_comments (post_id, user_id, content, created_at) VALUES
    (post1, uid2, '好棒！求看更多作品', NOW() - interval '1 day' + interval '30 minutes'),
    (post1, uid4, '入门款就够了，关键是拍照的心情', NOW() - interval '1 day' + interval '2 hours'),
    (post1, uid1, '夕阳永远拍不腻', NOW() - interval '1 day' + interval '5 hours'),
    (post2, uid3, '小确幸！继续加油～', NOW() - interval '20 hours'),
    (post2, uid1, '被认可的感觉真的很好', NOW() - interval '18 hours'),
    (post3, uid3, '马上去看！', NOW() - interval '4 hours'),
    (post3, uid1, '这部真的很好，看了三遍了', NOW() - interval '3 hours');

  -- ===== 通知 =====
  INSERT INTO notifications (user_id, type, title, content, reference_type, reference_id, is_read, created_at) VALUES
    (uid1, 'message',          '小明 给你发了消息',       '好的谢谢推荐～',                   'conversation', conv1, false, NOW() - interval '2 days'),
    (uid1, 'treehole_comment', '有人评论了你的树洞',       '这部真的很好，看了三遍了',          'treehole_post', post3, false, NOW() - interval '3 hours'),
    (uid1, 'bottle_reply',     '你的漂流瓶被回复了',       null,                              'bottle', null, true, NOW() - interval '1 day'),
    (uid1, 'message',          '张三 想和你打招呼',        '可以认识一下吗？',                  'conversation', conv3, false, NOW() - interval '2 hours');

END $$;

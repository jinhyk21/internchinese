-- =====================================================================
-- DỮ LIỆU HOẠT ĐỘNG 6 THÁNG (demo) — chạy trong Supabase SQL Editor, SAU seed_more.sql và seed_content_2.sql
-- Tạo 60 học viên demo (email demo01..demo60@internchinese.demo), phiên luyện tập, tin nhắn,
-- điểm đánh giá, tiến độ từ vựng, bookmark, trải đều 180 ngày gần nhất, điểm tăng dần theo thời gian.
-- Chạy lại sẽ bỏ qua nếu đã seed. Xóa sạch: chạy seed_activity_cleanup.sql
-- Tài khoản demo KHÔNG đăng nhập được (chỉ là dữ liệu hiển thị).
-- =====================================================================
DO $$
DECLARE
  sur text[] := ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi','Đỗ','Ngô','Dương','Lý','Trịnh','Phan','Võ','Đinh','Mai','Tạ','Hồ','Lương'];
  mid text[] := ARRAY['Minh','Thu','Quốc','Ngọc','Đức','Thanh','Gia','Tuấn','Phương','Hải','Khánh','Bảo','Thế','Hồng','Công','Quang','Diệu','Mỹ','Việt','Anh'];
  giv text[] := ARRAY['Anh','Hà','Bảo','Linh','Huy','Mai','Hân','Kiệt','Thảo','Đăng','Vy','Châu','Ngọc','Minh','Lan','Nhung','Vinh','Dương','Duyên','Tùng','My','Hoàng','Trân','Khoa'];
  v_name text;
  unis   text[] := ARRAY['ĐH Hà Nội','ĐH Ngoại ngữ - ĐHQG Hà Nội','ĐH Ngoại thương','ĐH Sư phạm TP.HCM','ĐH Khoa học Xã hội và Nhân văn TP.HCM','ĐH Đà Nẵng - Ngoại ngữ','ĐH Thăng Long','ĐH Kinh tế Quốc dân'];
  fields text[] := ARRAY['Văn phòng - Hành chính','Kinh doanh - Bán hàng','Xuất nhập khẩu','Du lịch - Dịch vụ','Nhân sự','Sản xuất - Nhà máy'];
  levels text[] := ARRAY['HSK 2','HSK 3','HSK 3','HSK 4','HSK 4','HSK 5'];

  u_zh text[] := ARRAY['你好，我是实习生，请多关照。','好的，我明白了。','请问具体需要怎么做？','对不起，我没听清楚，可以再说一遍吗？',
    '我今天下午可以完成。','谢谢您的帮助。','我觉得这个办法比较好。','我遇到了一点问题，需要您的建议。','我已经把文件发给您了。',
    '请问截止日期是什么时候？','我会尽快处理这件事。','没问题，我马上去做。'];
  u_vi text[] := ARRAY['Xin chào, tôi là thực tập sinh, mong được chiếu cố.','Vâng, tôi hiểu rồi.','Xin hỏi cụ thể cần làm thế nào?',
    'Xin lỗi, tôi nghe chưa rõ, nói lại giúp tôi được không?','Chiều nay tôi có thể hoàn thành.','Cảm ơn sự giúp đỡ của anh/chị.',
    'Tôi thấy cách này tốt hơn.','Tôi gặp một chút vấn đề, cần lời khuyên của anh/chị.','Tôi đã gửi tài liệu cho anh/chị rồi.',
    'Xin hỏi hạn chót là khi nào?','Tôi sẽ xử lý việc này sớm nhất.','Không vấn đề, tôi làm ngay.'];
  a_zh text[] := ARRAY['好的，那你先去准备一下。','很好，你说得很清楚。','这个问题我们再讨论一下。','请你再详细说明一下。',
    '没关系，慢慢来。','那你什么时候可以完成？','不错，继续保持。','明白了，谢谢你的说明。'];
  a_py text[] := ARRAY['Hǎo de, nà nǐ xiān qù zhǔnbèi yíxià.','Hěn hǎo, nǐ shuō de hěn qīngchu.','Zhège wèntí wǒmen zài tǎolùn yíxià.',
    'Qǐng nǐ zài xiángxì shuōmíng yíxià.','Méi guānxi, mànmàn lái.','Nà nǐ shénme shíhou kěyǐ wánchéng?','Búcuò, jìxù bǎochí.','Míngbai le, xièxie nǐ de shuōmíng.'];
  a_vi text[] := ARRAY['Được, vậy bạn đi chuẩn bị trước đi.','Tốt lắm, bạn nói rất rõ ràng.','Vấn đề này chúng ta bàn thêm.',
    'Bạn hãy giải thích chi tiết hơn.','Không sao, cứ từ từ.','Vậy khi nào bạn hoàn thành được?','Khá lắm, tiếp tục phát huy.','Tôi hiểu rồi, cảm ơn bạn đã giải thích.'];

  strengths text[] := ARRAY['Biết dùng từ lịch sự (请/您/谢谢) đúng môi trường công sở.','Phát âm rõ ràng, dễ nghe.','Phản xạ nhanh, trả lời đúng trọng tâm.',
    'Vận dụng tốt từ vựng chuyên ngành.','Câu nói đủ dài, diễn đạt đầy đủ ý.','Giữ được hội thoại tự nhiên, không bị ngắt quãng.'];
  weaknesses text[] := ARRAY['Còn nhầm thanh điệu ở một số từ.','Câu còn ngắn, thiếu chi tiết.','Dùng sai lượng từ trong vài câu.','Chưa linh hoạt khi gặp câu hỏi bất ngờ.',
    'Thiếu từ nối giữa các ý (因为…所以…).','Vốn từ chuyên ngành còn hạn chế.'];
  recs text[] := ARRAY['Ôn lại từ vựng ngành trong mục Từ vựng trước khi luyện lại.','Luyện nói câu dài hơn bằng cách thêm lý do hoặc ví dụ.',
    'Nghe và nhại lại phát âm của AI từng câu một.','Học thêm các mẫu câu lịch sự khi nói với cấp trên.','Thử luyện ở chế độ giọng nói để cải thiện phản xạ.',
    'Làm lại tình huống này sau vài ngày để so sánh tiến bộ.'];
  corr jsonb[] := ARRAY[
    '{"original":"我很高兴认识你们大家","corrected":"很高兴认识大家","explanation":"Cách nói gọn và tự nhiên hơn trong giao tiếp công sở."}'::jsonb,
    '{"original":"我做完工作了","corrected":"我已经完成工作了","explanation":"Dùng 已经…了 để nhấn mạnh việc đã hoàn thành."}'::jsonb,
    '{"original":"一个文件","corrected":"一份文件","explanation":"Lượng từ của 文件 là 份, không dùng 个."}'::jsonb,
    '{"original":"你可以帮我吗","corrected":"您能帮我一下吗","explanation":"Với cấp trên nên dùng 您 và 能…一下 cho lịch sự."}'::jsonb,
    '{"original":"我不知道怎么做这个","corrected":"我不太清楚该怎么做","explanation":"不太清楚 nghe mềm mỏng và chuyên nghiệp hơn 不知道."}'::jsonb];

  uid uuid; sid uuid; joined timestamptz; started timestamptz; dur int; mode text; st text;
  i int; k int; r int; n_sess int; n_round int; a int; b int; n_users int := 60;
  sc record; prog numeric; base numeric; pr numeric; gr numeric; vo numeric; fl numeric; cm numeric; ov numeric;
  ts timestamptz; first_zh text; first_vi text; v_email text; fld text;
  cl numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email LIKE 'demo%@internchinese.demo') THEN
    RAISE NOTICE 'Dữ liệu demo đã tồn tại, bỏ qua.'; RETURN;
  END IF;

  FOR i IN 1..n_users LOOP
    uid := gen_random_uuid();
    v_name := sur[1 + (i*7) % 20] || ' ' || mid[1 + (i*11 + i/20) % 20] || ' ' || giv[1 + (i*5 + i/3) % 24];
    v_email := 'demo' || lpad(i::text, 2, '0') || '@internchinese.demo';
    -- 24 người vào rải đều 175→20 ngày trước, 4 người mới trong 2 tuần gần đây
    joined := CASE WHEN i <= 52 THEN now() - ((176 - (i-1) * 3.0) || ' days')::interval - (random()*8 || ' hours')::interval
                   ELSE now() - ((random()*13 + 1) || ' days')::interval END;
    IF i <= 52 AND (176 - (i-1) * 3.0) < 20 THEN joined := now() - interval '20 days'; END IF;
    fld := fields[1 + floor(random()*6)::int];

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', v_email,
      '$2a$10$' || md5(random()::text) || md5(random()::text), joined, '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name), joined, joined, '', '', '', '');

    UPDATE public.profiles SET full_name = v_name, university = unis[1 + floor(random()*8)::int],
      student_code = (ARRAY['21','22','23'])[1 + floor(random()*3)::int] || lpad((floor(random()*99999))::int::text, 5, '0'),
      chinese_level = levels[1 + floor(random()*6)::int], internship_field = fld,
      created_at = joined, updated_at = joined
    WHERE id = uid;

    -- ===== PHIÊN LUYỆN TẬP =====
    n_sess := 2 + floor(random() * (3 + extract(epoch FROM (now() - joined)) / 86400 / 9))::int;
    FOR k IN 1..n_sess LOOP
      SELECT * INTO sc FROM public.scenarios WHERE is_published ORDER BY random() LIMIT 1;
      started := date_trunc('day', joined + random() * (now() - joined - interval '2 hours'))
                 + interval '7 hours' + random() * interval '15 hours';
      IF started > now() - interval '1 hour' THEN started := now() - interval '1 hour' - random() * interval '5 hours'; END IF;
      IF started < joined THEN started := joined + interval '30 minutes'; END IF;
      dur := 240 + floor(random() * 1100)::int;
      mode := CASE WHEN random() < 0.28 THEN 'voice' ELSE 'text' END;
      r := floor(random()*100)::int;
      st := CASE WHEN r < 80 THEN 'completed' WHEN r < 91 THEN 'abandoned'
                 WHEN started > now() - interval '3 days' THEN 'in_progress' ELSE 'completed' END;
      IF st = 'abandoned' THEN dur := 60 + floor(random()*200)::int; END IF;

      sid := gen_random_uuid();
      INSERT INTO public.conversation_sessions (id, user_id, scenario_id, title, status, communication_mode,
        started_at, completed_at, duration_seconds, created_at)
      VALUES (sid, uid, sc.id, sc.title_zh, st, mode, started,
        CASE WHEN st = 'in_progress' THEN NULL ELSE started + (dur || ' seconds')::interval END,
        CASE WHEN st = 'in_progress' THEN floor(random()*200)::int ELSE dur END, started);

      -- tin nhắn: AI mở đầu, rồi các lượt user/AI xen kẽ
      ts := started;
      IF sc.initial_message IS NOT NULL THEN
        INSERT INTO public.conversation_messages (session_id, sender, content, created_at)
        VALUES (sid, 'assistant', sc.initial_message, ts);
      END IF;
      n_round := CASE WHEN st = 'abandoned' THEN 1 + floor(random()*2)::int ELSE 3 + floor(random()*4)::int END;
      first_zh := sc.suggested_phrases -> 0 ->> 'zh';
      first_vi := sc.suggested_phrases -> 0 ->> 'vi';
      FOR r IN 1..n_round LOOP
        ts := ts + ((20 + floor(random()*40)) || ' seconds')::interval;
        a := 1 + floor(random()*12)::int;
        IF r = 1 AND first_zh IS NOT NULL THEN
          INSERT INTO public.conversation_messages (session_id, sender, content, translated_content, created_at)
          VALUES (sid, 'user', first_zh, first_vi, ts);
        ELSE
          INSERT INTO public.conversation_messages (session_id, sender, content, translated_content, created_at)
          VALUES (sid, 'user', u_zh[a], u_vi[a], ts);
        END IF;
        IF NOT (st = 'in_progress' AND r = n_round) THEN
          ts := ts + ((3 + floor(random()*5)) || ' seconds')::interval;
          b := 1 + floor(random()*8)::int;
          INSERT INTO public.conversation_messages (session_id, sender, content, pinyin, translated_content, created_at)
          VALUES (sid, 'assistant', a_zh[b], a_py[b], a_vi[b], ts);
        END IF;
      END LOOP;

      -- đánh giá cho phiên hoàn thành: điểm tăng dần theo thời gian tham gia
      IF st = 'completed' THEN
        prog := least(1, extract(epoch FROM (started - joined)) / 86400 / 150);
        base := 52 + 28 * prog + (random()*14 - 7)
                + CASE sc.difficulty WHEN 'beginner' THEN 4 WHEN 'advanced' THEN -5 ELSE 0 END;
        pr := least(98, greatest(35, base + random()*10 - 5));
        gr := least(98, greatest(35, base + random()*10 - 5));
        vo := least(98, greatest(35, base + random()*10 - 5));
        fl := least(98, greatest(35, base + random()*10 - 5));
        cm := least(98, greatest(35, base + random()*10 - 5));
        ov := round((pr + gr + vo + fl + cm) / 5, 2);
        a := 1 + floor(random()*6)::int; b := (a % 6) + 1;
        cl := 1 + floor(random()*5);
        INSERT INTO public.conversation_evaluations (session_id, user_id, overall_score, pronunciation_score, grammar_score,
          vocabulary_score, fluency_score, communication_score, strengths, weaknesses, corrections, recommendations,
          detailed_feedback, created_at)
        VALUES (sid, uid, ov, round(pr,2), round(gr,2), round(vo,2), round(fl,2), round(cm,2),
          ARRAY[strengths[a], strengths[b]], ARRAY[weaknesses[a], weaknesses[b]],
          jsonb_build_array(corr[cl::int], corr[((cl::int) % 5) + 1]),
          ARRAY[recs[a], recs[b], recs[((b) % 6) + 1]],
          jsonb_build_object('summary',
            CASE WHEN ov >= 80 THEN 'Buổi luyện tập rất tốt, bạn giao tiếp tự tin và đúng ngữ cảnh công sở.'
                 WHEN ov >= 65 THEN 'Buổi luyện tập khá ổn, cần chú ý thêm ngữ pháp và vốn từ chuyên ngành.'
                 ELSE 'Bạn đã hoàn thành buổi luyện, hãy ôn lại từ vựng và luyện thêm để tự tin hơn.' END),
          started + (dur || ' seconds')::interval + interval '8 seconds');
      END IF;
    END LOOP;

    -- ===== TIẾN ĐỘ TỪ VỰNG =====
    INSERT INTO public.user_vocabulary (user_id, vocabulary_id, status, review_count, last_reviewed_at, created_at)
    SELECT uid, v.id, t.st,
           CASE t.st WHEN 'mastered' THEN 6 + floor(random()*10)::int WHEN 'remembered' THEN 3 + floor(random()*4)::int ELSE 1 + floor(random()*2)::int END,
           t.c + random() * (now() - t.c), t.c
    FROM (SELECT id FROM public.vocabulary ORDER BY random() * CASE difficulty WHEN 'HSK 1' THEN 1 WHEN 'HSK 2' THEN 1.5 WHEN 'HSK 3' THEN 2 WHEN 'HSK 4' THEN 3 ELSE 6 END LIMIT (30 + floor(random()*120)::int)) v,
    LATERAL (SELECT (ARRAY['learning','learning','remembered','remembered','mastered'])[1 + floor(random()*5)::int] AS st,
                    joined + random() * (now() - joined - interval '1 hour') AS c) t
    ON CONFLICT DO NOTHING;

    -- ===== BOOKMARK =====
    INSERT INTO public.bookmarks (user_id, item_type, scenario_id, created_at)
    SELECT uid, 'scenario', id, joined + random() * (now() - joined)
    FROM public.scenarios WHERE is_published ORDER BY random() LIMIT (2 + floor(random()*4)::int)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.bookmarks (user_id, item_type, vocabulary_id, created_at)
    SELECT uid, 'vocabulary', id, joined + random() * (now() - joined)
    FROM public.vocabulary ORDER BY random() LIMIT (3 + floor(random()*6)::int)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Kiểm tra nhanh sau khi chạy
SELECT 'profiles' t, count(*) FROM public.profiles UNION ALL
SELECT 'conversation_sessions', count(*) FROM public.conversation_sessions UNION ALL
SELECT 'conversation_messages', count(*) FROM public.conversation_messages UNION ALL
SELECT 'conversation_evaluations', count(*) FROM public.conversation_evaluations UNION ALL
SELECT 'user_vocabulary', count(*) FROM public.user_vocabulary UNION ALL
SELECT 'bookmarks', count(*) FROM public.bookmarks;

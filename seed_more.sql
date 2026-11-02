-- Bổ sung dữ liệu cho các ngành còn thiếu. Chạy trong Supabase SQL Editor. Chạy lại nhiều lần không bị trùng.

-- ===== TÌNH HUỐNG =====
INSERT INTO public.scenarios (category_id, title, title_zh, description, situation, learning_objectives, difficulty,
  estimated_minutes, ai_role, ai_role_zh, ai_personality, initial_message, suggested_phrases, is_published)
SELECT c.id, s.title, s.title_zh, s.description, s.situation, s.objectives, s.difficulty, s.minutes,
       s.ai_role, s.ai_role_zh, s.personality, s.initial_message, s.phrases::jsonb, TRUE
FROM (VALUES
 ('Du lịch - Dịch vụ','Đặt phòng khách sạn','预订酒店房间','Tiếp nhận yêu cầu đặt phòng của khách Trung Quốc.',
  'Bạn là thực tập sinh lễ tân khách sạn. Một khách Trung Quốc muốn đặt phòng.',
  ARRAY['Hỏi ngày nhận/trả phòng','Giới thiệu loại phòng','Xác nhận thông tin đặt phòng'],'beginner',10,
  'Khách hàng','客人','Lịch sự, muốn biết rõ giá và tiện nghi.','你好，我想订一个双人房，住两晚。',
  '[{"zh":"请问您什么时候入住？","vi":"Xin hỏi khi nào quý khách nhận phòng?"},{"zh":"一晚三百元，包含早餐。","vi":"300 tệ một đêm, đã gồm bữa sáng."}]'),
 ('Du lịch - Dịch vụ','Xử lý khiếu nại của khách','处理客人投诉','Lắng nghe, xin lỗi và đưa ra giải pháp cho khách không hài lòng.',
  'Khách phàn nàn phòng không sạch. Bạn cần xin lỗi và xử lý.',
  ARRAY['Xin lỗi đúng cách','Hỏi rõ vấn đề','Đề xuất giải pháp'],'advanced',15,
  'Khách hàng','客人','Đang bực bội nhưng sẽ dịu lại nếu được giải quyết tốt.','你们的房间不干净，我很不满意！',
  '[{"zh":"非常抱歉给您带来不便。","vi":"Thành thật xin lỗi vì sự bất tiện."},{"zh":"我马上帮您换一间房。","vi":"Tôi sẽ đổi phòng cho quý khách ngay."}]'),
 ('Sản xuất - Nhà máy','Quy định an toàn lao động','工厂安全规定','Nghe hướng dẫn an toàn từ quản đốc ngày đầu vào xưởng.',
  'Ngày đầu thực tập ở nhà máy, quản đốc phổ biến quy định an toàn.',
  ARRAY['Hiểu quy định an toàn','Xác nhận đã hiểu','Hỏi lại khi chưa rõ'],'beginner',10,
  'Quản đốc','车间主任','Nghiêm khắc về an toàn nhưng kiên nhẫn với người mới.','进车间之前，必须先戴好安全帽。你明白了吗？',
  '[{"zh":"我明白了。","vi":"Tôi đã hiểu."},{"zh":"请问口罩在哪里领？","vi":"Xin hỏi lấy khẩu trang ở đâu?"}]'),
 ('Sản xuất - Nhà máy','Báo cáo sự cố máy móc','汇报设备故障','Báo cáo máy hỏng và mô tả sự cố cho tổ trưởng.',
  'Máy trên dây chuyền đột ngột dừng. Bạn phải báo cáo ngay.',
  ARRAY['Mô tả sự cố','Nêu thời điểm xảy ra','Đề xuất xử lý'],'intermediate',15,
  'Tổ trưởng','组长','Bình tĩnh, hỏi nhanh và cần thông tin chính xác.','怎么了？哪台机器出问题了？',
  '[{"zh":"三号机器突然停了。","vi":"Máy số 3 đột nhiên dừng."},{"zh":"需要马上找人修理。","vi":"Cần gọi người sửa ngay."}]'),
 ('Nhân sự','Xin nghỉ phép','请假','Xin phép nghỉ và trao đổi bàn giao công việc.',
  'Bạn bị ốm và cần xin nghỉ một ngày.',
  ARRAY['Xin nghỉ lịch sự','Nêu lý do','Bàn giao công việc'],'beginner',10,
  'Quản lý nhân sự','人事经理','Thông cảm nhưng cần biết công việc có bị ảnh hưởng không.','你好，有什么事吗？',
  '[{"zh":"我今天身体不舒服，想请一天假。","vi":"Hôm nay tôi không khỏe, muốn xin nghỉ một ngày."},{"zh":"工作我已经交接好了。","vi":"Tôi đã bàn giao công việc xong."}]'),
 ('Kinh doanh - Bán hàng','Đàm phán giá','价格谈判','Thương lượng giá và chiết khấu với khách.',
  'Khách Trung Quốc muốn giảm giá cho đơn hàng số lượng lớn.',
  ARRAY['Nêu giá','Thương lượng chiết khấu','Chốt thỏa thuận'],'advanced',15,
  'Khách hàng','客户','Khéo mặc cả, cần lý do thuyết phục.','这个价格有点贵，能便宜一点吗？',
  '[{"zh":"订得越多，价格越优惠。","vi":"Đặt càng nhiều giá càng ưu đãi."},{"zh":"这是我们最低的价格了。","vi":"Đây là giá thấp nhất của chúng tôi."}]')
) AS s(cat, title, title_zh, description, situation, objectives, difficulty, minutes, ai_role, ai_role_zh, personality, initial_message, phrases)
JOIN public.categories c ON c.name = s.cat
WHERE NOT EXISTS (SELECT 1 FROM public.scenarios x WHERE x.title = s.title);

-- ===== TỪ VỰNG =====
INSERT INTO public.vocabulary (category_id, chinese, pinyin, vietnamese, example_chinese, example_pinyin, example_vietnamese, difficulty)
SELECT c.id, v.zh, v.py, v.vi, v.ex, v.exp, v.exv, v.diff
FROM (VALUES
 ('Văn phòng - Hành chính','会议','huì yì','Cuộc họp','下午三点有一个会议。','Xiàwǔ sān diǎn yǒu yí ge huìyì.','3 giờ chiều có một cuộc họp.','beginner'),
 ('Văn phòng - Hành chính','文件','wén jiàn','Tài liệu','请把文件发给我。','Qǐng bǎ wénjiàn fā gěi wǒ.','Xin gửi tài liệu cho tôi.','beginner'),
 ('Văn phòng - Hành chính','加班','jiā bān','Làm thêm giờ','今天需要加班。','Jīntiān xūyào jiābān.','Hôm nay cần làm thêm giờ.','intermediate'),
 ('Văn phòng - Hành chính','截止日期','jié zhǐ rì qī','Hạn chót','截止日期是星期五。','Jiézhǐ rìqī shì xīngqīwǔ.','Hạn chót là thứ Sáu.','intermediate'),
 ('Kinh doanh - Bán hàng','报价','bào jià','Báo giá','请给我一个报价。','Qǐng gěi wǒ yí ge bàojià.','Xin báo giá cho tôi.','intermediate'),
 ('Kinh doanh - Bán hàng','合同','hé tong','Hợp đồng','我们明天签合同。','Wǒmen míngtiān qiān hétong.','Ngày mai chúng ta ký hợp đồng.','intermediate'),
 ('Kinh doanh - Bán hàng','折扣','zhé kòu','Chiết khấu','这个产品有折扣吗？','Zhège chǎnpǐn yǒu zhékòu ma?','Sản phẩm này có chiết khấu không?','beginner'),
 ('Kinh doanh - Bán hàng','售后服务','shòu hòu fú wù','Dịch vụ hậu mãi','我们提供售后服务。','Wǒmen tígōng shòuhòu fúwù.','Chúng tôi cung cấp dịch vụ hậu mãi.','advanced'),
 ('Xuất nhập khẩu','海关','hǎi guān','Hải quan','货物正在通过海关。','Huòwù zhèngzài tōngguò hǎiguān.','Hàng đang thông quan.','intermediate'),
 ('Xuất nhập khẩu','报关单','bào guān dān','Tờ khai hải quan','请填写报关单。','Qǐng tiánxiě bàoguāndān.','Vui lòng điền tờ khai hải quan.','advanced'),
 ('Xuất nhập khẩu','集装箱','jí zhuāng xiāng','Container','一个集装箱装满了。','Yí ge jízhuāngxiāng zhuāng mǎn le.','Một container đã đầy.','intermediate'),
 ('Xuất nhập khẩu','运费','yùn fèi','Cước vận chuyển','运费由买方承担。','Yùnfèi yóu mǎifāng chéngdān.','Cước vận chuyển do bên mua chịu.','intermediate'),
 ('Du lịch - Dịch vụ','预订','yù dìng','Đặt trước','我想预订一个房间。','Wǒ xiǎng yùdìng yí ge fángjiān.','Tôi muốn đặt một phòng.','beginner'),
 ('Du lịch - Dịch vụ','入住','rù zhù','Nhận phòng','请问几点可以入住？','Qǐngwèn jǐ diǎn kěyǐ rùzhù?','Xin hỏi mấy giờ nhận phòng được?','beginner'),
 ('Du lịch - Dịch vụ','退房','tuì fáng','Trả phòng','中午十二点退房。','Zhōngwǔ shí''èr diǎn tuìfáng.','12 giờ trưa trả phòng.','beginner'),
 ('Du lịch - Dịch vụ','导游','dǎo yóu','Hướng dẫn viên','导游会带大家参观。','Dǎoyóu huì dài dàjiā cānguān.','Hướng dẫn viên sẽ dẫn mọi người tham quan.','beginner'),
 ('Du lịch - Dịch vụ','投诉','tóu sù','Khiếu nại','客人对服务有投诉。','Kèrén duì fúwù yǒu tóusù.','Khách có khiếu nại về dịch vụ.','intermediate'),
 ('Nhân sự','简历','jiǎn lì','Sơ yếu lý lịch (CV)','请发一份简历给我。','Qǐng fā yí fèn jiǎnlì gěi wǒ.','Xin gửi cho tôi một bản CV.','beginner'),
 ('Nhân sự','请假','qǐng jià','Xin nghỉ phép','我明天想请假。','Wǒ míngtiān xiǎng qǐngjià.','Ngày mai tôi muốn xin nghỉ.','beginner'),
 ('Nhân sự','工资','gōng zī','Tiền lương','工资每月十号发。','Gōngzī měi yuè shí hào fā.','Lương trả vào ngày 10 hằng tháng.','beginner'),
 ('Nhân sự','培训','péi xùn','Đào tạo','新员工需要参加培训。','Xīn yuángōng xūyào cānjiā péixùn.','Nhân viên mới cần tham gia đào tạo.','intermediate'),
 ('Sản xuất - Nhà máy','车间','chē jiān','Xưởng sản xuất','他在车间工作。','Tā zài chējiān gōngzuò.','Anh ấy làm việc ở xưởng.','beginner'),
 ('Sản xuất - Nhà máy','安全帽','ān quán mào','Mũ bảo hộ','进车间要戴安全帽。','Jìn chējiān yào dài ānquánmào.','Vào xưởng phải đội mũ bảo hộ.','beginner'),
 ('Sản xuất - Nhà máy','机器','jī qì','Máy móc','这台机器坏了。','Zhè tái jīqì huài le.','Chiếc máy này hỏng rồi.','beginner'),
 ('Sản xuất - Nhà máy','质量检查','zhì liàng jiǎn chá','Kiểm tra chất lượng','产品需要质量检查。','Chǎnpǐn xūyào zhìliàng jiǎnchá.','Sản phẩm cần kiểm tra chất lượng.','intermediate'),
 ('Sản xuất - Nhà máy','生产线','shēng chǎn xiàn','Dây chuyền sản xuất','生产线今天停了。','Shēngchǎnxiàn jīntiān tíng le.','Dây chuyền hôm nay đã dừng.','intermediate')
) AS v(cat, zh, py, vi, ex, exp, exv, diff)
JOIN public.categories c ON c.name = v.cat
WHERE NOT EXISTS (SELECT 1 FROM public.vocabulary x WHERE x.chinese = v.zh);

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

out='Slide_InternChinese_18_muc.pptx'
prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
RED=RGBColor(192,0,0); BLUE=RGBColor(31,78,121); DARK=RGBColor(35,35,35); GRAY=RGBColor(242,242,242); WHITE=RGBColor(255,255,255); GOLD=RGBColor(216,163,52)
blank=prs.slide_layouts[6]

def box(sl,x,y,w,h,fill=None,line=None):
    sh=sl.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb=fill or WHITE; sh.line.color.rgb=line or fill or WHITE
    return sh
def text(sl,t,x,y,w,h,size=20,color=DARK,bold=False,align=PP_ALIGN.LEFT):
    tb=sl.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); tf=tb.text_frame; tf.clear(); tf.word_wrap=True; tf.margin_left=Inches(.08); tf.margin_right=Inches(.08); tf.vertical_anchor=MSO_ANCHOR.MIDDLE
    p=tf.paragraphs[0]; p.alignment=align; r=p.add_run(); r.text=t; r.font.name='Arial'; r.font.size=Pt(size); r.font.bold=bold; r.font.color.rgb=color
    return tb
def title(sl,n,t):
    text(sl,f'{n:02d}  {t}',.55,.35,12.2,.55,26,RED,True)
    sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(.55), Inches(1.0), Inches(12.2), Inches(.04)).fill.solid(); sl.shapes[-1].fill.fore_color.rgb=GOLD; sl.shapes[-1].line.fill.background()
def bullets(sl,items,x=.8,y=1.35,w=6.0,h=4.8,size=19):
    tb=sl.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h)); tf=tb.text_frame; tf.clear(); tf.word_wrap=True
    for i,it in enumerate(items):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph(); p.text=it; p.level=0; p.font.name='Arial'; p.font.size=Pt(size); p.font.color.rgb=DARK; p.space_after=Pt(12); p.text='• '+it
def placeholder(sl,label,x=7.2,y=1.45,w=5.4,h=4.8):
    sh=box(sl,x,y,w,h,GRAY,RGBColor(170,170,170)); text(sl,'[ CHÈN ẢNH / SƠ ĐỒ ]\\n'+label,x+.15,y+1.55,w-.3,1.4,18,RGBColor(100,100,100),False,PP_ALIGN.CENTER)
def footer(sl,n):
    text(sl,f'InternChinese · 实习汉语    |    {n}',.6,7.08,12,.25,9,RGBColor(120,120,120),False,PP_ALIGN.RIGHT)

# cover
s=prs.slides.add_slide(blank); s.background.fill.solid(); s.background.fill.fore_color.rgb=RGBColor(250,248,245)
text(s,'INTERNCHINESE',.8,1.25,11.8,.8,38,RED,True,PP_ALIGN.CENTER)
text(s,'实习汉语 · Luyện tiếng Trung giao tiếp nơi công sở',1.0,2.2,11.3,.55,22,BLUE,False,PP_ALIGN.CENTER)
box(s,4.25,3.25,4.85,1.05,RED,RED); text(s,'Luyện đúng tình huống – Tự tin giao tiếp',4.4,3.38,4.55,.75,20,WHITE,True,PP_ALIGN.CENTER)
text(s,'Báo cáo dự án Design Thinking',1.2,5.15,10.9,.45,20,DARK,False,PP_ALIGN.CENTER)
text(s,'Nhóm thực hiện: ........................................',1.2,5.75,10.9,.35,15,DARK,False,PP_ALIGN.CENTER)
footer(s,1)

# agenda
s=prs.slides.add_slide(blank); title(s,0,'NỘI DUNG TRÌNH BÀY')
cols=[['01–04','Bối cảnh · Người dùng · Vấn đề'],['05–09','Nghiên cứu · Insight · Ý tưởng'],['10–13','Giải pháp · Prototype · User flow'],['14–18','Kiểm thử · Cải tiến · Kết luận']]
for i,(a,b) in enumerate(cols):
    x=.8+(i%2)*6.1; y=1.5+(i//2)*2.3; box(s,x,y,5.5,1.55,GRAY,RGBColor(220,220,220)); text(s,a,x+.25,y+.25,1.3,.5,25,RED,True); text(s,b,x+1.65,y+.25,3.5,.75,18,DARK,True)
footer(s,2)

slides=[
('GIỚI THIỆU',['InternChinese là nền tảng web luyện tiếng Trung theo tình huống thực tập.','Kết hợp hội thoại AI, giọng nói, chấm điểm, từ vựng HSK và dịch Trung–Việt.','Mục tiêu: biến kiến thức HSK thành năng lực giao tiếp công sở.'],'Tổng quan giao diện sản phẩm'),
('TÊN DỰ ÁN, THÀNH VIÊN, SLOGAN/LOGO',['Tên: InternChinese – 实习汉语.','Logo chữ 实 đại diện cho thực tập và bản sắc chữ Hán.','Slogan: “Luyện đúng tình huống – Tự tin giao tiếp nơi công sở”.','Thành viên: ........................................................'],'Logo / ảnh nhóm'),
('BỐI CẢNH VÀ LÝ DO CHỌN ĐỀ TÀI',['Sinh viên biết từ vựng nhưng khó sử dụng trong tình huống thật.','Thiếu môi trường luyện nói an toàn, có phản hồi ngay.','Giao tiếp công sở yêu cầu đúng vai trò, sắc thái và mức độ lịch sự.'],'Sơ đồ bối cảnh học tập'),
('VẤN ĐỀ BAN ĐẦU VÀ ĐỐI TƯỢNG NGƯỜI DÙNG',['Đối tượng chính: sinh viên chuẩn bị hoặc đang thực tập.','Vấn đề: thiếu tự tin, thiếu từ chuyên ngành, khó tìm người luyện cùng.','Nhu cầu: bài luyện ngắn, hỗ trợ song ngữ, có điểm và hướng cải thiện.'],'Persona người dùng'),
('PHƯƠNG PHÁP NGHIÊN CỨU NGƯỜI DÙNG',['Phỏng vấn bán cấu trúc và khảo sát nhanh.','Phân tích hành trình học tiếng Trung.','Kiểm thử nhiệm vụ trên prototype.','Tổng hợp pain point thành yêu cầu thiết kế.'],'Ảnh nghiên cứu / affinity map'),
('KẾT QUẢ NGHIÊN CỨU VÀ VẤN ĐỀ',['Không biết bắt đầu hoặc nói tiếp thế nào.','Sợ dùng sai kính ngữ và sắc thái.','Không nhận được phản hồi cụ thể.','Dễ bỏ cuộc nếu bài học dài và không thấy tiến bộ.'],'Affinity map / pain points'),
('INSIGHT VÀ NHU CẦU CHƯA ĐƯỢC ĐÁP ỨNG',['Insight: “Tôi cần được thử nói trong đúng bối cảnh mà không sợ bị đánh giá.”','Cần người đối thoại, câu gợi ý, pinyin, nghe phát âm và sửa lỗi.','Cần nhìn thấy tiến bộ sau mỗi phiên luyện.'],'Insight statement'),
('PHÁT BIỂU VẤN ĐỀ VÀ CƠ SỞ THIẾT KẾ',['How Might We: giúp sinh viên luyện một tình huống công sở trong khoảng 10 phút?','Nguyên tắc: ngắn gọn, có ngữ cảnh, phản hồi có thể hành động.','Tiếng Trung là nội dung chính; tiếng Việt là lớp hỗ trợ.'],'Problem statement'),
('QUÁ TRÌNH HÌNH THÀNH Ý TƯỞNG',['Ý tưởng ban đầu: video, chatbot, flashcard, phỏng vấn mô phỏng.','Giải pháp được chọn kết hợp tình huống + AI + từ vựng + đánh giá.','Luồng: chọn → luyện → nhận phản hồi → ôn lại.'],'Brainstorming / journey map'),
('TIÊU CHÍ LỰA CHỌN GIẢI PHÁP',['Giải quyết đúng pain point.','Dễ sử dụng trên desktop và mobile.','Khả thi trong thời gian và công nghệ của nhóm.','Có thể mở rộng ngành, cấp độ và dữ liệu.','Đo lường được kết quả học tập.'],'Ma trận tiêu chí'),
('GIẢI PHÁP ĐƯỢC LỰA CHỌN VÀ GIÁ TRỊ KHÁC BIỆT',['Nền tảng gồm: Tình huống, Từ vựng, Dịch, Lịch sử, Đã lưu và Hồ sơ.','Tình huống gắn với nghề nghiệp và vai trò cụ thể.','Có chế độ văn bản/giọng nói và cơ chế AI dự phòng.'],'Ảnh màn hình các module'),
('CÁCH GIẢI PHÁP HOẠT ĐỘNG',['Chọn tình huống theo ngành, cấp độ hoặc từ khóa.','Đọc bối cảnh, mục tiêu và câu gợi ý.','Trò chuyện với AI bằng văn bản hoặc giọng nói.','Hoàn thành và nhận điểm, lỗi, đề xuất.','Lưu từ vựng và luyện lại.'],'User flow sản phẩm'),
('PROTOTYPE, HÀNH TRÌNH TRẢI NGHIỆM',['Trang chủ hiển thị thống kê và gợi ý hôm nay.','Màn hình luyện có bối cảnh, vai trò, mục tiêu, chat và tiến trình.','Kết quả có điểm tổng, radar, điểm thành phần và transcript.','Responsive cho desktop, tablet và mobile.'],'Ảnh prototype 3 màn hình'),
('PHƯƠNG PHÁP VÀ KỊCH BẢN KIỂM THỬ',['Tìm và mở một tình huống.','Gửi câu tiếng Trung, bật/tắt bản dịch.','Hoàn thành buổi luyện và xem kết quả.','Tìm từ chuyên ngành, đánh dấu đã nhớ.','Dịch câu bằng viết tay.'],'Ảnh buổi kiểm thử'),
('KẾT QUẢ KIỂM THỬ VÀ PHẢN HỒI',['Đo tỷ lệ hoàn thành, thời gian và số lỗi.','Ghi nhận điểm dừng, câu hỏi và nhận xét.','Phân loại lỗi: chặn nhiệm vụ, gây chậm, gây hiểu nhầm.','Bổ sung số liệu thực tế của nhóm trước khi thuyết trình.'],'Bảng kết quả kiểm thử'),
('NHỮNG THAY ĐỔI SAU KIỂM THỬ',['Làm rõ mục tiêu và nút hành động.','Bổ sung pinyin, nghe, tiến trình lượt nói.','Hỗ trợ khôi phục phiên đang dở.','Tách khu vực luyện và thông tin trên mobile.','Bổ sung trạng thái loading, empty và error.'],'Before / after giao diện'),
('TÍNH KHẢ THI, HẠN CHẾ VÀ HƯỚNG PHÁT TRIỂN',['Khả thi: React, Supabase, dữ liệu tình huống và responsive đã có.','Hạn chế: AI, microphone và quota phụ thuộc dịch vụ ngoài.','Phát triển: dashboard giảng viên, chấm phát âm, nhắc ôn, PWA/mobile.'],'Roadmap phát triển'),
('KẾT LUẬN',['InternChinese tạo vòng lặp học tập: chọn tình huống → thực hành → phản hồi → ôn lại.','Giải pháp kết nối học tiếng Trung với hành vi giao tiếp nghề nghiệp.','Mục tiêu cuối: giúp sinh viên tự tin hơn khi thực tập trong môi trường sử dụng tiếng Trung.'],'Ảnh tổng kết / QR demo')
]
for i,(t,items,img) in enumerate(slides,1):
    s=prs.slides.add_slide(blank); title(s,i,t); bullets(s,items); placeholder(s,img); footer(s,i+2)
prs.save(out); print(out)


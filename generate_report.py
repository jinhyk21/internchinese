from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

doc=Document(); s=doc.sections[0]
s.top_margin=Cm(2); s.bottom_margin=Cm(2); s.left_margin=Cm(2.8); s.right_margin=Cm(2)
def font(run,n=13,b=False,i=False,c=None):
    run.font.name='Times New Roman'; run._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); run.font.size=Pt(n); run.bold=b; run.italic=i
    if c: run.font.color.rgb=RGBColor(*c)
for x in ['Normal','Body Text']:
    st=doc.styles[x]; st.font.name='Times New Roman'; st._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); st.font.size=Pt(13); st.paragraph_format.line_spacing=1.5; st.paragraph_format.space_after=Pt(6)
for x,n,c in [('Title',24,(192,0,0)),('Heading 1',17,(192,0,0)),('Heading 2',14,(31,78,121))]:
    st=doc.styles[x]; st.font.name='Times New Roman'; st._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); st.font.size=Pt(n); st.font.bold=True; st.font.color.rgb=RGBColor(*c)
def para(t='',style=None,align=None):
    p=doc.add_paragraph(style=style)
    if align is not None: p.alignment=align
    font(p.add_run(t)); return p
def box(t,h=3):
    tb=doc.add_table(rows=1,cols=1); tb.alignment=WD_TABLE_ALIGNMENT.CENTER; cell=tb.cell(0,0); cell.height=Cm(h); cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),'F2F2F2'); cell._tc.get_or_add_tcPr().append(shd)
    p=cell.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(p.add_run('[ ĐẶT ẢNH TẠI ĐÂY ]\\n'+t),12,False,True,(89,89,89))
    q=doc.add_paragraph('Hình minh họa đề xuất: '+t); q.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(q.add_run(''),11,False,True,(89,89,89))
def table(headers, rows):
    tb=doc.add_table(rows=1,cols=len(headers)); tb.style='Table Grid'
    for i,h in enumerate(headers):
        c=tb.rows[0].cells[i]; c.text=''; font(c.paragraphs[0].add_run(h),11,True)
    for row in rows:
        cs=tb.add_row().cells
        for i,v in enumerate(row): cs[i].text=''; font(cs[i].paragraphs[0].add_run(str(v)),11)
def bullets(items):
    for x in items:
        p=doc.add_paragraph(style='List Bullet'); font(p.add_run(x),13)

for _ in range(4): para('')
para('BÁO CÁO DỰ ÁN',align=WD_ALIGN_PARAGRAPH.CENTER)
para('INTERNCHINESE',style='Title',align=WD_ALIGN_PARAGRAPH.CENTER)
para('实习汉语 · Nền tảng luyện tiếng Trung giao tiếp nơi công sở',align=WD_ALIGN_PARAGRAPH.CENTER)
para('Môn học: Design Thinking',align=WD_ALIGN_PARAGRAPH.CENTER)
para('Nhóm thực hiện: ........................................................',align=WD_ALIGN_PARAGRAPH.CENTER)
para('Giảng viên: ..............................................................',align=WD_ALIGN_PARAGRAPH.CENTER)
para('Năm học: 2026',align=WD_ALIGN_PARAGRAPH.CENTER)
box('Ảnh/logo dự án hoặc ảnh giao diện tổng quan',4)
doc.add_page_break()
para('HƯỚNG DẪN ĐỊNH DẠNG VÀ SỬ DỤNG BÁO CÁO',style='Heading 1')
para('Báo cáo được thiết kế để in trên giấy A4. Nội dung chính dùng Times New Roman, cỡ 13 pt, giãn dòng 1,5; tiêu đề chương cỡ 17 pt, tiêu đề mục cỡ 14 pt; chú thích hình và bảng cỡ 11 pt. Lề trang: trái 2,8 cm, phải 2,0 cm, trên 2,0 cm, dưới 2,0 cm.')
para('Các khung màu xám là vị trí giữ chỗ để chèn ảnh chụp màn hình, sơ đồ, biểu đồ hoặc ảnh nhóm. Sau khi chèn ảnh, căn giữa và giữ chú thích ngay bên dưới.')
bullets(['Trang bìa và mục lục','Nội dung báo cáo theo đúng 18 mục yêu cầu','Các khung chèn ảnh, sơ đồ và minh họa','Phụ lục danh sách ảnh cần chuẩn bị trước khi in'])
doc.add_page_break()
para('MỤC LỤC',style='Heading 1')
para('Trong Word: References → Table of Contents → Automatic Table. Sau khi chỉnh sửa, chọn Update Field.')
titles=['Giới thiệu','Tên dự án, thành viên, slogan/logo','Bối cảnh và lý do chọn đề tài','Vấn đề ban đầu và đối tượng người dùng','Phương pháp nghiên cứu người dùng','Kết quả nghiên cứu và vấn đề của người dùng','Insight và nhu cầu chưa được đáp ứng','Phát biểu vấn đề và cơ sở thiết kế giải pháp','Quá trình hình thành ý tưởng','Tiêu chí lựa chọn giải pháp','Giải pháp được lựa chọn và giá trị khác biệt','Cách giải pháp hoạt động','Prototype, hành trình trải nghiệm của người dùng','Phương pháp và kịch bản kiểm thử','Kết quả kiểm thử và phản hồi','Những thay đổi sau kiểm thử','Tính khả thi, hạn chế và hướng phát triển','Kết luận']
for i,t in enumerate(titles,1): para(f'{i}. {t}')
doc.add_page_break()

data=[
('GIỚI THIỆU',['InternChinese là nền tảng web hỗ trợ sinh viên Việt Nam luyện tiếng Trung trong các tình huống thực tập và giao tiếp nơi công sở. Sản phẩm kết hợp thư viện tình huống song ngữ, hội thoại với AI, nhận diện giọng nói, chấm điểm sau buổi luyện, kho từ vựng HSK 1–9, từ vựng chuyên ngành và công cụ dịch Trung–Việt.','Dự án tập trung vào khoảng cách giữa việc học tiếng Trung theo giáo trình và nhu cầu sử dụng ngôn ngữ trong môi trường làm việc thực tế. Người học được đặt vào bối cảnh cụ thể như giới thiệu bản thân, hỏi quy trình, xác nhận đơn hàng, trao đổi với quản lý hoặc xử lý vấn đề trong công việc.','Báo cáo trình bày quy trình Design Thinking: thấu hiểu người dùng, xác định vấn đề, hình thành ý tưởng, tạo prototype, kiểm thử và hoàn thiện giải pháp.']),
('TÊN DỰ ÁN, THÀNH VIÊN, SLOGAN/LOGO',['Tên dự án: InternChinese – 实习汉语. “Intern” thể hiện bối cảnh thực tập; “Chinese” thể hiện ngôn ngữ mục tiêu; 实习汉语 có nghĩa là tiếng Trung thực tập.','Slogan đề xuất: “Luyện đúng tình huống – Tự tin giao tiếp nơi công sở”. Logo dùng biểu tượng con dấu chữ 实, gợi liên tưởng đến thực tập, tính xác thực và văn hóa chữ Hán.','Thành viên nhóm: ........................................................................................................................................\\nVai trò: .............................................................................................................................................................','Công nghệ chính: React, React Router, Supabase, JavaScript, pinyin-pro, Web Speech API và Gemini API khi có khóa cấu hình.']),
('BỐI CẢNH VÀ LÝ DO CHỌN ĐỀ TÀI',['Sinh viên học tiếng Trung thường có thể làm bài tập ngữ pháp hoặc ghi nhớ từ vựng, nhưng gặp khó khăn khi phải nói trong một tình huống công việc cụ thể. Các tài liệu phổ biến chưa luôn gắn với ngành thực tập, vai trò giao tiếp và mức độ lịch sự cần thiết.','Trong môi trường doanh nghiệp Trung Quốc hoặc có đối tác Trung Quốc, thực tập sinh cần dùng tiếng Trung để chào hỏi, xin hướng dẫn, hỏi tiến độ, báo cáo lỗi, trao đổi với khách hàng và xử lý yêu cầu phát sinh.','Nhóm chọn đề tài xây dựng một không gian luyện tập an toàn, cho phép người học thử, sai, nhận phản hồi và luyện lại trước khi giao tiếp thật.']),
('VẤN ĐỀ BAN ĐẦU VÀ ĐỐI TƯỢNG NGƯỜI DÙNG',['Vấn đề ban đầu: người học thiếu cơ hội luyện nói theo ngữ cảnh công sở; không biết dùng câu nào cho lịch sự; khó tự đánh giá; từ vựng chưa gắn với ngành nghề; việc chuyển từ biết từ sang nói thành câu còn chậm.','Đối tượng chính là sinh viên đại học đang chuẩn bị thực tập, đang thực tập hoặc mới đi làm tại môi trường có sử dụng tiếng Trung. Trình độ giả định từ HSK 1 đến HSK 7–9, trọng tâm là HSK 3–5.','Đối tượng phụ gồm giảng viên muốn giao bài luyện tình huống, người học tự do cần ôn từ vựng ngành và quản trị viên quản lý dữ liệu.']),
('PHƯƠNG PHÁP NGHIÊN CỨU NGƯỜI DÙNG',['Nhóm sử dụng phỏng vấn bán cấu trúc, khảo sát nhanh, phân tích hành trình học tiếng Trung và kiểm thử nhiệm vụ trên prototype.','Câu hỏi tập trung vào tình huống giao tiếp thường gặp, nỗi sợ khi nói, cách tra từ, phản hồi mong muốn, mức chấp nhận AI và dữ liệu cần xem sau buổi luyện.','Quy trình: tuyển người tham gia phù hợp, xin đồng ý, ghi nhận câu trả lời, mã hóa chủ đề lặp lại, tổng hợp pain point và chuyển hóa thành yêu cầu thiết kế.']),
('KẾT QUẢ NGHIÊN CỨU VÀ VẤN ĐỀ CỦA NGƯỜI DÙNG',['Các vấn đề nổi bật: không biết bắt đầu câu chuyện; sợ dùng sai kính ngữ hoặc sắc thái; thiếu từ chuyên ngành; khó tìm người luyện cùng; không nhận được phản hồi ngay; dễ bỏ cuộc nếu bài quá dài.','Người học cần giao diện song ngữ nhưng không muốn phụ thuộc vào bản dịch. Họ muốn xem pinyin khi cần, nghe phát âm, xem câu gợi ý và có quyền bật/tắt tiếng Việt để tăng dần độ khó.','Người dùng quan tâm đến điểm số, lịch sử luyện tập, tiến độ từ vựng và khả năng luyện lại cùng một tình huống.']),
('INSIGHT VÀ NHU CẦU CHƯA ĐƯỢC ĐÁP ỨNG',['Insight chính: “Tôi không chỉ cần biết câu đúng; tôi cần được đặt vào đúng vai trò, đúng bối cảnh và được thử nói nhiều lần mà không sợ bị đánh giá.”','Nhu cầu chưa được đáp ứng gồm: thư viện tình huống theo ngành; người đối thoại phản hồi tự nhiên; hướng dẫn câu lịch sự; chấm điểm có giải thích; ôn lại lỗi và từ vựng; trải nghiệm thống nhất trên máy tính và điện thoại.','Định hướng thiết kế là biến mỗi buổi học thành một nhiệm vụ ngắn có mục tiêu, vai trò, câu gợi ý, hội thoại, phản hồi và bước luyện lại.']),
('PHÁT BIỂU VẤN ĐỀ VÀ CƠ SỞ THIẾT KẾ GIẢI PHÁP',['Sinh viên Việt Nam chuẩn bị thực tập trong môi trường sử dụng tiếng Trung cần một cách luyện giao tiếp công sở có ngữ cảnh, phản hồi tức thời và có thể luyện lại; nếu không, họ khó chuyển kiến thức HSK thành hành vi giao tiếp tự tin.','How Might We: Làm thế nào để sinh viên luyện một tình huống công sở trong khoảng 10 phút, nhận phản hồi dễ hiểu và biết chính xác nên cải thiện điều gì?','Nguyên tắc thiết kế: ngắn gọn nhưng có chiều sâu; song ngữ có kiểm soát; khuyến khích thử sai; phản hồi có thể hành động; tiến bộ được nhìn thấy; nội dung phân theo ngành và cấp độ.']),
('QUÁ TRÌNH HÌNH THÀNH Ý TƯỞNG',['Nhóm phát triển nhiều hướng: video bài giảng, chatbot tự do, bộ thẻ từ vựng, mô phỏng phỏng vấn và nền tảng tình huống tương tác. Sau khi so sánh, nhóm kết hợp ưu điểm thành một sản phẩm.','Luồng được chọn: chọn tình huống → đọc bối cảnh và mục tiêu → trò chuyện văn bản hoặc giọng nói → hoàn thành → nhận đánh giá → xem lại hội thoại và lỗi → lưu từ/câu để ôn.','Tình huống được mở rộng theo Văn phòng, Xuất nhập khẩu, Kinh doanh, Công nghệ thông tin, Tài chính, Marketing, Logistics, Giáo dục và Y tế.']),
('TIÊU CHÍ LỰA CHỌN GIẢI PHÁP',['Nhóm đánh giá theo mức giải quyết pain point, dễ sử dụng, tạo động lực, khả thi kỹ thuật, mở rộng nội dung, an toàn dữ liệu và khả năng đo lường kết quả học tập.']),
('GIẢI PHÁP ĐƯỢC LỰA CHỌN VÀ GIÁ TRỊ KHÁC BIỆT',['InternChinese gồm sáu khu vực: Tình huống, Từ vựng, Dịch, Lịch sử, Đã lưu và Hồ sơ. Người dùng luyện theo tình huống, tra từ, dịch câu, theo dõi kết quả và quản lý tiến độ trong cùng hệ thống.','Giá trị khác biệt: nội dung đặt trong bối cảnh thực tập; vai trò AI cụ thể; hỗ trợ tiếng Trung, pinyin và tiếng Việt; chế độ văn bản/giọng nói; đánh giá theo phát âm, ngữ pháp, từ vựng, độ trôi chảy và giao tiếp; có bộ luật dự phòng khi AI không khả dụng.','Hệ thống hỗ trợ HSK 1–9 và từ vựng chuyên ngành, nối việc học phổ thông với nhu cầu nghề nghiệp.']),
('CÁCH GIẢI PHÁP HOẠT ĐỘNG',['Khám phá: xem tình huống, lọc theo độ khó, ngành hoặc từ khóa; trang chủ hiển thị gợi ý hôm nay, buổi đang dở và thống kê.','Luyện tập: tạo phiên hội thoại, hiển thị vai trò AI, bối cảnh, mục tiêu, câu gợi ý và đồng hồ; người dùng gửi câu bằng bàn phím hoặc giọng nói.','Phản hồi: tạo điểm tổng, điểm thành phần, điểm mạnh, điểm cần cải thiện, đề xuất và sửa lỗi; người dùng xem transcript song ngữ và luyện lại.','Củng cố: lưu tình huống/từ vựng, ôn flashcard, cập nhật trạng thái chưa nhớ/đã nhớ/thuộc và theo dõi tiến độ HSK.','Kiến trúc dùng Supabase cho xác thực, hồ sơ, tình huống, từ vựng, phiên hội thoại, tin nhắn, đánh giá và bookmark.']),
('PROTOTYPE, HÀNH TRÌNH TRẢI NGHIỆM CỦA NGƯỜI DÙNG',['Prototype gồm đăng nhập, trang chủ, thẻ tình huống, luyện hội thoại, kết quả, từ vựng, dịch, lịch sử, đã lưu và hồ sơ. Giao diện có bản desktop, tablet và mobile.','Hành trình mẫu: Mai đăng nhập → chọn tình huống văn phòng → xem mục tiêu → nói với đồng nghiệp AI → hoàn thành 6 lượt → xem điểm và lỗi → lưu từ mới → ôn lại ngày hôm sau.']),
('PHƯƠNG PHÁP VÀ KỊCH BẢN KIỂM THỬ',['Kiểm thử khả dụng theo nhiệm vụ: người tham gia tự thực hiện, người quan sát ghi thời gian, lỗi, điểm dừng, câu hỏi và nhận xét.','Kịch bản: tìm tình huống; gửi câu và bật/tắt bản dịch; hoàn thành buổi luyện và tìm điểm ngữ pháp; tìm từ ngành và đánh dấu đã nhớ; dịch câu bằng chữ viết tay.','Chỉ số: tỷ lệ hoàn thành, thời gian, số lần nhấn sai, mức hiểu mục tiêu, hài lòng 1–5 và ý định tiếp tục.']),
('KẾT QUẢ KIỂM THỬ VÀ PHẢN HỒI',['Kết quả cần được điền sau khi nhóm kiểm thử thực tế. Bảng dưới đây là mẫu ghi nhận cho báo cáo chính thức.']),
('NHỮNG THAY ĐỔI SAU KIỂM THỬ',['Đã làm rõ mục tiêu tình huống; cho phép bật/tắt tiếng Việt; bổ sung pinyin và nút nghe; thêm tiến trình lượt hội thoại; hỗ trợ tiếp tục phiên dở; tách phần luyện và thông tin trên màn hình nhỏ; thêm trạng thái tải và thông báo lỗi.','Khu vực từ vựng hỗ trợ tìm kiếm không dấu, dạng thẻ/danh sách, trạng thái học và phiên ôn tập. Khu vực kết quả có vòng điểm, radar, thanh điểm, điểm mạnh và sửa lỗi.','Các thay đổi nhằm giảm tải nhận thức, làm rõ bước tiếp theo và biến phản hồi thành hành động luyện tập.']),
('TÍNH KHẢ THI, HẠN CHẾ VÀ HƯỚNG PHÁT TRIỂN',['Tính khả thi: dự án đã có React, định tuyến, xác thực Supabase, lưu hội thoại, dữ liệu tình huống/từ vựng và giao diện responsive. Gemini được dùng khi có cấu hình; khi lỗi có bộ luật hội thoại và chấm điểm dự phòng.','Hạn chế: nhận diện giọng nói phụ thuộc trình duyệt và micro; đánh giá phát âm chưa thay thế giáo viên; AI có thể tạo phản hồi chưa phù hợp; dữ liệu cần kiểm duyệt; API cần kiểm soát chi phí và khóa bí mật.','Hướng phát triển: chấm phát âm chuyên sâu; dashboard giảng viên; ngân hàng tình huống do giáo viên biên soạn; lớp học; phân tích lỗi theo thời gian; nhắc ôn; thêm ngành; kiểm duyệt AI; PWA/mobile và accessibility.']),
('KẾT LUẬN',['InternChinese giải quyết nhu cầu giúp sinh viên luyện tiếng Trung trong bối cảnh công sở trước khi đi thực tập. Sản phẩm tạo vòng lặp hoàn chỉnh: chọn tình huống, thực hành, nhận phản hồi, xem lại và củng cố.','Qua Design Thinking, nhóm chuyển insight “cần được thử nói an toàn trong đúng bối cảnh” thành giải pháp có thể sử dụng, đo lường và mở rộng. Prototype là nền tảng để tiếp tục kiểm thử với người dùng thật và nâng cao độ chính xác AI.','Mục tiêu cuối cùng là giúp người học bớt sợ nói, hiểu cách diễn đạt lịch sự và tự tin hơn khi giao tiếp bằng tiếng Trung trong môi trường nghề nghiệp.'])
]
for i,(title,ps) in enumerate(data,1):
    para(f'{i}. {title}',style='Heading 1')
    for x in ps: para(x)
    if i==6: box('Sơ đồ affinity map hoặc ảnh ghi chú nghiên cứu',3)
    if i==9: box('Sơ đồ brainstorming / journey map',3)
    if i==10: table(['Tiêu chí','Ý nghĩa','Ưu tiên'],[('Giải quyết nhu cầu','Đúng pain point','Cao'),('Dễ sử dụng','Luồng rõ, responsive','Cao'),('Khả thi','Phù hợp nguồn lực','Cao'),('Mở rộng','Thêm ngành và cấp độ','TB'),('An toàn','Bảo vệ dữ liệu','Cao')])
    if i==13:
        box('Ảnh trang chủ và danh sách tình huống',3.2); box('Ảnh màn hình luyện hội thoại',3.2); box('Ảnh kết quả đánh giá / radar kỹ năng',3.2)
    if i==14: box('Ảnh buổi kiểm thử hoặc bảng quan sát',3)
    if i==15: table(['Nhiệm vụ','Người dùng 1','Người dùng 2','Nhận xét / hành động'],[('Tìm tình huống','','',''),('Gửi hội thoại','','',''),('Xem kết quả','','',''),('Ôn từ vựng','','','')])
para('PHỤ LỤC – DANH SÁCH ẢNH CẦN CHUẨN BỊ',style='Heading 1')
table(['STT','Ảnh cần chèn','Vị trí'],[('1','Logo / ảnh nhóm','Trang bìa'),('2','Trang chủ','Mục 13'),('3','Danh sách tình huống','Mục 13'),('4','Màn hình hội thoại','Mục 13'),('5','Kết quả chấm điểm','Mục 13'),('6','Kho từ vựng / flashcard','Mục 12–13'),('7','Màn hình dịch và viết tay','Mục 12–13'),('8','Ảnh kiểm thử / phản hồi','Mục 14–15')])
para('Ghi chú khi in: cập nhật mục lục, kiểm tra số trang, thay khung giữ chỗ bằng ảnh thật, kiểm tra lỗi chính tả và xuất thêm bản PDF để đối chiếu.')
for sec in doc.sections:
    f=sec.footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(f.add_run('InternChinese – Báo cáo dự án | '),10,False,False,(89,89,89)); fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); f._p.append(fld)
doc.save('Bao_cao_du_an_InternChinese.docx')
print('Bao_cao_du_an_InternChinese.docx')

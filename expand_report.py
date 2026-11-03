from docx import Document
from docx.shared import Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

path='Bao_cao_du_an_InternChinese.docx'
doc=Document(path)
extra={
'1. GIỚI THIỆU':[
'Về mặt sản phẩm, InternChinese được xây dựng như một hệ thống học tập tương tác thay vì một trang tra cứu đơn thuần. Mỗi tình huống đều có tiêu đề tiếng Việt và tiếng Trung, mô tả hoàn cảnh, vai trò của AI, mục tiêu học tập, câu gợi ý, độ khó và thời lượng dự kiến. Cấu trúc này giúp người học biết mình đang luyện điều gì trước khi bắt đầu.',
'Về mặt trải nghiệm, hệ thống tạo một vòng lặp khép kín: khám phá nội dung, thực hành hội thoại, nhận đánh giá, xem lại lỗi và ôn tập. Đây là cơ sở để biến việc học từ thụ động thành hành vi luyện tập có mục tiêu.'
],
'2. TÊN DỰ ÁN, THÀNH VIÊN, SLOGAN/LOGO':[
'Tên InternChinese được chọn vì ngắn, dễ nhớ và mô tả trực tiếp nhóm người dùng cũng như ngôn ngữ mục tiêu. Từ 实习 trong logo nhấn mạnh rằng nội dung không hướng đến giao tiếp chung chung mà hướng đến ngữ cảnh thực tập và công việc.',
'Trong báo cáo chính thức, nhóm cần bổ sung họ tên, mã sinh viên, vai trò và phần đóng góp của từng thành viên. Có thể phân vai theo các nhóm: nghiên cứu người dùng, thiết kế UI/UX, phát triển frontend, xây dựng dữ liệu, kiểm thử và thuyết trình.'
],
'3. BỐI CẢNH VÀ LÝ DO CHỌN ĐỀ TÀI':[
'Việc học theo danh sách từ vựng hoặc mẫu câu riêng lẻ thường tạo ra khoảng cách giữa “biết nghĩa” và “dùng được trong hội thoại”. Một câu có thể đúng ngữ pháp nhưng chưa phù hợp về mức độ lịch sự, vai trò người nói hoặc tình huống doanh nghiệp.',
'InternChinese giải quyết khoảng cách này bằng cách đặt từ vựng và mẫu câu vào một kịch bản có người đối thoại. Ví dụ, người học không chỉ học từ 打印机 mà còn phải hỏi cách kết nối máy in, xin phép sử dụng và xác nhận quy trình với đồng nghiệp.'
],
'4. VẤN ĐỀ BAN ĐẦU VÀ ĐỐI TƯỢNG NGƯỜI DÙNG':[
'Chân dung người dùng chính là một sinh viên có nền tảng tiếng Trung cơ bản, hiểu một phần từ vựng HSK nhưng thiếu tự tin khi nói với người lớn tuổi, quản lý hoặc khách hàng. Người dùng thường học bằng điện thoại, có thời gian ngắn và muốn thấy kết quả ngay sau mỗi lần luyện.',
'Các nhu cầu chức năng tương ứng gồm: chọn nội dung theo độ khó, tìm kiếm tình huống, xem gợi ý, luyện bằng văn bản hoặc giọng nói, xem bản dịch/pinyin, nhận điểm, lưu nội dung và theo dõi tiến độ. Các nhu cầu cảm xúc gồm cảm giác an toàn, không bị phán xét và biết rõ cách tiến bộ.'
],
'5. PHƯƠNG PHÁP NGHIÊN CỨU NGƯỜI DÙNG':[
'Trong phỏng vấn bán cấu trúc, nhóm nên bắt đầu bằng câu hỏi mở về trải nghiệm học và thực tập, sau đó mới hỏi về công cụ hoặc tính năng. Cách làm này hạn chế việc dẫn dắt người tham gia vào một giải pháp có sẵn.',
'Dữ liệu nghiên cứu được tổng hợp theo các nhóm: mục tiêu, hành vi hiện tại, khó khăn, động lực, ngữ cảnh sử dụng và tiêu chí thành công. Từ đó nhóm chuyển các phát hiện thành yêu cầu “must have”, “should have” và “could have”.'
],
'6. KẾT QUẢ NGHIÊN CỨU VÀ VẤN ĐỀ CỦA NGƯỜI DÙNG':[
'Pain point có tác động lớn nhất là người học không biết mình nên nói gì tiếp theo. Vì vậy, hệ thống cần đưa ra câu gợi ý vừa đủ: không biến bài luyện thành bài đọc thuộc lòng nhưng cũng không để người mới bắt đầu rơi vào trạng thái trống ý tưởng.',
'Pain point thứ hai là phản hồi chưa cụ thể. Một thông báo “bạn nói chưa tốt” không giúp người học cải thiện; phản hồi cần chỉ ra điểm mạnh, lỗi, câu sửa và đề xuất luyện tiếp. Đây là lý do màn hình kết quả được thiết kế theo nhiều trục kỹ năng.'
],
'7. INSIGHT VÀ NHU CẦU CHƯA ĐƯỢC ĐÁP ỨNG':[
'Insight được diễn giải thành nhu cầu thiết kế: người học cần một “phòng tập giao tiếp” có thể lặp lại nhiều lần, trong đó sai lầm là dữ liệu để học chứ không phải lý do bị đánh giá. AI đóng vai đối tác hội thoại, còn hệ thống đóng vai huấn luyện viên.',
'Để đáp ứng nhu cầu này, tính năng bật/tắt tiếng Việt, hiển thị pinyin và nút nghe được đặt ngay trong luồng học. Người dùng có thể bắt đầu với nhiều hỗ trợ, sau đó giảm hỗ trợ khi đã tự tin hơn.'
],
'8. PHÁT BIỂU VẤN ĐỀ VÀ CƠ SỞ THIẾT KẾ GIẢI PHÁP':[
'Các nguyên tắc trên được chuyển thành yêu cầu giao diện: thông tin quan trọng phải xuất hiện trước khi bắt đầu; hành động chính “Hoàn thành” phải dễ nhận biết; trạng thái phiên phải được lưu; lỗi mạng hoặc lỗi AI phải có thông báo dễ hiểu; giao diện mobile phải giữ được chức năng cốt lõi.',
'Nhóm cũng ưu tiên thiết kế song ngữ có phân cấp. Tiếng Trung là nội dung luyện tập chính, tiếng Việt là lớp hỗ trợ. Cách trình bày này tránh việc người học chỉ đọc bản dịch mà không tiếp xúc đủ với tiếng Trung.'
],
'9. QUÁ TRÌNH HÌNH THÀNH Ý TƯỞNG':[
'Ở giai đoạn divergent, nhóm tạo nhiều ý tưởng mà chưa đánh giá ngay để mở rộng không gian giải pháp. Ở giai đoạn convergent, các ý tưởng được chấm theo giá trị người dùng, mức độ phù hợp môn học, thời gian triển khai và khả năng chứng minh bằng prototype.',
'Ý tưởng cuối cùng kết hợp chatbot, thư viện tình huống, flashcard và công cụ dịch. Việc kết hợp này tạo ra hành trình liền mạch: nội dung học, thực hành và ôn tập không bị tách rời thành các ứng dụng khác nhau.'
],
'10. TIÊU CHÍ LỰA CHỌN GIẢI PHÁP':[
'Tiêu chí “giải quyết nhu cầu” được đặt cao nhất vì một sản phẩm nhiều tính năng nhưng không giải quyết sự thiếu tự tin khi nói sẽ không tạo ra giá trị. Tiêu chí “khả thi” giúp nhóm kiểm soát phạm vi và ưu tiên những chức năng có thể hoàn thiện trong thời gian dự án.',
'Trong trường hợp các giải pháp có điểm tương đương, nhóm ưu tiên phương án có thể đo lường bằng dữ liệu: số buổi luyện, thời lượng, điểm số, số từ đã nhớ, số lần luyện lại và tỷ lệ hoàn thành nhiệm vụ.'
],
'11. GIẢI PHÁP ĐƯỢC LỰA CHỌN VÀ GIÁ TRỊ KHÁC BIỆT':[
'Giá trị của InternChinese nằm ở sự kết hợp giữa “đúng ngữ cảnh” và “có phản hồi”. Các nền tảng học từ có thể cung cấp nghĩa, còn công cụ chatbot chung có thể tạo hội thoại, nhưng InternChinese tổ chức cả hai theo mục tiêu thực tập và theo dõi kết quả sau mỗi phiên.',
'Giải pháp cũng có tính linh hoạt. Khi Gemini khả dụng, AI có thể tạo phản hồi và đánh giá theo hội thoại; khi không khả dụng, bộ luật nội bộ vẫn cho phép người dùng luyện các mẫu câu cơ bản và nhận điểm sơ bộ. Điều này làm prototype ổn định hơn khi trình diễn.'
],
'12. CÁCH GIẢI PHÁP HOẠT ĐỘNG':[
'Luồng dữ liệu bắt đầu khi người dùng đăng nhập và chọn tình huống. Hệ thống tạo conversation_session, lưu từng conversation_message của người dùng và AI, sau đó tạo conversation_evaluation khi người dùng hoàn thành. Các bản ghi này được dùng để hiển thị lịch sử và kết quả.',
'Trang Từ vựng có tìm kiếm theo chữ Hán, pinyin hoặc tiếng Việt, hỗ trợ tìm không dấu, lật thẻ và cập nhật trạng thái học. Trang Dịch hỗ trợ hai chiều Trung–Việt, pinyin, phát âm, tra nghĩa từng từ và nhập chữ bằng bảng viết tay.',
'Trang Hồ sơ tổng hợp số buổi luyện, số buổi hoàn thành, thời gian, điểm trung bình và tiến độ HSK. Nhờ đó người dùng thấy được quá trình dài hạn thay vì chỉ nhìn kết quả của một lần luyện.'
],
'13. PROTOTYPE, HÀNH TRÌNH TRẢI NGHIỆM CỦA NGƯỜI DÙNG':[
'Ở trang chủ, người dùng nhìn thấy lời chào, số buổi đã hoàn thành, thời gian luyện, điểm trung bình và số từ đã nhớ. Khu vực “Tiếp tục luyện tập” giúp phục hồi phiên đang dở, còn “Gợi ý hôm nay” tạo điểm bắt đầu nhanh.',
'Trong màn hình luyện, cột thông tin hiển thị bối cảnh, vai trò AI, mục tiêu và câu mẫu; khu vực chat hiển thị hội thoại, bản dịch và tiến trình lượt nói. Trên mobile, hai khu vực được chuyển thành các tab để tránh giao diện quá chật.',
'Màn hình kết quả dùng ba lớp thông tin: điểm tổng để đọc nhanh, radar để nhìn cân bằng kỹ năng, và các thanh điểm/correction để biết cần sửa gì. Cách phân cấp này phục vụ cả người chỉ cần một chỉ số lẫn người muốn phân tích sâu.'
],
'14. PHƯƠNG PHÁP VÀ KỊCH BẢN KIỂM THỬ':[
'Mỗi nhiệm vụ kiểm thử cần có tiêu chí hoàn thành rõ ràng. Ví dụ, nhiệm vụ “tìm tình huống” được xem là hoàn thành khi người tham gia mở đúng tình huống và nói được mục tiêu học; nhiệm vụ “xem kết quả” hoàn thành khi họ tìm được điểm tổng và ít nhất một đề xuất.',
'Ngoài quan sát trực tiếp, nhóm nên hỏi lại sau nhiệm vụ: điều gì dễ, điều gì gây bối rối, thông tin nào thiếu, họ có tin điểm số không và có sẵn sàng sử dụng lại không. Các câu trả lời này giúp phân biệt lỗi giao diện với vấn đề về nội dung hoặc kỳ vọng.'
],
'15. KẾT QUẢ KIỂM THỬ VÀ PHẢN HỒI':[
'Khi điền bảng kết quả, nhóm nên ghi cả bằng chứng định lượng và định tính. Ví dụ: “4/5 người hoàn thành trong dưới 2 phút” đi kèm nhận xét “người dùng không nhận ra bộ lọc độ khó”. Cách ghi này giúp thay đổi thiết kế có căn cứ.',
'Các phản hồi cần phân loại theo mức độ nghiêm trọng: lỗi chặn nhiệm vụ, lỗi gây chậm, vấn đề dễ gây hiểu nhầm và đề xuất cải tiến. Những lỗi chặn nhiệm vụ phải được xử lý trước khi hoàn thiện báo cáo hoặc trình diễn.'
],
'16. NHỮNG THAY ĐỔI SAU KIỂM THỬ':[
'Các thay đổi không chỉ nhằm làm giao diện đẹp hơn mà nhằm cải thiện khả năng hoàn thành mục tiêu. Thanh tiến trình cho người dùng biết mình đang ở đâu; câu gợi ý giảm trạng thái bí ý; tiếp tục phiên dở giúp tránh mất công sức; kết quả có đề xuất giúp người học biết bước tiếp theo.',
'Việc hỗ trợ desktop, tablet và mobile cũng là một thay đổi quan trọng. Người dùng có thể luyện trên laptop khi học nghiêm túc hoặc trên điện thoại trong thời gian ngắn. Bố cục responsive giữ lại các hành động chính nhưng giảm thông tin phụ trên màn hình nhỏ.'
],
'17. TÍNH KHẢ THI, HẠN CHẾ VÀ HƯỚNG PHÁT TRIỂN':[
'Về kỹ thuật, dữ liệu được tách thành các thực thể rõ ràng: profiles, categories, scenarios, vocabulary, conversation_sessions, conversation_messages, conversation_evaluations và bookmarks. Cách tổ chức này cho phép mở rộng nội dung mà không phải thay đổi toàn bộ giao diện.',
'Về vận hành, cần bổ sung quy trình kiểm duyệt dữ liệu, giới hạn tần suất gọi AI, ẩn khóa API ở phía máy chủ, kiểm tra quyền truy cập theo người dùng và thông báo rõ khi kết quả chỉ là đánh giá tự động. Đây là điều kiện cần để phát triển prototype thành sản phẩm thật.',
'Về giáo dục, hướng phát triển quan trọng nhất là liên kết điểm số với bài ôn cụ thể: lỗi kính ngữ dẫn đến bài luyện 请/您, thiếu từ ngành dẫn đến flashcard theo lĩnh vực, câu quá ngắn dẫn đến nhiệm vụ mở rộng ý.'
],
'18. KẾT LUẬN':[
'Điểm mạnh của dự án là nhìn việc học tiếng Trung từ góc độ hành vi sử dụng. Người học không chỉ cần biết thêm từ mà cần hoàn thành một hành động giao tiếp: xin phép, xác nhận, báo cáo, hỏi lại, giải thích hoặc đề xuất.',
'Trong giai đoạn tiếp theo, nhóm cần kiểm thử với nhiều người dùng thật hơn, đặc biệt là sinh viên thuộc các ngành khác nhau. Dữ liệu kiểm thử sẽ giúp điều chỉnh độ khó, chất lượng câu gợi ý, cách tính điểm và thứ tự ưu tiên tính năng.',
'Với nền tảng hiện có, InternChinese có thể phát triển thành một hệ sinh thái luyện giao tiếp nghề nghiệp bằng tiếng Trung, kết nối người học, giảng viên và doanh nghiệp.'
]
}
def add_after(par, text):
    new=OxmlElement('w:p'); par._p.addnext(new)
    from docx.text.paragraph import Paragraph
    np=Paragraph(new, par._parent); np.style=doc.styles['Normal']; r=np.add_run(text)
    r.font.name='Times New Roman'; r._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); r.font.size=Pt(13)
for par in list(doc.paragraphs):
    if par.style.name=='Heading 1':
        key=par.text
        if key in extra:
            for text in reversed(extra[key]): add_after(par,text)
doc.save(path)
print(path)


-- Ngành mới
INSERT INTO public.categories (name, name_zh, description, icon, display_order)
SELECT v.n, v.z, v.d, v.i, v.o FROM (VALUES
($q$Công nghệ thông tin$q$, $q$信息技术$q$, $q$Giao tiếp với đội kỹ thuật: lỗi hệ thống, họp sprint, hỗ trợ người dùng, bảo mật.$q$, $q$laptop$q$, 7),
($q$Tài chính - Kế toán$q$, $q$财务与会计$q$, $q$Hóa đơn, thanh toán, báo cáo thu chi, đối chiếu công nợ, thuế.$q$, $q$calculator$q$, 8),
($q$Marketing - Truyền thông$q$, $q$市场营销与传媒$q$, $q$Lên kế hoạch chiến dịch, nội dung mạng xã hội, quảng cáo, phân tích khách hàng.$q$, $q$megaphone$q$, 9),
($q$Logistics - Kho vận$q$, $q$物流与仓储$q$, $q$Nhập xuất kho, theo dõi vận chuyển, kiểm đếm hàng hóa, giao nhận.$q$, $q$truck$q$, 10),
($q$Giáo dục - Đào tạo$q$, $q$教育与培训$q$, $q$Hỗ trợ lớp học, tư vấn khóa học, liên lạc phụ huynh, tổ chức sự kiện đào tạo.$q$, $q$book$q$, 11),
($q$Y tế - Dược phẩm$q$, $q$医疗与医药$q$, $q$Tiếp đón bệnh nhân, hỏi triệu chứng cơ bản, hướng dẫn thủ tục, tư vấn thuốc.$q$, $q$heart$q$, 12)
) AS v(n,z,d,i,o) WHERE NOT EXISTS (SELECT 1 FROM public.categories x WHERE x.name = v.n);

// Chuẩn hóa để tìm kiếm không phân biệt dấu/hoa thường: "Xuất nhập khẩu" ⇄ "xuat nhap khau", "nǐ hǎo" ⇄ "ni hao"
export const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()

export const hasZh = (s) => /[一-鿿]/.test(s || '')

// true nếu MỌI từ trong q đều xuất hiện ở đâu đó trong các trường
export const matchAll = (fields, q) => {
  const hay = norm(fields.filter(Boolean).join(' '))
  const raw = (fields.filter(Boolean).join(' ')).toLowerCase()
  return norm(q).split(' ').filter(Boolean).every(w => hay.includes(w) || raw.includes(w))
}

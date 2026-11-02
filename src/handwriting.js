// Nhận diện chữ Hán viết tay bằng Google Input Tools (miễn phí, không cần key).
// strokes: mảng nét, mỗi nét là [[x...],[y...],[t...]] — trả về danh sách chữ gợi ý.
export async function recognizeInk(strokes, width, height) {
  if (!strokes.length) return []
  const r = await fetch('https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=internchinese', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      options: 'enable_pre_space',
      requests: [{ writing_guide: { writing_area_width: width, writing_area_height: height }, ink: strokes, language: 'zh' }],
    }),
  })
  if (!r.ok) throw new Error('Không nhận diện được nét viết (HTTP ' + r.status + ')')
  const j = await r.json()
  if (j[0] !== 'SUCCESS') throw new Error('Không nhận diện được nét viết')
  return (j[1]?.[0]?.[1] || []).filter(c => /[一-鿿]/.test(c)).slice(0, 12)
}

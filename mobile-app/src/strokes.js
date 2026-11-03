
export const STROKES = [
  {
    zh: '横',
    py: 'héng',
    vi: 'Nét ngang',
    how: 'Viết từ TRÁI sang PHẢI, hơi dốc lên một chút.',
    ex: '一 二 三 王',
    pts: [[14, 54], [50, 50], [86, 46]]
  },
  {
    zh: '竖',
    py: 'shù',
    vi: 'Nét sổ',
    how: 'Viết từ TRÊN xuống DƯỚI, thẳng đứng.',
    ex: '十 中 上 午',
    pts: [[50, 10], [50, 50], [50, 90]]
  },
  {
    zh: '撇',
    py: 'piě',
    vi: 'Nét phẩy',
    how: 'Viết từ trên-phải kéo xuống dưới-TRÁI, nhẹ dần ở cuối.',
    ex: '人 千 白 毛',
    pts: [[72, 12], [52, 45], [26, 88]]
  },
  {
    zh: '捺',
    py: 'nà',
    vi: 'Nét mác',
    how: 'Viết từ trên-trái kéo xuống dưới-PHẢI, đầu nét mảnh, cuối nét đậm.',
    ex: '人 大 天 木',
    pts: [[22, 14], [52, 52], [88, 88]]
  },
  {
    zh: '点',
    py: 'diǎn',
    vi: 'Nét chấm',
    how: 'Chấm ngắn, ấn từ trên xuống chếch sang phải.',
    ex: '主 六 办 衣',
    pts: [[42, 34], [50, 48], [58, 64]]
  },
  {
    zh: '提',
    py: 'tí',
    vi: 'Nét hất',
    how: 'Viết từ dưới-trái hất lên trên-PHẢI.',
    ex: '打 我 习 地',
    pts: [[18, 78], [50, 56], [84, 28]]
  },
  {
    zh: '横折',
    py: 'héngzhé',
    vi: 'Ngang gập',
    how: 'Viết ngang sang phải rồi gập xuống dưới.',
    ex: '口 日 四 国',
    pts: [[18, 24], [50, 24], [80, 24], [80, 55], [80, 88]]
  },
  {
    zh: '竖钩',
    py: 'shùgōu',
    vi: 'Sổ móc',
    how: 'Viết sổ xuống, cuối nét móc nhẹ sang TRÁI.',
    ex: '小 水 才 到',
    pts: [[56, 10], [56, 50], [56, 78], [40, 90]]
  },
  {
    zh: '横钩',
    py: 'hénggōu',
    vi: 'Ngang móc',
    how: 'Viết ngang sang phải rồi móc xuống chếch về TRÁI.',
    ex: '你 写 买 宁',
    pts: [[14, 34], [48, 34], [80, 34], [70, 54]]
  },
  {
    zh: '竖提',
    py: 'shùtí',
    vi: 'Sổ hất',
    how: 'Viết sổ xuống rồi hất chếch lên PHẢI.',
    ex: '良 以 民 长',
    pts: [[34, 10], [34, 50], [34, 80], [70, 56]]
  },
  {
    zh: '撇折',
    py: 'piězhé',
    vi: 'Phẩy gập',
    how: 'Phẩy xuống trái rồi gập chếch sang PHẢI.',
    ex: '去 么 参 红',
    pts: [[66, 12], [46, 36], [28, 56], [76, 64]]
  },
  {
    zh: '竖折',
    py: 'shùzhé',
    vi: 'Sổ gập',
    how: 'Viết sổ xuống rồi gập ngang sang PHẢI.',
    ex: '山 母 出 世',
    pts: [[28, 12], [28, 50], [28, 84], [62, 84], [86, 84]]
  }
]

// ==========================================
// GEOMETRY HELPERS
// ==========================================

const d = (a, b) => Math.hypot(
  a[0] - b[0],
  a[1] - b[1]
)

function length(p) {
  let total = 0

  for (let i = 1; i < p.length; i++) {
    total += d(p[i - 1], p[i])
  }

  return total
}

function resample(p, n = 32) {
  if (!Array.isArray(p) || p.length === 0) {
    return []
  }

  if (p.length === 1) {
    return Array(n).fill([p[0][0], p[0][1]])
  }

  const distances = [0]

  for (let i = 1; i < p.length; i++) {
    distances[i] = distances[i - 1] + d(p[i - 1], p[i])
  }

  const total = distances[distances.length - 1]

  if (total < 0.001) {
    return Array(n).fill([p[0][0], p[0][1]])
  }

  const result = []
  let j = 1

  for (let k = 0; k < n; k++) {
    const target = total * k / (n - 1)

    while (
      j < p.length - 1 &&
      distances[j] < target
    ) {
      j++
    }

    const segmentLength =
      distances[j] - distances[j - 1] || 1

    const t = (
      target - distances[j - 1]
    ) / segmentLength

    result.push([
      p[j - 1][0] +
        (p[j][0] - p[j - 1][0]) * t,

      p[j - 1][1] +
        (p[j][1] - p[j - 1][1]) * t
    ])
  }

  return result
}

const center = (p) => {
  const c = p.reduce(
    (sum, point) => [
      sum[0] + point[0],
      sum[1] + point[1]
    ],
    [0, 0]
  ).map(v => v / p.length)

  return p.map(point => [
    point[0] - c[0],
    point[1] - c[1]
  ])
}

const mean = (a, b) => {
  if (!a.length || a.length !== b.length) {
    return Infinity
  }

  return a.reduce(
    (sum, point, i) => sum + d(point, b[i]),
    0
  ) / a.length
}

const worst = (a, b) => {
  if (!a.length || a.length !== b.length) {
    return Infinity
  }

  return Math.max(
    ...a.map((point, i) => d(point, b[i]))
  )
}

const curl = (p) => {
  const direct = d(p[0], p[p.length - 1])

  return length(p) / Math.max(1, direct)
}

const angle = (p) => {
  return Math.atan2(
    p[p.length - 1][1] - p[0][1],
    p[p.length - 1][0] - p[0][0]
  ) * 180 / Math.PI
}

const adiff = (a, b) => {
  const diff = Math.abs(a - b) % 360

  return diff > 180 ? 360 - diff : diff
}

const smooth = (p) => {
  if (p.length < 3) return p

  return p.map((point, i) => {
    if (i === 0 || i === p.length - 1) {
      return point
    }

    return [
      (p[i - 1][0] + point[0] + p[i + 1][0]) / 3,
      (p[i - 1][1] + point[1] + p[i + 1][1]) / 3
    ]
  })
}

// Góc chuyển hướng tại từng điểm
function getTurnAngles(points) {
  const result = []

  for (let i = 1; i < points.length - 1; i++) {
    const a = Math.atan2(
      points[i][1] - points[i - 1][1],
      points[i][0] - points[i - 1][0]
    ) * 180 / Math.PI

    const b = Math.atan2(
      points[i + 1][1] - points[i][1],
      points[i + 1][0] - points[i][0]
    ) * 180 / Math.PI

    result.push(adiff(a, b))
  }

  return result
}

function getSegmentAngles(points, count = 8) {
  const result = []
  const step = (points.length - 1) / count

  for (let i = 0; i < count; i++) {
    const start = points[Math.round(i * step)]
    const end = points[Math.round((i + 1) * step)]

    result.push(
      Math.atan2(
        end[1] - start[1],
        end[0] - start[0]
      ) * 180 / Math.PI
    )
  }

  return result
}

// Sai số vị trí điểm đầu/cuối
function endpointError(user, tpl) {
  return {
    start: d(user[0], tpl[0]),
    end: d(
      user[user.length - 1],
      tpl[tpl.length - 1]
    )
  }
}

// Kiểm tra dữ liệu tọa độ
function validPoints(points) {
  return (
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(point =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1])
    )
  )
}

// ==========================================
// STROKE JUDGEMENT
// ==========================================

export function judgeStroke(user, tpl) {
  const fail = (msg, score = 0, details = {}) => ({
    ok: false,
    msg,
    score: Math.round(score),
    details
  })

  // 1. Validate input
  if (!validPoints(user) || !validPoints(tpl)) {
    return fail('Dữ liệu nét viết không hợp lệ.')
  }

  const rawUser = user.map(p => [p[0], p[1]])
  const rawTpl = tpl.map(p => [p[0], p[1]])

  const userLength = length(rawUser)
  const tplLength = length(rawTpl)

  if (rawUser.length < 3 || userLength < 5) {
    return fail('Nét quá ngắn — hãy kéo bút dài hơn.')
  }

  if (tplLength < 1) {
    return fail('Dữ liệu mẫu không hợp lệ.')
  }

  // 2. Resample để so sánh công bằng
  const U = resample(rawUser, 32)
  const T = resample(rawTpl, 32)

  const userSmooth = smooth(U)

  // 3. Kiểm tra chiều viết
  const directionError = adiff(
    angle(rawUser),
    angle(rawTpl)
  )

  const forwardError = mean(
    center(userSmooth),
    center(T)
  )

  const reverseError = mean(
    center(userSmooth),
    center([...T].reverse())
  )

  if (
    reverseError + 3 < forwardError &&
    directionError > 100
  ) {
    return fail(
      'Sai chiều viết — hãy bắt đầu từ điểm xanh và viết theo mũi tên.'
    )
  }

  // 4. Kiểm tra độ dài
  const ratio = userLength / tplLength

  if (ratio < 0.70) {
    return fail(
      'Nét quá ngắn — hãy viết đủ chiều dài theo mẫu.'
    )
  }

  if (ratio > 1.40) {
    return fail(
      'Nét quá dài — cần dừng đúng vị trí kết thúc.'
    )
  }

  // 5. Kiểm tra hướng tổng thể
  if (directionError > 28) {
    return fail(
      'Hướng nét bị lệch — hãy quan sát lại hướng mũi tên.'
    )
  }

  // 6. Kiểm tra điểm bắt đầu và kết thúc
  const endpoints = endpointError(rawUser, rawTpl)

  if (endpoints.start > 22) {
    return fail(
      'Điểm bắt đầu chưa đúng — hãy đặt bút gần chấm xanh hơn.'
    )
  }

  if (endpoints.end > 22) {
    return fail(
      'Điểm kết thúc chưa đúng — hãy dừng bút tại vị trí mẫu.'
    )
  }

  // 7. Kiểm tra độ cong tổng thể
  const userCurl = curl(U)
  const tplCurl = curl(T)

  if (userCurl > tplCurl * 1.30 + 0.10) {
    return fail(
      'Nét bị cong hoặc lượn quá nhiều — hãy viết dứt khoát hơn.'
    )
  }

  // 8. So sánh hình dạng tổng thể
  const normalizedUser = center(userSmooth)
  const normalizedTpl = center(T)

  const shapeMean = mean(
    normalizedUser,
    normalizedTpl
  )

  const shapeWorst = worst(
    normalizedUser,
    normalizedTpl
  )

  if (shapeMean > 12 || shapeWorst > 27) {
    return fail(
      'Hình dạng nét chưa giống mẫu — hãy chú ý đường đi của nét.'
    )
  }

  // 9. So sánh hướng chuyển động từng đoạn
  const userSegments = getSegmentAngles(U, 8)
  const tplSegments = getSegmentAngles(T, 8)

  const segmentErrors = userSegments.map(
    (a, i) => adiff(a, tplSegments[i])
  )

  const maxSegmentError = Math.max(...segmentErrors)
  const avgSegmentError =
    segmentErrors.reduce((a, b) => a + b, 0) /
    segmentErrors.length

  if (maxSegmentError > 65 && avgSegmentError > 28) {
    return fail(
      'Có đoạn viết sai hướng — hãy kiểm tra phần chuyển hướng của nét.'
    )
  }

  // 10. Kiểm tra vị trí gập/móc
  const userTurns = getTurnAngles(U)
  const tplTurns = getTurnAngles(T)

  const turnError = mean(
    userTurns.map(v => [v, 0]),
    tplTurns.map(v => [v, 0])
  )

  // Không áp dụng ngưỡng quá chặt cho nét ít điểm chuyển hướng.
  if (
    tplTurns.some(v => v > 35) &&
    turnError > 28
  ) {
    return fail(
      'Vị trí gập hoặc móc chưa đúng — hãy chú ý điểm chuyển hướng.'
    )
  }

  // 11. Tính điểm tổng hợp
  const lengthScore = Math.max(
    0,
    100 - Math.abs(1 - ratio) * 100
  )

  const directionScore = Math.max(
    0,
    100 - directionError * 2
  )

  const endpointScore = Math.max(
    0,
    100 - (
      endpoints.start * 0.5 +
      endpoints.end * 0.5
    ) * 3
  )

  const shapeScore = Math.max(
    0,
    100 - shapeMean * 5
  )

  const segmentScore = Math.max(
    0,
    100 - avgSegmentError * 2
  )

  const turnScore = Math.max(
    0,
    100 - turnError * 2
  )

  const score =
    lengthScore * 0.15 +
    directionScore * 0.15 +
    endpointScore * 0.15 +
    shapeScore * 0.25 +
    segmentScore * 0.15 +
    turnScore * 0.15

  // 12. Ngưỡng đạt
  if (score < 65) {
    return fail(
      'Nét chưa đạt yêu cầu — hãy viết chậm hơn và bám sát mẫu.',
      score,
      {
        ratio,
        directionError,
        endpoints,
        shapeMean,
        shapeWorst,
        avgSegmentError,
        turnError
      }
    )
  }

  let msg = 'Đạt yêu cầu! Nét viết đúng hướng và hình dạng.'

  if (score >= 90) {
    msg = 'Rất tốt! Nét viết chính xác và cân đối.'
  } else if (score >= 80) {
    msg = 'Tốt! Nét viết đạt yêu cầu.'
  }

  return {
    ok: true,
    msg,
    score: Math.round(score),
    details: {
      ratio,
      directionError,
      endpoints,
      shapeMean,
      shapeWorst,
      avgSegmentError,
      turnError
    }
  }
}

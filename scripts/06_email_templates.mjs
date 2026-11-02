// Sinh mẫu email Supabase Auth theo phong cách Trung Hoa của web (đỏ #b3202a, vàng kim, giấy gạo).
// Dán nội dung từng file vào Supabase → Authentication → Email Templates.
import fs from 'node:fs'

const FONT_ZH = "'Noto Serif SC','Songti SC','STSong','SimSun','Source Han Serif SC',serif"
const FONT_VI = "'Be Vietnam Pro','Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const layout = ({ preheader, zhTitle, title, intro, button, link, outro, code }) => `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#efe2c4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#efe2c4;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#efe2c4" style="background:#efe2c4;">
<tr><td align="center" style="padding:28px 12px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fbf6e8;border:1px solid #c9a227;border-radius:6px;">
    <!-- dải đỏ + viền vàng -->
    <tr><td bgcolor="#b3202a" style="background:#b3202a;border-bottom:4px solid #c9a227;border-radius:5px 5px 0 0;padding:20px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="52" valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="46" height="46" align="center" valign="middle" bgcolor="#f7efdc" style="background:#f7efdc;border:2px solid #b3202a;outline:2px solid #f7efdc;border-radius:6px;font-family:${FONT_ZH};font-size:26px;font-weight:900;color:#b3202a;line-height:46px;">实</td>
          </tr></table>
        </td>
        <td valign="middle" style="padding-left:14px;">
          <div style="font-family:${FONT_ZH};font-size:22px;font-weight:900;letter-spacing:2px;color:#ffffff;line-height:1.2;">InternChinese</div>
          <div style="font-family:${FONT_VI};font-size:12px;color:#e8d49a;line-height:1.4;">实习汉语 · Tiếng Trung thực tập</div>
        </td>
      </tr></table>
    </td></tr>

    <!-- hoa văn -->
    <tr><td align="center" style="padding:12px 0 0;font-family:${FONT_ZH};font-size:12px;letter-spacing:6px;color:#c9a227;line-height:1;">◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</td></tr>

    <!-- nội dung -->
    <tr><td style="padding:26px 36px 8px;">
      <div style="font-family:${FONT_ZH};font-size:46px;font-weight:900;letter-spacing:6px;color:#b3202a;line-height:1.1;text-align:center;">${zhTitle}</div>
      <div style="font-family:${FONT_ZH};font-size:20px;font-weight:700;color:#231a14;text-align:center;margin-top:10px;line-height:1.35;">${title}</div>
      <div style="width:60px;height:3px;background:#b3202a;margin:16px auto 0;font-size:0;line-height:0;">&nbsp;</div>
    </td></tr>
    <tr><td style="padding:14px 36px 4px;font-family:${FONT_VI};font-size:15px;line-height:1.7;color:#4a3b30;">
      ${intro}
    </td></tr>

    ${code ? `<tr><td align="center" style="padding:14px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#f7efdc" align="center" style="background:#f7efdc;border:2px dashed #c9a227;border-radius:6px;padding:14px 30px;font-family:${FONT_ZH};font-size:34px;font-weight:900;letter-spacing:10px;color:#b3202a;">{{ .Token }}</td>
      </tr></table>
    </td></tr>` : ''}

    ${button ? `<tr><td align="center" style="padding:20px 36px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#b3202a" style="background:#b3202a;border:1px solid #c9a227;border-bottom:3px solid #8a1620;border-radius:4px;">
          <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 38px;font-family:${FONT_ZH};font-size:16px;font-weight:700;letter-spacing:1px;color:#ffffff;text-decoration:none;">${button}</a>
        </td>
      </tr></table>
    </td></tr>` : ''}

    ${link ? `<tr><td style="padding:14px 36px 0;font-family:${FONT_VI};font-size:12px;line-height:1.6;color:#7a6a58;">
      Nếu nút không hoạt động, hãy sao chép đường dẫn này vào trình duyệt:<br>
      <a href="{{ .ConfirmationURL }}" target="_blank" style="color:#b3202a;word-break:break-all;">{{ .ConfirmationURL }}</a>
    </td></tr>` : ''}

    <tr><td style="padding:18px 36px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#f7efdc" style="background:#f7efdc;border-left:4px solid #c9a227;border-radius:3px;padding:12px 16px;font-family:${FONT_VI};font-size:13px;line-height:1.6;color:#6b5a4a;">${outro}</td>
      </tr></table>
    </td></tr>

    <!-- chân thư -->
    <tr><td bgcolor="#b3202a" align="center" style="background:#b3202a;border-top:4px solid #c9a227;border-radius:0 0 5px 5px;padding:16px 20px;">
      <div style="font-family:${FONT_ZH};font-size:18px;letter-spacing:8px;color:#e8d49a;">学以致用</div>
      <div style="font-family:${FONT_VI};font-size:12px;color:#f3e3c0;margin-top:6px;line-height:1.5;">InternChinese · Luyện giao tiếp tiếng Trung nơi công sở<br><a href="{{ .SiteURL }}" target="_blank" style="color:#e8d49a;">{{ .SiteURL }}</a></div>
    </td></tr>
  </table>

  <div style="max-width:560px;font-family:${FONT_VI};font-size:11px;line-height:1.6;color:#8a7a68;text-align:center;padding:14px 8px 0;">
    Email này được gửi tới {{ .Email }} vì có yêu cầu tại InternChinese. Nếu không phải bạn, hãy bỏ qua email này.
  </div>

</td></tr>
</table>
</body>
</html>
`

const ignore = 'Nếu bạn không thực hiện yêu cầu này, cứ yên tâm bỏ qua email — tài khoản của bạn vẫn an toàn.'
const T = {
  'confirm-signup': { subject: '欢迎加入 InternChinese — Xác nhận email của bạn',
    preheader: 'Chỉ còn một bước để bắt đầu luyện tiếng Trung thực tập.',
    zhTitle: '欢迎', title: 'Chào mừng bạn đến với InternChinese',
    intro: 'Cảm ơn bạn đã đăng ký! Hãy xác nhận địa chỉ email để kích hoạt tài khoản và bắt đầu luyện giao tiếp tiếng Trung qua các tình huống thực tập thực tế.',
    button: '确认邮箱 · Xác nhận email', link: true, outro: 'Đường dẫn có hiệu lực trong thời gian ngắn. ' + ignore },
  'invite': { subject: '您被邀请 — Lời mời tham gia InternChinese',
    preheader: 'Bạn được mời tham gia InternChinese.',
    zhTitle: '邀请', title: 'Bạn được mời tham gia InternChinese',
    intro: 'Bạn vừa được mời sử dụng InternChinese, nơi luyện tiếng Trung giao tiếp cho sinh viên thực tập. Bấm nút bên dưới để chấp nhận lời mời và đặt mật khẩu.',
    button: '接受邀请 · Chấp nhận lời mời', link: true, outro: ignore },
  'magic-link': { subject: '登录链接 — Liên kết đăng nhập InternChinese',
    preheader: 'Bấm để đăng nhập, không cần mật khẩu.',
    zhTitle: '登录', title: 'Đăng nhập vào InternChinese',
    intro: 'Bấm nút bên dưới để đăng nhập vào tài khoản của bạn — không cần nhập mật khẩu.',
    button: '立即登录 · Đăng nhập', link: true, outro: 'Liên kết chỉ dùng được một lần và sẽ hết hạn sau ít phút. ' + ignore },
  'change-email': { subject: '更换邮箱 — Xác nhận đổi email InternChinese',
    preheader: 'Xác nhận địa chỉ email mới cho tài khoản của bạn.',
    zhTitle: '更换', title: 'Xác nhận đổi địa chỉ email',
    intro: 'Bạn đã yêu cầu đổi email tài khoản từ <b>{{ .Email }}</b> sang <b>{{ .NewEmail }}</b>. Bấm nút bên dưới để xác nhận thay đổi.',
    button: '确认更换 · Xác nhận đổi email', link: true, outro: ignore },
  'reset-password': { subject: '重置密码 — Đặt lại mật khẩu InternChinese',
    preheader: 'Đặt lại mật khẩu cho tài khoản InternChinese của bạn.',
    zhTitle: '重置', title: 'Đặt lại mật khẩu',
    intro: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để tạo mật khẩu mới.',
    button: '重置密码 · Đặt lại mật khẩu', link: true, outro: 'Vì lý do bảo mật, liên kết sẽ hết hạn sau ít phút. ' + ignore },
  'reauthentication': { subject: '验证码 — Mã xác thực InternChinese',
    preheader: 'Mã xác thực của bạn: {{ .Token }}',
    zhTitle: '验证', title: 'Mã xác thực của bạn',
    intro: 'Hãy nhập mã dưới đây để xác nhận thao tác của bạn trên InternChinese.',
    code: true, outro: 'Không chia sẻ mã này với bất kỳ ai. ' + ignore },
}

fs.mkdirSync('email-templates', { recursive: true })
let md = '# Mẫu email Supabase — InternChinese\n\nSupabase → Authentication → Emails (Email Templates). Với mỗi loại: dán **Subject** và nội dung file HTML tương ứng.\n\n| Loại (Supabase) | File | Subject |\n|---|---|---|\n'
const NAMES = { 'confirm-signup': 'Confirm sign up', invite: 'Invite user', 'magic-link': 'Magic link', 'change-email': 'Change email address', 'reset-password': 'Reset password', reauthentication: 'Reauthentication' }
for (const [k, v] of Object.entries(T)) {
  fs.writeFileSync(`email-templates/${k}.html`, layout(v))
  md += `| ${NAMES[k]} | \`${k}.html\` | ${v.subject} |\n`
}
fs.writeFileSync('email-templates/README.md', md)
console.log(Object.keys(T).length, 'mẫu đã tạo')

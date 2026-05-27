// 관리자 이메일 알림 (Resend API 사용)
// 환경변수 RESEND_API_KEY, ADMIN_NOTIFY_EMAIL 필요

type SurveyCompleteParams = {
  userName: string;
  companyName: string;
  eventName: string;
  eventCategory?: string;
  registrationId: string;
};

type RegistrationCompleteParams = {
  userName: string;
  companyName: string;
  department?: string;
  jobTitle?: string;
  email: string;
  phone?: string;
  eventName: string;
  eventCategory?: string;
  registrationId: string;
};

function formatKstNow(): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}. ${parts.month}. ${parts.day} ${parts.hour}:${parts.minute} (KST)`;
}

async function sendResendMail(opts: { subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[notify] RESEND_API_KEY 미설정 — 알림 생략');
    return;
  }
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'isjeong@cloocus.com';
  const fromAddr = process.env.RESEND_FROM || 'Cloocus Event <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [adminEmail],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[notify] Resend 전송 실패:', res.status, errText);
    }
  } catch (err) {
    console.error('[notify] 네트워크 오류:', err);
  }
}

export async function notifyAdminSurveyComplete(params: SurveyCompleteParams): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloocus-event-2026.vercel.app';
  const adminUrl = `${siteUrl}/admin-cloocus-mkt/survey-responses`;
  const receivedAt = formatKstNow();

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'Malgun Gothic',Arial,sans-serif;background:#f9fafb;padding:30px 0;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:24px 30px;background:linear-gradient(135deg,#4c2d96 0%,#6d28d9 100%);color:#fff;">
        <div style="font-size:13px;opacity:0.85;letter-spacing:1px;">CLOOCUS EVENT · 설문조사 알림</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px;">📝 새 설문 응답이 접수되었습니다</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:90px;">이벤트</td><td style="padding:8px 0;font-weight:600;color:#111;">${params.eventName}</td></tr>
          ${params.eventCategory ? `<tr><td style="padding:8px 0;color:#6b7280;">카테고리</td><td style="padding:8px 0;color:#4c2d96;">${params.eventCategory}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">응답자</td><td style="padding:8px 0;font-weight:600;color:#111;">${params.userName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">회사</td><td style="padding:8px 0;color:#111;">${params.companyName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">접수 시각</td><td style="padding:8px 0;color:#111;">${receivedAt}</td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
          <tr><td align="center">
            <a href="${adminUrl}" style="display:inline-block;padding:14px 32px;background:#4c2d96;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
              관리자 페이지에서 바로 확인하기 →
            </a>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:20px 0 0;">버튼이 작동하지 않으면 아래 링크를 복사해서 열어주세요.<br/><a href="${adminUrl}" style="color:#6d28d9;word-break:break-all;">${adminUrl}</a></p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 30px;background:#f9fafb;font-size:11.5px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;">
        본 메일은 Cloocus Event System에서 자동 발송되었습니다.
      </td>
    </tr>
  </table>
  </td></tr>
</table>`;

  await sendResendMail({
    subject: `설문조사 접수_${params.eventName}`,
    html,
  });
}

export async function notifyAdminRegistrationComplete(params: RegistrationCompleteParams): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloocus-event-2026.vercel.app';
  const adminUrl = `${siteUrl}/admin-cloocus-mkt`;
  const receivedAt = formatKstNow();

  const escape = (v: string) => v.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const safe = {
    userName: escape(params.userName),
    companyName: escape(params.companyName),
    department: params.department ? escape(params.department) : '',
    jobTitle: params.jobTitle ? escape(params.jobTitle) : '',
    email: escape(params.email),
    phone: params.phone ? escape(params.phone) : '',
    eventName: escape(params.eventName),
    eventCategory: params.eventCategory ? escape(params.eventCategory) : '',
  };

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'Malgun Gothic',Arial,sans-serif;background:#f9fafb;padding:30px 0;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:24px 30px;background:linear-gradient(135deg,#0f766e 0%,#0891b2 100%);color:#fff;">
        <div style="font-size:13px;opacity:0.85;letter-spacing:1px;">CLOOCUS EVENT · 등록 알림</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px;">🎟️ 새 이벤트 등록이 접수되었습니다</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:90px;">이벤트</td><td style="padding:8px 0;font-weight:600;color:#111;">${safe.eventName}</td></tr>
          ${safe.eventCategory ? `<tr><td style="padding:8px 0;color:#6b7280;">카테고리</td><td style="padding:8px 0;color:#0f766e;">${safe.eventCategory}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">신청자</td><td style="padding:8px 0;font-weight:600;color:#111;">${safe.userName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">회사</td><td style="padding:8px 0;color:#111;">${safe.companyName}</td></tr>
          ${safe.department || safe.jobTitle ? `<tr><td style="padding:8px 0;color:#6b7280;">부서·직책</td><td style="padding:8px 0;color:#111;">${[safe.department, safe.jobTitle].filter(Boolean).join(' · ')}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">이메일</td><td style="padding:8px 0;color:#111;">${safe.email}</td></tr>
          ${safe.phone ? `<tr><td style="padding:8px 0;color:#6b7280;">연락처</td><td style="padding:8px 0;color:#111;">${safe.phone}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">접수 시각</td><td style="padding:8px 0;color:#111;">${receivedAt}</td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
          <tr><td align="center">
            <a href="${adminUrl}" style="display:inline-block;padding:14px 32px;background:#0f766e;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
              관리자 페이지에서 바로 확인하기 →
            </a>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:20px 0 0;">버튼이 작동하지 않으면 아래 링크를 복사해서 열어주세요.<br/><a href="${adminUrl}" style="color:#0891b2;word-break:break-all;">${adminUrl}</a></p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 30px;background:#f9fafb;font-size:11.5px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;">
        본 메일은 Cloocus Event System에서 자동 발송되었습니다.
      </td>
    </tr>
  </table>
  </td></tr>
</table>`;

  await sendResendMail({
    subject: `이벤트 등록 접수_${params.eventName}`,
    html,
  });
}

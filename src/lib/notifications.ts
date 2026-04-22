// 관리자 이메일 알림 (Resend API 사용)
// 환경변수 RESEND_API_KEY, ADMIN_NOTIFY_EMAIL 필요

type SurveyCompleteParams = {
  userName: string;
  companyName: string;
  eventName: string;
  eventCategory?: string;
  registrationId: string;
};

export async function notifyAdminSurveyComplete(params: SurveyCompleteParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[notify] RESEND_API_KEY 미설정 — 알림 생략');
    return;
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'isjeong@cloocus.com';
  const fromAddr = process.env.RESEND_FROM || 'Cloocus Event <onboarding@resend.dev>';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloocus-event-2026.vercel.app';
  const adminUrl = `${siteUrl}/admin-cloocus-mkt/survey-responses`;

  // 한국 시간(KST, UTC+9) 기준으로 표시
  const now = new Date();
  const kstParts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now).reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const receivedAt = `${kstParts.year}. ${kstParts.month}. ${kstParts.day} ${kstParts.hour}:${kstParts.minute} (KST)`;

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
        subject: `설문조사 접수_${params.eventName}`,
        html,
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

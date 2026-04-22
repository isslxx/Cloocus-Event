import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/supabase-auth';
import { notifyAdminSurveyComplete } from '@/lib/notifications';

// 관리자 알림 이메일 테스트용 엔드포인트
// 호출: /api/admin/test-notify (Authorization 헤더 필요)
export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'isjeong@cloocus.com';
  const fromAddr = process.env.RESEND_FROM || 'Cloocus Event <onboarding@resend.dev>';

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'RESEND_API_KEY 환경변수가 설정되지 않았습니다.',
      hint: 'Vercel Settings → Environment Variables에 RESEND_API_KEY 추가 후 Redeploy 필요',
    }, { status: 500 });
  }

  // 직접 Resend 호출해서 상세 응답 반환
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddr,
        to: [adminEmail],
        subject: `[TEST] 설문조사 접수 알림 테스트_${new Date().toISOString().slice(0, 16)}`,
        html: `<p>Cloocus Event System 알림 테스트입니다.</p><p>이 메일을 받으셨다면 Resend 설정이 정상입니다.</p><p>from: ${fromAddr}<br/>to: ${adminEmail}</p>`,
      }),
    });

    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* ignore */ }

    // 공통 부가정보
    await notifyAdminSurveyComplete({
      userName: '테스트 사용자',
      companyName: '테스트 회사',
      eventName: '알림 테스트 이벤트',
      eventCategory: '테스트',
      registrationId: '00000000-0000-0000-0000-000000000000',
    });

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      resend_response: body,
      config: {
        from: fromAddr,
        to: adminEmail,
        has_api_key: Boolean(apiKey),
        api_key_prefix: apiKey.slice(0, 6),
      },
      note: 'onboarding@resend.dev는 Resend 가입 시 등록한 이메일 주소로만 발송됩니다. 다른 주소로 받으려면 (a) 해당 주소로 Resend 가입 또는 (b) 도메인 검증 후 RESEND_FROM 환경변수 설정이 필요합니다.',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

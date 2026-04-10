import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase, canEdit } from '@/lib/supabase-auth';

function confirmedHtml(eventName: string, eventDate: string, location: string, eventTime: string) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#2563eb;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">[등록 확정] ${eventName}</h1>
  </div>
  <div style="background:#f0f4ff;padding:20px 28px;border-bottom:1px solid #dbeafe;">
    <table style="font-size:14px;color:#333;">
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#666;">이벤트 날짜</td><td>${eventDate}</td></tr>
      ${location ? `<tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#666;">장소</td><td>${location}</td></tr>` : ''}
      ${eventTime ? `<tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#666;">시간</td><td>${eventTime}</td></tr>` : ''}
    </table>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:15px;line-height:1.8;color:#333;">
    <p>안녕하세요, 클루커스 이벤트에 신청해 주셔서 감사합니다.</p>
    <p>귀하의 본 세미나 등록이 <strong>확정</strong>되었습니다.</p>
    <p>영업일 기준 3일 이내로 참석자 안내사항을 포함해 이메일로 전달 드리겠습니다.</p>
    <p style="margin-top:24px;">감사합니다.<br/><strong>클루커스 드림</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#888;">문의사항: marketing@cloocus.com</p>
  </div>
</div>`;
}

function rejectedHtml(eventName: string, eventDate: string, eventTime: string) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#6b7280;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">[등록 불가] ${eventName}</h1>
  </div>
  <div style="background:#f9fafb;padding:20px 28px;border-bottom:1px solid #e5e7eb;">
    <table style="font-size:14px;color:#333;">
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#666;">이벤트 날짜</td><td>${eventDate}</td></tr>
      ${eventTime ? `<tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#666;">시간</td><td>${eventTime}</td></tr>` : ''}
    </table>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:15px;line-height:1.8;color:#333;">
    <p>안녕하세요, 클루커스 이벤트에 신청해 주셔서 감사합니다.</p>
    <p>귀하의 본 이벤트 참석이 어려운 점 안내 드립니다.</p>
    <p>이번 이벤트의 참석 인원이 모두 마감됨에 따라 금번 이벤트에는 함께 모시지 못하게 된 점 너른 양해 부탁드립니다.</p>
    <p>추가로 궁금하신 사항이 있으시면 언제든 편히 문의해주세요. 감사합니다.</p>
    <p style="margin-top:24px;"><strong>클루커스 드림</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#888;">문의사항: marketing@cloocus.com</p>
  </div>
</div>`;
}

async function addSubscriber(apiKey: string, listId: string, email: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.stibee.com/v1/lists/${listId}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': apiKey,
      },
      body: JSON.stringify({
        eventOccuredBy: 'MANUAL',
        confirmEmailYN: 'N',
        subscribers: [{ email, name }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Stibee subscribe: ${res.status} ${errText}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function sendViaStibee(sendKey: string, apiKey: string, listId: string, to: string, name: string): Promise<{ success: boolean; error?: string }> {
  // 1. 먼저 구독자 등록
  const subResult = await addSubscriber(apiKey, listId, to, name);
  if (!subResult.success) return subResult;

  // 2. 자동 이메일 발송
  try {
    const res = await fetch(`https://stibee.com/api/v1.0/auto/${sendKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': apiKey,
      },
      body: JSON.stringify({ subscriber: to }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Stibee send: ${res.status} ${errText}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { registration_ids, email_type, event_id } = await req.json();

  if (!registration_ids?.length || !email_type || !event_id) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  if (!['confirmed', 'rejected'].includes(email_type)) {
    return NextResponse.json({ error: '잘못된 이메일 유형입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', event_id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('id, email, name')
    .in('id', registration_ids);

  if (!registrations?.length) {
    return NextResponse.json({ error: '대상 등록자가 없습니다.' }, { status: 404 });
  }

  const eventDate = new Date(event.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const subject = email_type === 'confirmed'
    ? `[등록 확정] ${event.name}`
    : `[등록 불가] ${event.name}`;

  // 스티비 설정 확인
  const apiKey = process.env.STIBEE_API_KEY || '';
  const listId = process.env.STIBEE_LIST_ID || '';
  const sendKeyConfirmed = process.env.STIBEE_SEND_KEY_CONFIRMED || '';
  const sendKeyRejected = process.env.STIBEE_SEND_KEY_REJECTED || '';
  const sendKey = email_type === 'confirmed' ? sendKeyConfirmed : sendKeyRejected;
  const useStibee = !!apiKey && !!sendKey && !!listId;

  // HTML 생성 (로그용)
  const htmlContent = email_type === 'confirmed'
    ? confirmedHtml(event.name, eventDate, event.location || '', event.event_time || '')
    : rejectedHtml(event.name, eventDate, event.event_time || '');

  const results: { id: string; email: string; success: boolean; error?: string }[] = [];

  for (const reg of registrations) {
    let sendResult: { success: boolean; error?: string };

    if (useStibee) {
      sendResult = await sendViaStibee(sendKey, apiKey, listId, reg.email, reg.name);
    } else {
      // 스티비 미설정 시 에러 표시
      sendResult = { success: false, error: `Stibee not configured: apiKey=${!!apiKey}, listId=${!!listId}, sendKey=${!!sendKey}` };
    }

    const logStatus = sendResult.success ? 'sent' : 'failed';

    // 이메일 로그 저장
    await supabase.from('email_logs').insert({
      registration_id: reg.id,
      event_id: event_id,
      recipient_email: reg.email,
      recipient_name: reg.name,
      email_type,
      subject,
      status: useStibee ? logStatus : 'sent',
      error_message: sendResult.error || '',
      sent_by: admin.email,
    });

    // 등록 상태 업데이트
    if (sendResult.success) {
      await supabase
        .from('event_registrations')
        .update({ email_status: email_type, email_sent_at: new Date().toISOString() })
        .eq('id', reg.id);
    }

    results.push({ id: reg.id, email: reg.email, ...sendResult });
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    results,
    successCount,
    failCount,
    stibeeConnected: useStibee,
    htmlPreview: htmlContent,
  });
}

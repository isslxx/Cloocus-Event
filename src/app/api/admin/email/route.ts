import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase, canEdit } from '@/lib/supabase-auth';

type TemplateVars = {
  event_name: string;
  event_date: string;
  event_time: string;
  event_location: string;
  user_name: string;
};

function generateSubject(type: 'confirmed' | 'rejected', vars: TemplateVars): string {
  return type === 'confirmed'
    ? `[등록 확정] ${vars.event_date} ${vars.event_name}`
    : `[등록 불가] ${vars.event_date} ${vars.event_name}`;
}

function confirmedHtml(v: TemplateVars) {
  const imgBase = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloocus-event-dfgk.vercel.app') : '';
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'Malgun Gothic',Arial,sans-serif;background:#f9fafb;padding:30px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;overflow:hidden;">
    <tr>
      <td align="center" style="padding:0;background-color:#4f46e5;border-radius:12px 12px 0 0;">
        <img src="${imgBase}/bg_purple.png" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0;" alt=""/>
        <div style="padding:0 20px 28px;color:#ffffff;font-size:22px;font-weight:700;">[등록 확정] ${v.event_name}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:22px;background:#f5f3ff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:8px 0;color:#6d28d9;font-weight:600;">날짜</td><td style="padding:8px 0;">${v.event_date}</td></tr>
          ${v.event_time ? `<tr><td style="padding:8px 0;color:#6d28d9;font-weight:600;">시간</td><td style="padding:8px 0;">${v.event_time}</td></tr>` : ''}
          ${v.event_location ? `<tr><td style="padding:8px 0;color:#6d28d9;font-weight:600;">장소</td><td style="padding:8px 0;">${v.event_location}</td></tr>` : ''}
        </table>
      </td>
    </tr>
    <tr><td align="center" style="background:#16a34a;color:#fff;padding:14px;font-weight:600;">귀하의 이벤트 등록이 확정되었습니다.</td></tr>
    <tr>
      <td style="padding:30px;font-size:15px;line-height:1.8;color:#333;">
        <p style="margin:0 0 16px;">안녕하세요, <strong>${v.user_name}</strong>님<br/>클루커스 이벤트에 신청해 주셔서 감사합니다.</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;">
          <tr><td style="padding:16px;">
            <div style="font-size:13px;color:#666;">신청 이벤트</div>
            <div style="font-size:16px;font-weight:600;margin-top:6px;">✔ ${v.event_name}</div>
          </td></tr>
        </table>
        <p style="margin:8px 0 16px;">해당 이벤트 등록이 <strong style="color:#6d28d9;">최종 확정</strong>되었습니다.<br/>참석자 안내사항을 3일 이내 이메일로 전달 드릴 예정입니다.</p>
        <p style="margin:24px 0 0;">감사합니다.<br/><strong>클루커스 드림</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;"/>
        <div style="text-align:center;font-size:12.5px;color:#888;line-height:1.7;">
          <div style="font-weight:600;color:#666;">(주)클루커스</div>
          <div>본사ㅣ서울특별시 강남구 논현로75길 6 (역삼동, 에비뉴75) | 📞 02-597-3400</div>
          <div style="margin-top:4px;">📧 marketing@cloocus.com</div>
        </div>
      </td>
    </tr>
  </table>
  </td></tr>
</table>`;
}

function rejectedHtml(v: TemplateVars) {
  const imgBase = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloocus-event-dfgk.vercel.app') : '';
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'Malgun Gothic',Arial,sans-serif;background:#f9fafb;padding:30px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;overflow:hidden;">
    <tr>
      <td align="center" style="padding:0;background-color:#6b7280;border-radius:12px 12px 0 0;">
        <img src="${imgBase}/bg_purple.png" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0;opacity:0.6;" alt=""/>
        <div style="padding:0 20px 28px;color:#ffffff;font-size:22px;font-weight:700;">[등록 불가] ${v.event_name}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:22px;background:#f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:8px 0;color:#666;font-weight:600;">이벤트</td><td style="padding:8px 0;">${v.event_name}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-weight:600;">날짜</td><td style="padding:8px 0;">${v.event_date}</td></tr>
          ${v.event_time ? `<tr><td style="padding:8px 0;color:#666;font-weight:600;">시간</td><td style="padding:8px 0;">${v.event_time}</td></tr>` : ''}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;font-size:15px;line-height:1.8;color:#333;">
        <p style="margin:0 0 16px;">안녕하세요, <strong>${v.user_name}</strong>님<br/>클루커스 이벤트에 신청해 주셔서 감사합니다.</p>
        <p style="margin:0 0 16px;">귀하의 "<strong>${v.event_name}</strong>" 참석이 어려운 점 안내 드립니다.</p>
        <p style="margin:0 0 16px;">이번 이벤트의 참석 인원이 모두 마감됨에 따라 금번 이벤트에는 함께 모시지 못하게 된 점 너른 양해 부탁드립니다.</p>
        <p style="margin:0 0 16px;">추가 문의사항이 있으시면 언제든 편히 문의해주세요.</p>
        <p style="margin:24px 0 0;">감사합니다.<br/><strong>클루커스 드림</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;"/>
        <div style="text-align:center;font-size:12.5px;color:#888;line-height:1.7;">
          <div style="font-weight:600;color:#666;">(주)클루커스</div>
          <div>본사ㅣ서울특별시 강남구 논현로75길 6 (역삼동, 에비뉴75) | 📞 02-597-3400</div>
          <div style="margin-top:4px;">📧 marketing@cloocus.com</div>
        </div>
      </td>
    </tr>
  </table>
  </td></tr>
</table>`;
}

type StibeeFields = {
  email: string;
  name: string;
  event_title?: string;
  event_name?: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  user_name?: string;
};

async function addSubscriber(apiKey: string, listId: string, fields: StibeeFields): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.stibee.com/v1/lists/${listId}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'AccessToken': apiKey },
      body: JSON.stringify({
        eventOccuredBy: 'MANUAL',
        confirmEmailYN: 'N',
        subscribers: [fields],
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

async function sendViaStibee(sendKey: string, apiKey: string, listId: string, fields: StibeeFields): Promise<{ success: boolean; error?: string }> {
  const subResult = await addSubscriber(apiKey, listId, fields);
  if (!subResult.success) return subResult;

  try {
    const res = await fetch(`https://stibee.com/api/v1.0/auto/${sendKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'AccessToken': apiKey },
      body: JSON.stringify({ subscriber: fields.email }),
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

// 미리보기 전용 엔드포인트
export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl;
  const event_id = url.searchParams.get('event_id') || '';
  const email_type = url.searchParams.get('email_type') || 'confirmed';

  if (!event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: event } = await supabase.from('events').select('*').eq('id', event_id).maybeSingle();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const eventDate = new Date(event.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const vars: TemplateVars = {
    event_name: event.name,
    event_date: eventDate,
    event_time: event.event_time || '',
    event_location: event.location || '',
    user_name: '홍길동',
  };

  const subject = generateSubject(email_type as 'confirmed' | 'rejected', vars);
  const html = email_type === 'confirmed' ? confirmedHtml(vars) : rejectedHtml(vars);

  return NextResponse.json({ subject, html, vars });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { registration_ids, email_type, event_id } = await req.json();

  if (!registration_ids?.length || !email_type) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  if (!['confirmed', 'rejected'].includes(email_type)) {
    return NextResponse.json({ error: '잘못된 이메일 유형입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // 등록자 조회 (event_id 포함)
  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('id, email, name, event_id')
    .in('id', registration_ids);

  if (!registrations?.length) return NextResponse.json({ error: '대상 등록자가 없습니다.' }, { status: 404 });

  // 관련된 모든 이벤트 조회 (각 등록자의 event_id가 다를 수 있음)
  const eventIds = [...new Set(registrations.map((r) => r.event_id || event_id).filter(Boolean))];
  const { data: eventsData } = await supabase.from('events').select('*').in('id', eventIds);
  const eventMap = new Map((eventsData || []).map((e) => [e.id, e]));

  // 폴백 이벤트 (event_id 파라미터로 전달된 것)
  const fallbackEvent = event_id ? eventMap.get(event_id) : null;

  const apiKey = process.env.STIBEE_API_KEY || '';
  const listId = process.env.STIBEE_LIST_ID || '';
  const sendKeyConfirmed = process.env.STIBEE_SEND_KEY_CONFIRMED || '';
  const sendKeyRejected = process.env.STIBEE_SEND_KEY_REJECTED || '';
  const sendKey = email_type === 'confirmed' ? sendKeyConfirmed : sendKeyRejected;
  const useStibee = !!apiKey && !!sendKey && !!listId;

  // 디버그 정보
  const stibeeDebug = {
    hasApiKey: !!apiKey,
    hasListId: !!listId,
    hasSendKey: !!sendKey,
    apiKeyPrefix: apiKey.slice(0, 8),
    listId,
    sendKeyPrefix: sendKey.slice(0, 8),
    useStibee,
  };

  const results: { id: string; email: string; success: boolean; error?: string }[] = [];

  for (const reg of registrations) {
    // 각 등록자의 이벤트 정보 개별 조회
    const regEvent = eventMap.get(reg.event_id || '') || fallbackEvent;
    if (!regEvent) {
      results.push({ id: reg.id, email: reg.email, success: false, error: '이벤트 정보를 찾을 수 없습니다.' });
      continue;
    }

    const eventDate = new Date(regEvent.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const vars: TemplateVars = {
      event_name: regEvent.name,
      event_date: eventDate,
      event_time: regEvent.event_time || '',
      event_location: regEvent.location || '',
      user_name: reg.name,
    };

    const subject = generateSubject(email_type as 'confirmed' | 'rejected', vars);

    let sendResult: { success: boolean; error?: string };

    if (useStibee) {
      const typeLabel = email_type === 'confirmed' ? '등록 확정' : '등록 불가';
      const stibeeFields: StibeeFields = {
        email: reg.email,
        name: reg.name,
        event_title: `[${typeLabel}] ${regEvent.name}`,
        event_name: regEvent.name,
        event_date: eventDate,
        event_time: regEvent.event_time || '',
        event_location: regEvent.location || '',
        user_name: reg.name,
      };
      sendResult = await sendViaStibee(sendKey, apiKey, listId, stibeeFields);
    } else {
      sendResult = { success: false, error: `Stibee not configured: apiKey=${stibeeDebug.hasApiKey}, listId=${stibeeDebug.hasListId}, sendKey=${stibeeDebug.hasSendKey}` };
    }

    const logStatus = sendResult.success ? 'sent' : 'failed';

    await supabase.from('email_logs').insert({
      registration_id: reg.id,
      event_id: reg.event_id || event_id,
      recipient_email: reg.email,
      recipient_name: reg.name,
      email_type,
      subject,
      status: logStatus,
      error_message: sendResult.error || '',
      sent_by: admin.email,
    });

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

  return NextResponse.json({ results, successCount, failCount, stibeeConnected: useStibee, stibeeDebug });
}

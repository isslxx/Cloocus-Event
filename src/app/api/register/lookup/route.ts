import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 이메일 + PIN으로 등록 정보 조회
export async function POST(req: NextRequest) {
  try {
    const { email, pin, event_id } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: '확인 암호 4자리를 입력해주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    let query = supabase
      .from('event_registrations')
      .select('id, name, company_name, company_name_raw, department, job_title, email, phone, industry, company_size, referral_source, referrer_name, inquiry, event_id, registration_status, survey_enabled, survey_completed, events!event_registrations_event_id_fkey(name, status, event_date, event_type, capacity, location, event_time, category, ended_at)')
      .eq('email', email.toLowerCase().trim())
      .eq('pin', pin)
      .is('deleted_at', null)
      .is('cancelled_at', null);

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: '일치하는 신청 내역이 없습니다. 이메일 주소와 확인 암호를 다시 확인해주세요.' }, { status: 404 });
    }

    // 설문 q6_feedback 매핑 (문의사항 채팅에 함께 노출)
    const regIds = data.map((r) => (r as Record<string, unknown>).id as string);
    const feedbackMap: Record<string, string> = {};
    if (regIds.length > 0) {
      const { data: surveys } = await supabase
        .from('surveys')
        .select('registration_id, q6_feedback')
        .in('registration_id', regIds);
      for (const s of surveys || []) {
        if (s.q6_feedback && s.q6_feedback.trim() !== '') {
          feedbackMap[s.registration_id] = s.q6_feedback;
        }
      }
    }

    function mapRecord(r: Record<string, unknown>) {
      const eventsRaw = r.events;
      const evt = Array.isArray(eventsRaw) ? eventsRaw[0] : eventsRaw;
      const eventStatus = (evt as Record<string, unknown>)?.status || 'closed';
      return {
        registration: {
          id: r.id,
          name: r.name,
          company_name: (r.company_name_raw || r.company_name) as string,
          department: r.department,
          job_title: r.job_title,
          email: r.email,
          phone: r.phone,
          industry: r.industry,
          company_size: r.company_size,
          referral_source: r.referral_source,
          referrer_name: r.referrer_name,
          inquiry: r.inquiry,
          survey_feedback: feedbackMap[r.id as string] || null,
          event_id: r.event_id,
          event_name: (evt as Record<string, unknown>)?.name || '',
          event_date: (evt as Record<string, unknown>)?.event_date || '',
          event_type: (evt as Record<string, unknown>)?.event_type || '',
          event_category: (evt as Record<string, unknown>)?.category || '이벤트',
          event_location: (evt as Record<string, unknown>)?.location || '',
          event_time: (evt as Record<string, unknown>)?.event_time || '',
          event_status: (evt as Record<string, unknown>)?.status || 'open',
          event_ended_at: (evt as Record<string, unknown>)?.ended_at || null,
          registration_status: r.registration_status || 'pending',
          survey_enabled: r.survey_enabled || false,
          survey_completed: r.survey_completed || false,
        },
        editable: eventStatus === 'open',
      };
    }

    // 여러 등록이 있으면 목록 반환
    if (data.length > 1) {
      const registrations = data.map((r) => {
        const mapped = mapRecord(r as Record<string, unknown>);
        return { id: mapped.registration.id, event_name: mapped.registration.event_name, event_date: mapped.registration.event_date, registration_status: mapped.registration.registration_status };
      });
      return NextResponse.json({ multiple: true, registrations });
    }

    // 1건이면 바로 반환
    const mapped = mapRecord(data[0] as Record<string, unknown>);
    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

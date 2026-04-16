import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCompanyName } from '@/lib/company-normalize';
import { isValidEmail, isValidPhone } from '@/lib/validation';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 등록 정보 조회 (PIN 검증 필요)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pin = req.nextUrl.searchParams.get('pin');

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: '확인 암호 4자리를 입력해주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('event_registrations')
      .select('*, events!event_registrations_event_id_fkey(name, status, event_date, event_type, capacity, location, event_time, category)')
      .eq('id', id)
      .eq('pin', pin)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '등록 정보를 찾을 수 없거나 암호가 일치하지 않습니다.' }, { status: 404 });
    }

    const evt = Array.isArray(data.events) ? data.events[0] : data.events;
    const eventStatus = evt?.status || 'closed';

    return NextResponse.json({
      registration: {
        id: data.id,
        name: data.name,
        company_name: data.company_name_raw || data.company_name,
        department: data.department,
        job_title: data.job_title,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        company_size: data.company_size,
        referral_source: data.referral_source,
        referrer_name: data.referrer_name,
        inquiry: data.inquiry,
        event_id: data.event_id,
        event_name: evt?.name || '',
        event_date: evt?.event_date || '',
        event_type: evt?.event_type || '',
        event_category: evt?.category || '이벤트',
        event_location: evt?.location || '',
        event_time: evt?.event_time || '',
        registration_status: data.registration_status || 'pending',
        survey_enabled: data.survey_enabled || false,
        survey_completed: data.survey_completed || false,
      },
      editable: eventStatus === 'open',
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 등록 취소 (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pin } = await req.json();

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: '확인 암호 4자리를 입력해주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: reg } = await supabase
      .from('event_registrations')
      .select('pin, event_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!reg) {
      return NextResponse.json({ error: '등록 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (reg.pin !== pin) {
      return NextResponse.json({ error: '확인 암호가 일치하지 않습니다.' }, { status: 403 });
    }

    // Check if event is still open
    if (reg.event_id) {
      const { data: evt } = await supabase
        .from('events')
        .select('status')
        .eq('id', reg.event_id)
        .single();

      if (evt?.status !== 'open') {
        return NextResponse.json({ error: '이벤트가 마감되어 취소할 수 없습니다.' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('event_registrations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: '취소 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 등록 정보 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name, company_name, department, job_title,
      email, phone, industry, industry_etc, company_size,
      referral_source, referral_source_etc, referrer_name, inquiry, pin,
    } = body;

    // PIN 검증
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: '확인 암호 4자리를 입력해주세요.' }, { status: 400 });
    }

    // 서버 검증
    if (!name?.trim() || !company_name?.trim() || !department?.trim() || !job_title?.trim()) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: '올바른 연락처 형식(010-0000-0000)을 입력해주세요.' }, { status: 400 });
    }

    if (!industry || !company_size || !referral_source) {
      return NextResponse.json({ error: '필수 선택 항목을 선택해주세요.' }, { status: 400 });
    }

    if (industry === '기타' && !industry_etc?.trim()) {
      return NextResponse.json({ error: '산업군(기타)을 입력해주세요.' }, { status: 400 });
    }

    if (referral_source === '기타' && !referral_source_etc?.trim()) {
      return NextResponse.json({ error: '신청 경로(기타)를 입력해주세요.' }, { status: 400 });
    }

    if ((referral_source === '클루커스 담당자 소개' || referral_source === '외부 담당자 소개') && !referrer_name?.trim()) {
      return NextResponse.json({ error: '추천인 성명을 입력해주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // PIN 확인 + 이벤트 상태 확인
    const { data: reg } = await supabase
      .from('event_registrations')
      .select('event_id, pin')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!reg) {
      return NextResponse.json({ error: '등록 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (reg.pin !== pin) {
      return NextResponse.json({ error: '확인 암호가 일치하지 않습니다.' }, { status: 403 });
    }

    if (reg.event_id) {
      const { data: evt } = await supabase
        .from('events')
        .select('status')
        .eq('id', reg.event_id)
        .single();

      if (evt?.status !== 'open') {
        return NextResponse.json({ error: '이벤트가 마감되어 수정할 수 없습니다.' }, { status: 403 });
      }
    }

    const normalizedCompany = normalizeCompanyName(company_name);

    const { error } = await supabase
      .from('event_registrations')
      .update({
        name: name.trim(),
        company_name: normalizedCompany,
        company_name_raw: company_name.trim(),
        department: department.trim(),
        job_title: job_title.trim(),
        email: email.toLowerCase().trim(),
        phone,
        industry: industry === '기타' && industry_etc ? `기타: ${industry_etc.trim()}` : industry,
        company_size,
        referral_source: referral_source === '기타' && referral_source_etc ? `기타: ${referral_source_etc.trim()}` : referral_source,
        referrer_name: referrer_name?.trim() || '',
        inquiry: inquiry?.trim() || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: '수정 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

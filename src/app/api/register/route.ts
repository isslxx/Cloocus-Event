import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCompanyName } from '@/lib/company-normalize';
import { isBlockedEmailDomain, isValidEmail, isValidPhone } from '@/lib/validation';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, company_name, department, job_title,
      email, phone, industry, company_size,
      referral_source, referrer_name, inquiry, privacy_consent,
      event_id,
    } = body;

    // 서버 검증
    if (!name?.trim() || !company_name?.trim() || !department?.trim() || !job_title?.trim()) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }

    if (isBlockedEmailDomain(email)) {
      return NextResponse.json({ error: '업무용 이메일 주소를 입력해주세요.' }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: '올바른 연락처 형식(010-0000-0000)을 입력해주세요.' }, { status: 400 });
    }

    if (!industry || !company_size || !referral_source) {
      return NextResponse.json({ error: '필수 선택 항목을 선택해주세요.' }, { status: 400 });
    }

    if (!privacy_consent) {
      return NextResponse.json({ error: '개인정보 수집 및 이용에 동의해주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 이메일 중복 체크
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });
    }

    const normalizedCompany = normalizeCompanyName(company_name);

    const { error } = await supabase.from('event_registrations').insert({
      name: name.trim(),
      company_name: normalizedCompany,
      company_name_raw: company_name.trim(),
      department: department.trim(),
      job_title: job_title.trim(),
      email: email.toLowerCase().trim(),
      phone,
      industry,
      company_size,
      referral_source,
      referrer_name: referrer_name?.trim() || '',
      inquiry: inquiry?.trim() || '',
      privacy_consent,
      event_id: event_id || null,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: '등록 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

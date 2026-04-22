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
      email, phone, industry, industry_etc, company_size,
      referral_source, referral_source_etc, referrer_name, inquiry, privacy_consent,
      event_id, pin,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      landing_page, referrer_url,
    } = body;

    // 서버 검증
    if (!name?.trim() || !company_name?.trim() || !department?.trim() || !job_title?.trim()) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }

    // 개인 메일은 경고만 표시하고 등록 허용

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

    if (!privacy_consent) {
      return NextResponse.json({ error: '개인정보 수집 및 이용에 동의해주세요.' }, { status: 400 });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: '개인 확인 암호 4자리 숫자를 입력해주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const normalizedCompany = normalizeCompanyName(company_name);

    const trimOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 255) : null);

    const insertRow = {
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
      privacy_consent,
      event_id: event_id || null,
      pin,
      utm_source:   trimOrNull(utm_source),
      utm_medium:   trimOrNull(utm_medium),
      utm_campaign: trimOrNull(utm_campaign),
      utm_content:  trimOrNull(utm_content),
      utm_term:     trimOrNull(utm_term),
      landing_page: trimOrNull(landing_page),
      referrer_url: trimOrNull(referrer_url),
    };

    const { data: insertedData, error } = await supabase
      .from('event_registrations')
      .insert(insertRow)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: '등록 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: insertedData?.id });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

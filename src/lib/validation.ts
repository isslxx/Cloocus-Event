import { BLOCKED_EMAIL_DOMAINS } from './constants';

export function isBlockedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return BLOCKED_EMAIL_DOMAINS.includes(domain);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone);
}

export type FormErrors = Record<string, string>;

export function validateRegistrationForm(form: {
  name: string;
  company_name: string;
  department: string;
  job_title: string;
  email: string;
  phone: string;
  industry: string;
  industry_etc?: string;
  company_size: string;
  referral_source: string;
  referral_source_etc?: string;
  referrer_name?: string;
  privacy_consent: boolean;
}): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = '성함을 입력해주세요.';
  if (!form.company_name.trim()) errors.company_name = '회사명을 입력해주세요.';
  if (!form.department.trim()) errors.department = '부서명을 입력해주세요.';
  if (!form.job_title.trim()) errors.job_title = '직급을 입력해주세요.';

  if (!form.email.trim()) {
    errors.email = '이메일을 입력해주세요.';
  } else if (!isValidEmail(form.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }

  if (!form.phone.trim()) {
    errors.phone = '연락처를 입력해주세요.';
  } else if (!isValidPhone(form.phone)) {
    errors.phone = '올바른 연락처 형식(010-0000-0000)을 입력해주세요.';
  }

  if (!form.industry) {
    errors.industry = '산업군을 선택해주세요.';
  } else if (form.industry === '기타' && !form.industry_etc?.trim()) {
    errors.industry_etc = '산업군을 입력해주세요.';
  }
  if (!form.company_size) errors.company_size = '기업 규모를 선택해주세요.';
  if (!form.referral_source) {
    errors.referral_source = '신청 경로를 선택해주세요.';
  } else if (form.referral_source === '기타' && !form.referral_source_etc?.trim()) {
    errors.referral_source_etc = '신청 경로를 입력해주세요.';
  } else if ((form.referral_source === '클루커스 담당자 소개' || form.referral_source === '외부 담당자 소개') && !form.referrer_name?.trim()) {
    errors.referrer_name = '추천인 성명을 입력해주세요.';
  }
  if (!form.privacy_consent) errors.privacy_consent = '개인정보 수집 및 이용에 동의해주세요.';

  return errors;
}

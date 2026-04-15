'use client';

import { useEffect, useState, use } from 'react';

type VerifyData = {
  valid: boolean;
  name: string;
  email: string;
  company: string;
  event_name: string;
  event_date: string;
  event_type: string;
  event_category: string;
  registration_status: string;
};

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/verify/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('조회에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">확인 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">확인 불가</h1>
          <p className="text-gray-500 text-sm">{error || '유효하지 않은 등록 정보입니다.'}</p>
        </div>
      </div>
    );
  }

  const isConfirmed = data.registration_status === 'confirmed';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className={`bg-white rounded-xl border-2 p-8 max-w-sm w-full text-center ${isConfirmed ? 'border-green-300' : 'border-yellow-300'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isConfirmed ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <span className="text-3xl">{isConfirmed ? '✓' : '⏳'}</span>
        </div>

        {isConfirmed ? (
          <h1 className="text-2xl font-bold text-green-700 mb-1">등록이 확정되었습니다</h1>
        ) : (
          <h1 className="text-xl font-bold text-yellow-700 mb-1">
            {data.registration_status === 'rejected' ? '등록 불가' : '등록 대기 중'}
          </h1>
        )}

        <p className="text-gray-400 text-xs mb-6 mt-1">참석자 검증 정보</p>

        <div className="text-left space-y-3 bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">성함</span>
            <span className="text-sm font-medium text-gray-900">{data.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">회사</span>
            <span className="text-sm font-medium text-gray-900">{data.company}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">이메일</span>
            <span className="text-sm font-medium text-gray-900 text-right break-all">{data.email}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">이벤트</span>
            <span className="text-sm font-medium text-gray-900 text-right">{data.event_name}</span>
          </div>
          {data.event_date && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">날짜</span>
              <span className="text-sm text-gray-700">{(() => { const d = new Date(data.event_date); return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`; })()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">카테고리</span>
            <span className="text-sm text-gray-700">{data.event_category}</span>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cloocus-logo.png" alt="Cloocus" className="h-5 mx-auto mt-6" />
      </div>
    </div>
  );
}

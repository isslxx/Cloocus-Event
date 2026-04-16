'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

type SurveyQuestion = {
  id: string;
  event_id: string | null;
  question_text: string;
  question_type: string;
  options: string[];
  required: boolean;
  sort_order: number;
  active: boolean;
};

const DEFAULT_QUESTIONS: Omit<SurveyQuestion, 'id' | 'event_id'>[] = [
  { question_text: '교육 전 Microsoft Azure에 대한 이해 수준은 어느 정도입니까?', question_type: 'single', options: ['전혀 모름 (들어봤으나 사용 경험 없음)', '기본 개념 (Azure 역할 및 주요 서비스 이해)', '기초 수준 (리소스 생성 등 기본 실습/사용 경험)', '중급 수준 (가상머신, 스토리지 등 일부 서비스 적용 경험)', '고급 수준 (아키텍처 설계, 최적화 등 고급 기능 숙지)'], required: true, sort_order: 1, active: true },
  { question_text: '오늘 참여한 이벤트의 난이도는 어떠셨나요?', question_type: 'single', options: ['매우 쉬움', '적절함', '다소 어려움', '매우 어려움'], required: true, sort_order: 2, active: true },
  { question_text: '본 이벤트에 참여하신 목적은 무엇입니까? (복수 선택 가능)', question_type: 'multiple', options: ['기초 지식 및 기본 역량 확보', '클라우드 도입 전 비교/평가', '사내 PoC 프로젝트 준비', 'Azure 전환(마이그레이션) 검토', '사용 중인 Azure 기술 고도화', '기타'], required: true, sort_order: 3, active: true },
  { question_text: '현재 Microsoft Azure 도입 또는 마이그레이션을 고려 중입니까?', question_type: 'single', options: ['이미 사용 중 (추가 도입/확장 계획 있음)', '이미 사용 중 (추가 도입/확장 계획 없음)', '6개월 이내 도입 계획 있음', '1년 이내 도입 계획 있음', '계획 없음 / 미정'], required: true, sort_order: 4, active: true },
  { question_text: 'Microsoft Azure 추가 활용에 대한 클루커스의 컨설팅이 필요하십니까? (복수 선택 가능)', question_type: 'multiple', options: ['예 (클루커스의 추가 컨설팅 필요)', '예 (교육/세미나 이벤트 소식 필요)', '필요 없음'], required: true, sort_order: 5, active: true },
  { question_text: '참여 후기, 추가로 배우고 싶은 교육 주제 등 피드백이 있으시면 편히 말씀 부탁드립니다.', question_type: 'text', options: [], required: false, sort_order: 6, active: true },
];

export default function SurveyManagementPage() {
  const { accessToken } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [surveyStats, setSurveyStats] = useState<Record<string, { enabled: number; completed: number }>>({});

  const [editing, setEditing] = useState<SurveyQuestion | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formText, setFormText] = useState('');
  const [formType, setFormType] = useState('single');
  const [formOptions, setFormOptions] = useState('');
  const [formRequired, setFormRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const [evtRes, statsRes] = await Promise.all([
        fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/survey-stats', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const evtData = await evtRes.json();
      setEvents(Array.isArray(evtData) ? evtData : []);
      setSurveyStats(await statsRes.json() || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  const fetchQuestions = useCallback(async (eventId: string) => {
    const param = eventId ? `event_id=${eventId}` : '';
    const res = await fetch(`/api/admin/survey-questions?${param}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
  }, [accessToken]);

  useEffect(() => { if (accessToken) fetchEvents(); }, [accessToken, fetchEvents]);
  useEffect(() => { if (accessToken) fetchQuestions(selectedEventId); }, [accessToken, selectedEventId, fetchQuestions]);

  const openNew = () => { setIsNew(true); setEditing(null); setFormText(''); setFormType('single'); setFormOptions(''); setFormRequired(true); };
  const openEdit = (q: SurveyQuestion) => { setIsNew(false); setEditing(q); setFormText(q.question_text); setFormType(q.question_type); setFormOptions((q.options || []).join('\n')); setFormRequired(q.required); };

  const handleSave = async () => {
    if (!formText.trim()) return;
    setSaving(true);
    const opts = formOptions.split('\n').map((o) => o.trim()).filter(Boolean);
    const body = { question_text: formText.trim(), question_type: formType, options: opts, required: formRequired, sort_order: isNew ? questions.length + 1 : editing?.sort_order, event_id: selectedEventId || null };
    if (isNew) {
      await fetch('/api/admin/survey-questions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) });
    } else if (editing) {
      await fetch(`/api/admin/survey-questions/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) });
    }
    setSaving(false); setEditing(null); setIsNew(false);
    fetchQuestions(selectedEventId);
  };

  const handleDelete = async (id: string) => { if (!confirm('이 질문을 삭제하시겠습니까?')) return; await fetch(`/api/admin/survey-questions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }); fetchQuestions(selectedEventId); };

  const handleMove = async (q: SurveyQuestion, dir: -1 | 1) => {
    const idx = questions.findIndex((x) => x.id === q.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= questions.length) return;
    const swap = questions[swapIdx];
    await Promise.all([
      fetch(`/api/admin/survey-questions/${q.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ sort_order: swap.sort_order }) }),
      fetch(`/api/admin/survey-questions/${swap.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ sort_order: q.sort_order }) }),
    ]);
    fetchQuestions(selectedEventId);
  };

  const handleToggle = async (q: SurveyQuestion) => {
    await fetch(`/api/admin/survey-questions/${q.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ active: !q.active }) });
    setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, active: !x.active } : x));
  };

  const handleCopyToEvent = async (targetEventId: string) => {
    if (!questions.length) return;
    for (const q of questions) {
      await fetch('/api/admin/survey-questions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ event_id: targetEventId || null, question_text: q.question_text, question_type: q.question_type, options: q.options, required: q.required, sort_order: q.sort_order }) });
    }
    alert('설문이 복사되었습니다.');
  };

  const handleInitDefault = async () => {
    for (const q of DEFAULT_QUESTIONS) {
      await fetch('/api/admin/survey-questions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ ...q, event_id: selectedEventId || null }) });
    }
    fetchQuestions(selectedEventId);
  };

  const typeLabel: Record<string, string> = { single: '단일 선택', multiple: '복수 선택', text: '서술형' };

  if (loading) return <p className="text-gray-400">로딩 중...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">설문조사 관리</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">기본 설문조사</option>
            {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
          </select>
          <button onClick={openNew} className="btn-primary text-sm">+ 질문 추가</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            {selectedEventId ? events.find((e) => e.id === selectedEventId)?.name : '기본'} 설문 질문
            <span className="text-sm text-gray-400 ml-2">({questions.length}개)</span>
          </h2>
          <div className="flex gap-2">
            {questions.length === 0 && (
              <button onClick={handleInitDefault} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">기본 질문 불러오기</button>
            )}
            {questions.length > 0 && (
              <select onChange={(e) => { if (e.target.value) handleCopyToEvent(e.target.value); e.target.value = ''; }} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg" defaultValue="">
                <option value="" disabled>다른 이벤트로 복사</option>
                <option value="">기본 설문조사</option>
                {events.filter((e) => e.id !== selectedEventId).map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {questions.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">등록된 질문이 없습니다. &quot;+ 질문 추가&quot; 또는 &quot;기본 질문 불러오기&quot;를 사용하세요.</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={q.id} className={`border rounded-lg p-4 ${q.active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => handleMove(q, -1)} disabled={idx === 0} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
                    <button onClick={() => handleMove(q, 1)} disabled={idx === questions.length - 1} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      <span className="text-blue-600 mr-1">Q{idx + 1}.</span>{q.question_text}{q.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{typeLabel[q.question_type] || q.question_type}{q.options.length > 0 && ` · ${q.options.length}개 옵션`}</p>
                    {q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.options.map((opt) => <span key={opt} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{opt}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleToggle(q)} className={`text-xs px-2 py-1 rounded ${q.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{q.active ? '활성' : '비활성'}</button>
                    <button onClick={() => openEdit(q)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">수정</button>
                    <button onClick={() => handleDelete(q.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-4">이벤트별 설문 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">이벤트명</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">설문 활성</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">설문 완료</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">완료율</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => {
                const stats = surveyStats[evt.id] || { enabled: 0, completed: 0 };
                const rate = stats.enabled > 0 ? Math.round((stats.completed / stats.enabled) * 100) : 0;
                return (
                  <tr key={evt.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEventId(evt.id)}>
                    <td className="px-4 py-3 font-medium">{evt.name}</td>
                    <td className="px-4 py-3 text-right">{stats.enabled}</td>
                    <td className="px-4 py-3 text-right">{stats.completed}</td>
                    <td className="px-4 py-3 text-right">{stats.enabled > 0 && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rate >= 70 ? 'bg-green-100 text-green-700' : rate >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{rate}%</span>}</td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">이벤트가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(isNew || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">{isNew ? '질문 추가' : '질문 수정'}</h2>
            <div className="space-y-4">
              <div className="field"><label>질문</label><textarea rows={2} value={formText} onChange={(e) => setFormText(e.target.value)} placeholder="질문 내용을 입력하세요" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field"><label>유형</label><select value={formType} onChange={(e) => setFormType(e.target.value)}><option value="single">단일 선택</option><option value="multiple">복수 선택</option><option value="text">서술형</option></select></div>
                <div className="field"><label>필수</label><select value={formRequired ? 'true' : 'false'} onChange={(e) => setFormRequired(e.target.value === 'true')}><option value="true">필수</option><option value="false">선택</option></select></div>
              </div>
              {formType !== 'text' && (
                <div className="field"><label>선택 옵션 (줄바꿈으로 구분)</label><textarea rows={5} value={formOptions} onChange={(e) => setFormOptions(e.target.value)} placeholder={'옵션 1\n옵션 2\n옵션 3'} /></div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? '저장 중...' : '저장'}</button>
              <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

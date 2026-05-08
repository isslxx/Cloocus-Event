import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

const VALID_TYPES = ['short_text', 'long_text', 'single_choice', 'multi_choice', 'agreement'] as const;
type QuestionType = typeof VALID_TYPES[number];

type OptionRow = { label: string };

function sanitizeOptions(raw: unknown): OptionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (typeof o === 'string') return { label: o.trim() };
      if (o && typeof o === 'object' && 'label' in o) {
        const label = String((o as { label: unknown }).label || '').trim();
        return { label };
      }
      return { label: '' };
    })
    .filter((o) => o.label.length > 0)
    .slice(0, 50);
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) return NextResponse.json({ error: 'event_id 필요' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('event_custom_questions')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { event_id, question_type, label, description, options, required, allow_etc } = body;

  if (!event_id) return NextResponse.json({ error: 'event_id 필요' }, { status: 400 });
  if (!VALID_TYPES.includes(question_type as QuestionType)) {
    return NextResponse.json({ error: '지원하지 않는 문항 타입' }, { status: 400 });
  }
  if (!label?.trim()) return NextResponse.json({ error: '문항 내용을 입력해주세요.' }, { status: 400 });

  const supabase = getServiceSupabase();

  const { data: maxRow } = await supabase
    .from('event_custom_questions')
    .select('sort_order')
    .eq('event_id', event_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const isChoice = question_type === 'single_choice' || question_type === 'multi_choice';
  const cleanedOptions = isChoice ? sanitizeOptions(options) : [];

  const { data, error } = await supabase
    .from('event_custom_questions')
    .insert({
      event_id,
      question_type,
      label: label.trim(),
      description: description?.trim() || null,
      options: cleanedOptions,
      required: !!required,
      allow_etc: isChoice ? !!allow_etc : false,
      active: true,
      sort_order: nextOrder,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, label, description, options, required, active, sort_order, question_type, allow_etc } = body;
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (label !== undefined) {
    if (!String(label).trim()) return NextResponse.json({ error: '문항 내용을 입력해주세요.' }, { status: 400 });
    updates.label = String(label).trim();
  }
  if (description !== undefined) updates.description = String(description || '').trim() || null;
  if (required !== undefined) updates.required = !!required;
  if (active !== undefined) updates.active = !!active;
  if (sort_order !== undefined) updates.sort_order = Number(sort_order);
  if (question_type !== undefined) {
    if (!VALID_TYPES.includes(question_type as QuestionType)) {
      return NextResponse.json({ error: '지원하지 않는 문항 타입' }, { status: 400 });
    }
    updates.question_type = question_type;
  }
  if (options !== undefined) updates.options = sanitizeOptions(options);
  if (allow_etc !== undefined) updates.allow_etc = !!allow_etc;

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('event_custom_questions').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('event_custom_questions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

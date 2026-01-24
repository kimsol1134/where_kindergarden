import { NextResponse } from 'next/server';
import { supabase, checkRateLimit, getClientIp } from '@/lib/supabase';
import type { ReviewSuggestion } from '@/types';

// Admin email to receive notifications
const ADMIN_EMAIL = 'kimsol1134@naver.com';

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: '제안 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: rateLimitResult.resetAt.toISOString(),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    // Parse request body
    const body: ReviewSuggestion = await request.json();

    // Validate required fields
    if (!body.type || !body.kindergartenId) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Validate based on type
    if (body.type === 'add') {
      if (!body.url || !body.title || !body.source) {
        return NextResponse.json(
          { error: 'URL, 제목, 출처는 필수입니다.' },
          { status: 400 }
        );
      }

      // Validate URL format
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { error: '올바른 URL 형식이 아닙니다.' },
          { status: 400 }
        );
      }
    } else if (body.type === 'delete') {
      if (!body.reviewId) {
        return NextResponse.json(
          { error: '삭제할 후기 ID가 필요합니다.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: '유효하지 않은 제안 유형입니다.' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.submitterEmail && !isValidEmail(body.submitterEmail)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data: insertedData, error } = await supabase
      .from('review_suggestions')
      .insert({
        type: body.type,
        kindergarten_id: body.kindergartenId,
        url: body.type === 'add' ? body.url : null,
        title: body.type === 'add' ? body.title : null,
        source: body.type === 'add' ? body.source : null,
        review_id: body.type === 'delete' ? body.reviewId : null,
        reason: body.reason || null,
        submitter_email: body.submitterEmail || null,
        submitter_ip: clientIp,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: '제안 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Send email notification to admin
    await sendEmailNotification(body, insertedData?.id);

    return NextResponse.json(
      { 
        success: true, 
        message: body.type === 'add' 
          ? '후기 추가 제안이 접수되었습니다. 검토 후 반영됩니다.'
          : '후기 삭제 제안이 접수되었습니다. 검토 후 처리됩니다.',
      },
      { 
        status: 201,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Review suggestion error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function sendEmailNotification(
  suggestion: ReviewSuggestion,
  suggestionId?: string
): Promise<void> {
  try {
    const subject = suggestion.type === 'add'
      ? `[우리동네유치원] 새 후기 추가 제안`
      : `[우리동네유치원] 후기 삭제 제안`;

    const bodyText = suggestion.type === 'add'
      ? `
새로운 후기 추가 제안이 접수되었습니다.

📋 제안 ID: ${suggestionId || 'N/A'}
🏫 유치원 ID: ${suggestion.kindergartenId}
📎 URL: ${suggestion.url}
📝 제목: ${suggestion.title}
📂 출처: ${suggestion.source}
💬 메모: ${suggestion.reason || '없음'}
📧 제출자 이메일: ${suggestion.submitterEmail || '미제공'}

Supabase 대시보드에서 확인하세요:
https://supabase.com/dashboard/project/qektqbhrfynnwixsewqs/editor/table/review_suggestions
      `.trim()
      : `
후기 삭제 제안이 접수되었습니다.

📋 제안 ID: ${suggestionId || 'N/A'}
🏫 유치원 ID: ${suggestion.kindergartenId}
🗑️ 삭제 대상 후기 ID: ${suggestion.reviewId}
💬 삭제 사유: ${suggestion.reason || '없음'}
📧 제출자 이메일: ${suggestion.submitterEmail || '미제공'}

Supabase 대시보드에서 확인하세요:
https://supabase.com/dashboard/project/qektqbhrfynnwixsewqs/editor/table/review_suggestions
      `.trim();

    // Use Supabase Edge Function or external email service
    // For now, we'll use a simple webhook approach with Supabase's built-in email
    // You can replace this with your preferred email service (SendGrid, Resend, etc.)
    
    // Option: Use Supabase's database webhook to trigger email
    // For MVP, we'll log the notification and use Supabase's built-in notifications
    console.log(`📧 Email notification to ${ADMIN_EMAIL}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${bodyText}`);
    
    // TODO: Integrate with actual email service
    // Example with Resend:
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@where-kindergarden.com',
    //     to: ADMIN_EMAIL,
    //     subject,
    //     text: bodyText,
    //   }),
    // });
    
  } catch (emailError) {
    // Don't fail the request if email fails
    console.error('Email notification error:', emailError);
  }
}

import { describe, expect, it } from 'vitest';
import {
  extractBlogPageContentFromHtml,
  extractCafePageContentFromHtml,
  extractNaverSearchCandidatesFromHtml,
  extractQuestionEvidenceFromHtml,
} from '../../../../scripts/review-autoresearch/lib/naver-collector';

describe('naver collector parsers', () => {
  it('네이버 블로그 HTML에서 제목/작성자/날짜/본문을 추출한다', () => {
    const html = `
      <html>
        <head>
          <title>뒤나미스 유치원 설명회 후기 : 네이버블로그</title>
          <meta property="og:title" content="뒤나미스 유치원 설명회 후기" />
        </head>
        <body>
          <div class="blog2_container">
            <div class="nick"><span class="ell">영종맘일기</span></div>
          </div>
          <span class="se_publishDate">2025.11.15.</span>
          <div class="se-main-container">
            뒤나미스유치원 설명회 다녀왔어요. 선생님들이 친절하고 급식 설명도 자세했습니다.
          </div>
        </body>
      </html>
    `;

    const parsed = extractBlogPageContentFromHtml(html);
    expect(parsed.title).toBe('뒤나미스 유치원 설명회 후기');
    expect(parsed.sourceName).toBe('영종맘일기');
    expect(parsed.date).toBe('2025-11-15');
    expect(parsed.bodyText).toContain('선생님들이 친절하고');
  });

  it('네이버 카페 질문글 HTML에서 질문/답변 요약을 추출한다', () => {
    const html = `
      <html>
        <head>
          <title>뒤나미스 유치원 보내시는 분 만족도 어떠신가요? : 네이버 카페</title>
          <meta property="og:site_name" content="영맘" />
        </head>
        <body>
          <h3 class="title_text">뒤나미스 유치원 보내시는 분 만족도 어떠신가요?</h3>
          <span class="date">2025.11.20.</span>
          <div class="ArticleContentBox">
            만약 첫째 보내고 계신다면 둘째도 보낼 만큼 만족도 있으신가요? 조언 부탁드립니다.
          </div>
          <div class="CommentBox">
            <p class="text_comment">저는 첫째 졸업시키고 둘째 보내고 있는데 아주 만족해요. 책읽기 수업이 좋아요.</p>
            <p class="text_comment">담임 선생님이 세심하고 숲체험 프로그램도 만족스러웠습니다.</p>
          </div>
        </body>
      </html>
    `;

    const evidence = extractQuestionEvidenceFromHtml(html);
    const parsed = extractCafePageContentFromHtml(html);

    expect(evidence).not.toBeNull();
    expect(evidence?.questionSummary).toContain('둘째도 보낼 만큼 만족도');
    expect(evidence?.answerSummary).toContain('아주 만족해요');
    expect(evidence?.answerEvidenceCount).toBe(2);
    expect(parsed.sourceName).toBe('영맘');
    expect(parsed.date).toBe('2025-11-20');
  });

  it('네이버 검색 결과 HTML에서 블로그/카페 후보만 추린다', () => {
    const html = `
      <html>
        <body>
          <div class="api_subject_bx">
            <a href="https://blog.naver.com/example/223">뒤나미스 유치원 보내보니</a>
            <p>설명회와 급식, 선생님 후기를 정리했어요.</p>
          </div>
          <div class="api_subject_bx">
            <a href="https://cafe.naver.com/yeongjongdolove/983584">뒤나미스 유치원 보내시는 분 만족도 어떠신가요?</a>
            <p>둘째도 보낼 정도로 만족하는지 묻는 질문글</p>
          </div>
          <div class="api_subject_bx">
            <a href="https://example.com/offtopic">맛집 후기</a>
          </div>
        </body>
      </html>
    `;

    const candidates = extractNaverSearchCandidatesFromHtml(html);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.source)).toEqual([
      'naver_blog',
      'naver_cafe',
    ]);
  });
});

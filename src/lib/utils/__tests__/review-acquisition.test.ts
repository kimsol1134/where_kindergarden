import { describe, expect, it } from 'vitest';
import {
  canonicalizeKnownReviewUrl,
  extractLearnsLatestReviews,
  extractNaverBlogIdentity,
  parseStudyholicDetailHtml,
  parseStudyholicListHtml,
} from '@/lib/utils/review-acquisition';

describe('review acquisition utils', () => {
  it('parses Studyholic list rows into exact review tuples', () => {
    const rows = parseStudyholicListHtml(`
      <table>
        <tr>
          <td width="40" align="center">3235</td>
          <td width="50" align="center">서울</td>
          <td width="60" align="center">용산구</td>
          <td width="70" align="center">유치원</td>
          <td width="360">
            <a href="KinderView.asp?SearchPart=&SearchWord=&idx=3795">
              <b>[계성유치원]</b>&nbsp;인성을 중요시하는 유치원
            </a>
          </td>
          <td width="70" align="left"><font color="#ff0080">★★★★★</font></td>
        </tr>
      </table>
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      listIndex: 3235,
      kindergartenName: '계성유치원',
      reviewTitle: '인성을 중요시하는 유치원',
      region: '서울',
      sigungu: '용산구',
      category: '유치원',
      rating: 5,
      canonicalUrl: 'https://www.studyholic.com/eduinfo/KinderView.asp?idx=3795',
    });
  });

  it('parses Studyholic detail pages and marks login-gated fields fail-closed', () => {
    const detail = parseStudyholicDetailHtml(`
      <html>
        <head>
          <title>[ 계성유치원 리뷰 ] 인성을 중요시하는 유치원 - 서울 용산구 계성유치원 수업 분위기 및 장단점 등 [스터디홀릭]</title>
        </head>
        <body>
          <table>
            <tr>
              <td class="write_lttl"><b>지역</b></td>
              <td>서울 용산구</td>
              <td class="write_lttl"><b>위치</b></td>
              <td>산천동</td>
            </tr>
            <tr>
              <td class="write_lttl"><b>시설유무</b></td>
              <td colspan="3">실외놀이터, 강당, 도서관</td>
            </tr>
            <tr>
              <td class="write_lttl"><b>시설만족</b></td>
              <td colspan="3">좋아요</td>
            </tr>
            <tr>
              <td class="write_lttl"><b>선생님특징</b></td>
              <td colspan="3"><span class="cred b">&lt;로그인&gt;</span>후 열람가능</td>
            </tr>
            <tr>
              <td class="write_lttl"><b>전체만족도</b></td>
              <td><span class="corg">★★★★★</span></td>
            </tr>
          </table>
          <table>
            <tr>
              <td colspan="2">
                <span class="cblue b">[평가글]</span>
                <p>무료로 열람가능 합니다!</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `);

    expect(detail.isReviewPage).toBe(true);
    expect(detail.kindergartenName).toBe('계성유치원');
    expect(detail.reviewTitle).toBe('인성을 중요시하는 유치원');
    expect(detail.rating).toBe(5);
    expect(detail.publicFields['시설유무']).toBe('실외놀이터, 강당, 도서관');
    expect(detail.loginRequiredFields).toContain('선생님특징');
    expect(detail.loginRequiredFields).toContain('평가글');
    expect(detail.reviewTextAccessible).toBe(false);
  });

  it('canonicalizes Naver blog URLs to PostView form', () => {
    expect(
      canonicalizeKnownReviewUrl(
        'https://blog.naver.com/liberalwife/223251458831?fromRss=true&trackingCode=rss'
      )
    ).toBe(
      'https://blog.naver.com/PostView.naver?blogId=liberalwife&logNo=223251458831'
    );
    expect(
      canonicalizeKnownReviewUrl(
        'https://m.blog.naver.com/PostView.naver?blogId=liberalwife&logNo=223251458831&referrerCode=1'
      )
    ).toBe(
      'https://blog.naver.com/PostView.naver?blogId=liberalwife&logNo=223251458831'
    );

    expect(
      extractNaverBlogIdentity(
        'https://blog.naver.com/liberalwife/223251458831?fromRss=true'
      )
    ).toMatchObject({
      blogId: 'liberalwife',
      logNo: '223251458831',
      rssUrl: 'https://rss.blog.naver.com/liberalwife.xml',
    });
  });

  it('extracts latest reviews from Next.js hydration payloads without DOM rendering', () => {
    const reviews = extractLearnsLatestReviews(`
      <html>
        <body>
          <script>
            self.__next_f.push([1,"{\\"school\\":{\\"reviewBoard\\":{\\"latestReviews\\":[{\\"id\\":\\"rev-1\\",\\"rating\\":5,\\"previewText\\":\\"선생님이 친절해요\\",\\"user\\":{\\"typeLabel\\":\\"엄마\\"},\\"createdAt\\":\\"2026-03-01T00:00:00.000Z\\"}]}}"]);
          </script>
        </body>
      </html>
    `);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      id: 'rev-1',
      rating: 5,
      previewText: '선생님이 친절해요',
      userTypeLabel: '엄마',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
  });
});

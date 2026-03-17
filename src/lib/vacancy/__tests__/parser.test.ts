import { describe, expect, it } from 'vitest';
import { parseVacancyDetailPage, parseVacancyListPage } from '../parser';

describe('vacancy parser', () => {
  it('should parse vacancy list rows and skip rows without kindergarten links', () => {
    const html = `
      <html>
        <body>
          <h2 id="totalText">유치원 조회결과 - 총 12건</h2>
          <tbody id="dsMainTbody">
            <tr>
              <td>남부유치원</td>
              <td>사립</td>
              <td>서울특별시 강남구 언주로 123</td>
              <td>
                <a onclick="gotoPreschURL('http://e-childschoolinfo.moe.go.kr/kinderMt/kinderSummary.do?ittId=kg-positive&neisCd=B100000799')">보기</a>
              </td>
              <td>
                <a href="#" onclick="javascript:fn_vacancyDetail('B100000799','B100000001','B100000249');return false;">4</a>
              </td>
              <td>02-111-2222</td>
              <td>2026-03-17</td>
            </tr>
            <tr>
              <td>도곡렉슬유치원</td>
              <td>사립</td>
              <td>서울특별시 강남구 선릉로 221</td>
              <td>
                <a onclick="gotoPreschURL('http://e-childschoolinfo.moe.go.kr/kinderMt/kinderSummary.do?ittId=kg-zero&neisCd=B100000900')">보기</a>
              </td>
              <td>0</td>
              <td>02-333-4444</td>
              <td></td>
            </tr>
            <tr>
              <td>링크없는유치원</td>
              <td>국공립</td>
              <td>서울특별시 강남구 테헤란로 1</td>
              <td></td>
              <td>2</td>
              <td>02-555-6666</td>
              <td>2026-03-16</td>
            </tr>
          </tbody>
          <a href="#" onclick="fn_search(2); return false;">2</a>
          <a href="#" onclick="fn_search(7); return false;">7</a>
          <a href="#" onclick="fn_search(12); return false;">12</a>
        </body>
      </html>
    `;

    const parsed = parseVacancyListPage(html, '2026');

    expect(parsed.totalCount).toBe(12);
    expect(parsed.totalPages).toBe(12);
    expect(parsed.items).toHaveLength(2);

    expect(parsed.items[0]).toMatchObject({
      kindercode: 'kg-positive',
      aidYear: '2026',
      vacancyCount: 4,
      updatedAt: '2026-03-17',
      preschCd: 'B100000799',
      upperEduOfficeCd: 'B100000001',
      eduOfficeCd: 'B100000249',
      foundType: '사립',
      name: '남부유치원',
      address: '서울특별시 강남구 언주로 123',
      phone: '02-111-2222',
    });

    expect(parsed.items[1]).toMatchObject({
      kindercode: 'kg-zero',
      vacancyCount: 0,
      updatedAt: null,
      preschCd: null,
      upperEduOfficeCd: null,
      eduOfficeCd: null,
    });
  });

  it('should parse vacancy detail rows', () => {
    const html = `
      <html>
        <body>
          <table class="ed_tbst">
            <thead>
              <tr><th>순번</th><th>연령</th><th>과정</th><th>결원</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>3세</td><td>교육과정+방과후과정</td><td>2</td></tr>
              <tr><td>2</td><td>5세</td><td>교육과정</td><td>1</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    expect(parseVacancyDetailPage(html)).toEqual([
      { rowNo: 1, age: '3세', course: '교육과정+방과후과정', vacancyCount: 2 },
      { rowNo: 2, age: '5세', course: '교육과정', vacancyCount: 1 },
    ]);
  });
});

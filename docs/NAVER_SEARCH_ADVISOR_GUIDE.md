# Naver Search Advisor Manual Configuration Guide

Since code-level optimization is complete (Meta tags, JSON-LD, Sitemap), you need to perform the following **manual steps** in the [Naver Search Advisor Console](https://searchadvisor.naver.com/) to ensure fast indexing.

## 1. Site Registration & Verification
1.  Login to **Naver Search Advisor**.
2.  Click **Webmaster Tools**.
3.  Enter URL: `https://where-kindergarden.vercel.app`
4.  **Verify Ownership**:
    *   Since we added the `naver-site-verification` tag in `layout.tsx`, just click **"HTML 태그" (HTML Tag)** matching verification.
    *   Click **Confirm (확인)**.

## 2. Submit Sitemap (Critical)
Naver does not automatically find sitemaps as fast as Google.
1.  Go to **Request (요청)** > **Submit Sitemap (사이트맵 제출)** menu.
2.  Enter the URL path: `sitemap.xml`
3.  Click **OK (확인)**.

## 3. SEO Optimization Check (Site Diagnosis)
1.  Go to **Reports (리포트)** > **Site Optimization (사이트 최적화)**.
2.  It may take a few days for data to appear.
3.  Check if "Search Robot Collection" is successful.

## 4. Manual Crawl Request (Speed up indexing)
To index the updated main page immediately:
1.  Go to **Request (요청)** > **Web Page Collection (웹 페이지 수집)**.
2.  Leave the input empty (to collect the home page) or enter specific paths like `search`.
3.  Click **Request (확인)**.
    *   *Tip: Do this whenever you make major content changes.*

## 5. Check Robots.txt
1.  Go to **Verification (검증)** > **Robots.txt**.
2.  Click **Collect (수집요청)** to ensure Naver sees your latest `robots.txt`.
3.  It should say "Collected" (수집됨) and show the content we defined.

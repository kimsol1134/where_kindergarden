#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REVIEW_PAGE_SIZE = 100;
const reviewsPath = path.resolve('public/data/reviews.json');
const kindergartensPath = path.resolve('public/data/kindergartens.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isWebUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function main() {
  const reviewsData = readJson(reviewsPath);
  const kindergartens = readJson(kindergartensPath);
  const kindergartenIds = new Set(kindergartens.map((item) => item.kindercode));
  const reviewsByKindergarten = reviewsData.reviews ?? {};
  const allReviews = Object.values(reviewsByKindergarten).flat();

  const missingWebUrls = allReviews.filter((review) => !isWebUrl(review.url));
  const missingKindergartens = Object.keys(reviewsByKindergarten).filter((id) => !kindergartenIds.has(id));
  const emptyGroups = Object.entries(reviewsByKindergarten).filter(([, reviews]) => !Array.isArray(reviews) || reviews.length === 0);
  const expectedPageCount = Math.max(1, Math.ceil(allReviews.length / REVIEW_PAGE_SIZE));
  const issues = [];

  if (reviewsData.totalCount !== allReviews.length) {
    issues.push(`totalCount ${reviewsData.totalCount} does not match actual ${allReviews.length}`);
  }
  if (reviewsData.kindergartenCount !== Object.keys(reviewsByKindergarten).length) {
    issues.push(
      `kindergartenCount ${reviewsData.kindergartenCount} does not match actual ${Object.keys(reviewsByKindergarten).length}`
    );
  }
  if (missingWebUrls.length > 0) {
    issues.push(`${missingWebUrls.length} reviews do not have an http/https URL`);
  }
  if (missingKindergartens.length > 0) {
    issues.push(`${missingKindergartens.length} review groups are missing kindergarten metadata`);
  }
  if (emptyGroups.length > 0) {
    issues.push(`${emptyGroups.length} review groups are empty`);
  }

  const report = {
    totalReviews: allReviews.length,
    webReviewUrls: allReviews.length - missingWebUrls.length,
    kindergartenGroups: Object.keys(reviewsByKindergarten).length,
    expectedStaticPages: expectedPageCount,
    missingWebUrlSample: missingWebUrls.slice(0, 10).map((review) => ({
      id: review.id,
      kindergartenId: review.kindergartenId,
      title: review.title,
      url: review.url,
    })),
    missingKindergartenSample: missingKindergartens.slice(0, 10),
  };

  console.log(JSON.stringify(report, null, 2));

  if (issues.length > 0) {
    console.error('\nReview web coverage verification failed:');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  console.log('\nReview web coverage verification passed.');
}

main();

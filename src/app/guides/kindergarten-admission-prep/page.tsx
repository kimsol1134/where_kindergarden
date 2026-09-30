import type { Metadata } from 'next';
import { SeoGuideArticle } from '../_components/SeoGuideArticle';
import { getGuide, guidePath } from '../_lib/guides';

const guide = getGuide('kindergarten-admission-prep');

export const metadata: Metadata = {
  title: guide.title,
  description: guide.description,
  keywords: guide.keywords,
  alternates: {
    canonical: guidePath(guide.slug),
  },
  openGraph: {
    title: guide.title,
    description: guide.description,
    type: 'article',
    url: guidePath(guide.slug),
    images: [
      {
        url: guide.heroImage,
        width: 1200,
        height: 630,
        alt: guide.heroAlt,
      },
    ],
  },
};

export default function KindergartenAdmissionPrepGuidePage() {
  return <SeoGuideArticle guide={guide} />;
}

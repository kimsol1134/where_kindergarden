export interface VacancyDetailRow {
  rowNo: number;
  age: string;
  course: string;
  vacancyCount: number;
}

export interface VacancySummary {
  kindercode: string;
  aidYear: string;
  vacancyCount: number;
  updatedAt: string | null;
  preschCd: string | null;
  upperEduOfficeCd: string | null;
  eduOfficeCd: string | null;
  foundType: string | null;
  name: string;
  address: string;
  phone: string | null;
  detail: VacancyDetailRow[];
}

export interface VacancyDataset {
  version: string;
  source: string;
  aidYear: string;
  totalCount: number;
  positiveCount: number;
  items: Record<string, VacancySummary>;
}

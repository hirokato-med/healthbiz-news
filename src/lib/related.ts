import type { Article } from './types';

/** 記事名で会社を引くときの正規化（法人格や空白の違いを吸収） */
export function companyKey(name: string): string {
  return name
    .replace(/株式会社|合同会社|有限会社|一般社団法人|公益社団法人|医療法人|社会医療法人|学校法人|国立大学法人|\(株\)|（株）/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** その記事に関係する会社名（発信元と company ブロック） */
export function companyNamesOf(a: Article): string[] {
  const names = [a.source_name];
  if (a.company?.name) names.push(a.company.name);
  return [...new Set(names.filter(Boolean))];
}

/**
 * 関連する過去記事。同じ会社の記事を優先し、足りなければ同じ分類の新しい記事で埋める。
 */
export function relatedArticles(target: Article, all: Article[], limit = 3): Article[] {
  const keys = new Set(companyNamesOf(target).map(companyKey));
  const news = all.filter((a) => a.id !== target.id && a.kind !== 'substack' && a.kind !== 'weekly' && a.kind !== 'monthly');
  const sameCompany = news.filter((a) => companyNamesOf(a).some((n) => keys.has(companyKey(n))));
  const sameCategory = news.filter((a) => a.category === target.category && !sameCompany.includes(a));
  return [...sameCompany, ...sameCategory].slice(0, limit);
}

/** 会社ページ用: その会社の記事（新しい順）と、会社情報ブロック */
export function articlesOfCompany(name: string, all: Article[]): { articles: Article[]; info: Article['company'] | null } {
  const key = companyKey(name);
  const articles = all.filter((a) => a.kind !== 'substack' && a.kind !== 'weekly' && a.kind !== 'monthly' && companyNamesOf(a).some((n) => companyKey(n) === key));
  const info = articles.map((a) => a.company).find((c) => c && companyKey(c.name) === key) ?? null;
  return { articles, info };
}

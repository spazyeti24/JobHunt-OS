import { logger } from "./logger";

export interface RawJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  isRemote: boolean;
  salary: string | null;
  applyUrl: string | null;
  jobDescription: string;
  source: string;
}

async function fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok && attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    return res;
  } catch (err) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

export async function fetchJSearch(
  query: string,
  location: string,
  employmentTypes: string[],
  datePosted = "week",
  pages = 2
): Promise<RawJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    logger.warn("RAPIDAPI_KEY not set, skipping JSearch");
    return [];
  }

  const fullQuery = location ? `${query} in ${location}` : query;
  const empTypeParam = employmentTypes.join(",");

  const jobs: RawJob[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const url = new URL("https://jsearch.p.rapidapi.com/search");
      url.searchParams.set("query", fullQuery);
      url.searchParams.set("date_posted", datePosted);
      url.searchParams.set("employment_types", empTypeParam);
      url.searchParams.set("page", String(page));
      url.searchParams.set("num_pages", "1");

      const res = await fetchWithRetry(url.toString(), {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, "JSearch returned non-OK status");
        break;
      }

      const data = (await res.json()) as {
        data?: Array<{
          job_id: string;
          job_title: string;
          employer_name: string;
          job_city: string;
          job_state: string;
          job_country: string;
          job_employment_type: string;
          job_is_remote: boolean;
          job_min_salary?: number;
          job_max_salary?: number;
          job_apply_link: string;
          job_description: string;
        }>;
      };

      if (!data.data || data.data.length === 0) break;

      for (const item of data.data) {
        const loc = [item.job_city, item.job_state, item.job_country]
          .filter(Boolean)
          .join(", ");
        let salary: string | null = null;
        if (item.job_min_salary && item.job_max_salary) {
          salary = `$${Math.round(item.job_min_salary / 1000)}K–$${Math.round(item.job_max_salary / 1000)}K`;
        }
        jobs.push({
          jobId: `jsearch_${item.job_id}`,
          title: item.job_title,
          company: item.employer_name,
          location: loc || location,
          employmentType: item.job_employment_type || "FULLTIME",
          isRemote: item.job_is_remote,
          salary,
          applyUrl: item.job_apply_link,
          jobDescription: item.job_description ?? "",
          source: "JSearch",
        });
      }
    } catch (err) {
      logger.error({ err }, "JSearch fetch error");
    }
  }

  return jobs;
}

export async function fetchAdzuna(
  query: string,
  location: string,
  pages = 2
): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    logger.warn("Adzuna credentials not set, skipping");
    return [];
  }

  const what = query;
  const where = location || "US";
  const allResults: RawJob[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/${page}`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("what", what);
      url.searchParams.set("where", where);
      url.searchParams.set("results_per_page", "20");
      url.searchParams.set("content-type", "application/json");

      const res = await fetchWithRetry(url.toString(), {});
      if (!res.ok) {
        logger.warn({ status: res.status, page }, "Adzuna returned non-OK status");
        break;
      }

      const data = (await res.json()) as {
        results?: Array<{
          id: string;
          title: string;
          company?: { display_name: string };
          location?: { display_name: string };
          contract_type?: string;
          salary_min?: number;
          salary_max?: number;
          redirect_url: string;
          description: string;
        }>;
      };

      if (!data.results || data.results.length === 0) break;

      for (const item of data.results) {
        let salary: string | null = null;
        if (item.salary_min && item.salary_max) {
          salary = `$${Math.round(item.salary_min / 1000)}K–$${Math.round(item.salary_max / 1000)}K`;
        }
        allResults.push({
          jobId: `adzuna_${item.id}`,
          title: item.title,
          company: item.company?.display_name ?? "Unknown",
          location: item.location?.display_name ?? where,
          employmentType: item.contract_type?.toUpperCase() ?? "FULLTIME",
          isRemote: item.title.toLowerCase().includes("remote") || (item.location?.display_name?.toLowerCase().includes("remote") ?? false),
          salary,
          applyUrl: item.redirect_url,
          jobDescription: item.description ?? "",
          source: "Adzuna",
        });
      }
    } catch (err) {
      logger.error({ err, page }, "Adzuna fetch error");
      break;
    }
  }

  return allResults;
}

export function dedupeJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    if (seen.has(j.jobId)) return false;
    seen.add(j.jobId);
    return true;
  });
}


const SOURCES = [
  {
    name: "Arbeitnow",
    url: "https://www.arbeitnow.com/api/job-board-api"
  },
  {
    name: "Remote OK",
    url: "https://remoteok.com/api"
  },
  {
    name: "Jobicy",
    url: "https://jobicy.com/api/v2/remote-jobs?count=50"
  }
];

function clean(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") {
    return Object.values(value).join(", ");
  }
  return "";
}

function normalize(job, source) {
  const title = clean(job.title || job.position);
  const company = clean(job.company_name || job.company || job.name);
  const location = clean(
    job.location || job.jobGeo || job.candidate_required_location || "Remote"
  );

  const url = job.url || job.job_url || job.apply_url;

  if (!title || !company || !url || !url.startsWith("https://")) {
    return null;
  }

  return {
    title,
    company,
    location: location || "Remote",
    type: clean(job.job_type || job.jobType || job.type || "Not specified"),
    url,
    source,
    date: job.created_at || job.pubDate || job.date || ""
  };
}

export default async () => {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "GlobalOnlineSkills/1.0" }
      });

      if (!response.ok) throw new Error("Source unavailable");

      const data = await response.json();

      const jobs = Array.isArray(data)
        ? data
        : (data.data || data.jobs || []);

      return jobs
        .map((job) => normalize(job, source.name))
        .filter(Boolean);
    })
  );

  const jobs = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  const unique = [
    ...new Map(jobs.map((job) => [job.url, job])).values()
  ];

  unique.sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );

  return new Response(JSON.stringify({
    success: true,
    total: unique.length,
    jobs: unique
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=900"
    }
  });
};

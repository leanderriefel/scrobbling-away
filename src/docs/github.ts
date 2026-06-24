export const GITHUB_REPO = "https://github.com/leanderriefel/scrobbling-away";
export const GITHUB_DEFAULT_BRANCH = "main";

/** Repo-relative path → GitHub blob or tree URL */
export function githubSourceUrl(path: string): string {
  const normalized = path.replace(/^\//, "");

  if (normalized.includes("*")) {
    const directory = normalized.replace(/\/[^/]*\*[^/]*$/, "").replace(/\*.*$/, "");
    return `${GITHUB_REPO}/tree/${GITHUB_DEFAULT_BRANCH}/${directory}`;
  }

  return `${GITHUB_REPO}/blob/${GITHUB_DEFAULT_BRANCH}/${normalized}`;
}

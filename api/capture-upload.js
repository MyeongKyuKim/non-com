const GITHUB_API = "https://api.github.com";

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function sanitizeFilename(name) {
  return String(name || "capture.png")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildGitHubHeaders(token, extra = {}) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "non-com-capture-uploader",
    ...extra,
  };
}

function encodeGitHubPath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function parseDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Invalid dataUrl payload");
  }
  return {
    mime: match[1],
    base64: match[2],
  };
}

async function githubRequest(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: buildGitHubHeaders(token, options.headers),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  return res;
}

async function githubGet(path, token) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: buildGitHubHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

async function upsertFile({ owner, repo, branch, path, content, sha, token, message }) {
  const contentPath = `/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`;
  const body = {
    message,
    content,
    branch,
  };
  if (sha) body.sha = sha;
  const putRes = await githubRequest(contentPath, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return putRes.json();
}

function decodeGitHubContent(content) {
  const compact = String(content || "").replace(/\n/g, "");
  return Buffer.from(compact, "base64").toString("utf8");
}

function encodeTextBase64(text) {
  return Buffer.from(String(text), "utf8").toString("base64");
}

function nextCaptureId(items) {
  const regex = /^(\d{6})\.(png|jpg|jpeg)$/i;
  let maxId = 0;
  for (const item of items || []) {
    if (!item || item.type !== "file") continue;
    const match = regex.exec(item.name || "");
    if (!match) continue;
    const num = Number(match[1]);
    if (Number.isFinite(num) && num > maxId) maxId = num;
  }
  return String(maxId + 1).padStart(6, "0");
}

async function ensureBranch({ owner, repo, branch, token }) {
  if (branch === "main") return;

  const branchRefPath = `/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const mainRefPath = `/repos/${owner}/${repo}/git/ref/heads/main`;

  const branchRes = await fetch(`${GITHUB_API}${branchRefPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "non-com-capture-uploader",
    },
  });

  if (branchRes.ok) return;
  if (branchRes.status !== 404) {
    const text = await branchRes.text();
    throw new Error(`Failed to check branch "${branch}": ${text}`);
  }

  const mainRes = await githubRequest(mainRefPath, token);
  const mainJson = await mainRes.json();
  const mainSha = mainJson?.object?.sha;
  if (!mainSha) {
    throw new Error('Unable to resolve "main" branch SHA');
  }

  await githubRequest(`/repos/${owner}/${repo}/git/refs`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: mainSha,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getEnv("GITHUB_TOKEN");
    const owner = getEnv("GITHUB_OWNER");
    const repo = getEnv("GITHUB_REPO");
    const branch = process.env.GITHUB_BRANCH || "captures";

    const { dataUrl, caption, label, license, tags } = req.body || {};
    const { mime, base64 } = parseDataUrl(dataUrl);

    if (mime !== "image/png") {
      return res.status(400).json({ error: "Only image/png is supported" });
    }
    if (base64.length > 7_000_000) {
      return res.status(413).json({ error: "Payload too large" });
    }

    await ensureBranch({ owner, repo, branch, token });

    const dateDir = new Date().toISOString().slice(0, 10);
    const imagesDir = `captures/${dateDir}/images`;
    const listPath = `/repos/${owner}/${repo}/contents/${encodeGitHubPath(imagesDir)}?ref=${encodeURIComponent(
      branch
    )}`;
    const dirItems = (await githubGet(listPath, token)) || [];

    const id = nextCaptureId(dirItems);
    const imageName = `${id}.png`;
    const imagePath = `${imagesDir}/${imageName}`;

    const imagePut = await upsertFile({
      owner,
      repo,
      branch,
      path: imagePath,
      content: base64,
      token,
      message: `capture: ${id}`,
    });

    const readmePath = `captures/${dateDir}/README.md`;
    const readmeApiPath = `/repos/${owner}/${repo}/contents/${encodeGitHubPath(
      readmePath
    )}?ref=${encodeURIComponent(branch)}`;
    const existingReadme = await githubGet(readmeApiPath, token);
    const existingText = existingReadme ? decodeGitHubContent(existingReadme.content) : "";

    const entry = {
      id,
      file: `images/${imageName}`,
      caption: String(caption || ""),
      label: String(label || "capture"),
      license: String(license || "CC-BY-4.0"),
      tags: Array.isArray(tags) ? tags.map((x) => String(x)) : [],
    };
    const entryLine = JSON.stringify(entry);
    const separator = existingText && !existingText.endsWith("\n") ? "\n" : "";
    const nextReadme = `${existingText}${separator}${entryLine}\n`;

    await upsertFile({
      owner,
      repo,
      branch,
      path: readmePath,
      content: encodeTextBase64(nextReadme),
      sha: existingReadme?.sha,
      token,
      message: `capture index: ${dateDir} ${id}`,
    });

    return res.status(200).json({
      ok: true,
      id,
      path: imagePath,
      readmePath,
      branch,
      commitSha: imagePut?.commit?.sha || null,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Upload failed",
      detail: error.message,
    });
  }
}

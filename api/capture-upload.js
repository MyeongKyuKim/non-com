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
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "non-com-capture-uploader",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  return res;
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

    const { filename, dataUrl, cellIndex } = req.body || {};
    const safeFilename = sanitizeFilename(filename || `cell-${cellIndex || "x"}.png`);
    const { mime, base64 } = parseDataUrl(dataUrl);

    if (mime !== "image/png") {
      return res.status(400).json({ error: "Only image/png is supported" });
    }
    if (base64.length > 7_000_000) {
      return res.status(413).json({ error: "Payload too large" });
    }

    await ensureBranch({ owner, repo, branch, token });

    const dateDir = new Date().toISOString().slice(0, 10);
    const path = `captures/${dateDir}/${safeFilename}`;
    const contentPath = `/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`;

    let sha;
    const existingRes = await fetch(`${GITHUB_API}${contentPath}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "non-com-capture-uploader",
      },
    });
    if (existingRes.ok) {
      const existingJson = await existingRes.json();
      sha = existingJson?.sha;
    } else if (existingRes.status !== 404) {
      const text = await existingRes.text();
      throw new Error(`Failed checking existing file: ${text}`);
    }

    const commitMessage = `capture: ${safeFilename}`;
    const putRes = await githubRequest(contentPath, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMessage,
        content: base64,
        branch,
        sha,
      }),
    });

    const putJson = await putRes.json();

    return res.status(200).json({
      ok: true,
      path,
      branch,
      commitSha: putJson?.commit?.sha || null,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Upload failed",
      detail: error.message,
    });
  }
}

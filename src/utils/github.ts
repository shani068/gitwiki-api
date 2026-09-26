import path from "node:path";

import { ApiError } from "./ApiError";
import { Octokit } from "@octokit/rest";

const SKIP_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  "vendor",
  "target",
  "__pycache__",
  ".gradle",
];

const SKIP_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "ico",
  "webp",
  "bmp",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "otf",
  "mp3",
  "mp4",
  "mov",
  "wav",
  "webm",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "wasm",
  "class",
  "jar",
  "war",
  "ear",
  "zip",
  "tar",
  "gz",
  "tgz",
  "7z",
  "rar",
  "pdf",
  "lock",
  "map",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "composer.lock",
  "go.sum",
]);

const MAX_FILE_LINES = 2000;

export const shouldSkipFile = (filePath: string, size: number): boolean => {
  const isOverLineLimit = size > MAX_FILE_LINES;
  if (isOverLineLimit) {
    return true;
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  const fileName = path.posix.basename(normalizedPath);

  if (SKIP_FILES.has(fileName)) {
    return true;
  }

  const parentSegments = normalizedPath.split("/").slice(0, -1);
  const isInsideSkippedDirectory = parentSegments.some((segment) => SKIP_DIRS.includes(segment));
  if (isInsideSkippedDirectory) {
    return true;
  }

  const extension = path.posix.extname(fileName).slice(1).toLowerCase();
  const hasSkippedExtension = extension.length > 0 && SKIP_EXTENSIONS.has(extension);
  return hasSkippedExtension;
};

export function parseRepo(input: string) {
    const clean = input
      .replace("https://github.com/", "")
      .replace("http://github.com/", "")
      .replace(/\.git$/, "");
  
    const [owner, repo] = clean.split("/");
    return { owner, repo, repoKey: `${owner}/${repo}` };
  }


export async function fetchRepo(token: string, owner: string, repo: string) {
    const octokit = new Octokit({ auth: token });

    const { data: repoInfo } = await octokit.rest.repos.get({owner, repo}).catch((err)=>{
        if(err.status === 404) {
            throw new ApiError(404, `Github could not find ${owner}/${repo}`);
        }

        throw err;
    })

    const { data: tree } = await octokit.rest.git.getTree({
        owner, 
        repo, 
        tree_sha: repoInfo.default_branch,
        recursive: "true"
    })

    const files = [];

    for(const file of tree.tree) {
        if(file.type !== "blob") continue;
        if(shouldSkipFile(file.path, file.size ?? 0)) continue;

        const { data: fileContent } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: file.sha
        })

        files.push({
            path: file.path,
            content: Buffer.from(fileContent.content, "base64").toString("utf-8")
        });

        if(files.length >= 200) break;
    }

    return files;
}
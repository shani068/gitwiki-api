import {inngest} from "../client.js";
import { fetchRepo } from "@/utils/github.js";
import { chunkFiles } from "@/utils/chunk.js";
import { saveChunks } from "@/utils/vectorStore.js";

export const indexRepo = inngest.createFunction(
    { id: "index-repo", triggers: [{ event: "repo/index.requested"}]},

    async ({event, step}) => {
        const { token, owner, repo } = event.data;

        const repoName = repo.replace(/\.git$/, "");
        const repoKey = `${owner}/${repoName}`;

        const files = await step.run("fetch-repo-files", async () => {
            return await fetchRepo(token, owner, repoName);
        });

        const documents = await step.run("chunk-files", async () => {
            return await chunkFiles(repoName, files);
        });

        const result = await step.run("save-to-pinecone", async () => await saveChunks(repoKey, documents));

        return {
            repo: repoKey,
            fileCount: files.length,
            chunkCount: documents.length,
            saved: result?.saved,
        };
    }
)
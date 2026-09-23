import type { InngestFunction } from "inngest";
import { inngest } from "@/inngest/client";

export const helloWorld: InngestFunction.Any = inngest.createFunction(
  { id: "hello-world", triggers: [{ event: "test/hello.world" }] },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  },
);

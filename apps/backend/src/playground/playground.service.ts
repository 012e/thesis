import { Injectable, Logger } from "@nestjs/common";

import type { PlaygroundLanguage } from "@repo/rest-contracts";

import { PistonClient } from "./piston.client";
import type { ExecuteCodeInput } from "./playground.schemas";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

/** Timeouts applied when the caller does not provide one. */
const DEFAULT_RUN_TIMEOUT_MS = 10_000;
const DEFAULT_COMPILE_TIMEOUT_MS = 10_000;

const PISTON_VERSION_BY_LANGUAGE = {
  javascript: "20.11.1",
  typescript: "5.0.3",
  python: "3.12",
  c: "10.2",
  "c++": "10.2",
  java: "15.0.2",
  go: "1.16.2",
  rust: "1.68.2",
  ruby: "3.0.1",
  php: "8.2.3",
  kotlin: "1.8.20",
  swift: "5.3.3",
  lua: "5.4.4",
} as const satisfies Record<PlaygroundLanguage, string>;

@Injectable()
export class PlaygroundService {
  private readonly logger = new Logger(PlaygroundService.name);

  constructor(private readonly pistonClient: PistonClient) {}

  async executeCode(input: ExecuteCodeInput): Promise<ExecutionResult> {
    const startTime = Date.now();
    const runTimeout = input.timeout ?? DEFAULT_RUN_TIMEOUT_MS;

    this.logger.log(
      `Executing ${input.language} code via Piston (run_timeout: ${runTimeout}ms, size: ${input.code.length} bytes)`,
    );

    try {
      const response = await this.pistonClient.execute({
        language: input.language,
        version: PISTON_VERSION_BY_LANGUAGE[input.language],
        files: [{ content: input.code }],
        run_timeout: runTimeout,
        compile_timeout: DEFAULT_COMPILE_TIMEOUT_MS,
      });

      const executionTime = Date.now() - startTime;
      const compile = response.compile;
      const run = response.run;

      if (compile && (compile.status !== null || compile.code !== 0)) {
        return {
          stdout: compile.stdout,
          stderr: compile.stderr,
          exitCode: compile.code ?? -1,
          executionTime,
        };
      }

      // Piston status "TO" means the run was killed due to exceeding wall-time
      // or CPU-time. Surface this the same way the previous implementation did.
      if (run.status === "TO") {
        this.logger.warn(
          `Code execution timed out after ${executionTime}ms (limit: ${runTimeout}ms)`,
        );
        return {
          stdout: run.stdout,
          stderr:
            run.stderr ||
            `Error: Execution timeout exceeded (limit: ${runTimeout}ms)`,
          exitCode: -1,
          executionTime,
        };
      }

      const exitCode = run.code ?? -1;

      this.logger.log(
        `Code execution completed in ${executionTime}ms (exit code: ${exitCode})`,
      );

      return {
        stdout: `${compile?.stdout ?? ""}${run.stdout}`,
        stderr: `${compile?.stderr ?? ""}${run.stderr}`,
        exitCode,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Code execution failed: ${error}`);

      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        executionTime,
      };
    }
  }
}

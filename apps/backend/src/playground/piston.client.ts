import { Injectable, Logger } from "@nestjs/common";

import { env } from "../env";

// ── Piston API types ────────────────────────────────────────────────────────

export interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
}

export interface PistonFile {
  /** Optional filename — Piston uses the first file as the entry point. */
  name?: string;
  content: string;
  encoding?: "base64" | "hex" | "utf8";
}

export interface PistonExecuteRequest {
  language: string;
  /** SemVer selector or exact version. Use `"*"` for the latest installed. */
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  /** Max wall-time for the compile stage in ms. Defaults to 10 000. */
  compile_timeout?: number;
  /** Max wall-time for the run stage in ms. Defaults to 3 000. */
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

/**
 * Stage result returned by Piston for both `compile` and `run`.
 *
 * `status` is one of:
 *  - `null`  — no error
 *  - `"RE"`  — runtime error
 *  - `"SG"`  — killed by signal
 *  - `"TO"`  — timeout (wall-time or CPU-time)
 *  - `"OL"`  — stdout length exceeded
 *  - `"EL"`  — stderr length exceeded
 *  - `"XX"`  — internal Piston error
 */
export interface PistonStageResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number | null;
  signal: string | null;
  message: string | null;
  status: "RE" | "SG" | "TO" | "OL" | "EL" | "XX" | null;
  cpu_time: number;
  wall_time: number;
  memory: number;
}

export interface PistonExecuteResponse {
  language: string;
  version: string;
  /** Always present — result of the run stage. */
  run: PistonStageResult;
  /** Only present for compiled languages. */
  compile?: PistonStageResult;
}

// ── Client ──────────────────────────────────────────────────────────────────

@Injectable()
export class PistonClient {
  private readonly logger = new Logger(PistonClient.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.PISTON_URL.replace(/\/$/, ""); // strip trailing slash
  }

  /**
   * List all runtimes currently installed on the Piston instance.
   */
  async getRuntimes(): Promise<PistonRuntime[]> {
    const url = `${this.baseUrl}/api/v2/runtimes`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Piston runtimes request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<PistonRuntime[]>;
  }

  /**
   * Execute code in the Piston sandbox.
   *
   * Throws if the HTTP request itself fails (network error or non-2xx from
   * Piston). Timeout / runtime errors are surfaced via the returned
   * `PistonExecuteResponse` rather than thrown.
   */
  async execute(request: PistonExecuteRequest): Promise<PistonExecuteResponse> {
    const url = `${this.baseUrl}/api/v2/execute`;

    this.logger.debug(
      `POST ${url} — language=${request.language}@${request.version}`,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      throw new Error(
        body.message ??
          `Piston execute request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<PistonExecuteResponse>;
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { Sandbox, NetworkPolicy } from "microsandbox";
import type { ExecuteCodeInput } from "./playground.schemas";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

@Injectable()
export class PlaygroundService {
  private readonly logger = new Logger(PlaygroundService.name);
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly maxMemoryMb = 512;
  private readonly cpus = 1;

  async executeCode(input: ExecuteCodeInput): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = input.timeout ?? this.defaultTimeout;
    const isTypeScript = input.language === "typescript";

    this.logger.log(
      `Executing ${input.language} code (timeout: ${timeout}ms, size: ${input.code.length} bytes)`,
    );

    let sandbox: Sandbox | undefined;

    try {
      // Create ephemeral sandbox with Node.js
      sandbox = await Sandbox.create({
        name: `playground-${Date.now()}`,
        image: "node:alpine",
        cpus: this.cpus,
        memoryMib: this.maxMemoryMb,
        network: NetworkPolicy.publicOnly(),
      });

      this.logger.debug("Sandbox created successfully");

      // For TypeScript, we need tsx to execute it directly
      if (isTypeScript) {
        // Install tsx in the sandbox
        this.logger.debug("Installing tsx for TypeScript execution");
        await sandbox.shell("npm install -g tsx");
      }

      // Write code to a temporary file in the sandbox
      const fileExtension = isTypeScript ? "ts" : "js";
      const codeFile = `/tmp/code.${fileExtension}`;
      await sandbox.fs().write(codeFile, Buffer.from(input.code, "utf-8"));

      this.logger.debug(`Code written to ${codeFile}`);

      // Execute the code with a timeout
      const executeCommand = isTypeScript
        ? `tsx ${codeFile}`
        : `node ${codeFile}`;

      const executePromise = sandbox.shell(executeCommand);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timeout exceeded")),
          timeout,
        ),
      );

      const output = await Promise.race([executePromise, timeoutPromise]);

      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Code execution completed in ${executionTime}ms (exit code: ${output.code})`,
      );

      return {
        stdout: output.stdout(),
        stderr: output.stderr(),
        exitCode: output.code,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Code execution failed: ${error}`);

      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes("timeout")) {
        return {
          stdout: "",
          stderr: `Error: Execution timeout exceeded (limit: ${timeout}ms)`,
          exitCode: -1,
          executionTime,
        };
      }

      // Return other errors as stderr
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        executionTime,
      };
    } finally {
      // Always clean up the sandbox
      if (sandbox) {
        try {
          await sandbox.stopAndWait();
          this.logger.debug("Sandbox stopped and cleaned up");
        } catch (cleanupError) {
          this.logger.error(`Failed to cleanup sandbox: ${cleanupError}`);
        }
      }
    }
  }
}

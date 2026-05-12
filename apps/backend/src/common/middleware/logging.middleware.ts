import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, headers, query, body, ip } = req;
    const startTime = Date.now();
    const userAgent = headers["user-agent"] ?? "-";

    this.logger.debug(
      [
        "",
        "──────────────── Incoming Request ────────────────",
        `  ${method} ${originalUrl}`,
        `  IP         : ${ip}`,
        `  User-Agent : ${userAgent}`,
        "  Headers:",
        ...Object.entries(headers).map(
          ([k, v]) =>
            `    ${k}: ${Array.isArray(v) ? v.join(", ") : (v ?? "")}`,
        ),
        Object.keys(query).length
          ? `  Query: ${JSON.stringify(query, null, 2)}`
          : null,
        body !== undefined && Object.keys(body as object).length
          ? `  Body:\n${JSON.stringify(body, null, 2)
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n")}`
          : null,
        "──────────────────────────────────────────────────",
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get("Content-Length") ?? "-";

      this.logger.debug(
        `  ${method} ${originalUrl} → ${statusCode} (${contentLength} bytes) +${duration}ms`,
      );
    });

    next();
  }
}

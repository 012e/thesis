import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/auth";

/**
 * Guard that restricts access to users with the "admin" role.
 *
 * Throws 401 UnauthorizedException if there is no active session.
 * Throws 403 ForbiddenException if the authenticated user is not an admin.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[]> }>();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    const role = (session.user as { role?: string | null }).role;

    if (role !== "admin") {
      throw new ForbiddenException();
    }

    return true;
  }
}

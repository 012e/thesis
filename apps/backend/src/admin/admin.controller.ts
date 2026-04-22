import { Controller, UseGuards } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { adminContract } from "@repo/rest-contracts";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";

@Controller()
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @TsRestHandler(adminContract.listUsers)
  listUsers() {
    return tsRestHandler(adminContract.listUsers, async ({ query }) => {
      const result = await this.adminService.listUsers({
        limit: query.limit,
        offset: query.offset,
      });

      return { status: 200, body: result };
    });
  }
}

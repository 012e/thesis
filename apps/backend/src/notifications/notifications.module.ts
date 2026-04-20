import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/db/database.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { WebSocketTransport } from './transports/websocket.transport';
import { NOTIFICATION_TRANSPORTS } from './transports/notification-transport.interface';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    WebSocketTransport,
    {
      provide: NOTIFICATION_TRANSPORTS,
      useFactory: (ws: WebSocketTransport) => [ws],
      inject: [WebSocketTransport],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

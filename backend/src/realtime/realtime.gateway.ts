import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

// Rooms are scoped per-org so a dashboard user only ever receives events for
// their own organization's data, mirroring the REST API's org scoping.
function orgRoom(orgId: string) {
  return `org:${orgId}`;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private config: ConfigService) {}

  afterInit() {
    this.logger.log('Realtime gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) {
        client.disconnect();
        return;
      }
      const secret = this.config.get<string>('JWT_SECRET', 'change-me-in-production');
      const payload = jwt.verify(token, secret) as { orgId?: string };
      if (!payload?.orgId) {
        client.disconnect();
        return;
      }
      client.join(orgRoom(payload.orgId));
    } catch {
      client.disconnect();
    }
  }

  emitSubmissionUpsert(orgId: string, submission: unknown) {
    this.server.to(orgRoom(orgId)).emit('submission.upsert', submission);
  }

  emitSubmissionConflict(orgId: string, submission: unknown) {
    this.server.to(orgRoom(orgId)).emit('submission.conflict', submission);
  }

  emitJobUpsert(orgId: string, job: unknown) {
    this.server.to(orgRoom(orgId)).emit('job.upsert', job);
  }
}

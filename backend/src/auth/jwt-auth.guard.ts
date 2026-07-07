import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Every request that hits this guard is guaranteed to carry a valid JWT
// whose payload includes orgId — controllers/services scope every query by
// req.user.orgId so one org can never read or write another org's rows.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { REQUEST_ID_HEADER } from '@constants/index.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : uuidv4();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

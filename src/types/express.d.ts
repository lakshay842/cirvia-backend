export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: import('../modules/auth/types/auth.types.js').AuthenticatedUser;
    }
  }
}

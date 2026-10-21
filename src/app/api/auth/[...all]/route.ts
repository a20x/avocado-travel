import { authHandler } from '@/modules/auth/server';

// Служебные адреса Better Auth: /api/auth/get-session, /api/auth/sign-out и другие.
export const { GET, POST } = authHandler;

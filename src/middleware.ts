import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCAL_SESSION_COOKIE, getLocalSessionFromCookieValue } from '@/lib/local-session';

export async function middleware(req: NextRequest) {
  const isLocalDatabase = process.env.DATABASE_SOURCE?.toLowerCase() === 'local';
  const publicPaths = ['/login', '/clear-storage'];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  if (isLocalDatabase) {
    const localSession = getLocalSessionFromCookieValue(req.cookies.get(LOCAL_SESSION_COOKIE)?.value);

    if (!localSession && !isPublicPath) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (req.nextUrl.pathname === '/login' && localSession) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next({
      request: {
        headers: req.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rutas públicas que no requieren autenticación
  // Si el usuario está intentando acceder a /login y ya está autenticado
  if (req.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Si el usuario no está autenticado y está intentando acceder a rutas protegidas
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

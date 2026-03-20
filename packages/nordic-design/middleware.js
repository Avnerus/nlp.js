import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();
  
  // Only protect /editor paths
  if (url.pathname.startsWith('/editor')) {
    const password = process.env.EDITOR_PASSWORD;
    
    // If password is set, require authentication
    if (password) {
      const authHeader = request.headers.get('authorization');
      
      // Check for Basic auth
      if (authHeader && authHeader.startsWith('Basic ')) {
        const encodedCredentials = authHeader.substring(6);
        const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
        const [username, passedPassword] = decodedCredentials.split(':');
        
        if (passedPassword === password) {
          return NextResponse.next();
        }
      }
      
      // If no valid auth, return 401 with Basic auth challenge
      const response = new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Editor Access", charset="UTF-8"'
        }
      });
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/editor/:path*'],
};

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }
  return secret
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is not set')
  }
  return password
}

function createSessionToken(): string {
  const timestamp = Date.now()
  const data = `${timestamp}:${getSessionSecret()}`
  const hash = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('hex')
  return Buffer.from(`${timestamp}:${hash}`).toString('base64')
}

function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [timestampStr, hash] = decoded.split(':')
    const timestamp = parseInt(timestampStr, 10)
    
    // Check if session has expired
    if (Date.now() - timestamp > SESSION_DURATION) {
      return false
    }
    
    // Verify hash
    const expectedData = `${timestamp}:${getSessionSecret()}`
    const expectedHash = crypto.createHmac('sha256', getSessionSecret()).update(expectedData).digest('hex')
    
    return hash === expectedHash
  } catch {
    return false
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  return password === getAdminPassword()
}

export async function createSession(): Promise<void> {
  const token = createSessionToken()
  const cookieStore = await cookies()
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) {
    return false
  }
  
  return verifySessionToken(token)
}

export async function requireAuth(): Promise<void> {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect('/admin/login')
  }
}


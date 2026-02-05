'use server'

import { verifyPassword, createSession } from '@/lib/auth'

export async function loginAction(password: string): Promise<{ success: boolean }> {
  const isValid = await verifyPassword(password)
  
  if (isValid) {
    await createSession()
    return { success: true }
  }
  
  return { success: false }
}


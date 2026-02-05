'use server'

import { destroySession } from '@/lib/auth'

export async function logoutAction(): Promise<void> {
  await destroySession()
}


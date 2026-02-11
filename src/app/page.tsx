import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'

export default async function Home() {
  const userData = await getCurrentUser()

  if (userData) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}

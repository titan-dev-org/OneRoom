// components/AdminNavbar.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminNavbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/admin/users" className="font-bold text-xl">
              🛡️ Admin Panel
            </Link>
            <div className="flex gap-4">
              <Link href="/admin/users" className="hover:text-gray-300">
                Users
              </Link>
              <Link href="/" className="hover:text-gray-300">
                ← Back to App
              </Link>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-600 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

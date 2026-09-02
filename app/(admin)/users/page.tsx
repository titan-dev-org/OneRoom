// app/(admin)/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    setUsers(data || [])
    setLoading(false)
  }

  const updateVerification = async (userId: string, type: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        verified_type: type,
        is_verified: !!type,
      })
      .eq('id', userId)

    if (!error) {
      fetchUsers()
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manajemen User</h1>
      
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verifikasi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url && (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="font-medium">{user.full_name || user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4">@{user.username}</td>
                <td className="px-6 py-4">
                  {user.is_verified ? (
                    <span className={`px-2 py-1 text-xs text-white rounded-full ${
                      user.verified_type === 'creator' ? 'bg-blue-500' :
                      user.verified_type === 'government' ? 'bg-red-500' :
                      user.verified_type === 'news' ? 'bg-green-500' : 'bg-gray-500'
                    }`}>
                      {user.verified_type}
                    </span>
                  ) : (
                    <span className="text-gray-400">Tidak</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={user.verified_type || ''}
                    onChange={(e) => updateVerification(user.id, e.target.value || null)}
                    className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tidak</option>
                    <option value="creator">✨ Kreator</option>
                    <option value="government">🏛️ Pemerintah</option>
                    <option value="news">📰 Media</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
            }

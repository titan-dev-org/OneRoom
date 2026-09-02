// app/(admin)/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
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
    setUpdating(userId)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verified_type: type,
          is_verified: !!type,
        })
        .eq('id', userId)

      if (!error) {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error updating verification:', error)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manajemen User</h1>
      
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verifikasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-semibold">
                            {user.full_name?.[0] || user.username?.[0] || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{user.full_name || user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    @{user.username}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_verified ? (
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${
                        user.verified_type === 'creator' ? 'bg-blue-500' :
                        user.verified_type === 'government' ? 'bg-red-500' :
                        user.verified_type === 'news' ? 'bg-green-500' : 'bg-gray-500'
                      }`}>
                        {user.verified_type === 'creator' && '✨ '}
                        {user.verified_type === 'government' && '🏛️ '}
                        {user.verified_type === 'news' && '📰 '}
                        {user.verified_type}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Tidak terverifikasi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.verified_type || ''}
                      onChange={(e) => updateVerification(user.id, e.target.value || null)}
                      disabled={updating === user.id}
                      className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Tidak</option>
                      <option value="creator">✨ Kreator</option>
                      <option value="government">🏛️ Pemerintah</option>
                      <option value="news">📰 Media</option>
                    </select>
                    {updating === user.id && (
                      <span className="ml-2 inline-block animate-spin">⏳</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

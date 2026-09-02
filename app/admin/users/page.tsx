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
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manajemen User</h1>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Username</th>
              <th className="px-4 py-2 text-left">Verifikasi</th>
              <th className="px-4 py-2 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {user.avatar_url && (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span>{user.full_name || user.username}</span>
                  </div>
                </td>
                <td className="px-4 py-2">@{user.username}</td>
                <td className="px-4 py-2">
                  {user.is_verified ? (
                    <span className={`px-2 py-1 text-xs text-white rounded-full ${
                      user.verified_type === 'creator' ? 'bg-blue-500' :
                      user.verified_type === 'government' ? 'bg-red-500' :
                      user.verified_type === 'news' ? 'bg-green-500' : ''
                    }`}>
                      {user.verified_type}
                    </span>
                  ) : (
                    <span className="text-gray-400">Tidak</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={user.verified_type || ''}
                    onChange={(e) => updateVerification(user.id, e.target.value || null)}
                    className="px-2 py-1 border rounded text-sm"
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

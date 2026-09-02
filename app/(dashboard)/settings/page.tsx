'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setUsername(data.username)
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setWebsite(data.website || '')
      setLocation(data.location || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Harus login')

      let avatarUrl = profile?.avatar_url

      // Upload avatar
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
          bio,
          website,
          location,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profil berhasil diupdate!' })
      setTimeout(() => router.refresh(), 1000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Harus login')

      // Hapus semua data terkait (cascade akan menghapus otomatis)
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.admin.deleteUser(user.id)

      await supabase.auth.signOut()
      router.push('/login')
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal hapus akun' })
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Pengaturan Akun</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Foto Profil</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-300 overflow-hidden relative">
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
            maxLength={160}
          />
          <p className="text-xs text-gray-500">{bio.length}/160</p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
            placeholder="https://example.com"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Lokasi</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
          />
        </div>

        {message.text && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Hapus Akun
          </button>
        </div>
      </form>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Hapus Akun?</h2>
            <p className="text-gray-600 mb-6">
              Semua data Anda akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
          }

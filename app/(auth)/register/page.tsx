'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/')
      }
      setIsLoading(false)
    }
    checkSession()
  }, [router, supabase])

  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8
    const hasUpperCase = /[A-Z]/.test(pass)
    const hasLowerCase = /[a-z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    const hasSpecial = /[!@#$%^&*]/.test(pass)
    
    if (!hasMinLength) return 'Password minimal 8 karakter'
    if (!hasUpperCase) return 'Password harus ada huruf besar'
    if (!hasLowerCase) return 'Password harus ada huruf kecil'
    if (!hasNumber) return 'Password harus ada angka'
    if (!hasSpecial) return 'Password harus ada karakter spesial (!@#$%^&*)'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validasi
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    if (username.length < 3) {
      setError('Username minimal 3 karakter')
      setLoading(false)
      return
    }

    if (username.length > 20) {
      setError('Username maksimal 20 karakter')
      setLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username hanya boleh huruf, angka, dan underscore')
      setLoading(false)
      return
    }

    try {
      // REGISTER KE SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            full_name: fullName || username,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Email sudah terdaftar. Silakan login.')
        } else if (authError.message.includes('rate limit')) {
          setError('Terlalu banyak percobaan. Tunggu beberapa menit.')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (authData.user) {
        // TUNGGU TRIGGER MEMBUAT PROFILE (3 detik)
        setSuccess(true)
        await new Promise(resolve => setTimeout(resolve, 3000))

        // CEK APAKAH PROFILE SUDAH TERBUAT
        const { data: profile, error: checkError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        // JIKA PROFILE BELUM TERBUAT, INSERT MANUAL
        if (!profile || checkError) {
          console.log('Profile belum terbuat, insert manual...')
          
          try {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                username: username.toLowerCase(),
                full_name: fullName || username,
                role: 'user',
              })

            if (insertError) {
              console.error('Insert manual gagal:', insertError)
              // Coba sekali lagi dengan upsert
              await supabase
                .from('profiles')
                .upsert({
                  id: authData.user.id,
                  username: username.toLowerCase(),
                  full_name: fullName || username,
                  role: 'user',
                }, {
                  onConflict: 'id'
                })
            }
          } catch (err) {
            console.error('Error insert manual:', err)
          }
        }

        // REDIRECT KE LOGIN
        router.push('/login?registered=true')
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Gagal registrasi. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Daftar Akun
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Login
            </Link>
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">
              ✅ Registrasi berhasil! Mengalihkan ke halaman login...
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                />
              </div>
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username (huruf, angka, underscore)"
                />
              </div>
              <div>
                <label htmlFor="fullName" className="sr-only">Nama Lengkap</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Nama Lengkap (opsional)"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password (min 8 karakter)"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Password minimal 8 karakter, huruf besar/kecil, angka, dan spesial (!@#$%^&*)
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
      }

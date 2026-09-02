// app/(dashboard)/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostForm from '@/components/PostForm'
import PostCard from '@/components/PostCard'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | undefined>()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setCurrentUser(session.user.id)
      fetchPosts()
    }
    checkAuth()
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            verified_type,
            is_verified
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get counts untuk setiap post
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const [likesCount, commentsCount, repostsCount] = await Promise.all([
            supabase.from('likes').select('id', { count: 'exact' }).eq('post_id', post.id).eq('type', 'post'),
            supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', post.id),
            supabase.from('reposts').select('id', { count: 'exact' }).eq('post_id', post.id)
          ])

          return {
            ...post,
            likes_count: likesCount.count || 0,
            comments_count: commentsCount.count || 0,
            reposts_count: repostsCount.count || 0
          }
        })
      )

      setPosts(postsWithCounts)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostCreated = () => {
    fetchPosts()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PostForm onPostCreated={handlePostCreated} />
      
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <p className="text-gray-500">Belum ada postingan. Buat postingan pertama! 🚀</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUser}
            onInteraction={handlePostCreated}
            onDelete={handlePostCreated}
          />
        ))
      )}
    </div>
  )
        }

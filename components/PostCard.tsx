// components/PostCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

interface PostCardProps {
  post: {
    id: string
    content: string
    media_urls: string[]
    media_types: string[]
    created_at: string
    updated_at: string
    user_id: string
    parent_post_id: string | null
    is_quote: boolean
    quoted_post_id: string | null
    profiles: {
      id: string
      username: string
      full_name: string
      avatar_url: string
      verified_type: 'creator' | 'government' | 'news' | null
      is_verified: boolean
    }
    likes_count?: number
    comments_count?: number
    reposts_count?: number
  }
  currentUserId?: string
  onInteraction?: () => void
  onDelete?: () => void
}

export default function PostCard({ 
  post, 
  currentUserId, 
  onInteraction, 
  onDelete 
}: PostCardProps) {
  // States dengan tipe data yang jelas
  const [likes, setLikes] = useState<number>(post.likes_count || 0)
  const [isLiked, setIsLiked] = useState<boolean>(false)
  const [reposts, setReposts] = useState<number>(post.reposts_count || 0)
  const [isReposted, setIsReposted] = useState<boolean>(false)
  const [showComments, setShowComments] = useState<boolean>(false)
  const [commentContent, setCommentContent] = useState<string>('')
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editContent, setEditContent] = useState<string>(post.content)
  
  const supabase = createClient()
  const isOwner = currentUserId === post.user_id

  // Cek status like & repost saat komponen mount
  useEffect(() => {
    if (currentUserId) {
      checkInteraction()
    }
  }, [currentUserId])

  // Load comments saat showComments true
  useEffect(() => {
    if (showComments) {
      fetchComments()
    }
  }, [showComments])

  // Function untuk cek interaksi
  const checkInteraction = async () => {
    try {
      // Check like
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .eq('type', 'post')
        .single()

      setIsLiked(!!likeData)

      // Check repost
      const { data: repostData } = await supabase
        .from('reposts')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .single()

      setIsReposted(!!repostData)
    } catch (error) {
      console.error('Error checking interaction:', error)
    }
  }

  // Function untuk fetch comments
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
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
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // Function untuk handle like
  const handleLike = async () => {
    if (!currentUserId) {
      alert('Silakan login terlebih dahulu')
      return
    }
    
    setLoading(true)

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)
          .eq('type', 'post')

        if (error) throw error
        
        setLikes((prev: number) => prev - 1)
        setIsLiked(false)
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: currentUserId,
            post_id: post.id,
            type: 'post'
          })

        if (error) throw error
        
        setLikes((prev: number) => prev + 1)
        setIsLiked(true)

        // Buat notifikasi
        if (currentUserId !== post.user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: post.user_id,
              actor_id: currentUserId,
              type: 'like',
              post_id: post.id
            })
        }
      }
      
      onInteraction?.()
    } catch (error) {
      console.error('Error liking:', error)
      alert('Gagal melakukan like')
    } finally {
      setLoading(false)
    }
  }

  // Function untuk handle repost
  const handleRepost = async () => {
    if (!currentUserId) {
      alert('Silakan login terlebih dahulu')
      return
    }
    
    setLoading(true)

    try {
      if (isReposted) {
        // Unrepost
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)

        if (error) throw error
        
        setReposts((prev: number) => prev - 1)
        setIsReposted(false)
      } else {
        // Repost
        const { error } = await supabase
          .from('reposts')
          .insert({
            user_id: currentUserId,
            post_id: post.id
          })

        if (error) throw error
        
        setReposts((prev: number) => prev + 1)
        setIsReposted(true)

        // Buat notifikasi
        if (currentUserId !== post.user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: post.user_id,
              actor_id: currentUserId,
              type: 'repost',
              post_id: post.id
            })
        }
      }
      
      onInteraction?.()
    } catch (error) {
      console.error('Error reposting:', error)
      alert('Gagal melakukan repost')
    } finally {
      setLoading(false)
    }
  }

  // Function untuk handle comment
  const handleComment = async () => {
    if (!currentUserId) {
      alert('Silakan login terlebih dahulu')
      return
    }
    
    if (!commentContent.trim()) {
      alert('Komentar tidak boleh kosong')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: commentContent.trim(),
          parent_comment_id: replyTo
        })
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
        .single()

      if (error) throw error

      setComments((prev: any[]) => [...prev, data])
      setCommentContent('')
      setReplyTo(null)
      
      // Buat notifikasi
      if (currentUserId !== post.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: post.user_id,
            actor_id: currentUserId,
            type: 'comment',
            post_id: post.id
          })
      }

      onInteraction?.()
    } catch (error) {
      console.error('Error commenting:', error)
      alert('Gagal mengirim komentar')
    } finally {
      setLoading(false)
    }
  }

  // Function untuk delete post
  const handleDeletePost = async () => {
    if (!currentUserId || !isOwner) return
    
    setIsDeleting(true)

    try {
      // Delete media dari storage dulu
      if (post.media_urls && post.media_urls.length > 0) {
        for (const url of post.media_urls) {
          const path = url.split('/').pop()
          if (path) {
            await supabase.storage
              .from('post-media')
              .remove([path])
          }
        }
      }

      // Delete post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error

      onDelete?.()
      onInteraction?.()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Gagal menghapus postingan')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Function untuk edit post
  const handleEditPost = async () => {
    if (!currentUserId || !isOwner || !editContent.trim()) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', post.id)

      if (error) throw error

      setIsEditing(false)
      post.content = editContent.trim()
      onInteraction?.()
    } catch (error) {
      console.error('Error editing post:', error)
      alert('Gagal mengedit postingan')
    } finally {
      setLoading(false)
    }
  }

  // Function untuk render badge verifikasi
  const renderVerificationBadge = () => {
    if (!post.profiles?.is_verified) return null
    
    const badges: Record<string, { color: string; label: string; icon: string }> = {
      creator: {
        color: 'bg-blue-500',
        label: 'Kreator',
        icon: '✨'
      },
      government: {
        color: 'bg-red-500',
        label: 'Pemerintah',
        icon: '🏛️'
      },
      news: {
        color: 'bg-green-500',
        label: 'Media',
        icon: '📰'
      }
    }

    const badge = post.profiles.verified_type ? badges[post.profiles.verified_type] : null
    if (!badge) return null

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${badge.color} text-white text-xs rounded-full ml-1`}>
        {badge.icon} {badge.label}
      </span>
    )
  }

  // Function untuk render media
  const renderMedia = () => {
    if (!post.media_urls || post.media_urls.length === 0) return null

    const gridClass = 
      post.media_urls.length === 1 ? 'grid-cols-1' :
      post.media_urls.length === 2 ? 'grid-cols-2' :
      post.media_urls.length === 3 ? 'grid-cols-2' :
      'grid-cols-2'

    return (
      <div className={`grid gap-1 mt-3 ${gridClass}`}>
        {post.media_urls.map((url: string, index: number) => {
          const isVideo = post.media_types?.[index] === 'video'
          const aspectClass = post.media_urls.length === 1 ? 'aspect-video' : 'aspect-square'
          
          return (
            <div 
              key={index} 
              className={`relative ${aspectClass} ${post.media_urls.length === 3 && index === 0 ? 'row-span-2' : ''}`}
            >
              {isVideo ? (
                <video
                  src={url}
                  controls
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Image
                  src={url}
                  alt={`Media ${index + 1}`}
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.profiles?.username}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden relative flex-shrink-0">
            {post.profiles?.avatar_url ? (
              <Image
                src={post.profiles.avatar_url}
                alt={post.profiles?.full_name || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || '?'}
              </div>
            )}
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={`/profile/${post.profiles?.username}`}>
              <span className="font-semibold hover:underline text-gray-900">
                {post.profiles?.full_name || post.profiles?.username}
              </span>
            </Link>
            {renderVerificationBadge()}
            <span className="text-gray-500 text-sm">@{post.profiles?.username}</span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-gray-400 text-sm">
              {formatDistanceToNow(new Date(post.created_at), { 
                addSuffix: true, 
                locale: id 
              })}
            </span>
          </div>
          
          {/* Content */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={280}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEditPost}
                  disabled={loading || !editContent.trim()}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(post.content)
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-gray-800">{post.content}</p>
          )}
          
          {/* Media */}
          {renderMedia()}
          
          {/* Actions */}
          <div className="flex items-center gap-6 mt-4 pt-2 border-t border-gray-100">
            <button
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center gap-1 text-sm transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
              <span className="font-medium">{likes}</span>
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
            >
              <span className="text-lg">💬</span>
              <span className="font-medium">{post.comments_count || 0}</span>
            </button>
            
            <button
              onClick={handleRepost}
              disabled={loading}
              className={`flex items-center gap-1 text-sm transition-colors ${
                isReposted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'
              }`}
            >
              <span className="text-lg">🔁</span>
              <span className="font-medium">{reposts}</span>
            </button>
            
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin + '/post/' + post.id)
                alert('Link postingan disalin!')
              }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
            >
              <span className="text-lg">📤</span>
            </button>

            {/* Dropdown untuk edit/delete (hanya owner) */}
            {isOwner && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ⋮
                </button>
                {showDeleteConfirm && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setIsEditing(true)
                        setShowDeleteConfirm(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Yakin ingin menghapus postingan ini?')) {
                          handleDeletePost()
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {/* Comment input */}
              {currentUserId ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={replyTo ? "Balas komentar..." : "Tulis komentar..."}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleComment()
                      }
                    }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentContent.trim() || loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '⏳' : 'Kirim'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">
                  <Link href="/login" className="text-blue-500 hover:underline">
                    Login
                  </Link> untuk berkomentar
                </p>
              )}
              
              {/* Comments list */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Belum ada komentar. Jadilah yang pertama! 🎉
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Link href={`/profile/${comment.profiles?.username}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden relative flex-shrink-0">
                          {comment.profiles?.avatar_url ? (
                            <Image
                              src={comment.profiles.avatar_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                              {comment.profiles?.full_name?.[0] || comment.profiles?.username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Link href={`/profile/${comment.profiles?.username}`}>
                            <span className="font-semibold text-sm hover:underline">
                              {comment.profiles?.full_name || comment.profiles?.username}
                            </span>
                          </Link>
                          <span className="text-gray-500 text-xs">
                            @{comment.profiles?.username}
                          </span>
                          <span className="text-gray-400 text-xs">·</span>
                          <span className="text-gray-400 text-xs">
                            {formatDistanceToNow(new Date(comment.created_at), { 
                              addSuffix: true, 
                              locale: id 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        <button
                          onClick={() => setReplyTo(comment.id)}
                          className="text-xs text-gray-400 hover:text-blue-500 mt-1"
                        >
                          Balas
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  }

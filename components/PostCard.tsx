'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

interface PostCardProps {
  post: any
  currentUserId?: string
  onInteraction?: () => void
}

export default function PostCard({ post, currentUserId, onInteraction }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes_count || 0)
  const [isLiked, setIsLiked] = useState(false)
  const [reposts, setReposts] = useState(post.reposts_count || 0)
  const [isReposted, setIsReposted] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Cek status like & repost
  useEffect(() => {
    if (currentUserId) {
      checkInteraction()
    }
  }, [currentUserId])

  const checkInteraction = async () => {
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
  }

  const handleLike = async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)
          .eq('type', 'post')
        
        setLikes(prev => prev - 1)
        setIsLiked(false)
      } else {
        // Like
        await supabase
          .from('likes')
          .insert([
            {
              user_id: currentUserId,
              post_id: post.id,
              type: 'post',
            },
          ])
        
        setLikes(prev => prev + 1)
        setIsLiked(true)

        // Notifikasi
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: post.user_id,
              actor_id: currentUserId,
              type: 'like',
              post_id: post.id,
            },
          ])
      }
      onInteraction?.()
    } catch (error) {
      console.error('Error liking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRepost = async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      if (isReposted) {
        await supabase
          .from('reposts')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)
        
        setReposts(prev => prev - 1)
        setIsReposted(false)
      } else {
        await supabase
          .from('reposts')
          .insert([
            {
              user_id: currentUserId,
              post_id: post.id,
            },
          ])
        
        setReposts(prev => prev + 1)
        setIsReposted(true)

        await supabase
          .from('notifications')
          .insert([
            {
              user_id: post.user_id,
              actor_id: currentUserId,
              type: 'repost',
              post_id: post.id,
            },
          ])
      }
      onInteraction?.()
    } catch (error) {
      console.error('Error reposting:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComment = async () => {
    if (!currentUserId || !commentContent.trim()) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: post.id,
            user_id: currentUserId,
            content: commentContent.trim(),
          },
        ])
        .select('*, profiles(username, full_name, avatar_url, verified_type, is_verified)')
        .single()

      if (error) throw error

      setComments(prev => [...prev, data])
      setCommentContent('')
      
      // Notifikasi
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: post.user_id,
            actor_id: currentUserId,
            type: 'comment',
            post_id: post.id,
          },
        ])

      onInteraction?.()
    } catch (error) {
      console.error('Error commenting:', error)
    } finally {
      setLoading(false)
    }
  }

  // Render badge verifikasi
  const renderVerificationBadge = () => {
    if (!post.profiles?.is_verified) return null
    
    const badges = {
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

    const badge = badges[post.profiles.verified_type as keyof typeof badges]
    if (!badge) return null

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${badge.color} text-white text-xs rounded-full ml-1`}>
        {badge.icon} {badge.label}
      </span>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-4 hover:bg-gray-50 transition">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.profiles?.username}`}>
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden relative">
            {post.profiles?.avatar_url && (
              <Image
                src={post.profiles.avatar_url}
                alt={post.profiles?.full_name || 'User'}
                fill
                className="object-cover"
              />
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={`/profile/${post.profiles?.username}`}>
              <span className="font-semibold hover:underline">
                {post.profiles?.full_name || post.profiles?.username}
              </span>
            </Link>
            {renderVerificationBadge()}
            <span className="text-gray-500 text-sm">@{post.profiles?.username}</span>
            <span className="text-gray-400 text-sm">· {new Date(post.created_at).toLocaleDateString('id-ID')}</span>
          </div>
          
          {/* Content */}
          <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
          
          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className={`grid gap-1 mt-3 ${
              post.media_urls.length === 1 ? 'grid-cols-1' :
              post.media_urls.length === 2 ? 'grid-cols-2' :
              'grid-cols-2'
            }`}>
              {post.media_urls.map((url: string, index: number) => (
                <div key={index} className={`relative ${
                  post.media_urls.length === 1 ? 'aspect-video' : 'aspect-square'
                }`}>
                  <Image
                    src={url}
                    alt={`Media ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-6 mt-4 pt-2">
            <button
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center gap-1 text-sm ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <span>{isLiked ? '❤️' : '🤍'}</span>
              <span>{likes}</span>
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500"
            >
              💬 <span>{post.comments_count || 0}</span>
            </button>
            
            <button
              onClick={handleRepost}
              disabled={loading}
              className={`flex items-center gap-1 text-sm ${
                isReposted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'
              }`}
            >
              <span>🔁</span>
              <span>{reposts}</span>
            </button>
            
            <button className="text-gray-500 hover:text-blue-500 text-sm">
              📤 Share
            </button>
          </div>
          
          {/* Comments */}
          {showComments && (
            <div className="mt-4 pt-4 border-t">
              {/* Comment input */}
              {currentUserId && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Tulis komentar..."
                    className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentContent.trim() || loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    Kirim
                  </button>
                </div>
              )}
              
              {/* Comments list */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden relative flex-shrink-0">
                      {comment.profiles?.avatar_url && (
                        <Image
                          src={comment.profiles.avatar_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">
                          {comment.profiles?.full_name || comment.profiles?.username}
                        </span>
                        <span className="text-gray-500 text-xs">
                          @{comment.profiles?.username}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  }

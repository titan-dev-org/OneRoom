// components/PostCard.tsx
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
  const [likes, setLikes] = useState<number>(post.likes_count || 0)  // ← Explicit type
  const [isLiked, setIsLiked] = useState<boolean>(false)  // ← Explicit type
  const [reposts, setReposts] = useState<number>(post.reposts_count || 0)  // ← Explicit type
  const [isReposted, setIsReposted] = useState<boolean>(false)  // ← Explicit type
  const [showComments, setShowComments] = useState<boolean>(false)  // ← Explicit type
  const [commentContent, setCommentContent] = useState<string>('')  // ← Explicit type
  const [comments, setComments] = useState<any[]>([])  // ← Explicit type
  const [loading, setLoading] = useState<boolean>(false)  // ← Explicit type
  const supabase = createClient()

  // ... rest of the code
}

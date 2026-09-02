'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function PostForm({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    // Validasi: max 4 files
    if (selectedFiles.length + files.length > 4) {
      setError('Maksimal 4 file')
      return
    }

    // Validasi: max 10MB each
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} melebihi 10MB`)
        return false
      }
      return true
    })

    setFiles([...files, ...validFiles])
    
    // Create previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file))
    setPreviews([...previews, ...newPreviews])
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && files.length === 0) {
      setError('Tulis sesuatu atau upload file')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Harus login')

      let mediaUrls: string[] = []
      let mediaTypes: string[] = []

      // Upload files ke Supabase Storage
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName)

          mediaUrls.push(publicUrl)
          mediaTypes.push(file.type.startsWith('image/') ? 'image' : 'video')
        }
      }

      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            content: content.trim(),
            media_urls: mediaUrls,
            media_types: mediaTypes,
          },
        ])
        .select()
        .single()

      if (postError) throw postError

      // Reset form
      setContent('')
      setFiles([])
      setPreviews([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onPostCreated?.()
    } catch (err: any) {
      setError(err.message || 'Gagal posting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 shadow-sm">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Apa yang sedang terjadi?"
        className="w-full resize-none border-none focus:ring-0 text-lg placeholder-gray-400 min-h-[80px]"
        maxLength={280}
      />
      
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <Image
                src={preview}
                alt={`Preview ${index}`}
                fill
                className="object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-500 hover:text-blue-600"
          >
            📷 Media
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="text-xs text-gray-500 self-center">
            {content.length}/280
          </span>
        </div>
        <button
          type="submit"
          disabled={loading || (!content.trim() && files.length === 0)}
          className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memposting...' : 'Posting'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  )
        }

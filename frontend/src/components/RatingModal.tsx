"use client"

import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: any
  onRatingSubmitted: () => void
}

export function RatingModal({ isOpen, onClose, booking, onRatingSubmitted }: RatingModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    setIsSubmitting(true)
    try {
      await api.ratings.create({
        booking_id: booking.id,
        expert_id: booking.expert_id,
        institution_id: booking.institution_id,
        rating,
        feedback: feedback.trim() || null,
        rated_by: 'institution' // Since this modal is used by institutions to rate experts
      })

      // Update the booking to mark it as rated
      await api.bookings.update(booking.id, { is_rated: true })
      
      onRatingSubmitted()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('Failed to submit rating. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setRating(0)
    setHoverRating(0)
    setFeedback('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Rate Expert</DialogTitle>
          <DialogDescription className="text-slate-600">
            Rate your experience with {booking?.expert?.name || 'this expert'} for the project "{booking?.project?.title || 'this project'}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Star Rating */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none hover:scale-110 transition-transform duration-200"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {rating > 0 && (
                <>
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </>
              )}
            </p>
          </div>

          {/* Feedback */}
          <div className="flex flex-col gap-2">
            <label htmlFor="feedback" className="text-sm font-medium text-slate-700">
              Feedback (Optional)
            </label>
            <Textarea
              id="feedback"
              placeholder="Share your experience working with this expert..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-all duration-300">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 border-2 border-blue-400/20 hover:border-blue-400/40">
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

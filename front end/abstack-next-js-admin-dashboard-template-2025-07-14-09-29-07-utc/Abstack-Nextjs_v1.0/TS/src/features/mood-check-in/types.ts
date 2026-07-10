export interface MoodCheckIn {
  id: string
  studentId: string
  date: string
  moodValue: number
  createdAt: string
}

export const MOOD_OPTIONS: { value: number; label: string; emoji: string }[] = [
  { value: 1, label: 'Very low', emoji: '😢' },
  { value: 2, label: 'Low', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😄' },
]

'use client'

import { useParams } from 'next/navigation'
import { StudySession } from '@/components/anki/study-session'

export default function StudyPage() {
	const { deckId } = useParams<{ deckId: string }>()
	return <StudySession deckId={deckId} />
}

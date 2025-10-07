import { useEffect, useState } from 'react'
import { EventData } from '@/services/eventService'

/**
 * Hook to automatically update event status and provide real-time status changes
 */
export function useEventStatusUpdate(events: EventData[]) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [statusChanges, setStatusChanges] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (events.length === 0) return

    const interval = setInterval(() => {
      const now = new Date()
      const hasChanges = events.some(event => {
        // Check if any event status would change
        const currentTime = Math.floor(now.getTime() / 1000)
        const isLive = currentTime >= event.startTs && currentTime <= event.endTs
        const isEnded = currentTime > event.endTs
        const isUpcoming = currentTime < event.startTs

        // Determine what the status should be
        let expectedStatus: string
        if (isEnded) {
          expectedStatus = 'ended'
        } else if (isLive) {
          expectedStatus = 'live'
        } else {
          expectedStatus = 'upcoming'
        }

        // Check if status has changed
        const previousStatus = statusChanges.get(event.eventId)
        if (previousStatus && previousStatus !== expectedStatus) {
          return true // Status has changed
        }

        return false
      })

      if (hasChanges) {
        setLastUpdate(now)
        // Update status changes map
        const newStatusChanges = new Map(statusChanges)
        events.forEach(event => {
          const currentTime = Math.floor(now.getTime() / 1000)
          let expectedStatus: string
          if (currentTime > event.endTs) {
            expectedStatus = 'ended'
          } else if (currentTime >= event.startTs && currentTime <= event.endTs) {
            expectedStatus = 'live'
          } else {
            expectedStatus = 'upcoming'
          }
          newStatusChanges.set(event.eventId, expectedStatus)
        })
        setStatusChanges(newStatusChanges)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [events, statusChanges])

  return {
    lastUpdate,
    statusChanges,
    hasRecentChanges: statusChanges.size > 0
  }
}

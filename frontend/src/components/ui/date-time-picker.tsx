import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [selectedTime, setSelectedTime] = React.useState<string>("")

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setSelectedTime(format(date, "HH:mm"))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    if (newDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":")
      const combinedDate = new Date(newDate)
      combinedDate.setHours(parseInt(hours), parseInt(minutes))
      onDateChange?.(combinedDate)
    } else {
      onDateChange?.(newDate)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    if (selectedDate && time) {
      const [hours, minutes] = time.split(":")
      const combinedDate = new Date(selectedDate)
      combinedDate.setHours(parseInt(hours), parseInt(minutes))
      
      // Check if the selected time is in the past (only for today)
      const now = new Date()
      const isToday = selectedDate.toDateString() === now.toDateString()
      if (isToday && combinedDate <= now) {
        // Don't allow past times for today
        return
      }
      
      onDateChange?.(combinedDate)
    }
  }

  const displayValue = selectedDate && selectedTime 
    ? format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 
        parseInt(selectedTime.split(":")[0]), parseInt(selectedTime.split(":")[1])), "PPP 'at' p")
    : placeholder

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal glass-input",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 glass-card" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            disabled={(date) => {
              const today = new Date()
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
              return date < todayStart
            }}
          />
        </PopoverContent>
      </Popover>

      <Select value={selectedTime} onValueChange={handleTimeSelect} disabled={disabled}>
        <SelectTrigger className="w-32 glass-input">
          <SelectValue placeholder="Time">
            {selectedTime && (
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                {selectedTime}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="glass-card">
          {Array.from({ length: 24 }, (_, i) => {
            const hour = i.toString().padStart(2, "0")
            return Array.from({ length: 4 }, (_, j) => {
              const minute = (j * 15).toString().padStart(2, "0")
              const timeValue = `${hour}:${minute}`
              
              // Filter out past times if today is selected
              const now = new Date()
              const isToday = selectedDate && selectedDate.toDateString() === now.toDateString()
              if (isToday) {
                const [currentHour, currentMinute] = [now.getHours(), now.getMinutes()]
                const [selectedHour, selectedMinute] = [parseInt(hour), parseInt(minute)]
                const isPastTime = selectedHour < currentHour || 
                  (selectedHour === currentHour && selectedMinute <= currentMinute)
                
                if (isPastTime) {
                  return null
                }
              }
              
              return (
                <SelectItem key={timeValue} value={timeValue}>
                  {timeValue}
                </SelectItem>
              )
            }).filter(Boolean)
          }).flat()}
        </SelectContent>
      </Select>
    </div>
  )
}

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal glass-input",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 glass-card" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        />
      </PopoverContent>
    </Popover>
  )
}

interface TimePickerProps {
  time?: string
  onTimeChange?: (time: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = "Pick a time",
  className,
  disabled = false,
}: TimePickerProps) {
  return (
    <Select value={time} onValueChange={onTimeChange} disabled={disabled}>
      <SelectTrigger className={cn("glass-input", className)}>
        <SelectValue placeholder={placeholder}>
          {time && (
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              {time}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="glass-card">
        {Array.from({ length: 24 }, (_, i) => {
          const hour = i.toString().padStart(2, "0")
          return Array.from({ length: 4 }, (_, j) => {
            const minute = (j * 15).toString().padStart(2, "0")
            const timeValue = `${hour}:${minute}`
            return (
              <SelectItem key={timeValue} value={timeValue}>
                {timeValue}
              </SelectItem>
            )
          })
        }).flat()}
      </SelectContent>
    </Select>
  )
}

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [dateInputValue, setDateInputValue] = React.useState<string>("")
  const [timeInputValue, setTimeInputValue] = React.useState<string>("")
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      const timeString = format(date, "HH:mm")
      setSelectedTime(timeString)
      setDateInputValue(format(date, "dd/MM/yyyy"))
      setTimeInputValue(timeString)
    } else {
      // Reset all values when date is undefined
      setSelectedDate(undefined)
      setSelectedTime("")
      setDateInputValue("")
      setTimeInputValue("")
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    if (newDate) {
      setDateInputValue(format(newDate, "dd/MM/yyyy"))
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(":")
        const combinedDate = new Date(newDate)
        combinedDate.setHours(parseInt(hours), parseInt(minutes))
        onDateChange?.(combinedDate)
      } else {
        onDateChange?.(newDate)
      }
    } else {
      setDateInputValue("")
      onDateChange?.(newDate)
    }
    setIsDatePickerOpen(false)
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDateInputValue(value)

    const formats = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy-MM-dd"]
    let parsedDate: Date | undefined

    for (const formatStr of formats) {
      try {
        const parsed = parse(value, formatStr, new Date())
        if (isValid(parsed)) {
          parsedDate = parsed
          break
        }
      } catch (e) {
      }
    }

    if (parsedDate) {
      setSelectedDate(parsedDate)
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(":")
        parsedDate.setHours(parseInt(hours), parseInt(minutes))
      }
      onDateChange?.(parsedDate)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setTimeInputValue(time)
    if (selectedDate && time) {
      const [hours, minutes] = time.split(":")
      const combinedDate = new Date(selectedDate)
      combinedDate.setHours(parseInt(hours), parseInt(minutes))

      const now = new Date()
      const isToday = selectedDate.toDateString() === now.toDateString()
      if (isToday && combinedDate <= now) {
        // Don't allow past times for toda
        return
      }

      onDateChange?.(combinedDate)
    }
    setIsTimePickerOpen(false)
  }

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTimeInputValue(value)

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
    if (timeRegex.test(value)) {
      setSelectedTime(value)
      if (selectedDate) {
        const [hours, minutes] = value.split(":")
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
    } else if (value === "") {
      // Allow clearing the time
      setSelectedTime("")
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex-1">
            <Input
              value={dateInputValue}
              onChange={handleDateInputChange}
              placeholder="DD/MM/YYYY"
              className="glass-input pl-9"
              disabled={disabled}
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 glass-card"
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={false}
        >
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

      <Popover open={isTimePickerOpen} onOpenChange={(open) => {
        setIsTimePickerOpen(open)
        // Ensure time picker reflects current time when opening
        if (open && timeInputValue && !selectedTime) {
          setSelectedTime(timeInputValue)
        }
      }}>
        <PopoverTrigger asChild>
          <div className="relative w-32">
            <Input
              value={timeInputValue}
              onChange={handleTimeInputChange}
              placeholder="HH:MM"
              className="glass-input pl-9"
              disabled={disabled}
            />
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-0 glass-card max-h-60 overflow-y-auto" align="start">
          <div className="p-2 space-y-1">
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i.toString().padStart(2, "0")
              return Array.from({ length: 4 }, (_, j) => {
                const minute = (j * 15).toString().padStart(2, "0")
                const timeValue = `${hour}:${minute}`

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
                  <Button
                    key={timeValue}
                    variant={selectedTime === timeValue ? "default" : "ghost"}
                    className="w-full justify-center text-center font-normal text-sm px-2"
                    onClick={() => handleTimeSelect(timeValue)}
                  >
                    {timeValue}
                  </Button>
                )
              }).filter(Boolean)
            }).flat()}
          </div>
        </PopoverContent>
      </Popover>
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

import * as React from "react"
import { DollarSign } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { parseUsdcInput, formatUsdc, formatUsdcCompact, validateUsdcAmount } from "@/utils/usdcUtils"

interface UsdcInputProps {
  value?: number
  onChange?: (value: number) => void
  onBlur?: () => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  minAmount?: number
  maxAmount?: number
  showValidation?: boolean
  required?: boolean
}

export function UsdcInput({
  value,
  onChange,
  onBlur,
  placeholder = "0.00",
  label,
  className,
  disabled = false,
  minAmount = 0.01,
  maxAmount = 1000000,
  showValidation = true,
  required = false,
}: UsdcInputProps) {
  const [inputValue, setInputValue] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  // Update input value when prop value changes
  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(formatUsdc(value, false))
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setError(null)

    // Parse and validate the input
    const parsedAmount = parseUsdcInput(newValue)
    
    if (!isNaN(parsedAmount)) {
      if (showValidation) {
        const validation = validateUsdcAmount(parsedAmount, minAmount, maxAmount)
        if (!validation.isValid) {
          setError(validation.error || "Invalid amount")
        }
      }
      
      // Call onChange with the parsed amount
      onChange?.(parsedAmount)
    } else if (newValue.trim() !== "") {
      setError("Invalid amount format")
    }
  }

  const handleBlur = () => {
    // Format the input on blur
    const parsedAmount = parseUsdcInput(inputValue)
    if (!isNaN(parsedAmount)) {
      setInputValue(formatUsdc(parsedAmount, false))
    }
    onBlur?.()
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="flex items-center text-sm font-medium">
          <DollarSign className="h-4 w-4 mr-2" />
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "glass-input pr-8",
            error && "border-destructive focus:border-destructive"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          USDC
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {!error && showValidation && (
        <p className="text-xs text-muted-foreground">
          Min: {formatUsdc(minAmount)} • Max: {formatUsdc(maxAmount)}
        </p>
      )}
    </div>
  )
}

interface UsdcDisplayProps {
  amount: number
  label?: string
  showSymbol?: boolean
  compact?: boolean
  className?: string
}

export function UsdcDisplay({
  amount,
  label,
  showSymbol = true,
  compact = false,
  className,
}: UsdcDisplayProps) {
  const formattedAmount = compact 
    ? formatUsdcCompact(amount, showSymbol)
    : formatUsdc(amount, showSymbol)

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
      <p className="text-lg font-semibold">{formattedAmount}</p>
    </div>
  )
}
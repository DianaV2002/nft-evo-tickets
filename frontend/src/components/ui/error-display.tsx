import { AlertTriangle, Info, XCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserFriendlyError } from "@/utils/errorMapper"

interface ErrorDisplayProps {
  error: UserFriendlyError
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className = "" 
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (error.type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getCardVariant = () => {
    switch (error.type) {
      case 'error':
        return 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20'
      case 'info':
        return 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
      default:
        return 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
    }
  }

  return (
    <Card className={`glass-card ${getCardVariant()} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <CardTitle className="text-lg">{error.title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0 hover:bg-transparent"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {error.message}
        </p>
        {error.suggestion && (
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {error.suggestion}
            </p>
          </div>
        )}
        {onRetry && (
          <div className="mt-4">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SuccessDisplayProps {
  title: string
  message: string
  txSignature?: string
  onDismiss?: () => void
  className?: string
}

export function SuccessDisplay({ 
  title, 
  message, 
  txSignature, 
  onDismiss, 
  className = "" 
}: SuccessDisplayProps) {
  return (
    <Card className={`glass-card border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0 hover:bg-transparent"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {message}
        </p>
        {txSignature && (
          <div className="mt-3 p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Transaction ID:</p>
            <code className="text-xs break-all">{txSignature}</code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

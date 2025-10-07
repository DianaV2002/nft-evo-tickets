/**
 * Maps technical errors to user-friendly messages
 */

export interface UserFriendlyError {
  title: string
  message: string
  suggestion?: string
  type: 'error' | 'warning' | 'info'
}

/**
 * Maps Solana/Anchor program errors to user-friendly messages
 */
export function mapProgramError(error: any): UserFriendlyError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error'
  
  // Check for specific Anchor program errors
  if (errorMessage.includes('Unauthorized')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      suggestion: 'Make sure you\'re connected with the correct wallet.',
      type: 'error'
    }
  }
  
  if (errorMessage.includes('InsufficientPayment')) {
    return {
      title: 'Insufficient Funds',
      message: 'You don\'t have enough SOL to complete this transaction.',
      suggestion: 'Please add more SOL to your wallet and try again.',
      type: 'error'
    }
  }
  
  if (errorMessage.includes('TicketAlreadyListed')) {
    return {
      title: 'Ticket Already Listed',
      message: 'This ticket is already listed for sale.',
      suggestion: 'You can only list each ticket once.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('TicketNotListed')) {
    return {
      title: 'Ticket Not Listed',
      message: 'This ticket is not currently listed for sale.',
      suggestion: 'The ticket may have been removed or already sold.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('ListingExpired')) {
    return {
      title: 'Listing Expired',
      message: 'This listing has expired.',
      suggestion: 'The seller may have set an expiration time for this listing.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('CannotListInCurrentStage')) {
    return {
      title: 'Cannot List Ticket',
      message: 'This ticket cannot be listed in its current stage.',
      suggestion: 'Tickets can only be listed when they are in QR stage.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('InvalidTicketStage')) {
    return {
      title: 'Invalid Ticket Stage',
      message: 'This ticket is not in the correct stage for this operation.',
      suggestion: 'Please check the ticket status and try again.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('EventNotOver')) {
    return {
      title: 'Event Still Active',
      message: 'This operation can only be performed after the event ends.',
      suggestion: 'Please wait until the event is finished.',
      type: 'info'
    }
  }
  
  if (errorMessage.includes('TicketNotScanned')) {
    return {
      title: 'Ticket Not Scanned',
      message: 'This ticket has not been scanned for attendance.',
      suggestion: 'Make sure the ticket was properly scanned at the event.',
      type: 'warning'
    }
  }
  
  // Check for common Solana errors
  if (errorMessage.includes('insufficient funds')) {
    return {
      title: 'Insufficient SOL',
      message: 'Your wallet doesn\'t have enough SOL to pay for transaction fees.',
      suggestion: 'Please add SOL to your wallet to cover transaction costs.',
      type: 'error'
    }
  }
  
  if (errorMessage.includes('user rejected')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      suggestion: 'Please try again and confirm the transaction in your wallet.',
      type: 'info'
    }
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the Solana network.',
      suggestion: 'Please check your internet connection and try again.',
      type: 'error'
    }
  }
  
  if (errorMessage.includes('timeout')) {
    return {
      title: 'Transaction Timeout',
      message: 'The transaction took too long to complete.',
      suggestion: 'Please try again. The network might be busy.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('blockhash')) {
    return {
      title: 'Blockhash Error',
      message: 'The transaction blockhash is invalid or expired.',
      suggestion: 'Please try again. This usually resolves automatically.',
      type: 'warning'
    }
  }
  
  if (errorMessage.includes('signature')) {
    return {
      title: 'Signature Error',
      message: 'There was an issue with the transaction signature.',
      suggestion: 'Please try signing the transaction again.',
      type: 'error'
    }
  }
  
  // Check for wallet connection errors
  if (errorMessage.includes('wallet not connected') || errorMessage.includes('no wallet')) {
    return {
      title: 'Wallet Not Connected',
      message: 'Please connect your wallet to continue.',
      suggestion: 'Click the "Connect Wallet" button to get started.',
      type: 'error'
    }
  }
  
  // Check for RPC errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      title: 'Rate Limited',
      message: 'Too many requests. Please wait a moment.',
      suggestion: 'Wait a few seconds and try again.',
      type: 'warning'
    }
  }
  
  // Default fallback
  return {
    title: 'Transaction Failed',
    message: 'Something went wrong while processing your request.',
    suggestion: 'Please try again. If the problem persists, contact support.',
    type: 'error'
  }
}

/**
 * Maps general JavaScript errors to user-friendly messages
 */
export function mapGeneralError(error: any): UserFriendlyError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error'
  
  if (errorMessage.includes('fetch')) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the server.',
      suggestion: 'Please check your internet connection and try again.',
      type: 'error'
    }
  }
  
  if (errorMessage.includes('JSON')) {
    return {
      title: 'Data Error',
      message: 'Invalid data received from the server.',
      suggestion: 'Please refresh the page and try again.',
      type: 'error'
    }
  }
  
  if (errorMessage.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      suggestion: 'Please try again.',
      type: 'warning'
    }
  }
  
  return {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support if the problem persists.',
    type: 'error'
  }
}

/**
 * Main error mapping function that tries both program and general error mapping
 */
export function mapError(error: any): UserFriendlyError {
  // First try program-specific error mapping
  const programError = mapProgramError(error)
  if (programError.title !== 'Transaction Failed') {
    return programError
  }
  
  // Fall back to general error mapping
  return mapGeneralError(error)
}

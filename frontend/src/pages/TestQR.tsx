import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generateScannerQRData, validateSecureQRCode, generateQRCodeDataURL } from '@/services/qrCodeService'
import { QrCode, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

/**
 * Test page to demonstrate secure QR code functionality
 * This page shows how QR codes are generated with wallet signatures
 * and how they expire after 30 seconds
 */
export default function TestQR() {
  const wallet = useWallet()
  const { connection } = useConnection()
  const [qrCodeImage, setQrCodeImage] = useState<string>('')
  const [qrData, setQrData] = useState<any>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Test ticket data
  const mockTicket = {
    nftMint: 'TestNFTMint123456789',
    publicKey: 'TestTicketPDA987654321',
    event: 'TestEvent111222333',
    owner: wallet.publicKey?.toString() || 'NotConnected'
  }

  const generateQR = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      alert('Please connect your wallet first!')
      return
    }

    try {
      // Generate secure QR code with signature
      const qrDataString = await generateScannerQRData(mockTicket, wallet)
      const parsedData = JSON.parse(qrDataString)
      setQrData(parsedData)

      // Generate QR code image
      const qrImage = await generateQRCodeDataURL(qrDataString)
      setQrCodeImage(qrImage)

      // Start countdown timer
      setIsExpired(false)
      const interval = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, parsedData.expiresAt - now)
        setTimeLeft(Math.floor(remaining / 1000))

        if (remaining <= 0) {
          setIsExpired(true)
          clearInterval(interval)
        }
      }, 1000)

      // Clear after 35 seconds
      setTimeout(() => clearInterval(interval), 35000)
    } catch (error) {
      console.error('Error generating QR:', error)
      alert(`Error: ${error}`)
    }
  }

  const validateQR = async () => {
    if (!qrData) {
      alert('Generate a QR code first!')
      return
    }

    try {
      const result = await validateSecureQRCode(JSON.stringify(qrData), connection)
      setValidationResult(result)
    } catch (error) {
      console.error('Validation error:', error)
      setValidationResult({
        valid: false,
        error: String(error)
      })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text mb-2">Secure QR Code Test</h1>
        <p className="text-muted-foreground">
          Demonstration of dynamic QR codes with wallet signatures
        </p>
      </div>

      {/* Wallet Status */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Wallet Status</CardTitle>
        </CardHeader>
        <CardContent>
          {wallet.connected ? (
            <div className="space-y-2">
              <Badge className="bg-green-500">Connected</Badge>
              <p className="text-sm font-mono">{wallet.publicKey?.toString()}</p>
            </div>
          ) : (
            <div>
              <Badge variant="destructive">Not Connected</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Please connect your wallet to test QR code generation
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate QR Code */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Generate Secure QR Code
          </CardTitle>
          <CardDescription>
            Creates a QR code signed by your wallet that expires in 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={generateQR}
            disabled={!wallet.connected}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate New QR Code
          </Button>

          {qrCodeImage && (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed">
                  <img
                    src={qrCodeImage}
                    alt="Test QR Code"
                    className="w-64 h-64"
                  />
                </div>

                {/* Timer */}
                <div className="mt-4 text-center">
                  {isExpired ? (
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      EXPIRED
                    </Badge>
                  ) : (
                    <div className="space-y-2">
                      <Badge className="text-lg px-4 py-2 bg-green-500">
                        {timeLeft}s remaining
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        QR code expires in {timeLeft} seconds
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Details */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">QR Code Data:</h4>
                <div className="space-y-1 text-xs font-mono">
                  <p><span className="text-muted-foreground">NFT Mint:</span> {qrData.nftMint}</p>
                  <p><span className="text-muted-foreground">Owner:</span> {qrData.owner.slice(0, 20)}...</p>
                  <p><span className="text-muted-foreground">Generated:</span> {new Date(qrData.timestamp).toLocaleTimeString()}</p>
                  <p><span className="text-muted-foreground">Expires:</span> {new Date(qrData.expiresAt).toLocaleTimeString()}</p>
                  <p><span className="text-muted-foreground">Type:</span> {qrData.type}</p>
                  <p><span className="text-muted-foreground">Version:</span> {qrData.version}</p>
                  <p className="pt-2"><span className="text-muted-foreground">Signature:</span></p>
                  <p className="break-all text-[10px]">{qrData.signature}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validate QR Code */}
      {qrCodeImage && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Validate QR Code</CardTitle>
            <CardDescription>
              Test the validation logic (signature, expiration, ownership)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={validateQR}
              className="w-full"
              variant="outline"
            >
              Validate QR Code
            </Button>

            {validationResult && (
              <div className={`rounded-lg p-4 ${validationResult.valid ? 'bg-green-500/10 border-2 border-green-500' : 'bg-red-500/10 border-2 border-red-500'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validationResult.valid ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-700">Valid QR Code</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-700">Invalid QR Code</span>
                    </>
                  )}
                </div>
                {validationResult.error && (
                  <p className="text-sm text-red-600 mt-2">
                    Error: {validationResult.error}
                  </p>
                )}
                {validationResult.valid && validationResult.data && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Signature verified<br/>
                    ✓ Not expired<br/>
                    ✓ Correct format
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Info */}
      <Card className="glass-card border-blue-500/50">
        <CardHeader>
          <CardTitle className="text-blue-600">🔒 Security Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ <strong>Wallet Signature:</strong> Each QR code is cryptographically signed by the owner's wallet</p>
          <p>✅ <strong>30-Second Expiration:</strong> QR codes automatically expire, preventing screenshot attacks</p>
          <p>✅ <strong>NFT Ownership Check:</strong> Scanner verifies on-chain that presenter owns the NFT</p>
          <p>✅ <strong>Tamper Detection:</strong> Any modification to QR data invalidates the signature</p>
          <p>✅ <strong>Replay Prevention:</strong> Expired QR codes cannot be reused</p>
        </CardContent>
      </Card>

      {/* Attack Scenarios */}
      <Card className="glass-card border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-600">🚫 What Attackers Can't Do</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>❌ <strong>Screenshot Attack:</strong> QR code expires in 30 seconds</p>
          <p>❌ <strong>Sharing Attack:</strong> Signature + expiration prevents reuse</p>
          <p>❌ <strong>NFT Transfer Fraud:</strong> On-chain ownership verified</p>
          <p>❌ <strong>QR Forgery:</strong> Cannot fake wallet signature</p>
          <p>❌ <strong>Replay Attack:</strong> Timestamp prevents old QR reuse</p>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="glass-card bg-muted/30">
        <CardHeader>
          <CardTitle>📝 How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Connect your wallet using the button in the top right</li>
            <li>Click "Generate New QR Code" to create a secure QR code</li>
            <li>Watch the timer countdown (30 seconds)</li>
            <li>Click "Validate QR Code" to test validation (should pass if not expired)</li>
            <li>Wait for QR to expire, then validate again (should fail)</li>
            <li>Try taking a screenshot and see it become useless after 30s</li>
            <li>Generate a new QR code - notice the signature changes each time</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

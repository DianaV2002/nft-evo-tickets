import { useState } from "react"
import { MessageCircle, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Namaste! 🧘‍♀️ Welcome to your wellness and retreat journey. I'm here to guide you through our transformative events and experiences. Whether you're seeking inner peace, mindful practices, or rejuvenating retreats, I'm here to help you find the perfect path. How may I assist you today?",
      sender: "bot",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thank you for your message. I'm here to help you discover our wellness retreats and events. Feel free to ask about upcoming events, ticket options, or any specific wellness practices you're interested in exploring.",
        sender: "bot",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, botMessage])
    }, 1000)

    setInputValue("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Tooltip */}
          <div className="bg-white shadow-md rounded-lg px-3 py-2 border border-purple-100">
            <p className="text-xs text-gray-600">Need help? Chat with us! 🪷</p>
          </div>
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg hover:shadow-xl transition-all duration-300"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Suggested wellness avatar image */}
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                🪷
              </div>
              <div>
                <h3 className="font-semibold text-white">Wellness Guide</h3>
                <p className="text-xs text-white/80">Always here for you</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-purple-50/50 to-pink-50/50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                        : "bg-white shadow-sm border border-purple-100"
                    }`}
                  >
                    <p className={`text-sm ${message.sender === "bot" ? "text-gray-800" : ""}`}>{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === "user" ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="bg-gradient-to-br from-purple-500 to-pink-500"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}

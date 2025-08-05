import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, MessageCircle, Sparkles, TrendingDown, AlertCircle } from "lucide-react";

interface AICopilotPanelProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  message: string;
  timestamp: Date;
}

export function AICopilotPanel({ className }: AICopilotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      message: "Hello! I'm your AI business assistant. Ask me about your sales performance, inventory issues, or get insights about your business trends.",
      timestamp: new Date(Date.now() - 300000)
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const quickQuestions = [
    "Why are sales down this week?",
    "Which products should I reorder?",
    "What's causing high returns?",
    "Show me seasonal trends"
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      message: message.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(message);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        message: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("sales") && lowerMessage.includes("down")) {
      return "Based on your data analysis, sales are down 12% this week primarily due to: \n\n1. Reduced traffic from Amazon (competitor launched similar product)\n2. Low stock on your best-selling Wireless Earbuds Pro\n3. Seasonal slowdown in electronics category\n\nRecommendations: Increase marketing spend, restock key items, and consider bundling slow-moving inventory.";
    }
    
    if (lowerMessage.includes("reorder") || lowerMessage.includes("inventory")) {
      return "Your reorder recommendations based on velocity analysis:\n\n🔴 Critical: Smart Watch Series X (8 units left, 15.2/day velocity)\n🔴 Critical: USB-C Power Bank (2 units left, 22.1/day velocity)\n🟡 Low: Monitor stock levels for Bluetooth Speaker Mini\n\nSuggested PO quantities: Smart Watch (50 units), Power Bank (100 units). Total investment: ~$8,400.";
    }
    
    if (lowerMessage.includes("return")) {
      return "Return analysis shows concerning patterns:\n\n• 35% returns due to defective items (quality control issue)\n• 28% 'not as described' (listing accuracy problem)\n• Peak returns on ELC-008 Fitness Tracker (47% return rate)\n\nImmediate actions: Review supplier quality, update product descriptions, and consider discontinuing problematic SKUs.";
    }
    
    if (lowerMessage.includes("trend") || lowerMessage.includes("seasonal")) {
      return "Seasonal trends indicate:\n\n📈 Electronics typically peak in Nov-Dec (+45% vs avg)\n📉 Current period shows 8% below seasonal norm\n🎯 Opportunity: Back-to-school category emerging (Aug-Sep)\n\nStrategy: Shift marketing focus to educational electronics, prepare holiday inventory early.";
    }
    
    return "I've analyzed your question and here are some insights based on your business data. For more specific analysis, try asking about sales performance, inventory levels, customer behavior, or seasonal trends. I can provide detailed recommendations with confidence metrics.";
  };

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>AI Copilot</span>
          <Badge variant="outline" className="text-primary border-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            Beta
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* Chat Messages */}
        <div className="bg-secondary rounded-lg border border-border h-64 overflow-y-auto mb-4">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === "user" 
                    ? "bg-primary text-primary-foreground ml-4" 
                    : "bg-secondary text-foreground mr-4"
                }`}>
                  {message.type === "ai" && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="h-3 w-3 text-primary" />
                      <span className="text-xs text-muted-foreground">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-secondary text-foreground rounded-lg p-3 mr-4">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground">AI is thinking...</span>
                  </div>
                  <div className="flex space-x-1 mt-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Questions */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Quick Questions</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 text-left justify-start"
                onClick={() => handleSendMessage(question)}
                disabled={isTyping}
              >
                <MessageCircle className="h-3 w-3 mr-2 text-primary" />
                {question}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex space-x-2">
          <Input
            placeholder="Ask about your business data..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            disabled={isTyping}
            className="flex-1"
          />
          <Button 
            onClick={() => handleSendMessage(inputValue)}
            disabled={isTyping || !inputValue.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Capabilities Notice */}
        <div className="mt-4 p-3 bg-primary border border-primary rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">AI Insights</p>
              <p className="text-xs text-muted-foreground">
                Powered by your business data. All insights include confidence metrics and actionable recommendations.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
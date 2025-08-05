import { Brain, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";

interface InsightCardProps {
  title: string;
  insight: string;
  type?: "positive" | "negative" | "neutral" | "warning";
  confidence?: number;
}

export function InsightCard({ title, insight, type = "neutral", confidence }: InsightCardProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "positive":
        return "from-primary/20 to-primary/5 border-primary/30";
      case "negative":
        return "from-destructive/20 to-destructive/5 border-destructive/30";
      case "warning":
        return "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30";
      default:
        return "from-muted/20 to-muted/5 border-border";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "positive":
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case "negative":
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getTypeStyles()} rounded-lg p-4 border`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">{title}</h4>
            {confidence && (
              <div className="flex items-center space-x-1">
                <Brain className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">{confidence}% confidence</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}
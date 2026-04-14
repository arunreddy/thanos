import { Database, Server, Activity, Radio, Zap } from "lucide-react";
import type React from "react";

/* ── Category definitions ── */

export interface CategoryStyle {
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}

export interface Category extends CategoryStyle {
  label: string;
  prompt: string;
  examples: string[];
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  "Recommend DB": { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: Database },
  "Provision DB": { color: "#008555", bg: "#E6F4EF", border: "#B3D9CC", icon: Server },
  "Health":       { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", icon: Activity },
  "Kafka Assist": { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: Radio },
};

export const CATEGORIES: Category[] = [
  {
    label: "Recommend DB",
    prompt: "Recommend a database for ",
    examples: [
      "I need a database for a new microservice, transactional and structured data, ACID compliant, open source",
      "We have a vendor application that needs a database with Microsoft licensing",
      "Recommend a database for structured analytics data, large dataset over 300 GB",
    ],
    ...CATEGORY_STYLES["Recommend DB"],
  },
  {
    label: "Provision DB",
    prompt: "Provision a new database ",
    examples: [
      "Provision a PostgreSQL database for the payments team",
      "Create a new MySQL instance for staging",
      "Set up a MongoDB cluster for analytics",
    ],
    ...CATEGORY_STYLES["Provision DB"],
  },
  {
    label: "Health",
    prompt: "Run a health check on ",
    examples: [
      "Check health of production PostgreSQL cluster",
      "Show me slow queries on the transactions DB",
      "Are there any connection pool issues right now?",
    ],
    ...CATEGORY_STYLES["Health"],
  },
  {
    label: "Kafka Assist",
    prompt: "Help me with Kafka ",
    examples: [
      "How do I create or modify a topic in the Kafka portal?",
      "I need a service account and API key for my Kafka application",
      "How does authentication and authorization work for Kafka?",
      "I have a Kafka integration issue, how do I get help?",
    ],
    ...CATEGORY_STYLES["Kafka Assist"],
  },
];

export const DEFAULT_EXAMPLES = [
  "Show me slow queries on production",
  "Explore schema for employee database",
  "Check index usage on transactions table",
];

/* ── Shadow scale ── */
export const SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.06)",
  md: "0 2px 8px rgba(0,0,0,0.08)",
  lg: "0 4px 12px rgba(0,0,0,0.1)",
} as const;

// Re-export icons for components that need them alongside categories
export { Database, Server, Activity, Radio, Zap };

export type Category =
  | "llm"
  | "image"
  | "speech"
  | "dev-tools"
  | "vector-db"
  | "api"
  | "video-edit"
  | "creative"
  | "we-media"
  | "retail"
  | "ecommerce"
  | "docs"
  | "finance"
  | "education"
  | "hr";

export interface Product {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: Category;
  price: number;
  unit: string;
  tags: string[];
  features: string[];
  provider: string;
  badge?: string;
  pricingNote: string;
  /** platform：本站已接好；customer：正式调用走客户官方账号（本站有密钥时可试用） */
  access?: "platform" | "customer";
  /**
   * live：工作台可直接跑通核心能力；
   * setup：能力已接好，但需配置 Suno / MJ 等代理密钥后才真出片/成曲；
   * playbook：方案/接入陪跑（对话辅导），不伪装成已接通官方能力。
   */
  delivery?: "live" | "setup" | "playbook";
  runtime?: {
    provider:
      | "qwen"
      | "deepseek"
      | "openai"
      | "doubao"
      | "kimi"
      | "freellmapi"
      | "baidu"
      | "anthropic";
    model: string;
  };
  image?: string;
  published?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ChatAttachment {
  name: string;
  mime: string;
  kind: "image" | "text";
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendedProducts?: Product[];
  followUps?: string[];
  attachments?: ChatAttachment[];
}

export interface ChatHistoryItem {
  role: "user" | "assistant" | string;
  content: string;
  productIds?: string[];
}

export interface SubscriptionItem {
  id: string;
  productId: string;
  status: string;
  createdAt: string;
  name: string;
  price: number;
  unit: string;
  paymentMethod?: string | null;
}

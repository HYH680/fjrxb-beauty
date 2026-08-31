import type { Product } from "@/types";
import { liveConfigAttempts, type LlmConfig } from "@/lib/llm-config";
import {
  TASK_LABEL,
  attemptsForTask,
  describeLiveModel,
  isVisionProduct,
  productTask,
  rankModelsForTask,
  type TaskKind,
} from "@/lib/model-catalog";

export type { TaskKind };

export type ModelRoute = {
  task: TaskKind;
  label: string;
  attempts: LlmConfig[];
};

export function inferTask(input: {
  product: Product;
  message: string;
  hasImages: boolean;
}): TaskKind {
  return productTask(input.product, {
    message: input.message,
    hasImages: input.hasImages,
  });
}

export function describeRoute(config: LlmConfig, task: TaskKind) {
  return describeLiveModel(config, task);
}

export function resolveModelRoute(input: {
  product: Product;
  message: string;
  hasImages: boolean;
}): ModelRoute {
  const task = inferTask(input);
  const attempts = attemptsForTask(task);
  const preferredProvider = input.product.runtime?.provider;

  // 仅「模型接入」类 SKU 钉死厂商；场景服务按任务分数精排（省钱优先），用户可再手选覆盖
  const pinProvider =
    Boolean(preferredProvider) &&
    task !== "vision" &&
    (input.product.category === "llm" ||
      input.product.id === "openai-assistants");

  if (pinProvider && preferredProvider) {
    const ranked = rankModelsForTask(task);
    const wantModel = input.product.runtime?.model;
    const preferred =
      ranked.find(
        (model) =>
          model.provider === preferredProvider &&
          wantModel &&
          (model.model === wantModel || model.id === input.product.id)
      ) ||
      ranked.find((model) => model.provider === preferredProvider);
    if (preferred) {
      const first = liveConfigAttempts(preferred.config);
      const rest = attempts.filter(
        (item) =>
          !first.some(
            (row) =>
              row.baseUrl === item.baseUrl &&
              row.model === item.model &&
              row.apiKey === item.apiKey
          )
      );
      const merged = [...first, ...rest];
      const head = merged[0];
      return {
        task,
        label: head ? describeLiveModel(head, task) : `未分配 · ${TASK_LABEL[task]}`,
        attempts: merged,
      };
    }
  }

  const first = attempts[0];
  return {
    task,
    label: first ? describeLiveModel(first, task) : `未分配 · ${TASK_LABEL[task]}`,
    attempts,
  };
}

export function getProductRuntimeConfig(product: Product): LlmConfig | null {
  const route = resolveModelRoute({
    product,
    message: "",
    hasImages: false,
  });
  return route.attempts[0] ?? null;
}

export function getProductModelLabel(product: Product): string | null {
  if (isVisionProduct(product)) {
    const vision = resolveModelRoute({
      product,
      message: "",
      hasImages: true,
    });
    const text = resolveModelRoute({
      product,
      message: "",
      hasImages: false,
    });
    const visionLabel = vision.attempts[0] ? vision.label : null;
    const textLabel = text.attempts[0] ? text.label : null;
    if (visionLabel && textLabel && visionLabel !== textLabel) {
      return `看图 ${visionLabel} · 无图 ${textLabel}`;
    }
    return visionLabel || textLabel;
  }
  const route = resolveModelRoute({
    product,
    message: "",
    hasImages: false,
  });
  return route.attempts[0] ? route.label : null;
}

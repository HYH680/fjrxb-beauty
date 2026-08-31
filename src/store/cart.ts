"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  replaceItems: (products: Product[]) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          if (state.items.some((item) => item.product.id === product.id)) {
            return state;
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      clearCart: () => set({ items: [] }),

      replaceItems: (products) =>
        set({
          items: products.map((product) => ({ product, quantity: 1 })),
        }),

      totalItems: () => get().items.length,

      totalPrice: () =>
        get().items.reduce((sum, item) => sum + item.product.price, 0),
    }),
    { name: "ai-supermarket-cart-v2", skipHydration: true }
  )
);

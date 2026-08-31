"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { categoryLabels } from "@/data/products";
import { Search, MessageSquare, LayoutGrid, Settings, Home, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useLocale } from "@/hooks/useLocale";
import { localizedProductDescription, localizedProductName } from "@/lib/i18n/localize-copy";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { products } = useCatalog();
  const { t, locale } = useLocale();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("command.title")}
      description={t("command.desc")}
    >
      <CommandInput placeholder={t("command.desc")} />
      <CommandList>
        <CommandEmpty>{t("command.empty")}</CommandEmpty>

        <CommandGroup heading={t("nav.catalog")}>
          {user ? (
            <CommandItem onSelect={() => go("/home")}>
              <Home className="mr-2 h-4 w-4" />
              {t("command.workspace")}
            </CommandItem>
          ) : (
            <CommandItem onSelect={() => go("/")}>
              <Home className="mr-2 h-4 w-4" />
              {t("nav.home")}
            </CommandItem>
          )}
          <CommandItem onSelect={() => go("/chat")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {t("nav.guide")}
          </CommandItem>
          <CommandItem onSelect={() => go("/products")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            {t("command.catalog")}
          </CommandItem>
          {user ? (
            <CommandItem onSelect={() => go("/account")}>
              <Settings className="mr-2 h-4 w-4" />
              {t("common.account")}
            </CommandItem>
          ) : (
            <CommandItem onSelect={() => go("/login")}>
              <LogIn className="mr-2 h-4 w-4" />
              {t("nav.login")}
            </CommandItem>
          )}
        </CommandGroup>

        {open && (
          <CommandGroup heading={t("nav.services")}>
            {products.map((p) => {
              const name = localizedProductName(p, locale);
              const description = localizedProductDescription(p, locale);
              return (
              <CommandItem
                key={p.id}
                onSelect={() => go(`/tools/${p.id}`)}
                value={`${name} ${description} ${p.tags.join(" ")} ${p.name}`}
              >
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {categoryLabels[p.category]}
                </span>
              </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

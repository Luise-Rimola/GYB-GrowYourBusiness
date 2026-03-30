import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { sendMessage, deleteThread } from "@/app/chat/page";
import { CitationChips } from "@/components/CitationChips";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ChatTitleAutoSaveField } from "@/components/ChatTitleAutoSaveField";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const thread = await prisma.chatThread.findUnique({
    where: { id, companyId: company.id },
    include: { messages: true },
  });

  if (!thread) notFound();

  return (
    <div className="space-y-8">
      <Section
        title=""
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/chat"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              {t.chat.allChats}
            </Link>
            <Link
              href="/chat/evaluate"
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              {t.chat.evaluateBtn}
            </Link>
            <ConfirmDeleteForm
              action={deleteThread}
              confirmMessage={t.chat.deleteConfirm}
              className="inline"
            >
              <input type="hidden" name="thread_id" value={thread.id} />
              <button
                type="submit"
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
              >
                {t.chat.deleteChat}
              </button>
            </ConfirmDeleteForm>
          </div>
        }
      >
        <div className="mb-3">
          <ChatTitleAutoSaveField threadId={thread.id} initialTitle={thread.title} />
        </div>
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2 dark:border-amber-600 dark:bg-amber-900/30">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {locale === "de"
              ? "Hinweis: Je mehr Unternehmensdaten (z. B. Dokumente, KPIs, Runs) vorhanden sind, desto besser und präziser werden die Antworten."
              : "Note: The more company data (e.g., documents, KPIs, runs) is available, the better and more precise the answers will be."}
          </p>
        </div>
        <div className="flex h-[64vh] flex-col rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-900/20">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {thread.messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl border px-4 py-3 ${
                  message.role === "user"
                    ? "ml-auto border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                    : "mr-auto border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                  {message.content}
                </p>
                {message.citationsJson && (
                  <div className="mt-2">
                    <CitationChips citations={message.citationsJson as { artifact_ids?: string[]; kpi_keys?: string[]; source_ids?: string[]; knowledge_object_ids?: string[] }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <form action={sendMessage} className="mt-3 flex gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <input type="hidden" name="thread_id" value={thread.id} />
            <textarea
              name="content"
              rows={2}
              placeholder={t.chat.askPlaceholder}
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              required
            />
            <button
              type="submit"
              className="self-end rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {t.chat.send}
            </button>
          </form>
        </div>
      </Section>
    </div>
  );
}

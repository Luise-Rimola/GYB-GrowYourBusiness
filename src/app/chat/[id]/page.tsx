import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { sendMessage, deleteThread } from "@/app/chat/page";
import { CitationChips } from "@/components/CitationChips";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { areAllWorkflowsComplete } from "@/lib/chatPolicy";

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

  const allRunsComplete = await areAllWorkflowsComplete(company.id);

  return (
    <div className="space-y-8">
      <Section
        title={thread.title}
        description={t.chat.advisorChatDesc}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!allRunsComplete && (
              <Link
                href="/dashboard"
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-600 dark:text-amber-300"
              >
                {locale === "de" ? "Alle Workflows abschließen →" : "Complete all workflows →"}
              </Link>
            )}
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
        {!allRunsComplete && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-600 dark:bg-amber-900/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {locale === "de"
                ? "Bitte schließen Sie alle Workflows ab, bevor Sie Nachrichten senden."
                : "Please complete all workflows before sending messages."}
            </p>
          </div>
        )}
        <div className="space-y-4">
          {thread.messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl border p-4 ${
                message.role === "user"
                  ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                {message.role}
              </p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                {message.content}
              </p>
              {message.citationsJson && (
                <CitationChips citations={message.citationsJson as { artifact_ids?: string[]; kpi_keys?: string[]; source_ids?: string[]; knowledge_object_ids?: string[] }} />
              )}
            </div>
          ))}
        </div>

        <form action={sendMessage} className="mt-6 flex gap-3">
          <input type="hidden" name="thread_id" value={thread.id} />
          <textarea
            name="content"
            rows={2}
            placeholder={t.chat.askPlaceholder}
            disabled={!allRunsComplete}
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
            required
          />
          <button
            type="submit"
            disabled={!allRunsComplete}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.chat.send}
          </button>
        </form>
      </Section>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { areAllWorkflowsComplete } from "@/lib/chatPolicy";

async function createThread(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const allComplete = await areAllWorkflowsComplete(company.id);
  if (!allComplete) redirect("/chat");
  const title = String(formData.get("title") || "New chat").trim() || "New chat";
  const thread = await prisma.chatThread.create({
    data: { companyId: company.id, title },
  });
  redirect(`/chat/${thread.id}`);
}

export async function deleteThread(formData: FormData) {
  "use server";
  const threadId = String(formData.get("thread_id"));
  if (!threadId) return;
  await prisma.chatMessage.deleteMany({ where: { threadId } });
  await prisma.chatThread.delete({ where: { id: threadId } });
  redirect("/chat");
}

export async function sendMessage(formData: FormData) {
  "use server";
  const threadId = String(formData.get("thread_id"));
  const content = String(formData.get("content") || "").trim();
  if (!threadId || !content) return;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { messages: true },
  });
  if (!thread) return;

  const allComplete = await areAllWorkflowsComplete(thread.companyId);
  if (!allComplete) redirect(`/chat/${threadId}`);

  await prisma.chatMessage.create({
    data: {
      threadId,
      role: "user",
      content,
    },
  });

  const { generateAdvisorReply } = await import("@/services/chatAdvisor");
  const conversationHistory = thread.messages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => ({ role: m.role, content: m.content }));

  const { content: advisorReply, citations } = await generateAdvisorReply(
    thread.companyId,
    content,
    conversationHistory
  );

  await prisma.chatMessage.create({
    data: {
      threadId,
      role: "assistant",
      content: advisorReply,
      citationsJson: citations as object,
    },
  });

  redirect(`/chat/${threadId}`);
}

export default async function ChatPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const allRunsComplete = await areAllWorkflowsComplete(company.id);
  const threads = await prisma.chatThread.findMany({
    where: { companyId: company.id },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <Section
        title={t.chat.title}
        description={t.chat.description}
        actions={
          <Link
            href="/chat/evaluate"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
          >
            {t.chat.evaluateBtn}
          </Link>
        }
      >
        {!allRunsComplete && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-600 dark:bg-amber-900/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {locale === "de"
                ? "Bitte schließen Sie alle Workflows ab, bevor Sie den Berater-Chat nutzen. Der Chat nutzt Ihre Unternehmensdaten für kontextbezogene Recherche und bewertete Antworten."
                : "Please complete all workflows before using the advisor chat. The chat uses your company data for context-based research and evaluated answers."}
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm font-semibold text-amber-700 underline dark:text-amber-300"
            >
              {locale === "de" ? "→ Zu den Plänen" : "→ Go to Plans"}
            </Link>
          </div>
        )}
        <form action={createThread} className="mb-6 flex gap-3">
          <input
            name="title"
            placeholder={t.chat.chatTitle}
            disabled={!allRunsComplete}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!allRunsComplete}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New Chat
          </button>
        </form>

        <div className="space-y-4">
          {threads.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.chat.noChats}
            </p>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/chat/${thread.id}`}
                    className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {thread.title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {thread.messages.length} {t.chat.messages}
                    </span>
                    <ConfirmDeleteForm
                      action={deleteThread}
                      confirmMessage={t.chat.deleteConfirm}
                      className="inline"
                    >
                      <input type="hidden" name="thread_id" value={thread.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                        title="Delete chat"
                      >
                        {t.chat.deleteChat}
                      </button>
                    </ConfirmDeleteForm>
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  {thread.messages.slice(0, 2).map((message) => (
                    <div
                      key={message.id}
                      className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                    >
                      <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                        {message.role}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-200">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
